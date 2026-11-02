import { POPUP_REFERENCE, fitPopup } from './js/popup-layout.js';
import { createIntroPopup } from './js/intro-popup.js';
import { createSettingsPopup } from './js/settings-popup.js';
import { HEADING_FONT, headingFontReady } from './js/typography.js';
import { matchingCutscenes, playCutscenes } from './js/cutscene-player.js';
import { safeViewport, viewportSize, createAdaptiveBackground } from './js/adaptive-background.js';
import { DISH_ASSETS, DISH_IDS, normalizeDish, canSelectDish, createDishSelect, fitDishIcon } from './js/dish-select.js';
import { loadDishPreference, saveDishPreference } from './firebase.js';
import { RESULT_ASSETS, createResultPopup } from './js/result-popup.js';
import { awardFoodLoot, readFoodProgress, saveFoodProgress } from './js/food-progress.js';
import { FOOD_TEST_MODE } from './js/food-test-config.js';
import { getFoodDefinition, getFoodMaxLives, getFoodAssets, getFoodBugLimit } from './js/food-config.js';
import { GAMEPLAY_ASSETS, GAMEPLAY_STYLE, buildGameplayScene, fitGameplayScene } from './js/gameplay-scene.js';
import { FOOD_RULES, levelDurationMs, weightedType, shuffledSides, chooseEntry, createApproach, createCrossing, advanceApproach } from './js/food-rules.js';
import levels from './levels.js';
import { createSoundEffects } from './js/sound-effects.js';
import { getBugBaseBalance, getBugSpawnZone } from './bug-config.js';
import { initBackend, fetchRemoteLevel, saveProgress, trackEvent, recalcLeaderboard, rcNumber, createLevelAttempt, finishLevelAttempt } from './firebase.js';
import {
    isMobileDevice as isMobileDeviceUI,
    getViewportMode as getViewportModeUI,
    getUsedLevelColors as getUsedLevelColorsUI,
    createRoundedPanel as createRoundedPanelUI,
    createLabelSprite as createLabelSpriteUI,
    syncMobilePortraitOverlay,
} from './js/game-ui.js';
import { HOME_ASSETS, createHomeScreen, layoutHomeScreen } from './js/home-ui.js';
const MOBILE_MAX_VIEWPORT = 1366;
const MOBILE_LANDSCAPE_MIN_RATIO = 1.15;
const MOBILE_OVERLAY_ID = 'mobile-orientation-overlay';
const DEBUG_LEVEL_SELECT = new URLSearchParams(window.location.search).get('debug') === '1';

// ==== Global Constants ====
const FROZEN_EFFECT_DURATION_MS = 5000;
const FROZEN_LIFETIME_MULTIPLIER = 2;
const FROZEN_LIFETIME_RATE = 1 / FROZEN_LIFETIME_MULTIPLIER;

const NEAT_SPAWN_DELAY_MS = 1500;
const CHAMELEON_EFFECT_DURATION_MS = 5000;
const BALANCE_VERSION = '3-food-approach';
const AUDIO_PATHS = {
    bugClick: 'sounds/bug-click.mp3',
    wrongBugClick: 'sounds/wrong-bug-click.mp3',
    bombClick: 'sounds/bomb-click.mp3',
    levelMusic: 'sounds/level-music.mp3',
    menuMusic: 'sounds/menu-music.mp3',
    victory: 'sounds/victory.mp3',
    defeat: 'sounds/defeat.mp3',
    uiClick: 'sounds/ui-click.mp3'
};
const AUDIO_VOLUME = {
    bugClick: 0.92,
    wrongBugClick: 0.8,
    bombClick: 0.5,
    levelMusic: 0.3,
    menuMusic: 0.32,
    victory: 0.7225,
    defeat: 0.7225,
    uiClick: 0.95
};
const AUDIO_DUCKING_MULTIPLIER = 0.35;
const FROZEN_MUSIC_PLAYBACK_RATE = 0.9;
const CHAMELEON_MUSIC_INTERVAL_MS = 120;
const NEAT_MUSIC_SWEEP_MS = 900;
const HEALER_MUSIC_GLOW_MS = 700;

// ==== Global Variables ====
let activeObjects = [];
let maxSimultaneousObjects = 4;
let rootUI = new PIXI.Container();
let gameContainer = new PIXI.Container();
let playArea = null;
let scoreText, lifeText;
let levelData;
let objectQueue = [];
let isPaused = false;
let spawnTimer = null;
let spawnDueAt = null;
let spawnResumeAt = 0;
let gameTimeMs = 0;
let spawnSides = [];
let levelSession = 0;
const sessionTimeouts = new Set();
function sessionDelay(callback, ms) {
    const session = levelSession;
    const timer = setTimeout(() => {
        sessionTimeouts.delete(timer);
        if (session === levelSession) callback();
    }, ms);
    sessionTimeouts.add(timer);
    return timer;
}
function clearSessionCallbacks() {
    levelSession++;
    sessionTimeouts.forEach(timer => clearTimeout(timer));
    sessionTimeouts.clear();
}
let levelTimeRemainingMs = 0;
let levelCountdownTicker = null;
let levelCountdownLastAt = null;
let score = 0;
let life = 0;
let orientationPauseActive = false;
let spawnResumeDelayBlocked = false;
let frozenEffectStartedAt = 0;
let frozenEffectEndsAt = 0;
let chameleonEffectStartedAt = 0;
let chameleonEffectEndsAt = 0;
let currentAttemptId = null;
let currentAttemptPromise = null;
let currentAttemptStartedAt = 0;
let currentAttemptClosed = true;
let currentGameUI = {};
let pendingResizeFrame = null;
let pendingOrientationResizeTimeout = null;
let colorButtonsMap = {};
let levelsSinceLastAd = 0;
let lastAdTime = 0;
const DEBUG_SPAWN = false;
const audioCache = {};
let soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
let musicEnabled = localStorage.getItem('musicEnabled') !== 'false';
let levelMusicAudio = null;
let menuMusicAudio = null;
let audioDuckingActive = false;
let chameleonMusicTimer = null;
let transientMusicEffectTimer = null;
const musicEffectState = {
    frozen: false,
    chameleon: false,
    chameleonStartedAt: 0,
    transientRate: 1,
    transientVolume: 1
};
const soundEffects = createSoundEffects(AUDIO_PATHS, getEffectiveAudioVolume);

function getEffectiveAudioVolume(name) {
    const musicEffectVolume = name === 'levelMusic' ? getLevelMusicEffectVolume() : 1;
    const duckEffects = audioDuckingActive && name !== 'levelMusic' && name !== 'menuMusic';
    return (AUDIO_VOLUME[name] ?? 1) * musicEffectVolume * (duckEffects ? AUDIO_DUCKING_MULTIPLIER : 1);
}

function applyAudioVolumes() {
    soundEffects.updateVolumes();
    Object.entries(audioCache).forEach(([name, audio]) => {
        audio.volume = getEffectiveAudioVolume(name) * (audio._fadeProgress ?? 1);
    });
}

function getChameleonMusicPhase() {
    if (!musicEffectState.chameleonStartedAt) return 0;
    return (Date.now() - musicEffectState.chameleonStartedAt) / 1000;
}

function getLevelMusicEffectVolume() {
    let volumeMultiplier = musicEffectState.transientVolume;

    if (musicEffectState.chameleon) {
        const phase = getChameleonMusicPhase();
        volumeMultiplier *= 0.92 + Math.sin(phase * Math.PI * 2.2) * 0.08;
    }

    return Math.max(0.05, volumeMultiplier);
}

function getLevelMusicPlaybackRate() {
    let playbackRate = musicEffectState.transientRate;

    if (musicEffectState.frozen) {
        playbackRate *= FROZEN_MUSIC_PLAYBACK_RATE;
    }

    if (musicEffectState.chameleon) {
        const phase = getChameleonMusicPhase();
        playbackRate *= 0.96 + Math.sin(phase * Math.PI * 2.6) * 0.12;
    }

    return Math.max(0.5, Math.min(1.5, playbackRate));
}

function applyMusicPlaybackRates() {
    if (levelMusicAudio) {
        levelMusicAudio.playbackRate = getLevelMusicPlaybackRate();
    }
    if (menuMusicAudio) {
        menuMusicAudio.playbackRate = 1;
    }
}

function applyAudioState() {
    applyMusicPlaybackRates();
    applyAudioVolumes();
}

function getAudio(name) {
    if (!AUDIO_PATHS[name]) return null;
    if (!audioCache[name]) {
        const audio = new Audio(AUDIO_PATHS[name]);
        audio.preload = 'auto';
        audio.volume = getEffectiveAudioVolume(name);
        audio.addEventListener('error', () => {
            console.warn(`Audio file not loaded: ${AUDIO_PATHS[name]}`);
        }, { once: true });
        audioCache[name] = audio;
    }

    return audioCache[name];
}

// Reuse these audio elements during playback; never play audio to preload it.
function preloadAudio(name) {
    if (name !== 'levelMusic' && name !== 'menuMusic' && soundEffects.supported) {
        return soundEffects.preload(name);
    }
    return new Promise((resolve) => {
        const audio = getAudio(name);
        if (!audio || audio.readyState >= 4) {
            resolve();
            return;
        }

        const finish = () => {
            clearTimeout(timeout);
            audio.removeEventListener('canplaythrough', finish);
            audio.removeEventListener('error', finish);
            resolve();
        };
        // Some mobile browsers defer media loading until a user gesture.
        const timeout = setTimeout(() => {
            console.warn(`Audio preload timed out: ${AUDIO_PATHS[name]}`);
            finish();
        }, 15000);
        audio.addEventListener('canplaythrough', finish, { once: true });
        audio.addEventListener('error', finish, { once: true });
        audio.load();
    });
}

function playSound(name) {
    if (!soundEnabled) return;
    if (soundEffects.supported) {
        soundEffects.play(name);
        return;
    }

    const audio = getAudio(name);
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    gsap.killTweensOf(audio);
    const fadeIn = name === 'victory' || name === 'defeat';
    audio._fadeProgress = fadeIn ? 0 : 1;
    audio.volume = getEffectiveAudioVolume(name) * audio._fadeProgress;
    if (fadeIn) {
        gsap.to(audio, {
            _fadeProgress: 1,
            duration: 0.8,
            ease: 'none',
            onUpdate: () => { audio.volume = getEffectiveAudioVolume(name) * audio._fadeProgress; }
        });
    }
    audio.play().catch(() => {});
}

function playUiClick() {
    playSound('uiClick');
}

function playBugClick() {
    playSound('bugClick');
}

function playWrongBugClick() {
    playSound('wrongBugClick');
}

function playBombClick() {
    playSound('bombClick');
}

function startLevelMusic() {
    if (!musicEnabled) return;

    pauseMenuMusic();
    const audio = getAudio('levelMusic');
    if (!audio) return;

    levelMusicAudio = audio;
    levelMusicAudio.loop = true;
    levelMusicAudio.volume = getEffectiveAudioVolume('levelMusic');
    levelMusicAudio.playbackRate = getLevelMusicPlaybackRate();
    levelMusicAudio.play().catch(() => {});
}

function startMenuMusic() {
    if (!musicEnabled) return;

    stopLevelMusic();
    const audio = getAudio('menuMusic');
    if (!audio) return;

    menuMusicAudio = audio;
    menuMusicAudio.loop = true;
    menuMusicAudio.volume = getEffectiveAudioVolume('menuMusic');
    menuMusicAudio.playbackRate = 1;
    menuMusicAudio.play().catch(() => {});
}

function pauseLevelMusic() {
    if (levelMusicAudio) {
        levelMusicAudio.pause();
    }
}

function stopLevelMusic() {
    if (!levelMusicAudio) return;
    levelMusicAudio.pause();
    levelMusicAudio.currentTime = 0;
    levelMusicAudio.playbackRate = 1;
}

function pauseMenuMusic() {
    if (menuMusicAudio) {
        menuMusicAudio.pause();
    }
}

function stopMenuMusic() {
    if (!menuMusicAudio) return;
    menuMusicAudio.pause();
    menuMusicAudio.currentTime = 0;
}

function setAudioDucking(active) {
    if (audioDuckingActive === active) return;
    audioDuckingActive = active;
    applyAudioVolumes();
}

function startChameleonMusicEffect() {
    musicEffectState.chameleon = true;
    musicEffectState.chameleonStartedAt = Date.now();

    if (chameleonMusicTimer) {
        clearInterval(chameleonMusicTimer);
    }

    chameleonMusicTimer = setInterval(applyAudioState, CHAMELEON_MUSIC_INTERVAL_MS);
    applyAudioState();
}

function stopChameleonMusicEffect() {
    musicEffectState.chameleon = false;
    musicEffectState.chameleonStartedAt = 0;

    if (chameleonMusicTimer) {
        clearInterval(chameleonMusicTimer);
        chameleonMusicTimer = null;
    }

    applyAudioState();
}

function setFrozenMusicEffect(active) {
    musicEffectState.frozen = active;
    applyAudioState();
}

function clearTransientMusicEffect() {
    if (transientMusicEffectTimer) {
        clearTimeout(transientMusicEffectTimer);
        transientMusicEffectTimer = null;
    }

    musicEffectState.transientRate = 1;
    musicEffectState.transientVolume = 1;
    applyAudioState();
}

function clearGameplayMusicEffects() {
    musicEffectState.frozen = false;
    stopChameleonMusicEffect();
    clearTransientMusicEffect();
}

function playTransientMusicEffect(rate, volume, durationMs) {
    if (transientMusicEffectTimer) {
        clearTimeout(transientMusicEffectTimer);
    }

    musicEffectState.transientRate = rate;
    musicEffectState.transientVolume = volume;
    applyAudioState();

    transientMusicEffectTimer = setTimeout(() => {
        musicEffectState.transientRate = 1;
        musicEffectState.transientVolume = 1;
        transientMusicEffectTimer = null;
        applyAudioState();
    }, durationMs);
}

function playNeatMusicEffect() {
    playTransientMusicEffect(1.28, 0.72, NEAT_MUSIC_SWEEP_MS);
}

function playHealerMusicEffect() {
    playTransientMusicEffect(1.03, 1.22, HEALER_MUSIC_GLOW_MS);
}

function setSoundEnabled(enabled) {
    soundEnabled = enabled;
    if (!enabled) soundEffects.stopAll();
    localStorage.setItem('soundEnabled', enabled ? 'true' : 'false');
}

function setMusicEnabled(enabled) {
    musicEnabled = enabled;
    localStorage.setItem('musicEnabled', enabled ? 'true' : 'false');

    if (!enabled) {
        stopLevelMusic();
        stopMenuMusic();
        return;
    }

    if (document.hidden) return;

    const gameScreenActive = app?.stage?.children?.includes(gameContainer);
    if (gameScreenActive && levelData && !levelEnded) {
        if (!isPaused && !orientationPauseActive) {
            startLevelMusic();
        }
        return;
    }

    startMenuMusic();
}

function isYandexGames() {
    return typeof window !== 'undefined' && !!window.ysdk;
}

function shouldShowRewarded() {
    return isYandexGames() && !!window.ysdk?.adv?.showRewardedVideo;
}

function initYandexSDK() {
    if (typeof YaGames === 'undefined') return;

    YaGames.init().then((ysdk) => {
        window.ysdk = ysdk;
        console.log('Yandex SDK initialized');
    }).catch((err) => {
        console.log('Yandex SDK init error', err);
    });
}

function canShowAd() {
    return true;
}

function showInterstitialAd() {
    if (!isYandexGames()) return;
    if (!canShowAd()) return;
    if (!window.ysdk?.adv?.showFullscreenAdv) return;

    window.ysdk.adv.showFullscreenAdv({
        callbacks: {
            onOpen: () => {},
            onClose: () => {
                lastAdTime = Date.now();
            },
            onError: () => {}
        }
    });
}

function giveExtraLives(amount) {
    const maxLives = levelData ? getFoodMaxLives(levelData) : life;
    life = Math.min(life + amount, maxLives);
    levelEnded = false;
    clearAllPopups();
    updateUI();
    resumeGame();
}

function healPlayer(amount) {
    const healAmount = Math.max(0, Math.round(amount ?? 0));
    if (!healAmount) return;

    const maxLives = levelData ? getFoodMaxLives(levelData) : life;
    life = Math.min(life + healAmount, maxLives);
}

function showRewardedAd() {
    if (!isYandexGames()) return;
    if (!window.ysdk?.adv?.showRewardedVideo) return;

    window.ysdk.adv.showRewardedVideo({
        callbacks: {
            onOpen: () => {},
            onRewarded: () => {
                giveExtraLives(3);
            },
            onClose: () => {},
            onError: () => {}
        }
    });
}

function debugSpawn(message, extra = undefined) {
    if (!DEBUG_SPAWN) return;

    const snapshot = {
        levelId: levelData?.id ?? null,
        queue: objectQueue.length,
        active: activeObjects.length,
        isPaused,
        introActive,
        levelEnded,
        orientationPauseActive
    };

    if (extra !== undefined) {
        console.log(`[spawn-debug] ${message}`, snapshot, extra);
        return;
    }

    console.log(`[spawn-debug] ${message}`, snapshot);
}
// состояние уровня
let levelEnded = false; // true — как только показан попап победы

// Показывается ли сейчас интро‑попап (блокируем спавн до закрытия)
let introActive = false;
let activeCutscene = null;
let cutsceneGeneration = 0;
function cancelCutscene() {
    cutsceneGeneration++;
    activeCutscene?.dispose();activeCutscene=null;
}
function runCutscenes(when, won, continuation) {
    const scenes=matchingCutscenes(levelData.id,when,won);
    if(!scenes.length){continuation();return;}
    const generation=cutsceneGeneration;
    clearActiveColor();introActive=true;
    activeCutscene=playCutscenes({scenes,host:gameContainer,app,textures:TEXTURES,
        theme:loader.resources.intro_layout.data.popupTheme,
        onComplete(){if(generation!==cutsceneGeneration)return;activeCutscene=null;introActive=false;continuation();}
    });
}

// Runtime movement time combines base bug config, level multiplier and selected food.
function getLevelLifetimeMultiplier(type) {
    const multiplier = levelData?.params?.lifetimeMultiplier ?? 1;
    if (typeof multiplier === 'number') return multiplier;
    return multiplier[type] ?? multiplier.default ?? 1;
}

function getLevelSpawnConfig() {
    return levelData?.params?.spawnMultiplier ?? {};
}

function getLevelSpawnIntervalMultiplier(type) {
    const spawnMultiplier = getLevelSpawnConfig();
    if (typeof spawnMultiplier === 'number') return spawnMultiplier;

    const interval = spawnMultiplier.intervalMultiplier;
    if (typeof interval === 'number') return interval;
    if (interval && typeof interval === 'object') {
        return interval[type] ?? interval.default ?? 1;
    }

    return spawnMultiplier.default ?? 1;
}

function getRuntimeBugBalance(type) {
    const baseBalance = getBugBaseBalance(type);
    const lifetimeMultiplier = getLevelLifetimeMultiplier(type);
    const spawnIntervalMultiplier = getLevelSpawnIntervalMultiplier(type);

    // Время движения: базовое время вида × коэффициент уровня × коэффициент блюда.
    return {
        lifetime: baseBalance.lifetime * lifetimeMultiplier * getFoodDefinition(levelData).effects.travelTimeMultiplier,
        spawnInterval: baseBalance.spawnInterval / spawnIntervalMultiplier,
        clicks: baseBalance.clicks,
        scoreValue: baseBalance.scoreValue ?? 1,
        healAmount: baseBalance.healAmount ?? 0,
        spawnZone: getBugSpawnZone(type),
    };
}

function getObjectScoreValue(dataOrObject) {
    return Math.max(0, dataOrObject?.scoreValue ?? 1);
}

function clearSpawnTimer() { spawnDueAt = null; spawnTimer = null; }

function clearSpawnResumeDelay() { spawnResumeDelayBlocked = false; spawnResumeAt = 0; }

function startSpawnResumeDelay(delay = NEAT_SPAWN_DELAY_MS) { spawnResumeDelayBlocked = true; spawnResumeAt = gameTimeMs + delay; }

function scheduleNextSpawn(delay) {
    if (levelEnded) return;
    spawnDueAt = gameTimeMs + Math.max(0, delay ?? objectQueue[0]?.spawnInterval ?? 450);
}

function ensureSpawnTimerAfterUiChange() {
    if (spawnDueAt === null && !spawnResumeDelayBlocked && !levelEnded) scheduleNextSpawn(0);
}

function isFrozenEffectActive(now = gameTimeMs) {
    return frozenEffectEndsAt > now;
}

function isChameleonEffectActive(now = gameTimeMs) {
    return chameleonEffectEndsAt > now;
}

// Color button state
let activeKeyboardColor = null;
let activePointerColors = new Map();
let colorPressStart = 0;
const POINTER_COLOR_FALLBACK_KEY = '__pointer_fallback__';

function getPointerId(event) {
    return event?.data?.pointerId ??
        event?.data?.originalEvent?.pointerId ??
        null;
}

function getPointerColorKey(pointerId) {
    return pointerId ?? POINTER_COLOR_FALLBACK_KEY;
}

function isColorHeld(color) {
    if (!color) return false;
    if (activeKeyboardColor === color) return true;

    for (const heldColor of activePointerColors.values()) {
        if (heldColor === color) return true;
    }

    return false;
}

function hasAnyActiveColor() {
    return activeKeyboardColor !== null || activePointerColors.size > 0;
}

function getActiveColor() {
    if (activeKeyboardColor) return activeKeyboardColor;

    for (const heldColor of activePointerColors.values()) {
        if (heldColor) return heldColor;
    }

    return null;
}

function updatePlayAreaActiveBorder() { updateUI(); }

function syncAllColorButtonStates() {
    const colors = new Set([
        ...Object.keys(colorButtonsMap || {}),
        'red',
        'purple',
        'green',
        'yellow'
    ]);

    colors.forEach((color) => updateButtonState(color, isColorHeld(color)));
    updateBugHighlights();
    updatePlayAreaActiveBorder();
    setAudioDucking(hasAnyActiveColor());
}

// ==== UI Containers ====
const levelSelectContainer = new PIXI.Container();
let progressContainer = null;
let dishSelectScene = null;
let selectedDishId = normalizeDish(FOOD_TEST_MODE ? readFoodProgress().selected : localStorage.getItem('selectedDishId'), getCompletedLevels());
let dishSelectionRevision = 0;
let lastFoodReward = null;
function selectDish(id) {
    if (!canSelectDish(id, getCompletedLevels())) return false;
    selectedDishId = id; dishSelectionRevision++;
    if (!FOOD_TEST_MODE) localStorage.setItem('selectedDishId', id);
    const foodState=readFoodProgress();foodState.selected=id;saveFoodProgress(foodState);
    if (!FOOD_TEST_MODE) saveDishPreference(id).catch(() => {});
    updateHomeDish(); return true;
}
function updateHomeDish() {
    const home=progressContainer?.getChildByName('homeContainer');
    const foodButton=home?.getChildByName('08_button_dishes');
    if(foodButton){let badge=foodButton.getChildByName('foodReady');if(!badge){badge=new PIXI.Text('●',{fontSize:52,fill:0xF45D53});badge.name='foodReady';badge.position.set(20,5);foodButton.addChild(badge);}badge.visible=Object.entries(readFoodProgress().foods).some(([id,p])=>!p.completed&&p.collected.length===getFoodMaxLives({food:id}));}
    const dish = home?.getChildByName('dishContainer');
    if (!dish) return;
    const key = Object.keys(DISH_IDS).find(key => DISH_IDS[key] === selectedDishId);
    const texture = TEXTURES[`dish_${key}`];
    if (!texture?.valid) return;
    for (const child of dish.removeChildren()) child.destroy({ children: true });
    const icon = new PIXI.Sprite(texture); fitDishIcon(icon, [75, 150, 380, 360], true); dish.addChild(icon);
}
function menuViewport() {
    return { ...safeViewport(app.screen), fullWidth: app.screen.width, fullHeight: app.screen.height };
}
function closeDishSelect() {
    if (dishSelectScene) { dishSelectScene.destroy(); dishSelectScene = null; }
}
function showDishSelect(focusId) {
    if (dishSelectScene) return;
    clearProgressPopup();
    app.stage.removeChild(progressContainer);
    dishSelectScene = createDishSelect(TEXTURES, loader.resources.dish_layout.data, {
        getSelected: () => selectedDishId, getCompletedLevels,
        onSelect: id => { playUiClick(); selectDish(id); },
        onBack: () => { playUiClick(); showProgressScreen(); }
    });
    app.stage.addChild(dishSelectScene); dishSelectScene.fit(menuViewport()); if(focusId)dishSelectScene.focus(focusId); updateMobilePortraitOverlay();
}
let selectedLevelIndex = null;

PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

// ==== UI ASSET SLOTS ====
// Asset folders and filenames are documented in images/README.md.
// Missing custom files are ignored; the game falls back to drawn Pixi UI.
const UI_ASSET_SLOTS = {
    bg_levels: {
        path: 'images/backgrounds/bg_levels.png',
        width: 1280,
        height: 590,
        description: 'Background for the level select screen.'
    },
    level_entry_icon: {
        path: 'images/ui/level_entry_icon.png',
        width: 128,
        height: 128,
        description: 'Icon shown in the level entry popup.'
    },
    level_tile_completed: {
        path: 'images/ui/level_tile_completed.png',
        width: 128,
        height: 128,
        description: 'Completed level tile background.'
    },
    level_tile_locked: {
        path: 'images/ui/level_tile_locked.png',
        width: 128,
        height: 128,
        description: 'Not-yet-completed level tile background.'
    },
};

// ==== SPRITE PRELOADER (PIXI.Loader) ====
const SPRITE_PATHS = [
    ...HOME_ASSETS,
    ...DISH_ASSETS,
    ...GAMEPLAY_ASSETS,
    ...RESULT_ASSETS,
    ...getFoodAssets(),
    { name: 'bug', path: 'images/bugs/bug.png' },
    { name: 'healer', path: 'images/bugs/healer.png' },
    { name: 'bomb', path: 'images/bugs/bomb.png' },
    { name: 'bomb_animation', path: 'images/bugs/bomb-animation.png' },
    { name: 'coloredBug_red', path: 'images/bugs/coloredBug_red.png' },
    { name: 'coloredBug_purple', path: 'images/bugs/coloredBug_purple.png' },
    { name: 'coloredBug_green', path: 'images/bugs/coloredBug_green.png' },
    { name: 'coloredBug_yellow', path: 'images/bugs/coloredBug_yellow.png' },
    { name: 'frozen', path: 'images/bugs/frozen.png' },
    { name: 'chameleon', path: 'images/bugs/chameleon.png' },
    { name: 'neat', path: 'images/bugs/neat.png' },
    ...Object.entries(UI_ASSET_SLOTS).map(([name, slot]) => ({
        name,
        path: slot.path,
        optional: true
    }))
];

// Store loaded textures
const TEXTURES = {};
let bombAnimationFrames = [];
const THEME = {
    appBgCss: '#FFE39A',
    appBg: 0xFFD77A,
    preloaderBg: '#FFE39A',
    preloaderTrack: '#FFE7B8',
    preloaderFill: '#F29B38',
    fieldBg: 0xFFF7E8,
    cardBg: 0xFFF3D9,
    headerBg: 0xFFE7B8,
    textDark: 0x6B3E1F,
    border: 0xF29B38,
    borderDark: 0x9A5422,
    shadow: 0xD98B32,
    success: 0x6ED36E,
    fail: 0xFF7A7A,
    pause: 0x7C6CF2,
    primary: 0xFFB84D,
    secondary: 0xFFE8C2,
    levelDoneGlow: 0xDFF4D0,
    star: 0xFFD93D,
    white: 0xFFFFFF,
    overlay: 0x000000
};

function isMobileDevice() {
    return isMobileDeviceUI(MOBILE_MAX_VIEWPORT);
}

function getViewportMode() {
    return getViewportModeUI({
        maxViewport: MOBILE_MAX_VIEWPORT,
        minLandscapeRatio: MOBILE_LANDSCAPE_MIN_RATIO
    });
}

function getUsedLevelColors(level = levelData) {
    return getUsedLevelColorsUI(level, COLOR_BUTTON_SLOTS);
}

function createRoundedPanel(width, height, radius, fill = THEME.cardBg, borderColor = THEME.border, borderWidth = 4) {
    return createRoundedPanelUI({ width, height, radius, fill, borderColor, borderWidth, theme: THEME });
}

function createLabelSprite(textureName, maxWidth, maxHeight) {
    return createLabelSpriteUI({ textureName, maxWidth, maxHeight, textures: TEXTURES });
}

function createUIAssetSprite(slotName, maxWidth, maxHeight, options = {}) {
    const texture = TEXTURES[slotName];
    if (!texture) return null;

    const sprite = new PIXI.Sprite(texture);
    const {
        anchorX = 0,
        anchorY = 0,
        contain = true,
        fit = contain ? 'contain' : 'stretch'
    } = options;
    sprite.anchor.set(anchorX, anchorY);

    if (fit === 'cover') {
        const scale = Math.max(maxWidth / texture.width, maxHeight / texture.height);
        sprite.scale.set(scale);
    } else if (fit === 'contain') {
        const scale = Math.min(maxWidth / texture.width, maxHeight / texture.height);
        sprite.scale.set(scale);
    } else {
        sprite.width = maxWidth;
        sprite.height = maxHeight;
    }

    return sprite;
}

function createCoverBackground(slotName, width, height, fallbackColor) {
    const container = new PIXI.Container();
    const bg = new PIXI.Graphics();
    bg.beginFill(fallbackColor);
    bg.drawRect(0, 0, width, height);
    bg.endFill();
    container.addChild(bg);

    const sprite = createUIAssetSprite(slotName, width, height, {
        fit: 'cover',
        anchorX: 0.5,
        anchorY: 0.5
    });

    if (sprite) {
        sprite.x = width / 2;
        sprite.y = height / 2;
        container.addChild(sprite);
    }

    return container;
}

function pauseGameplayForOverlay() {
    if (orientationPauseActive || isPaused || introActive || levelEnded) return;
    levelCountdownLastAt = null;
    orientationPauseActive = true;
    pauseLevelMusic();
    freezeActiveObjects();
}

function resumeGameplayFromOverlay() {
    if (!orientationPauseActive || isPaused || introActive || levelEnded) return;
    orientationPauseActive = false;
    resumeGame();
    ensureSpawnTimerAfterUiChange();
}

function updateMobilePortraitOverlay() {
    const isGameScreen = app?.stage?.children?.includes(gameContainer);
    const shouldShow = isGameScreen && getViewportMode() === 'mobile-portrait';
    syncMobilePortraitOverlay({
        overlayId: MOBILE_OVERLAY_ID,
        shouldShow,
        message: 'Поверни телефон горизонтально, чтобы играть',
        setGameVisible: (visible) => {
            if (isGameScreen) rootUI.visible = visible;
        },
        onPause: pauseGameplayForOverlay,
        onResume: resumeGameplayFromOverlay
    });
}

const loadingScreen = window.gamePreloader;

// Create PIXI Application
const app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: THEME.appBg,
    resolution: Math.min(window.devicePixelRatio || 1, isMobileDeviceUI(MOBILE_MAX_VIEWPORT) ? 2 : Infinity),
    autoDensity: true,
    roundPixels: true
});

// Add app view to DOM
document.body.appendChild(app.view);
const adaptiveBackground = createAdaptiveBackground(app);
const syncBackground = () => { adaptiveBackground.layer.visible = gameContainer.parent === app.stage; };
gameContainer.on('added', syncBackground);
gameContainer.on('removed', syncBackground);
document.body.style.backgroundColor = THEME.appBgCss;
document.body.style.overscrollBehavior = 'none';
document.body.style.touchAction = 'none';
app.view.style.touchAction = 'none';
app.view.style.webkitTouchCallout = 'none';
initYandexSDK();

// === Backend init (Firebase) ===
initBackend()
  .then(async () => {
      const revision = dishSelectionRevision;
      const remote = await loadDishPreference().catch(() => null);
      if (!FOOD_TEST_MODE && revision === dishSelectionRevision) {
          selectedDishId = normalizeDish(localStorage.getItem('selectedDishId') || remote, getCompletedLevels());
          localStorage.setItem('selectedDishId', selectedDishId);
          await saveDishPreference(selectedDishId).catch(() => {});
          updateHomeDish(); dishSelectScene?.refresh();
      }
      return trackEvent('app_open', { ua: navigator.userAgent });
  })
  .catch((e) => console.warn('Backend init failed', e));

// Load sprites
const loader = PIXI.Loader.shared;
SPRITE_PATHS.forEach(({ name, path }) => {
    loader.add(name, path);
});

const audioNames = Object.keys(AUDIO_PATHS);
let loadedAudioCount = 0;
let preparedTextureProgress = 0;
function updatePreloadProgress() {
    const loadedSprites = SPRITE_PATHS.length * loader.progress / 100;
    // Reserve the final 20% for GPU preparation, not just network downloads.
    const progress = Math.floor(80 * (loadedSprites + loadedAudioCount) / (SPRITE_PATHS.length + audioNames.length)
        + 20 * preparedTextureProgress);
    loadingScreen.update(Math.min(progress / 100, 0.99));
}

async function prepareLoadedTextures() {
    const baseTextures = [...new Set(Object.values(TEXTURES).map(texture => texture.baseTexture))];
    const prepare = app.renderer.plugins.prepare;
    for (let index = 0; index < baseTextures.length; index += 1) {
        // Pixi's prepare queue uploads outside gameplay, yielding between textures.
        await new Promise(resolve => prepare.upload(baseTextures[index], resolve));
        preparedTextureProgress = (index + 1) / baseTextures.length;
        updatePreloadProgress();
    }
    preparedTextureProgress = 1;
    updatePreloadProgress();
}

const audioReady = Promise.all(audioNames.map((name) => preloadAudio(name).then(() => {
    loadedAudioCount += 1;
    updatePreloadProgress();
})));

let requiredResourceFailed = false;
const onLoadProgress = () => updatePreloadProgress();
const onLoadError = (error, loader, resource) => {
    if (SPRITE_PATHS.some(asset => asset.optional && asset.name === resource?.name)) {
        console.warn('Optional UI asset unavailable:', resource?.url);
        return;
    }
    console.error('Required sprite unavailable:', resource?.url, error);
    if (!requiredResourceFailed) {
        loadingScreen.error(`Не удалось загрузить файл: ${resource?.url || resource?.name || 'неизвестный ресурс'}. Проверьте путь к файлу и нажмите «Повторить».`);
    }
    requiredResourceFailed = true;
};
const progressBinding = loader.onProgress.add(onLoadProgress);
const errorBinding = loader.onError.add(onLoadError);

// Bootstrap artwork first; artwork failures keep the CSS fallback available.
loadingScreen.ready.then(() => loader.load(async () => {
    try {
        if (requiredResourceFailed) return;
        await headingFontReady;
        for (const { name, path, optional, dataResource } of SPRITE_PATHS) {
            if (dataResource) {
                if (!loader.resources[name]?.data) throw new Error(`Missing data: ${name}`);
                continue;
            }
            let texture = loader.resources[name]?.texture;
            if (texture && path.endsWith('.svg')) {
                const source = loader.resources[name].data;
                const canvas = document.createElement('canvas');
                canvas.width = source.naturalWidth * 2;
                canvas.height = source.naturalHeight * 2;
                canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
                texture = new PIXI.Texture(new PIXI.BaseTexture(canvas, { resolution: 2 }));
            }
            if (texture) TEXTURES[name] = texture;
            else if (!optional) throw new Error(`Missing texture: ${name}`);
        }
        bombAnimationFrames = Array.from({ length: 17 }, (_, index) => new PIXI.Texture(
            TEXTURES.bomb_animation.baseTexture, new PIXI.Rectangle(index * 142, 0, 142, 200)
        ));
        adaptiveBackground.setTexture(TEXTURES.gameplay_tablecloth);
        await Promise.all([audioReady, prepareLoadedTextures()]);
        showProgressScreen();
        resizeGame();
        if (DEBUG_LEVEL_SELECT) {
            installDebugLevelButton();
            openDebugLevelSelect();
        }
        app.renderer.render(app.stage);
        loadingScreen.finish();
    } catch (error) {
        console.error('Game startup failed:', error);
        loadingScreen.error();
    } finally {
        progressBinding.detach();
        errorBinding.detach();
    }
}));
// Color definitions and key mappings


// Color names match the artwork; keyboard positions remain fixed.
const COLOR_BUTTON_SLOTS = GAMEPLAY_STYLE.tools;


let dynamicColorKeyMap = {};

// Support both English and Russian keyboard layouts for the same fixed slots.
const KEY_LAYOUT_MAP = {
    'q': 'q',
    'w': 'w',
    'e': 'e',
    'r': 'r',
    '\u0439': 'q',
    '\u0446': 'w',
    '\u0443': 'e',
    '\u043a': 'r',
};

// Add helper function for button state updates
function updateButtonState(color, isActive) { colorButtonsMap[color]?.setHeld?.(isActive); }

function syncChameleonFieldOverlay() { updateUI(); }

function syncFrozenTimerBorder() { updateUI(); }

function finishFrozenEffect() { frozenEffectStartedAt = 0; frozenEffectEndsAt = 0; setFrozenMusicEffect(false); }

function activateFrozenEffect() {
    frozenEffectStartedAt = gameTimeMs;
    frozenEffectEndsAt = gameTimeMs + FROZEN_EFFECT_DURATION_MS;
    setFrozenMusicEffect(true);
    updateUI();
}

function finishChameleonEffect() { chameleonEffectStartedAt = 0; chameleonEffectEndsAt = 0; stopChameleonMusicEffect(); }

function activateChameleonEffect() {
    chameleonEffectStartedAt = gameTimeMs;
    chameleonEffectEndsAt = gameTimeMs + CHAMELEON_EFFECT_DURATION_MS;
    startChameleonMusicEffect();
    clearActiveColor();
}

function freezeActiveObjects() {
    clearActiveColor();
    activeObjects.forEach(obj => { obj.animations.forEach(a => a.pause()); obj.interactive = false; });
}
        
        // Remove all active objects silently (no life penalties, no score changes)
        function removeAllActiveObjectsSilent() { removeAllActiveObjectsImmediate(); }

        // Мгновенное удаление всех активных объектов (без анимаций) - для перехода между уровнями
        function removeAllActiveObjectsImmediate() {
    for (const obj of [...activeObjects]) resolveFoodBug(obj, false);
    activeObjects = [];
}

// Update keyboard handlers to support both layouts
function clearActiveColor() {
    activeKeyboardColor = null;
    activePointerColors.clear();
    syncAllColorButtonStates();
}

function getCenteredPopupBounds({
    widthRatio = 0.8,
    maxWidth = 480,
    heightRatio = 0.72,
    maxHeight = 420,
    minHeight = 240
} = {}) {
    // Stable design dimensions: resize the whole card, not individual text/buttons.
    const width = Math.min(maxWidth, POPUP_REFERENCE.width * widthRatio);
    const height = Math.min(maxHeight, Math.max(minHeight, POPUP_REFERENCE.height * heightRatio));
    return { width, height };
}

function getVerticalStackLayout({
    popupHeight,
    topY,
    itemCount,
    bottomPadding,
    preferredHeight,
    preferredGap,
    minHeight = 42,
    minGap = 8
} = {}) {
    const available = Math.max(0, popupHeight - topY - bottomPadding);
    const rawHeight = itemCount > 0
        ? Math.floor((available - minGap * Math.max(0, itemCount - 1)) / itemCount)
        : preferredHeight;
    const itemHeight = Math.max(minHeight, Math.min(preferredHeight, rawHeight));
    const gap = itemCount > 1
        ? Math.max(minGap, Math.min(preferredGap, Math.floor((available - itemHeight * itemCount) / (itemCount - 1))))
        : 0;
    const totalHeight = itemHeight * itemCount + gap * Math.max(0, itemCount - 1);
    const startY = topY + Math.max(0, Math.floor((available - totalHeight) / 2)) + itemHeight / 2;

    return { itemHeight, gap, startY };
}

window.addEventListener('keydown', (e) => {
    if (isPaused || introActive || levelEnded || orientationPauseActive || !app.stage.children.includes(gameContainer)) return;
    
    const key = e.key.toLowerCase();
    // Convert Russian key to English if needed
    const englishKey = KEY_LAYOUT_MAP[key] || key;
    const color = dynamicColorKeyMap[englishKey];
    
    if (color && activeKeyboardColor !== color) {
        activeKeyboardColor = color;
        colorPressStart = Date.now();
        syncAllColorButtonStates();
    }
});

window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    // Convert Russian key to English if needed
    const englishKey = KEY_LAYOUT_MAP[key] || key;
    const color = dynamicColorKeyMap[englishKey];
    
    if (color && activeKeyboardColor === color) {
        activeKeyboardColor = null;
        syncAllColorButtonStates();
    }
});

window.addEventListener('touchcancel', clearActiveColor);
window.addEventListener('blur', clearActiveColor);
document.addEventListener('visibilitychange', () => {
    levelCountdownLastAt = null;
    if (document.hidden) {
        if (levelCountdownTicker && !isPaused && !introActive && !orientationPauseActive && !levelEnded) showPausePopup();
        clearActiveColor();
        pauseLevelMusic();
        pauseMenuMusic();
    } else if (levelData && !levelEnded && !isPaused && !orientationPauseActive) {
        startLevelMusic();
    } else {
        startMenuMusic();
    }
});

// ==== Стартовый экран ====

function removeProgressScreenFromStage() {
    if (progressContainer && app.stage.children.includes(progressContainer)) {
        app.stage.removeChild(progressContainer);
    }
}

function getNextPlayableLevelIndex() {
    const completed = getCompletedLevels();
    return levels.findIndex((level, index) => !completed.includes(index));
}

function clearProgressPopup() {
    const popup = progressContainer?.getChildByName('allLevelsCompletedPopup');
    if (popup) {
        progressContainer.removeChild(popup);
        popup.destroy({ children: true });
    }

    const overlay = progressContainer?.getChildByName('allLevelsCompletedOverlay');
    if (overlay) {
        progressContainer.removeChild(overlay);
        overlay.destroy();
    }
}

function showAllLevelsCompletedPopup() {
    if (!progressContainer) return;
    clearProgressPopup();

    const overlay = new PIXI.Graphics();
    overlay.name = 'allLevelsCompletedOverlay';
    overlay.beginFill(THEME.overlay, 0.24);
    overlay.drawRect(0, 0, app.screen.width, app.screen.height);
    overlay.endFill();
    overlay.interactive = true;
    progressContainer.addChild(overlay);

    const popupWidth = Math.max(300, Math.min(460, app.screen.width * 0.52));
    const popupHeight = Math.max(150, Math.min(220, app.screen.height * 0.42));
    const popup = new PIXI.Container();
    popup.name = 'allLevelsCompletedPopup';
    popup.x = (app.screen.width - popupWidth) / 2;
    popup.y = (app.screen.height - popupHeight) / 2;

    const bg = new PIXI.Graphics();
    bg.beginFill(THEME.cardBg, 0.98);
    bg.lineStyle(5, THEME.borderDark, 1);
    bg.drawRoundedRect(0, 0, popupWidth, popupHeight, 28);
    bg.endFill();
    popup.addChild(bg);

    const title = new PIXI.Text('ВСЕ УРОВНИ\nПРОЙДЕНЫ!', {
        fontSize: Math.max(28, Math.min(42, popupWidth * 0.09)),
        fill: THEME.textDark,
        fontWeight: '900',
        fontFamily: HEADING_FONT,
        align: 'center'
    });
    title.anchor.set(0.5);
    title.x = popupWidth / 2;
    title.y = popupHeight * 0.42;
    popup.addChild(title);

    const ok = createButton(popupWidth * 0.55, Math.max(44, popupHeight * 0.24), 'OK', clearProgressPopup, 'secondary', Math.max(20, popupHeight * 0.12));
    ok.x = popupWidth / 2;
    ok.y = popupHeight * 0.78;
    popup.addChild(ok);

    progressContainer.addChild(popup);
}

function continueGameFromProgress() {
    const nextLevelIndex = getNextPlayableLevelIndex();
    if (nextLevelIndex < 0) {
        showAllLevelsCompletedPopup();
        return;
    }

    startLevel(nextLevelIndex);
}

function showProgressScreen() {
    cancelCutscene();
    closeDishSelect();
    clearAllPopups();
    clearSessionCallbacks();
    removeAllActiveObjectsImmediate();
    clearSpawnResumeDelay();
    stopLevelCountdown();
    clearSpawnTimer();
    clearGameplayMusicEffects();
    startMenuMusic();
    cleanupLevelSelectScroll();
    finishFrozenEffect();
    finishChameleonEffect();
    isPaused = false;
    introActive = false;
    levelEnded = false;
    orientationPauseActive = false;
    clearActiveColor();
    objectQueue = [];

    if (app.stage.children.includes(levelSelectContainer)) {
        app.stage.removeChild(levelSelectContainer);
    }
    if (app.stage.children.includes(gameContainer)) {
        app.stage.removeChild(gameContainer);
    }
    gameContainer.removeChildren();

    clearProgressPopup();
    if (!progressContainer) {
        progressContainer = new PIXI.Container();
        progressContainer.name = 'homeScreen';
        progressContainer.addChild(createHomeScreen(TEXTURES, {
            onPlay: () => { playUiClick(); continueGameFromProgress(); },
            onSettings: () => showPausePopup(true),
            onDishes: () => { playUiClick(); showDishSelect(); }
        }));
    }
    app.renderer.backgroundColor = 0xE5E8E6;
    updateHomeDish();
    layoutHomeScreen(progressContainer.getChildByName('homeContainer'), menuViewport());
    if (!app.stage.children.includes(progressContainer)) {
        app.stage.addChild(progressContainer);
    }
    updateMobilePortraitOverlay();
}

function openDebugLevelSelect() {
    if (!DEBUG_LEVEL_SELECT) return;
    if (app.stage.children.includes(levelSelectContainer)) return;
    if (app.stage.children.includes(gameContainer)) {
        closeLevelAttempt('exit', 'debug_level_select');
    }
    const intro = gameContainer.getChildByName('introPopup');
    if (intro?._resizeHandler) window.removeEventListener('resize', intro._resizeHandler);
    showProgressScreen();
    showLevelSelect();
}

function installDebugLevelButton() {
    if (document.getElementById('debug-level-select')) return;
    const button = document.createElement('button');
    button.id = 'debug-level-select';
    button.type = 'button';
    button.textContent = 'Тест: выбор уровня';
    button.style.cssText = 'position:fixed;bottom:8px;left:50%;transform:translateX(-50%);z-index:10001;padding:8px 14px;border:2px solid #2D1738;border-radius:12px;background:#F7F7F3;color:#2D1738;font:600 14px Arial;cursor:pointer;';
    button.addEventListener('click', () => {
        openDebugLevelSelect();
        button.blur();
    });
    document.body.appendChild(button);
}

function showLevelSelect() {
    cancelCutscene();
    stopLevelCountdown();
    clearSpawnTimer();
    clearGameplayMusicEffects();
    startMenuMusic();
    finishFrozenEffect();
    isPaused = false;
    introActive = false;
    levelEnded = false;
    orientationPauseActive = false;
    clearActiveColor();
    objectQueue = [];

    removeProgressScreenFromStage();
    app.stage.addChild(levelSelectContainer);

    // Удаляем старый scrollContainer, если он есть
    if (levelSelectContainer.scrollContainer) {
        levelSelectContainer.removeChild(levelSelectContainer.scrollContainer);
        levelSelectContainer.scrollContainer = null;
    }

    cleanupLevelSelectScroll();

    levelSelectContainer.removeChildren();

    const screenW = app.screen.width;
    const screenH = app.screen.height;

    levelSelectContainer.addChild(createCoverBackground('bg_levels', screenW, screenH, 0xFFD984));

    const title = new PIXI.Text("ВЫБЕРИ УРОВЕНЬ", {
        fontSize: Math.max(38, Math.min(68, screenW * 0.085)),
        fill: THEME.textDark,
        fontWeight: '900',
        fontFamily: HEADING_FONT
    });
    title.anchor.set(0.5);
    title.x = screenW / 2;
    title.y = Math.max(42, screenH * 0.075);
    levelSelectContainer.addChild(title);

    const scrollTop = Math.round(title.y + title.height * 0.5 + Math.max(38, screenH * 0.055));
    const bottomPadding = Math.max(26, screenH * 0.035);
    const visibleHeight = Math.max(120, screenH - scrollTop - bottomPadding);

    const scrollContainer = new PIXI.Container();
    scrollContainer.y = scrollTop;
    levelSelectContainer.addChild(scrollContainer);
    levelSelectContainer.scrollContainer = scrollContainer;

    const cols = 4;
    const sidePadding = Math.max(28, screenW * 0.09);
    const maxGridWidth = Math.min(580, screenW - sidePadding * 2);
    const spacing = Math.max(18, Math.min(28, maxGridWidth * 0.045));
    const buttonSize = Math.max(72, Math.min(126, (maxGridWidth - spacing * (cols - 1)) / cols));
    const totalLevels = levels.length;
    const rows = Math.ceil(totalLevels / cols);
    const rowGap = spacing;
    const contentHeight = rows * buttonSize + Math.max(0, rows - 1) * rowGap;
    const offsetX = (screenW - (buttonSize * cols + spacing * (cols - 1))) / 2;

    const completed = getCompletedLevels();
    const TAP_THRESHOLD = 10;
    let startX = 0;
    let startY = 0;
    let dragging = false;
    let dragMoved = false;
    let hasScrolled = false;
    let startScrollY = 0;
    let lastY = 0;
    let lastTime = performance.now();
    let velocity = 0;

    const maxY = scrollTop;
    const minY = Math.min(maxY, scrollTop - Math.max(0, contentHeight - visibleHeight));

    const applyRubberBand = (value) => {
        if (value > maxY) return maxY + (value - maxY) * 0.34;
        if (value < minY) return minY + (value - minY) * 0.34;
        return value;
    };

    const clampToBounds = (value) => Math.max(minY, Math.min(maxY, value));

    const stopScrollAnimation = () => {
        if (levelSelectContainer.scrollAnimationFrame) {
            cancelAnimationFrame(levelSelectContainer.scrollAnimationFrame);
            levelSelectContainer.scrollAnimationFrame = null;
        }
        gsap.killTweensOf(scrollContainer);
    };

    const settleScroll = () => {
        const boundedY = clampToBounds(scrollContainer.y);
        if (Math.abs(scrollContainer.y - boundedY) > 0.5) {
            gsap.to(scrollContainer, {
                y: boundedY,
                duration: 0.28,
                ease: "back.out(1.1)"
            });
        }
    };

    const startInertia = () => {
        stopScrollAnimation();

        const step = () => {
            scrollContainer.y = applyRubberBand(scrollContainer.y + velocity);

            if (scrollContainer.y > maxY || scrollContainer.y < minY) {
                velocity *= 0.72;
            } else {
                velocity *= 0.93;
            }

            if (Math.abs(velocity) < 0.18) {
                levelSelectContainer.scrollAnimationFrame = null;
                settleScroll();
                return;
            }

            levelSelectContainer.scrollAnimationFrame = requestAnimationFrame(step);
        };

        if (Math.abs(velocity) > 0.18) {
            levelSelectContainer.scrollAnimationFrame = requestAnimationFrame(step);
        } else {
            settleScroll();
        }
    };

    for (let i = 0; i < totalLevels; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const isCompleted = completed.includes(i);
        const x = offsetX + col * (buttonSize + spacing);
        const y = row * (buttonSize + rowGap);

        const button = new PIXI.Container();
        button.x = x;
        button.y = y;
        button.interactive = true;
        button.buttonMode = true;
        button.hitArea = new PIXI.Rectangle(0, 0, buttonSize, buttonSize);

        const shadow = new PIXI.Graphics();
        shadow.beginFill(0xB96D23, 0.16);
        shadow.drawRoundedRect(3, 5, buttonSize, buttonSize, Math.max(14, buttonSize * 0.18));
        shadow.endFill();

        const customTile = createUIAssetSprite(
            isCompleted ? 'level_tile_completed' : 'level_tile_locked',
            buttonSize,
            buttonSize,
            { contain: false }
        );

        if (customTile) {
            button.addChild(shadow, customTile);
        } else {
            const tile = new PIXI.Graphics();
            tile.beginFill(isCompleted ? 0xDFE8B3 : 0xFFE6BE);
            tile.drawRoundedRect(0, 0, buttonSize, buttonSize, Math.max(16, buttonSize * 0.17));
            tile.endFill();
            tile.lineStyle(Math.max(3, buttonSize * 0.034), isCompleted ? 0x74C966 : 0xE39A42, 1);
            tile.drawRoundedRect(1, 1, buttonSize - 2, buttonSize - 2, Math.max(16, buttonSize * 0.17));

            const inner = new PIXI.Graphics();
            inner.lineStyle(2, 0xFFF4CE, 0.6);
            inner.drawRoundedRect(5, 5, buttonSize - 10, buttonSize - 10, Math.max(12, buttonSize * 0.13));

            button.addChild(shadow, tile, inner);
        }

        button.on('pointerdown', () => {
            gsap.to(button.scale, { x: 0.97, y: 0.97, duration: 0.08 });
        });
        button.on('pointerup', (e) => {
            gsap.to(button.scale, { x: 1, y: 1, duration: 0.12, ease: "back.out(1.7)" });
            const dx = e.data.global.x - startX;
            const dy = e.data.global.y - startY;
            const moved = Math.sqrt(dx * dx + dy * dy);

            if (!hasScrolled && !dragMoved && moved <= TAP_THRESHOLD && !levelSelectContainer.getChildByName('levelEntryPopup')) {
                playUiClick();
                showLevelEntryPopup(i);
            }
        });
        button.on('pointerupoutside', () => {
            gsap.to(button.scale, { x: 1, y: 1, duration: 0.12 });
        });

        const label = new PIXI.Text("" + (i + 1), {
            fontSize: Math.max(30, buttonSize * 0.36),
            fill: THEME.textDark,
            fontWeight: '900',
            fontFamily: 'Arial'
        });
        label.anchor.set(0.5);
        label.x = buttonSize / 2;
        label.y = buttonSize / 2;

        button.addChild(label);
        scrollContainer.addChild(button);

        if (isCompleted) {
            const star = new PIXI.Text('★', {
                fontSize: Math.max(28, buttonSize * 0.28),
                fill: THEME.star,
                fontWeight: '900',
                fontFamily: 'Arial'
            });
            star.anchor.set(0, 0.5);
            star.x = button.x + buttonSize - buttonSize * 0.18;
            star.y = button.y + buttonSize / 2;
            scrollContainer.addChild(star);
        }
    }

    const mask = new PIXI.Graphics();
    mask.beginFill(0xffffff);
    mask.drawRect(0, 0, screenW, visibleHeight);
    mask.endFill();
    mask.y = scrollTop;
    mask.renderable = false;
    scrollContainer.mask = mask;
    levelSelectContainer.addChild(mask);

    scrollContainer.interactive = true;
    scrollContainer.hitArea = new PIXI.Rectangle(0, 0, screenW, Math.max(contentHeight, visibleHeight));
    scrollContainer.on('pointerdown', (e) => {
        stopScrollAnimation();
        dragging = true;
        dragMoved = false;
        hasScrolled = false;
        startX = e.data.global.x;
        startY = e.data.global.y;
        startScrollY = scrollContainer.y;
        lastY = e.data.global.y;
        lastTime = performance.now();
        velocity = 0;
    });

    const releaseScroll = () => {
        if (!dragging) return;
        dragging = false;
        startInertia();
    };

    scrollContainer.on('pointerup', releaseScroll);
    scrollContainer.on('pointerupoutside', releaseScroll);
    scrollContainer.on('pointercancel', releaseScroll);

    scrollContainer.on('pointermove', (e) => {
        if (!dragging) return;
        
        const currentTime = performance.now();
        const deltaTime = currentTime - lastTime;
        const currentX = e.data.global.x;
        const currentY = e.data.global.y;
        const dx = currentX - startX;
        const dy = currentY - startY;

        if (Math.abs(dx) > TAP_THRESHOLD || Math.abs(dy) > TAP_THRESHOLD) {
            dragMoved = true;
            hasScrolled = true;
        }

        velocity = ((currentY - lastY) / Math.max(1, deltaTime)) * 16.67;
        scrollContainer.y = applyRubberBand(startScrollY + dy);
        
        lastY = currentY;
        lastTime = currentTime;
    });

    const wheelHandler = (e) => {
        e.preventDefault();
        stopScrollAnimation();
        const delta = e.deltaY || e.detail || e.wheelDelta;
        const targetY = clampToBounds(scrollContainer.y - delta * 0.55);

        gsap.to(scrollContainer, {
            y: targetY,
            duration: 0.18,
            ease: "power3.out",
            onComplete: settleScroll
        });
    };

    levelSelectContainer.wheelHandler = wheelHandler;
    document.addEventListener('wheel', wheelHandler, { passive: false });

    scrollContainer.y = scrollTop;
}

function cleanupLevelSelectScroll() {
    if (levelSelectContainer.wheelHandler) {
        document.removeEventListener('wheel', levelSelectContainer.wheelHandler);
        levelSelectContainer.wheelHandler = null;
    }

    if (levelSelectContainer.scrollAnimationFrame) {
        cancelAnimationFrame(levelSelectContainer.scrollAnimationFrame);
        levelSelectContainer.scrollAnimationFrame = null;
    }

    if (levelSelectContainer.scrollContainer) {
        gsap.killTweensOf(levelSelectContainer.scrollContainer);
    }
}

function closeLevelEntryPopup() {
    const popup = levelSelectContainer.getChildByName('levelEntryPopup');
    if (popup) {
        levelSelectContainer.removeChild(popup);
    }

    const overlay = levelSelectContainer.getChildByName('levelEntryOverlay');
    if (overlay) {
        levelSelectContainer.removeChild(overlay);
    }

    selectedLevelIndex = null;
}

function showLevelEntryPopup(levelIndex) {
    closeLevelEntryPopup();
    selectedLevelIndex = levelIndex;

    const overlay = new PIXI.Graphics();
    overlay.beginFill(THEME.overlay, 0.34);
    overlay.drawRect(0, 0, app.screen.width, app.screen.height);
    overlay.endFill();
    overlay.name = 'levelEntryOverlay';
    overlay.interactive = true;
    overlay.buttonMode = true;
    overlay.on('pointerdown', (event) => {
        event.stopPropagation();
    });
    overlay.on('pointerup', (event) => {
        event.stopPropagation();
        closeLevelEntryPopup();
    });
    levelSelectContainer.addChild(overlay);

    const popupBounds = getCenteredPopupBounds({
        widthRatio: 0.78,
        maxWidth: 420,
        heightRatio: 0.42,
        maxHeight: 300,
        minHeight: 220
    });
    const popupWidth = popupBounds.width;
    const popupHeight = popupBounds.height;
    const popup = new PIXI.Container();
    popup.name = 'levelEntryPopup';
    fitPopup(popup, app.screen, popupWidth, popupHeight);
    popup.interactive = true;
    popup.hitArea = new PIXI.Rectangle(0, 0, popupWidth, popupHeight);
    popup.on('pointerdown', (event) => event.stopPropagation());
    popup.on('pointerup', (event) => event.stopPropagation());
    popup.on('pointerupoutside', (event) => event.stopPropagation());

    popup.addChild(createGameFieldPopupPanel(popupWidth, popupHeight, 30, THEME.border));

    const iconSize = Math.max(52, Math.min(78, popupHeight * 0.24));
    const entryIcon = createUIAssetSprite('level_entry_icon', iconSize, iconSize, {
        anchorX: 0.5,
        anchorY: 0
    });
    const titleBaseY = entryIcon
        ? Math.max(14, Math.round(popupHeight * 0.06)) + iconSize + Math.max(8, Math.round(popupHeight * 0.025))
        : Math.max(18, Math.round(popupHeight * 0.11));

    if (entryIcon) {
        entryIcon.x = popupWidth / 2;
        entryIcon.y = Math.max(14, Math.round(popupHeight * 0.06));
        popup.addChild(entryIcon);
    }

    const title = new PIXI.Text(`Уровень ${levelIndex + 1}`, {
        fontSize: Math.max(22, Math.min(40, Math.round(Math.min(popupWidth * 0.088, popupHeight * 0.13)))),
        fill: THEME.textDark,
        fontWeight: 'bold',
        fontFamily: HEADING_FONT,
        align: 'center',
    });
    title.anchor.set(0.5, 0);
    title.x = popupWidth / 2;
    title.y = titleBaseY;
    popup.addChild(title);

    const subtitle = new PIXI.Text('Готов начать уровень?', {
        fontSize: Math.max(16, Math.min(26, Math.round(Math.min(popupWidth * 0.055, popupHeight * 0.095)))),
        fill: THEME.textDark,
        fontFamily: 'Arial',
        align: 'center',
    });
    subtitle.anchor.set(0.5, 0);
    subtitle.x = popupWidth / 2;
    subtitle.y = title.y + title.height + Math.max(10, Math.round(popupHeight * 0.05));
    popup.addChild(subtitle);

    const btnWidth = Math.min(260, popupWidth * 0.68);
    const buttonLayout = getVerticalStackLayout({
        popupHeight,
        topY: subtitle.y + subtitle.height + Math.max(14, Math.round(popupHeight * 0.07)),
        itemCount: 2,
        bottomPadding: Math.max(18, Math.round(popupHeight * 0.08)),
        preferredHeight: 58,
        preferredGap: 18,
        minHeight: 44,
        minGap: 10
    });
    const btnHeight = buttonLayout.itemHeight;
    const btnFontSize = Math.max(22, Math.min(30, Math.round(btnHeight * 0.42)));

    const playBtn = createButton(btnWidth, btnHeight, 'ИГРАТЬ', () => {
        const index = selectedLevelIndex;
        closeLevelEntryPopup();
        if (index !== null) {
            startLevel(index);
        }
    }, 'primary', btnFontSize);
    playBtn.x = popupWidth / 2;
    playBtn.y = buttonLayout.startY;
    popup.addChild(playBtn);

    const backBtn = createButton(btnWidth, btnHeight, 'НАЗАД', () => {
        closeLevelEntryPopup();
    }, 'secondary', btnFontSize);
    backBtn.x = popupWidth / 2;
    backBtn.y = buttonLayout.startY + btnHeight + buttonLayout.gap;
    popup.addChild(backBtn);

    levelSelectContainer.addChild(popup);
}

// запускаем уровень
function startLevel(index) {
    cancelCutscene();
    closeDishSelect();
    clearAllPopups();
    clearSessionCallbacks();
    stopLevelCountdown();
  // Очищаем предыдущий уровень: останавливаем интервалы и таймеры
  cleanupLevelSelectScroll();
  clearSpawnTimer();
  clearSpawnResumeDelay();
  stopLevelMusic();
  stopMenuMusic();
  clearGameplayMusicEffects();
  finishFrozenEffect();
  finishChameleonEffect();
  isPaused = false;
  introActive = false;
  levelEnded = false;
  orientationPauseActive = false;
  clearActiveColor();
  objectQueue = [];
  rootUI.visible = true;
  
  // Мгновенно удаляем все активные объекты предыдущего уровня
  if (activeObjects.length > 0) {
    removeAllActiveObjectsImmediate();
  }
  
  if (app.stage.children.includes(levelSelectContainer)) {
    app.stage.removeChild(levelSelectContainer);
  }
  removeProgressScreenFromStage();
  app.stage.addChild(gameContainer);
  gameContainer.addChild(rootUI);
  const food = normalizeDish(selectedDishId, getCompletedLevels());
  if (food !== selectedDishId) selectDish(food);
  // Snapshot the selected food for this run; never mutate the level catalog.
  levelData = { ...levels[index], food };

  maxSimultaneousObjects = getFoodBugLimit(levelData);

  score = 0;
  life = getFoodMaxLives(levelData);
  gameTimeMs = 0;
  spawnSides = [];
  levelTimeRemainingMs = levelDurationMs(levelData);

  const { fieldWrapper, playField } = setupPlayArea();
  playArea = playField;
  syncChameleonFieldOverlay();
  syncFrozenTimerBorder();
  updateMobilePortraitOverlay();

    // реальный старт спавна
  let started = false;
  const generation = cutsceneGeneration;
  const startSpawning = () => {
    if(started || generation!==cutsceneGeneration)return;
    started=true;
    startLevelCountdown();
    beginLevelAttempt();
    startLevelMusic();
    prepareObjectQueue();
    scheduleNextSpawn(0);
    if (typeof levelData.onEnterLevel === 'function') levelData.onEnterLevel();
  };

  // если в конфиге уровня есть интро-попап — сначала показываем его, спавн не запускаем
  runCutscenes('beforeLevel', null, () => {
  if (levelData.introPopup) {
    introActive = true; // ⬅ блокируем спавн
    showIntroPopup(levelData.introPopup, startSpawning);
  } else {
    startSpawning();
  }
  });

}

// игровое поле
function setupPlayArea() {
    for (const child of rootUI.removeChildren()) child.destroy({ children: true });
    const enabledColors = getUsedLevelColors();
    currentGameUI = buildGameplayScene(TEXTURES, {
        enabledColors,
        levelNumber: levelData.id,
        showKeyboardHints: getViewportMode() === 'desktop',
        foodDefinition: getFoodDefinition(levelData),
        onHold: (color, event) => {
            if (isPaused || introActive || orientationPauseActive || levelEnded) return;
            playUiClick();
            activePointerColors.set(getPointerColorKey(getPointerId(event)), color);
            syncAllColorButtonStates();
        },
        onRelease: (color, event) => {
            const key = getPointerColorKey(getPointerId(event));
            if (activePointerColors.get(key) === color) activePointerColors.delete(key);
            syncAllColorButtonStates();
        },
        onSettings: () => showPausePopup()
    });
    rootUI.addChild(currentGameUI.scene);
    colorButtonsMap = currentGameUI.buttons;
    dynamicColorKeyMap = Object.fromEntries(GAMEPLAY_STYLE.tools.filter(t => enabledColors.includes(t.color)).map(t => [t.key, t.color]));
    fitGameplayScene(currentGameUI.scene, safeViewport(app.screen));
    app.renderer.backgroundColor = 0x79A6AA;
    updateUI();
    return { fieldWrapper: currentGameUI.scene, playField: currentGameUI.field };
}

function createCandyPanel(width, height, radius, options = {}) {
    const {
        fill = 0xFFD56E,
        innerFill = 0xFFE7A7,
        border = 0xE89132,
        darkBorder = 0xB86720,
        shadow = 0xA95E1E,
        borderWidth = 5,
        inset = 10
    } = options;
    const panel = new PIXI.Container();

    const drop = new PIXI.Graphics();
    drop.beginFill(shadow, 0.18);
    drop.drawRoundedRect(4, 6, width, height, radius);
    drop.endFill();

    const base = new PIXI.Graphics();
    base.beginFill(fill);
    base.drawRoundedRect(0, 0, width, height, radius);
    base.endFill();
    base.lineStyle(borderWidth + 2, darkBorder, 0.35);
    base.drawRoundedRect(0, 0, width, height, radius);

    const shine = new PIXI.Graphics();
    shine.beginFill(innerFill, 0.78);
    shine.drawRoundedRect(inset, inset * 0.8, width - inset * 2, Math.max(16, height * 0.46), Math.max(12, radius - inset));
    shine.endFill();

    const rim = new PIXI.Graphics();
    rim.lineStyle(borderWidth, border, 0.95);
    rim.drawRoundedRect(1, 1, width - 2, height - 2, radius);

    const innerRim = new PIXI.Graphics();
    innerRim.lineStyle(2, 0xFFF6D2, 0.82);
    innerRim.drawRoundedRect(inset, inset, width - inset * 2, height - inset * 2, Math.max(12, radius - inset));

    panel.addChild(drop, base, shine, rim, innerRim);
    return panel;
}

function drawGameFieldPopupPanel(bg, border, width, height, radius = 34, borderColor = THEME.border) {
    const inset = Math.max(12, Math.min(20, Math.min(width, height) * 0.045));
    const innerRadius = Math.max(14, radius - inset * 0.6);

    bg.clear();
    bg.beginFill(0xB86421, 0.18);
    bg.drawRoundedRect(5, 7, width, height, radius);
    bg.endFill();
    bg.beginFill(0xFFF2D2, 1);
    bg.drawRoundedRect(0, 0, width, height, radius);
    bg.endFill();
    bg.beginFill(0xFFF9EF, 0.98);
    bg.drawRoundedRect(inset, inset, width - inset * 2, height - inset * 2, innerRadius);
    bg.endFill();
    bg.lineStyle(2, 0xFFFFFF, 0.75);
    bg.drawRoundedRect(inset + 5, inset + 5, width - inset * 2 - 10, height - inset * 2 - 10, Math.max(10, innerRadius - 5));

    border.clear();
    border.lineStyle(Math.max(6, Math.min(9, Math.min(width, height) * 0.025)), 0xB86421, 0.45);
    border.drawRoundedRect(1, 1, width - 2, height - 2, radius);
    border.lineStyle(Math.max(4, Math.min(7, Math.min(width, height) * 0.018)), borderColor, 0.95);
    border.drawRoundedRect(inset, inset, width - inset * 2, height - inset * 2, innerRadius);
}

function createGameFieldPopupPanel(width, height, radius = 34, borderColor = THEME.border) {
    const panel = new PIXI.Container();
    const bg = new PIXI.Graphics();
    const border = new PIXI.Graphics();
    drawGameFieldPopupPanel(bg, border, width, height, radius, borderColor);
    panel.addChild(bg, border);
    return panel;
}

// Функция для взвешенного случайного выбора


// очередь объектов
function prepareObjectQueue() {
    objectQueue = [];
    for (let i = 0; i < 64; i++) {
        const type = weightedType(levelData.params.spawnWeights);
        if (!type) break;
        const balance = getRuntimeBugBalance(type);
        objectQueue.push({ type, ...balance });
    }
}


// Проверка, что объект полностью в пределах поля


// Add this function before spawnObject
function animateBugShake(obj) {
    const body = obj.body;
    obj.animations.forEach(a => a.kill());
    body.rotation = 0;
    body.scale.set(1);
    obj.animations = [gsap.timeline().to(body, { rotation: 0.18, duration: 0.05, repeat: 3, yoyo: true }).to(body, { rotation: 0, duration: 0.05 })];
}

// Add this function before spawnObject
function animateFatBugSquish(obj) {
    obj.animations.forEach(a => a.kill());
    obj.body.rotation = 0;
    obj.body.scale.set(1);
    obj.animations = [gsap.timeline().to(obj.body.scale, { x: 0.9, y: 1.1, duration: 0.08 }).to(obj.body.scale, { x: 1, y: 1, duration: 0.12 })];
}

function addClicksCounter(container, clicks, {
    fontSize = 28,
    fontFamily = 'Arial',
    strokeThickness = 4
} = {}) {
    const countText = new PIXI.Text(clicks, {
        fontSize,
        fill: 0xFFFFFF,
        fontWeight: 'bold',
        fontFamily,
        stroke: 0x000000,
        strokeThickness
    });
    countText.anchor.set(0.5);
    countText.name = 'clickText';
    container.addChild(countText);
    return countText;
}

function removeClicksCounter(container) {
    const text = container.getChildByName('clickText');
    if (!text) return;

    container.removeChild(text);
    text.destroy();
}

// --- Safe bounds helpers ---
// Возвращает безопасные границы спавна с учётом рамки и небольшого запаса под анимации
// Возвращает итоговый «след» объекта (размер коллизии) на этапе спавна.
// Важно: здесь учитываем реальные габариты визуала (fat = x2, fatColored = x2, остальные = x1).

// Подтягивает объект внутрь безопасной зоны (при ресайзе/перестроении UI)

// генерация объекта
// Integrated into game.js; movement and simulation use logical scene coordinates.
function spawnObject() {
    if (isPaused || introActive || orientationPauseActive || levelEnded || document.hidden) return;
    if (activeObjects.filter(obj => obj.state !== 'resolved').length >= getFoodBugLimit(levelData)) {
        scheduleNextSpawn(FOOD_RULES.retrySpawnMs);
        return;
    }
    if (!objectQueue.length) prepareObjectQueue();
    const data = objectQueue[0];
    if (!data) return;
    const fat = data.type === 'fat' || data.type.startsWith('fatColoredBug_');
    const size = FOOD_RULES.bugSize * (fat ? FOOD_RULES.fatSizeMultiplier : 1);
    const radius = size / 2;
    const rect = GAMEPLAY_STYLE.playRect;
    const allowed = side => !(data.spawnZone === 'left' && side === 'right') && !(data.spawnZone === 'right' && side === 'left');
    if (!spawnSides.some(allowed)) spawnSides = shuffledSides();
    const sideIndex = spawnSides.findIndex(allowed);
    const side = spawnSides[sideIndex];
    const food = {
        x: GAMEPLAY_STYLE.food.x + GAMEPLAY_STYLE.food.size / 2 - rect.x,
        y: GAMEPLAY_STYLE.food.y + GAMEPLAY_STYLE.food.size / 2 - rect.y,
        radius: GAMEPLAY_STYLE.food.size / 2
    };
    const position = chooseEntry(rect, side, radius, activeObjects, Math.random, data.spawnZone, data.type === 'bomb' ? food : null);
    if (!position) { scheduleNextSpawn(FOOD_RULES.retrySpawnMs); return; }
    spawnSides.splice(sideIndex, 1);
    objectQueue.shift();
    food.radius = GAMEPLAY_STYLE.food.radius;
    const container = new PIXI.Container();
    Object.assign(container, data.type === 'bomb'
        ? createCrossing(position, rect, side, radius, data.lifetime)
        : createApproach(position, food, radius, data.lifetime, getFoodDefinition(levelData).effects.foodWaitSeconds * 1000));
    container.type = data.type;
    container.data = data;
    container.scoreValue = data.scoreValue;
    container.interactive = container.buttonMode = true;
    container.hitArea = new PIXI.Circle(0, 0, size * FOOD_RULES.tapRadiusMultiplier * (data.type === 'bomb' ? 1 : FOOD_RULES.regularTapScale));
    container.animations = [];
    // Separate screen-vertical hops from heading, hit effects and the clickable root.
    const hop = new PIXI.Container();
    container.hop = hop;
    container.hopPeriodMs = fat ? FOOD_RULES.fatHopPeriodMs : FOOD_RULES.hopPeriodMs;
    container.hopElapsedMs = Math.random() * container.hopPeriodMs;
    container.addChild(hop);
    const heading = new PIXI.Container();
    heading.rotation = container.angle - FOOD_RULES.textureForwardAngle;
    hop.addChild(heading);
    const body = new PIXI.Container();
    body.name = 'bugBody';
    heading.addChild(body);
    container.body = body;
    const highlight = new PIXI.Graphics();
    highlight.name = 'heldToolHighlight';
    const tool = GAMEPLAY_STYLE.tools.find(t => data.type.endsWith('_' + t.color));
    if (tool) {
        highlight.beginFill(tool.fill, 0.22).drawCircle(0, 0, radius * 0.9).endFill();
        highlight.lineStyle(4, tool.fill, 0.95).drawCircle(0, 0, radius * 0.9);
    }
    highlight.visible = false;
    container.highlight = highlight;
    container.addChildAt(highlight, 0);
    const visual = new PIXI.Sprite(getTextureForType(data.type));
    visual.anchor.set(0.5);
    visual.scale.set(size / Math.max(visual.texture.width, visual.texture.height));
    body.addChild(visual);
    if (data.clicks > 1) addClicksCounter(container, data.clicks);
    container.on('pointerdown', () => hitFoodBug(container));
    playArea.addChild(container);
    activeObjects.push(container);
    updateBugHighlights();
    scheduleNextSpawn(data.spawnInterval);
}

function hitFoodBug(obj) {
    if (isPaused || introActive || orientationPauseActive || levelEnded || obj.state === 'resolved' || obj.bombTriggered || document.hidden) return;
    const type = obj.type;
    const colored = type.startsWith('coloredBug_') || type.startsWith('fatColoredBug_');
    const wrong = type !== 'bomb' && !isChameleonEffectActive() && (colored ? !isColorHeld(type.split('_')[1]) : hasAnyActiveColor());
    if (wrong) {
        playWrongBugClick();
        currentGameUI.feedback('wrong');
        animateBugShake(obj);
        return;
    }
    if (type === 'bomb') {
        playBombClick();
        const food = {
            x: GAMEPLAY_STYLE.food.x + GAMEPLAY_STYLE.food.size / 2 - GAMEPLAY_STYLE.playRect.x,
            y: GAMEPLAY_STYLE.food.y + GAMEPLAY_STYLE.food.size / 2 - GAMEPLAY_STYLE.playRect.y,
            radius: 0
        };
        const radius = obj.radius;
        Object.assign(obj, createApproach({ x: obj.x, y: obj.y }, food, 0, FOOD_RULES.bombFlightMs, 0));
        obj.radius = radius;
        obj.bombTriggered = true;
        obj.interactive = obj.buttonMode = false;
        obj.hop.children[0].rotation = obj.angle - FOOD_RULES.textureForwardAngle;
        return;
    }
    playBugClick();
    if (colored && isColorHeld(type.split('_')[1])) showColorHit(obj, type.split('_')[1]);
    obj.data.clicks = Math.max(0, (obj.data.clicks ?? 1) - 1);
    const count = obj.getChildByName('clickText');
    if (count) count.text = String(obj.data.clicks);
    if (obj.data.clicks > 0) { animateFatBugSquish(obj); return; }
    score += getObjectScoreValue(obj.data);
    // Resolve before any visual effect, so a click during the warning cannot damage food.
    const holdAfterHit = type === 'bug' || type === 'fat' || colored;
    resolveFoodBug(obj, true, holdAfterHit);
    if (type === 'healer') {
        changeFoodHealth(Math.max(0, obj.data.healAmount ?? 0));
        playHealerMusicEffect();
    } else if (type === 'frozen') {
        activateFrozenEffect();
    } else if (type === 'chameleon') {
        activateChameleonEffect();
    } else if (type === 'neat') {
        clearSpawnTimer();
        startSpawnResumeDelay(NEAT_SPAWN_DELAY_MS);
        playNeatMusicEffect();
        for (const other of [...activeObjects]) {
            if (other.state === 'resolved') continue;
            score += getObjectScoreValue(other.data);
            resolveFoodBug(other);
        }
        currentGameUI.feedback('heal');
    }
    updateUI();
}

function changeFoodHealth(delta) {
    if (levelEnded) return;
    life = Math.max(0, Math.min(getFoodMaxLives(levelData), life + delta));
    currentGameUI.feedback(delta < 0 ? 'damage' : 'heal');
    updateUI();
    if (life <= 0) endGame(false);
}

function resolveFoodBug(obj, animate = true, holdAfterHit = false) {
    obj.state = 'resolved';
    if (obj.highlight) obj.highlight.visible = false;
    obj.interactive = obj.buttonMode = false;
    obj.warning?.destroy({ children: true });
    obj.warning = null;
    obj.animations.forEach(animation => animation.kill());
    obj.animations = [];
    if (!animate) {
        activeObjects = activeObjects.filter(other => other !== obj);
        obj.destroy({ children: true });
        return;
    }
    // Removal is advanced by the same clock as motion; no delayed callbacks survive a restart.
    obj.holdAfterHit = holdAfterHit;
    obj.removeRemainingMs = holdAfterHit ? 500 : 180;
    if (holdAfterHit) obj.alpha = 0.3;
}

function showFoodWarning(obj) {
    const warning = new PIXI.Container();
    const text = new PIXI.Text('!', { fontFamily: 'Arial', fontSize: 28, fontWeight: '900', fill: 0xF65C70, stroke: 0x2D1738, strokeThickness: 3 });
    text.anchor.set(0.5);
    warning.addChild(text);
    warning.position.set(obj.x, obj.y - obj.radius - 22);
    const crowded = activeObjects.some(other => other !== obj && other.warning && Math.hypot(other.warning.x - warning.x, other.warning.y - warning.y) < 40);
    text.visible = !crowded;
    const pulse = new PIXI.Graphics();
    pulse.lineStyle(4, 0xF65C70, 0.85);
    const foodX = GAMEPLAY_STYLE.food.x + 250 - GAMEPLAY_STYLE.playRect.x;
    const foodY = GAMEPLAY_STYLE.food.y + 250 - GAMEPLAY_STYLE.playRect.y;
    const angle = Math.atan2(obj.y - foodY, obj.x - foodX);
    pulse.arc(foodX - warning.x, foodY - warning.y, GAMEPLAY_STYLE.food.radius, angle - 0.12, angle + 0.12);
    warning.addChild(pulse);
    warning.interactiveChildren = false;
    currentGameUI.effects.addChild(warning);
    obj.warning = warning;
}

function updateBugHop(obj, dt, rate) {
    if (!obj.hop) return;
    if (obj.bombTriggered) {
        obj.hop.y = 0;
        return;
    }
    if (obj.state !== 'entering' && obj.state !== 'approaching') {
        obj.hop.y = 0;
        return;
    }
    obj.hopElapsedMs = (obj.hopElapsedMs + dt * rate) % obj.hopPeriodMs;
    const phase = obj.hopElapsedMs / obj.hopPeriodMs;
    // A soft lift and landing, with the final quarter of each cycle on the ground.
    const lift = Math.sin(Math.PI * Math.min(phase / 0.75, 1));
    obj.hop.y = -FOOD_RULES.hopHeight * lift * lift;
}

function advanceGameplay(dt) {
    // Fixed maximum step preserves contact/timeout ordering at low and high FPS.
    let remaining = Math.min(dt, levelTimeRemainingMs);
    while (remaining > 0 && !levelEnded) {
        const step = Math.min(FOOD_RULES.simulationStepMs, remaining);
        gameTimeMs += step;
        for (const effect of [...currentGameUI.effects.children]) {
            if (effect.remainingMs == null) continue;
            effect.remainingMs -= step;
            if (effect.animationFrames) {
                const elapsed = effect.durationMs - effect.remainingMs;
                effect.texture = effect.animationFrames[Math.min(effect.animationFrames.length - 1, Math.floor(elapsed / 100))];
            } else if (effect.colorHit) {
                const progress=1-Math.max(0,effect.remainingMs)/effect.durationMs;
                effect.alpha=1-progress;effect.scale.set(0.65+progress*0.9);
            } else effect.alpha = Math.max(0, effect.remainingMs / 250);
            if (effect.remainingMs <= 0) effect.destroy({ children: true });
        }
        levelTimeRemainingMs = Math.max(0, levelTimeRemainingMs - step);
        if (frozenEffectEndsAt && gameTimeMs >= frozenEffectEndsAt) finishFrozenEffect();
        if (chameleonEffectEndsAt && gameTimeMs >= chameleonEffectEndsAt) finishChameleonEffect();
        for (const obj of [...activeObjects]) {
            if (levelEnded) break;
            if (obj.state === 'resolved') {
                obj.removeRemainingMs -= step;
                if (obj.removeRemainingMs <= 1e-7) resolveFoodBug(obj, false);
                else if (!obj.holdAfterHit) { obj.alpha = obj.removeRemainingMs / 180; obj.body.scale.set(0.8 + 0.2 * obj.alpha); }
                continue;
            }
            const movementRate = isFrozenEffectActive() ? FROZEN_LIFETIME_RATE : 1;
            const event = advanceApproach(obj, step, GAMEPLAY_STYLE.playRect, movementRate);
            updateBugHop(obj, step, movementRate);
            if (event === 'warning') showFoodWarning(obj);
            if (obj.warning) obj.warning.alpha = 0.65 + Math.sin(gameTimeMs * 0.025) * 0.35;
            if (event === 'damage' || event === 'departed') {
                if (event === 'damage' && obj.bombTriggered) showExplosion(obj.x, obj.y);
                resolveFoodBug(obj, false);
                if (event === 'damage') changeFoodHealth(-1);
            }
        }
        if (levelEnded) break;
        if (spawnResumeDelayBlocked && gameTimeMs >= spawnResumeAt) {
            spawnResumeDelayBlocked = false;
            scheduleNextSpawn(0);
        }
        if (levelTimeRemainingMs > 0 && !spawnResumeDelayBlocked && spawnDueAt !== null && gameTimeMs >= spawnDueAt) {
            spawnDueAt = null;
            spawnObject();
        }
        remaining -= step;
    }
    updateUI(dt);
}


function showColorHit(obj, color) {
    const effect = new PIXI.Graphics();
    effect.name = 'colorHit'; effect.colorHit = true;
    const tint = GAMEPLAY_STYLE.tools.find(tool => tool.color === color).fill;
    const radius = obj.radius * 0.75;
    effect.lineStyle(4, tint, 0.95).drawCircle(0, 0, radius);
    for(let i=0;i<6;i++) {
        const angle=i*Math.PI/3;
        effect.lineStyle(4,tint).moveTo(Math.cos(angle)*(radius+8),Math.sin(angle)*(radius+8))
            .lineTo(Math.cos(angle)*(radius+19),Math.sin(angle)*(radius+19));
    }
    effect.position.set(obj.x, obj.y + (obj.hop?.y || 0));
    effect.interactive = false; effect.scale.set(0.65);
    effect.durationMs = effect.remainingMs = 260;
    currentGameUI.effects.addChild(effect);
}

function showExplosion(x, y) {
    const blast = new PIXI.Sprite(bombAnimationFrames[0]);
    blast.name = 'bombExplosion';
    blast.anchor.set(0.5);
    blast.position.set(x, y);
    blast.animationFrames = bombAnimationFrames;
    blast.durationMs = blast.remainingMs = bombAnimationFrames.length * 100;
    currentGameUI.effects.addChild(blast);
}

function updateBugHighlights() {
    for (const obj of activeObjects) {
        if (!obj.highlight) continue;
        const color = obj.type.split('_')[1];
        obj.highlight.visible = obj.state !== 'resolved' && isColorHeld(color);
    }
}

// обновление UI
function stopLevelCountdown() {
    if (levelCountdownTicker) app.ticker.remove(levelCountdownTicker);
    levelCountdownTicker = null;
    levelCountdownLastAt = null;
}

function tickLevelCountdown(now = performance.now()) {
    if (levelEnded || isPaused || introActive || orientationPauseActive || document.hidden || getViewportMode() === 'mobile-portrait') {
        levelCountdownLastAt = null;
        return;
    }
    const dt = levelCountdownLastAt === null ? 0 : Math.max(0, now - levelCountdownLastAt);
    levelCountdownLastAt = now;
    advanceGameplay(dt);
    if (life <= 0) endGame(false);
    else if (levelTimeRemainingMs === 0) endGame(true);
}

function startLevelCountdown() {
    stopLevelCountdown();
    levelCountdownLastAt = performance.now();
    levelCountdownTicker = () => tickLevelCountdown();
    app.ticker.add(levelCountdownTicker);
    updateUI();
}

function updateUI(dt = 0) {
    if (!levelData || !currentGameUI.update) return;
    currentGameUI.update({ life, maximum: getFoodMaxLives(levelData), remainingMs: levelTimeRemainingMs,
        durationMs: levelDurationMs(levelData), activeColor: getActiveColor(),
        specialEffects: [
            { type: 'frozen', remainingMs: frozenEffectEndsAt - gameTimeMs, durationMs: FROZEN_EFFECT_DURATION_MS },
            { type: 'chameleon', remainingMs: chameleonEffectEndsAt - gameTimeMs, durationMs: CHAMELEON_EFFECT_DURATION_MS }
        ].filter(effect => effect.remainingMs > 0), clockMs: gameTimeMs, dt });
}

// конец игры
function endGame(won) {
    if (levelEnded) return;
    clearSessionCallbacks();
    stopLevelCountdown();
    clearSpawnTimer();
    clearSpawnResumeDelay();
    finishFrozenEffect();
    finishChameleonEffect();
    clearTransientMusicEffect();
    levelEnded = true;
    stopLevelMusic();
    playSound(won ? 'victory' : 'defeat');
    sessionDelay(() => {
        if (levelEnded && !document.hidden) startMenuMusic();
    }, 900);
    debugSpawn('endGame called', { won, score, life });
    freezeActiveObjects();
    closeLevelAttempt(won ? 'win' : 'loss');

    // Remove remaining objects without penalties
    removeAllActiveObjectsSilent();
    for (const effect of currentGameUI.effects.removeChildren()) effect.destroy({ children: true });

    // --- backend: прогресс, события, лидерборд (fire-and-forget) ---
    saveProgress(levelData.id, score, won).catch(() => {});
    trackEvent(won ? 'level_win' : 'level_lose', {
        levelId: levelData.id,
        score,
        lifeLeft: life
    }).catch(() => {});
    recalcLeaderboard(levels.length).catch(() => {});

    const idx = levels.findIndex(level => level.id === levelData.id);
    lastFoodReward = won ? awardFoodLoot(levelData) : null;
    if (won) {
        levelsSinceLastAd++;
        if (levelsSinceLastAd >= 2) {
            showInterstitialAd();
            levelsSinceLastAd = 0;
        }
        markLevelCompleted(idx);
    } else {
        showInterstitialAd();
        levelsSinceLastAd = 0;
    }
    runCutscenes('afterLevel', won, () => won ? showWinOverlayThenPopup(idx) : showLoseOverlayThenPopup(idx));

}


// Для хранения прогресса
function getCompletedLevels() {
    try {
        return JSON.parse(localStorage.getItem('completedLevels') || '[]');
    } catch {
        return [];
    }
}
function markLevelCompleted(index) {
    const completed = getCompletedLevels();
    if (!completed.includes(index)) {
        completed.push(index);
        localStorage.setItem('completedLevels', JSON.stringify(completed));
    }
}

function getLevelSpawnWeights(level) {
    return level?.params?.spawnWeights ?? level?.spawnWeights ?? {};
}

function getLevelBugTypes(level) {
    return Object.keys(getLevelSpawnWeights(level));
}

function beginLevelAttempt() {
    if (!levelData) return;

    currentAttemptStartedAt = Date.now();
    currentAttemptClosed = false;
    currentAttemptId = null;

    const spawnWeights = getLevelSpawnWeights(levelData);
    currentAttemptPromise = createLevelAttempt({
        levelId: levelData.id,
        targetsRequired: levelDurationMs(levelData) / 1000,
        objectiveType: 'survival',
        bugsRepelled: score,
        lifeLeft: getFoodMaxLives(levelData),
        bugTypes: getLevelBugTypes(levelData),
        spawnWeights,
        levelParams: {
            maxObjects: levelData.params?.maxObjects ?? null,
            effectiveMaxObjects: getFoodBugLimit(levelData),
            foodId: levelData.food,
            foodEffects: getFoodDefinition(levelData).effects,
            lifetimeMultiplier: levelData.params?.lifetimeMultiplier ?? null,
            spawnMultiplier: levelData.params?.spawnMultiplier ?? null,
            objectLifetime: levelData.params?.objectLifetime ?? null,
            spawnInterval: levelData.params?.spawnInterval ?? null
        },
        balanceVersion: BALANCE_VERSION
    });

    currentAttemptPromise
        .then((id) => {
            currentAttemptId = id;
            console.log('Level attempt created:', id);
        })
        .catch((error) => {
            console.warn('Failed to create level attempt:', error?.code || error?.name || error, error);
        });
}

function closeLevelAttempt(status, exitReason = null) {
    if (currentAttemptClosed || !levelData) return;

    currentAttemptClosed = true;

    const result = {
        status,
        exitReason,
        targetsCompleted: (levelDurationMs(levelData) - levelTimeRemainingMs) / 1000,
        targetsRequired: levelData.durationSeconds,
        objectiveType: 'survival',
        bugsRepelled: score,
        lifeLeft: life,
        durationMs: Date.now() - currentAttemptStartedAt
    };
    const pendingAttemptPromise = currentAttemptPromise;
    const knownAttemptId = currentAttemptId;

    const finish = async () => {
        try {
            let attemptId = knownAttemptId;
            if (!attemptId && pendingAttemptPromise) {
                attemptId = await pendingAttemptPromise;
            }

            if (!attemptId) return;
            await finishLevelAttempt(attemptId, result);
            console.log('Level attempt finished:', attemptId, result.status, result.exitReason);
        } catch (error) {
            console.warn('Failed to finish level attempt:', error?.code || error?.name || error, error);
        }
    };

    finish();
}

function rebuildUI() {
    if (currentGameUI.scene) fitGameplayScene(currentGameUI.scene, safeViewport(app.screen));
    updateUI();
}

function scheduleResponsiveResize() {
    if (pendingResizeFrame !== null) {
        cancelAnimationFrame(pendingResizeFrame);
    }

    pendingResizeFrame = requestAnimationFrame(() => {
        pendingResizeFrame = null;
        resizeGame();
    });
}

window.addEventListener('resize', scheduleResponsiveResize);
function onOrientationChange() {
    scheduleResponsiveResize();

    if (pendingOrientationResizeTimeout !== null) {
        clearTimeout(pendingOrientationResizeTimeout);
    }

    pendingOrientationResizeTimeout = setTimeout(() => {
        pendingOrientationResizeTimeout = null;
        scheduleResponsiveResize();
    }, 180);
}
window.addEventListener('orientationchange', onOrientationChange);
window.visualViewport?.addEventListener('resize', scheduleResponsiveResize);
const destroyApp = app.destroy.bind(app);
app.destroy = (...args) => {
    cancelCutscene();
    window.removeEventListener('resize', scheduleResponsiveResize);
    window.removeEventListener('orientationchange', onOrientationChange);
    window.visualViewport?.removeEventListener('resize', scheduleResponsiveResize);
    if (pendingResizeFrame !== null) cancelAnimationFrame(pendingResizeFrame);
    clearTimeout(pendingOrientationResizeTimeout);
    gameContainer.off('added', syncBackground); gameContainer.off('removed', syncBackground);
    adaptiveBackground.dispose(); destroyApp(...args);
};

function resizeGame() {
    const viewport = viewportSize();
    app.renderer.resize(viewport.width, viewport.height);
    adaptiveBackground.resize();
    activeCutscene?.resize();
    if (dishSelectScene) dishSelectScene.fit(menuViewport());
    const viewportMode = getViewportMode();
    const isGameScreen = app.stage.children.includes(gameContainer);

    if (progressContainer && app.stage.children.includes(progressContainer)) {
        layoutHomeScreen(progressContainer.getChildByName('homeContainer'), menuViewport());
        if (progressContainer.getChildByName('allLevelsCompletedPopup')) showAllLevelsCompletedPopup();

    }

    // Экран выбора уровня
    if (app.stage.children.includes(levelSelectContainer)) {
        const selected = selectedLevelIndex;
        showLevelSelect();
        if (selected !== null) showLevelEntryPopup(selected);
    }

    // Игровой экран
    if (isGameScreen) {
        if (viewportMode === 'mobile-portrait') {
            pauseGameplayForOverlay();
            rootUI.visible = false;
            updateMobilePortraitOverlay();
        } else {
            rootUI.visible = true;
            rebuildUI();
            updateMobilePortraitOverlay();
        }
    }

    for (const host of [gameContainer, progressContainer, levelSelectContainer]) {
        if (!host) continue;
        for (const child of host.children) {
            if (child._popupLayout) fitPopup(child, app.screen);
            if (['pauseOverlay', 'winOverlay', 'loseOverlay', 'introOverlay'].includes(child.name)) {
                const opacity = child._backdropAlpha ?? (child.name === 'introOverlay' ? 0.42 : child.name === 'pauseOverlay' ? 0.34 : 0.30);
                // Redraw the backdrop instead of scaling its children (result titles).
                child.scale.set(1);
                child.clear().beginFill(child._backdropColor ?? THEME.overlay, opacity).drawRect(0, 0, app.screen.width, app.screen.height).endFill();
            }
            const title = child.getChildByName?.('resultTitle');
            if (title) {
                title.position.set(app.screen.width / 2, app.screen.height / 2);
                title.scale.set(Math.min(app.screen.width / 1280, app.screen.height / 720));
            }
        }
    }

    updateMobilePortraitOverlay();
}

// Вызвать resizeGame при загрузке, чтобы всё было адаптивно с самого начала
resizeGame();

// Функция для очистки всех попапов
function clearAllPopups() {
  const popups = ['winPopup','losePopup','pausePopup','pauseOverlay','winOverlay','loseOverlay','introPopup','introOverlay'];
  popups.forEach(name => {
    const node = gameContainer.getChildByName(name);
    if (node) {
        if (node._appearFrame) cancelAnimationFrame(node._appearFrame);
        if (node._resizeHandler) window.removeEventListener('resize', node._resizeHandler);
        gameContainer.removeChild(node);
        node.destroy({ children: true });
    }
  });
}


// Fade in; dialog scale remains relative to the current viewport throughout.
function animateAppear(obj, duration = 500) {
  if (obj._appearFrame) cancelAnimationFrame(obj._appearFrame);
  const start = performance.now();
  obj.alpha = 0;
  if (obj._popupLayout) {
      obj._appearance = 0.94;
      fitPopup(obj, app.screen);
  }
  const step = now => {
    obj._appearFrame = null;
    if (obj.destroyed || !obj.parent) return;
    const progress = Math.min(1, (now - start) / duration);
    obj.alpha = progress;
    if (obj._popupLayout) {
        obj._appearance = 0.94 + 0.06 * (1 - Math.pow(1 - progress, 3));
        fitPopup(obj, app.screen);
    }
    if (progress < 1) obj._appearFrame = requestAnimationFrame(step);
  };
  obj._appearFrame = requestAnimationFrame(step);
}

// Универсальная выдача текстуры по типу
function getTextureForType(t) {
  if (!t) return TEXTURES['bug'];
  if (t === 'healer') {
    return TEXTURES['healer'] || TEXTURES['bug'];
  }
  if (t === 'frozen') {
    return TEXTURES['frozen'] || TEXTURES['bug'];
  }
  if (t === 'chameleon') {
    return TEXTURES['chameleon'] || TEXTURES['bug'];
  }
  if (t === 'neat') {
    return TEXTURES['neat'] || TEXTURES['bug'];
  }
  if (t.startsWith('fatColoredBug_')) {
    const color = t.split('_')[1];
    return TEXTURES[`coloredBug_${color}`] || TEXTURES['bug'];
  }
  return TEXTURES[t] || TEXTURES['bug'];
}

// Попап "Новый жук!"
function showIntroPopup(cfg, onClose) {
    clearAllPopups();
    introActive = true;
    const layout = loader.resources.intro_layout.data;
    const theme = layout.popupTheme;
    const overlay = new PIXI.Graphics();
    overlay.name = 'introOverlay';
    overlay._backdropColor = parseInt(theme.backdrop.slice(1), 16);
    overlay._backdropAlpha = theme.backdropAlpha;
    overlay.beginFill(overlay._backdropColor, overlay._backdropAlpha).drawRect(0, 0, app.screen.width, app.screen.height).endFill();
    overlay.interactive = true;
    const popup = createIntroPopup(TEXTURES, layout, loader.resources.result_layout.data.fontStack,
        cfg, getTextureForType(cfg?.type), () => {
            if (popup.destroyed || popup.parent !== gameContainer) return;
            playUiClick();
            clearAllPopups();
            introActive = false;
            if (typeof onClose === 'function') onClose();
        }, app.view);
    gameContainer.addChild(overlay, popup);
    fitPopup(popup, app.screen);
}
function showWinOverlayThenPopup(levelIndex) { showWinPopup(levelIndex); }
function showLoseOverlayThenPopup(levelIndex) { showLosePopup(levelIndex); }
function showWinPopup(levelIndex) { showResultPopup({ won: true, levelIndex }); }
function showLosePopup(levelIndex) { showResultPopup({ won: false, levelIndex }); }

function showResultPopup({ won, levelIndex }) {
    clearAllPopups();
    const layout = loader.resources.result_layout.data;
    const overlay = new PIXI.Graphics();
    overlay.name = won ? 'winOverlay' : 'loseOverlay';
    const theme = loader.resources.intro_layout.data.popupTheme;
    overlay._backdropColor = parseInt(theme.backdrop.slice(1), 16);
    overlay._backdropAlpha = theme.backdropAlpha;
    overlay.beginFill(overlay._backdropColor, overlay._backdropAlpha)
        .drawRect(0, 0, app.screen.width, app.screen.height).endFill();
    overlay.interactive = true;
    gameContainer.addChild(overlay);
    const hasNext = !!levels[levelIndex + 1];
    const transition = callback => {
        playUiClick();
        clearAllPopups();
        callback();
    };
    const popup = createResultPopup(TEXTURES, layout, {
        won, hasNext, reward: won ? lastFoodReward : null,
        onDishes: foodId => transition(() => {showProgressScreen();showDishSelect(foodId || lastFoodReward?.received.find(r=>r.ready)?.foodId);}),
        theme: loader.resources.intro_layout.data.popupTheme,
        onMenu: () => transition(showProgressScreen),
        onPrimary: () => transition(() => {
            if(won && lastFoodReward?.received.some(r=>r.ready)){showProgressScreen();showDishSelect(lastFoodReward.received.find(r=>r.ready).foodId);}
            else if (!won) startLevel(levelIndex);
            else if (hasNext) startLevel(levelIndex + 1);
            else {
                showProgressScreen();
                showLevelSelect();
            }
        })
    });
    fitPopup(popup, app.screen);
    gameContainer.addChild(popup);
}
function showPausePopup(homeSettings = false) {
    if(activeCutscene)return;
    homeSettings = homeSettings === true;
    const popupHost = homeSettings ? progressContainer : gameContainer;
    if (popupHost.getChildByName('pausePopup')) return;
    if (!homeSettings && isPaused) return; // Prevent multiple popups
    playUiClick();
    if (!homeSettings) {
        levelCountdownLastAt = null;
        isPaused = true;
        pauseLevelMusic();
        freezeActiveObjects();
    }

    const theme = loader.resources.intro_layout.data.popupTheme;
    const overlay = new PIXI.Graphics();
    overlay.name = 'pauseOverlay';
    overlay._backdropColor = parseInt(theme.backdrop.slice(1), 16);
    overlay._backdropAlpha = theme.backdropAlpha;
    overlay.beginFill(overlay._backdropColor, overlay._backdropAlpha)
        .drawRect(0, 0, app.screen.width, app.screen.height).endFill();
    overlay.interactive = true;
    const close = () => {
        overlay.destroy({ children: true });
        popup.destroy({ children: true });
        if (!homeSettings) isPaused = false;
    };
    const popup = createSettingsPopup(TEXTURES, theme, loader.resources.result_layout.data.fontStack, {
        homeSettings,
        soundEnabled: localStorage.getItem('soundEnabled') !== 'false',
        musicEnabled: localStorage.getItem('musicEnabled') !== 'false',
        onSound(enabled) { setSoundEnabled(enabled); if (enabled) playUiClick(); },
        onMusic(enabled) { playUiClick(); setMusicEnabled(enabled); },
        onClose() { playUiClick(); close(); if (!homeSettings) resumeGame(); },
        onRetry() { playUiClick(); closeLevelAttempt('exit', 'restart'); close(); startLevel(levelData.id - 1); },
        onMenu() { playUiClick(); closeLevelAttempt('exit', 'menu'); close(); showProgressScreen(); }
    });
    fitPopup(popup, app.screen);
    popupHost.addChild(overlay, popup);
}
function createButton(width, height, text, onClick, variant = 'primary', fontSize = 32) {
    const styles = {
        primary: { fill: THEME.primary, border: THEME.borderDark, text: THEME.white },
        secondary: { fill: THEME.secondary, border: 0xB56A2D, text: THEME.textDark },
        pause: { fill: 0x8E7CFF, border: 0x5E4AE0, text: THEME.white },
        success: { fill: THEME.success, border: 0x4AAE4A, text: THEME.white }
    };
    const style = styles[variant] || styles.primary;

    const btn = new PIXI.Graphics();
    btn.lineStyle(4, style.border);
    btn.beginFill(style.fill);
    btn.drawRoundedRect(-width/2, -height/2, width, height, 18);
    btn.endFill();
    btn.interactive = true;
    btn.buttonMode = true;
    btn.on('pointerdown', (event) => {
        event.stopPropagation();
        playUiClick();
        onClick(event);
    });

    const btnText = new PIXI.Text(text, {
        fontSize,
        fill: style.text,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        align: 'center',
    });
    btnText.anchor.set(0.5);
    btn.addChild(btnText);

    return btn;
}

// Вынести удаление объекта с анимацией


function resumeGame() {
    levelCountdownLastAt = performance.now();
    startLevelMusic();
    if (!levelCountdownTicker && !levelEnded) startLevelCountdown();
    if (spawnDueAt === null) scheduleNextSpawn();
    activeObjects.forEach(obj => {
        obj.animations.forEach(a => a.resume());
        obj.interactive = obj.buttonMode = obj.state !== 'resolved';
    });
}

export default levels;


