import levels from './levels.js';
import { getBugBaseBalance, getBugSpawnZone } from './bug-config.js';
import { initBackend, fetchRemoteLevel, saveProgress, trackEvent, recalcLeaderboard, rcNumber } from './firebase.js';
import {
    isMobileDevice as isMobileDeviceUI,
    getViewportMode as getViewportModeUI,
    getUsedLevelColors as getUsedLevelColorsUI,
    getButtonTextureName as getButtonTextureNameUI,
    getGameLayout as getGameLayoutUI,
    createRoundedPanel as createRoundedPanelUI,
    createLabelSprite as createLabelSpriteUI,
    syncMobilePortraitOverlay,
    buildDesktopLevelHeader as buildDesktopLevelHeaderUI,
    buildMobileLevelHeader as buildMobileLevelHeaderUI,
    updateLevelHeaderUI
} from './js/game-ui.js';
const MOBILE_MAX_VIEWPORT = 1366;
const MOBILE_LANDSCAPE_MIN_RATIO = 1.15;
const MOBILE_OVERLAY_ID = 'mobile-orientation-overlay';

// ==== Global Constants ====
const IS_TOUCH = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const MIN_BAR_H = 110;    // px
const BAR_H_PRC = 0.16;   // 14 % экрана тест
const GAP_HORZ = 12;      // промежутки
const BORDER_RADIUS = 40;
const FRAME_BORDER = 12;
const SAFE_PADDING_EXTRA = 6; // внутренний зазор от рамки, чтобы объекты не заходили на неё
const HEADER_H_PRC = 0.10;   // 10 % высоты квадратного поля
const HEART_SIZE_PRC = 0.50;   // 50 % высоты шапки
const HEART_GAP = 6;      // px между сердцами
const BUG_SIZE_PRC = 0.15;    // 15% от размера игрового поля
const MIN_BUG_SIZE = 60;      // минимальный размер жука
const MAX_BUG_SIZE = 120;
const FROZEN_EFFECT_DURATION_MS = 5000;
const FROZEN_LIFETIME_MULTIPLIER = 2;
const FROZEN_LIFETIME_RATE = 1 / FROZEN_LIFETIME_MULTIPLIER;
const FROZEN_ANIMATION_TIME_SCALE = 0.5;
const FROZEN_WAVE_COLOR = 0x8FE8FF;     // максимальный размер жука

const NEAT_SPAWN_DELAY_MS = 1500;
const NEAT_WAVE_COLORS = [0xFDFDFD, 0xEAEAEA, 0xD8DDE3, 0xC8D0D8];
const CHAMELEON_EFFECT_DURATION_MS = 5000;
const CHAMELEON_WAVE_COLORS = [0xFFB7C5, 0xFFD7A8, 0xFFF0A6, 0xBAF2BB, 0xB8E7FF, 0xD8C4FF];
const DEBUG_SHOW_SPAWN_ZONES = false;
const CASUAL_UI = {
    outerPadding: 10,
    topHudHeightRatio: 0.18,
    sidePanelWidthRatio: 0.12,
    gapRatio: 0.018,
    playfieldRadius: 32,
    panelRadius: 26,
};

// ==== Global Variables ====
let activeObjects = [];
let maxSimultaneousObjects = 4;
let rootUI = new PIXI.Container();
let gameContainer = new PIXI.Container();
let bottomBar = null;
let playArea = null;
let playAreaFrame = null;
let hudContainer = null;
let sidePanelsContainer = null;
let colorButtonsContainer = null;
let scoreText, lifeText;
let levelData;
let objectQueue = [];
let isPaused = false;
let spawnTimer = null;
let score = 0;
let life = 0;
let orientationPauseActive = false;
let spawnResumeDelayBlocked = false;
let spawnResumeDelayTimer = null;
let frozenEffectStartedAt = 0;
let frozenEffectEndsAt = 0;
let frozenEffectTimer = null;
let chameleonEffectStartedAt = 0;
let chameleonEffectEndsAt = 0;
let chameleonEffectTimer = null;
let chameleonFieldOverlay = null;
let gameLayout = null;
let currentGameUI = { hearts: [] };
let pendingResizeFrame = null;
let pendingOrientationResizeTimeout = null;
let colorButtonsMap = {};
let levelsSinceLastAd = 0;
let lastAdTime = 0;
const DEBUG_SPAWN = true;

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
    const maxLives = levelData?.lifeCount ?? life;
    life = Math.min(life + amount, maxLives);
    levelEnded = false;
    clearAllPopups();
    updateUI();
    resumeGame();
}

function healPlayer(amount) {
    const healAmount = Math.max(0, Math.round(amount ?? 0));
    if (!healAmount) return;

    const maxLives = levelData?.lifeCount ?? life;
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

// Runtime balance is always derived from base bug config * level multipliers.
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
    const frozenLifetimeMultiplier = isFrozenEffectActive() ? FROZEN_LIFETIME_MULTIPLIER : 1;

    // Итоговые параметры жука считаются из базовых значений вида * коэффициенты уровня.
    return {
        lifetime: baseBalance.lifetime * lifetimeMultiplier * frozenLifetimeMultiplier,
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

function getDisplayObjectCenterGlobal(displayObject) {
    if (!displayObject) return null;
    const bounds = displayObject.getBounds();
    return new PIXI.Point(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
}

function getHealTargetGlobalPosition(nextLifeValue) {
    if (!currentGameUI) return null;

    const nextLife = Math.max(1, nextLifeValue ?? life);

    if (currentGameUI.mode === 'mobile-landscape' && currentGameUI.heartsContainer) {
        const heartSize = currentGameUI.heartSize ?? 34;
        const heartGap = currentGameUI.heartGap ?? 8;
        const totalWidth = nextLife * heartSize + Math.max(0, nextLife - 1) * heartGap;
        const startX = (currentGameUI.heartRightX ?? 0) - totalWidth;
        const localPoint = new PIXI.Point(
            startX + (nextLife - 1) * (heartSize + heartGap) + heartSize / 2,
            currentGameUI.heartCenterY ?? heartSize / 2
        );

        return currentGameUI.heartsContainer.toGlobal(localPoint);
    }

    const heart = currentGameUI.hearts?.[nextLife - 1];
    if (heart) {
        return getDisplayObjectCenterGlobal(heart);
    }

    return null;
}

function animateHealingHeart(sourceObject, targetPoint, onComplete) {
    const startPoint = getDisplayObjectCenterGlobal(sourceObject);
    if (!startPoint || !targetPoint) {
        onComplete?.();
        return;
    }

    const texture = TEXTURES.life || TEXTURES.heart;
    if (!texture) {
        onComplete?.();
        return;
    }

    const heart = new PIXI.Sprite(texture);
    heart.anchor.set(0.5);
    heart.x = startPoint.x;
    heart.y = startPoint.y;
    heart.width = 34;
    heart.height = 34;
    heart.zIndex = 9999;
    app.stage.sortableChildren = true;
    app.stage.addChild(heart);

    const arcHeight = Math.max(36, Math.abs(targetPoint.y - startPoint.y) * 0.25 + 28);
    const controlPoint = {
        x: (startPoint.x + targetPoint.x) / 2,
        y: Math.min(startPoint.y, targetPoint.y) - arcHeight
    };
    const flight = { t: 0 };

    gsap.to(heart.scale, {
        x: 1.2,
        y: 1.2,
        duration: 0.14,
        yoyo: true,
        repeat: 1,
        ease: "sine.inOut"
    });

    gsap.to(flight, {
        t: 1,
        duration: 0.55,
        ease: "power2.inOut",
        onUpdate: () => {
            const t = flight.t;
            const inv = 1 - t;
            heart.x = inv * inv * startPoint.x + 2 * inv * t * controlPoint.x + t * t * targetPoint.x;
            heart.y = inv * inv * startPoint.y + 2 * inv * t * controlPoint.y + t * t * targetPoint.y;
        },
        onComplete: () => {
            gsap.to(heart, {
                alpha: 0,
                duration: 0.12,
                onComplete: () => {
                    if (heart.parent) heart.parent.removeChild(heart);
                    heart.destroy();
                    onComplete?.();
                }
            });
        }
    });
}

function clearSpawnTimer() {
    if (spawnTimer) {
        clearTimeout(spawnTimer);
        spawnTimer = null;
    }
}

function clearSpawnResumeDelay() {
    spawnResumeDelayBlocked = false;
    if (spawnResumeDelayTimer) {
        clearTimeout(spawnResumeDelayTimer);
        spawnResumeDelayTimer = null;
    }
}

function startSpawnResumeDelay(delay = NEAT_SPAWN_DELAY_MS) {
    clearSpawnResumeDelay();
    spawnResumeDelayBlocked = true;
    spawnResumeDelayTimer = setTimeout(() => {
        spawnResumeDelayBlocked = false;
        spawnResumeDelayTimer = null;
        ensureSpawnTimerAfterUiChange();
    }, delay);
}

function scheduleNextSpawn(delay) {
    clearSpawnTimer();

    if (orientationPauseActive || isPaused || introActive || levelEnded || getViewportMode() === 'mobile-portrait') {
        debugSpawn('scheduleNextSpawn skipped by state', { delay });
        return;
    }
    if (objectQueue.length === 0) {
        debugSpawn('scheduleNextSpawn skipped because queue is empty', { delay });
        return;
    }

    const nextDelay = Math.max(50, Math.round(delay ?? objectQueue[0].spawnInterval ?? 450));
    debugSpawn('scheduleNextSpawn armed', { delay, nextDelay, nextType: objectQueue[0]?.type ?? null });
    spawnTimer = setTimeout(spawnObject, nextDelay);
}

function ensureSpawnTimerAfterUiChange() {
    if (spawnTimer || spawnResumeDelayBlocked || orientationPauseActive || isPaused || introActive || levelEnded) return;
    if (objectQueue.length === 0) return;
    scheduleNextSpawn(0);
}

function removeObjectFromActiveList(target) {
    activeObjects = activeObjects.filter((obj) => obj !== target);
    ensureSpawnTimerAfterUiChange();
}

function isFrozenEffectActive(now = Date.now()) {
    return frozenEffectEndsAt > now;
}

function isChameleonEffectActive(now = Date.now()) {
    return chameleonEffectEndsAt > now;
}

function getLifetimeDecayMs(startTime, endTime) {
    if (endTime <= startTime) return 0;

    const elapsed = endTime - startTime;
    if (!frozenEffectStartedAt || frozenEffectEndsAt <= startTime || frozenEffectStartedAt >= endTime) {
        return elapsed;
    }

    const overlapStart = Math.max(startTime, frozenEffectStartedAt);
    const overlapEnd = Math.min(endTime, frozenEffectEndsAt);
    const frozenOverlap = Math.max(0, overlapEnd - overlapStart);
    return elapsed - frozenOverlap * (1 - FROZEN_LIFETIME_RATE);
}

function syncObjectLifetime(obj, now = Date.now()) {
    if (obj.remainingLifetimeMs == null) {
        obj.remainingLifetimeMs = 0;
    }

    if (obj.lastLifetimeSyncAt == null) {
        obj.lastLifetimeSyncAt = now;
        return obj.remainingLifetimeMs;
    }

    const decay = getLifetimeDecayMs(obj.lastLifetimeSyncAt, now);
    obj.remainingLifetimeMs = Math.max(0, obj.remainingLifetimeMs - decay);
    obj.lastLifetimeSyncAt = now;
    return obj.remainingLifetimeMs;
}

function getObjectAnimationTimeScale(now = Date.now()) {
    return isFrozenEffectActive(now) ? FROZEN_ANIMATION_TIME_SCALE : 1;
}

function applyObjectAnimationTimeScale(obj, now = Date.now()) {
    if (!obj.animations) return;
    const timeScale = getObjectAnimationTimeScale(now);
    obj.animations.forEach(anim => {
        if (typeof anim.timeScale === 'function') {
            anim.timeScale(timeScale);
        }
    });
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

function syncAllColorButtonStates() {
    const colors = new Set([
        ...Object.keys(colorButtonsMap || {}),
        'red',
        'blue',
        'green',
        'yellow'
    ]);

    colors.forEach((color) => updateButtonState(color, isColorHeld(color)));
}



// ==== UI Containers ====
const startContainer = new PIXI.Container();
const levelSelectContainer = new PIXI.Container();
let selectedLevelIndex = null;

PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

// ==== UI ASSET SLOTS ====
// Put custom PNGs into images/ui/custom/ with these exact names.
// Missing custom files are ignored; the game falls back to drawn Pixi UI.
const UI_ASSET_SLOTS = {
    bg_levels: {
        path: 'images/ui/custom/bg_levels.png',
        width: 1280,
        height: 590,
        description: 'Background for the level select screen.'
    },
    bg_game: {
        path: 'images/ui/custom/bg_game.png',
        width: 1280,
        height: 590,
        description: 'Background for the in-level game screen.'
    },
    level_entry_icon: {
        path: 'images/ui/custom/level_entry_icon.png',
        width: 128,
        height: 128,
        description: 'Icon shown in the level entry popup.'
    },
    level_tile_completed: {
        path: 'images/ui/custom/level_tile_completed.png',
        width: 128,
        height: 128,
        description: 'Completed level tile background.'
    },
    level_tile_locked: {
        path: 'images/ui/custom/level_tile_locked.png',
        width: 128,
        height: 128,
        description: 'Not-yet-completed level tile background.'
    },
    game_hud_panel: {
        path: 'images/ui/custom/game_hud_panel.png',
        width: 1180,
        height: 112,
        description: 'Top in-level HUD panel.'
    },
    game_goal_badge: {
        path: 'images/ui/custom/game_goal_badge.png',
        width: 220,
        height: 72,
        description: 'Goal counter badge inside the HUD.'
    },
    game_playfield_frame: {
        path: 'images/ui/custom/game_playfield_frame.png',
        width: 900,
        height: 520,
        description: 'Main in-level playfield frame.'
    },
    game_side_panel: {
        path: 'images/ui/custom/game_side_panel.png',
        width: 128,
        height: 360,
        description: 'Left/right color-button side panel.'
    },
    game_settings_button: {
        path: 'images/ui/custom/game_settings_button.png',
        width: 96,
        height: 96,
        description: 'Settings button background.'
    },
    custom_button_red: {
        path: 'images/ui/custom/button_red.png',
        width: 107,
        height: 112,
        description: 'Custom red color button.'
    },
    custom_button_blue: {
        path: 'images/ui/custom/button_blue.png',
        width: 107,
        height: 112,
        description: 'Custom blue/cyan color button.'
    },
    custom_button_purple: {
        path: 'images/ui/custom/button_purple.png',
        width: 107,
        height: 112,
        description: 'Custom purple color button.'
    },
    custom_button_green: {
        path: 'images/ui/custom/button_green.png',
        width: 107,
        height: 112,
        description: 'Custom green color button.'
    }
};

// ==== SPRITE PRELOADER (PIXI.Loader) ====
const SPRITE_PATHS = [
    { name: 'bug', path: 'images/bug.png' },
    { name: 'healer', path: 'images/healer.png' },
    { name: 'bomb', path: 'images/bomb.png' },
    { name: 'coloredBug_red', path: 'images/coloredBug_red.png' },
    { name: 'coloredBug_blue', path: 'images/coloredBug_blue.png' },
    { name: 'coloredBug_green', path: 'images/coloredBug_green.png' },
    { name: 'coloredBug_yellow', path: 'images/coloredBug_yellow.png' },
    { name: 'bomb_explosion', path: 'images/bomb.gif'},
    { name: 'button_green',  path: 'images/ui/button_green.png' },
    { name: 'button_blue',   path: 'images/ui/button_blue.png' },
    { name: 'button_purple', path: 'images/ui/button_purple.png' },
    { name: 'button_red',    path: 'images/ui/button_red.png' },
    { name: 'button_yellow', path: 'images/ui/button_yellow.png' },
    { name: 'frozen', path: 'images/ui/frozen.png' },
    { name: 'chameleon', path: 'images/chameleon.png' },
    { name: 'neat', path: 'images/neat.png' },
    { name: 'heart', path: 'images/ui/heart.png' },
    { name: 'life', path: 'images/life.png' },
    { name: 'gear', path: 'images/ui/gear.png' },
    ...Object.entries(UI_ASSET_SLOTS).map(([name, slot]) => ({
        name,
        path: slot.path,
        optional: true
    }))
];

// Store loaded textures
const TEXTURES = {};
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

function getButtonTextureName(color) {
    const baseTextureName = COLOR_BUTTON_SLOTS.find((slot) => slot.color === color)?.textureName || getButtonTextureNameUI(color);
    const customTextureName = `custom_${baseTextureName}`;
    return TEXTURES[customTextureName] ? customTextureName : baseTextureName;
}

function getGameLayout() {
    return getGameLayoutUI({
        mode: getViewportMode(),
        screenWidth: app?.screen?.width ?? window.innerWidth,
        screenHeight: app?.screen?.height ?? window.innerHeight,
        barHeightRatio: BAR_H_PRC,
        minBarHeight: MIN_BAR_H,
        gapHorizontal: GAP_HORZ,
        headerHeightRatio: HEADER_H_PRC,
        borderRadius: BORDER_RADIUS,
        colorButtonSlots: COLOR_BUTTON_SLOTS
    });
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

    orientationPauseActive = true;
    clearSpawnTimer();

    activeObjects.forEach(obj => {
        obj.pausedLifetime = syncObjectLifetime(obj);

        if (obj.lifetimeCheckTimeout) {
            clearTimeout(obj.lifetimeCheckTimeout);
        }

        if (obj.animations) {
            obj.animations.forEach(anim => anim.pause());
        }

        obj.interactive = false;
        obj.buttonMode = false;
    });
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

function showPreloader() {
    const preloader = document.createElement('div');
    preloader.id = 'preloader';
    preloader.style.position = 'fixed';
    preloader.style.left = '0';
    preloader.style.top = '0';
    preloader.style.width = '100vw';
    preloader.style.height = '100vh';
    preloader.style.background = THEME.preloaderBg;
    preloader.style.display = 'flex';
    preloader.style.flexDirection = 'column';
    preloader.style.alignItems = 'center';
    preloader.style.justifyContent = 'center';
    preloader.style.fontSize = '2em';
    preloader.style.zIndex = '9999';
    preloader.style.fontFamily = 'Arial';
    
    const loadingText = document.createElement('div');
    loadingText.innerText = 'Загрузка...';
    loadingText.style.marginBottom = '20px';
    
    const progressBar = document.createElement('div');
    progressBar.style.width = '300px';
    progressBar.style.height = '20px';
    progressBar.style.background = THEME.preloaderTrack;
    progressBar.style.borderRadius = '10px';
    progressBar.style.overflow = 'hidden';
    
    const progressFill = document.createElement('div');
    progressFill.style.width = '0%';
    progressFill.style.height = '100%';
    progressFill.style.background = THEME.preloaderFill;
    progressFill.style.transition = 'width 0.3s';
    
    progressBar.appendChild(progressFill);
    preloader.appendChild(loadingText);
    preloader.appendChild(progressBar);
    document.body.appendChild(preloader);
    
    return { preloader, progressFill };
}

function hidePreloader() {
    const preloader = document.getElementById('preloader');
    if (preloader) {
        preloader.style.opacity = '0';
        preloader.style.transition = 'opacity 0.5s';
        setTimeout(() => preloader.remove(), 500);
    }
}

// ==== START GAME ONLY AFTER SPRITES LOADED ====
const { preloader, progressFill } = showPreloader();

// Create PIXI Application
const app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: THEME.appBg,
    resolution: window.devicePixelRatio,
    autoDensity: true,
    resizeTo: window,
    roundPixels: true
});

// Add app view to DOM
document.body.appendChild(app.view);
document.body.style.backgroundColor = THEME.appBgCss;
document.body.style.overscrollBehavior = 'none';
document.body.style.touchAction = 'none';
app.view.style.touchAction = 'none';
app.view.style.webkitTouchCallout = 'none';
initYandexSDK();

// === Backend init (Firebase) ===
initBackend()
  .then(() => trackEvent('app_open', { ua: navigator.userAgent }))
  .catch((e) => console.warn('Backend init failed', e));

// Load sprites
const loader = PIXI.Loader.shared;
SPRITE_PATHS.forEach(({ name, path }) => {
    loader.add(name, path);
});

// Add loading progress handler
loader.onProgress.add((loader) => {
    const progress = Math.round(loader.progress);
    progressFill.style.width = `${progress}%`;
});

// Add error handler
loader.onError.add((error, loader, resource) => {
    const isOptionalResource = SPRITE_PATHS.some(({ name, optional }) => optional && resource?.name === name);
    if (isOptionalResource) {
        console.warn('Optional UI asset not loaded, using Pixi fallback:', resource?.url || resource?.name);
        return;
    }

    console.error('Error loading sprite:', {
        error: error,
        resource: resource ? {
            name: resource.name,
            url: resource.url,
            type: resource.type
        } : 'unknown',
        loader: loader
    });
    alert('Ошибка загрузки ресурсов. Пожалуйста, обновите страницу.');
});

// Start loading
loader.load(() => {
    console.log('All resources loaded successfully');
    // Store all loaded textures
    SPRITE_PATHS.forEach(({ name }) => {
        const texture = loader.resources[name]?.texture;
        if (texture) {
            TEXTURES[name] = texture;
        }
    });
    hidePreloader();
    resizeGame();
    app.stage.addChild(startContainer);
});

// ...весь остальной код...

// Color definitions and key mappings
const COLORS = {
    red: 0xFF4F6F,
    blue: 0x21C8F6,
    green: 0x83D91B,
    yellow: 0xC64CFF,
    purple: THEME.pause
};


// Color buttons keep fixed visual slots. The "blue" game color is the purple bug/button.
const COLOR_BUTTON_SLOTS = [
    { color: 'red', key: 'q', side: 'left', icon: 'heart', textureName: 'button_red' },
    { color: 'yellow', key: 'e', side: 'left', icon: 'star', textureName: 'button_blue' },
    { color: 'blue', key: 'w', side: 'right', icon: 'drop', textureName: 'button_purple' },
    { color: 'green', key: 'r', side: 'right', icon: 'leaf', textureName: 'button_green' },
];

const MOBILE_FIXED_BUTTON_COLUMNS = {
    left: ['red', 'yellow'],
    right: ['blue', 'green']
};

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
function updateButtonState(color, isActive) {
    const mapped = colorButtonsMap[color];
    const buttons = Array.isArray(mapped) ? mapped : (mapped ? [mapped] : []);

    if (!buttons.length) {
        const fallback = colorButtonsContainer?.getChildByName(`colorButton_${color}`);
        if (fallback) buttons.push(fallback);
    }
    if (!buttons.length) return;

    buttons.forEach((button) => {
        const activeIndicator = button.getChildByName('activeIndicator');
        if (activeIndicator) {
            activeIndicator.visible = isActive;
        }

        if (button._holdAnim) {
            button._holdAnim.kill();
            button._holdAnim = null;
        }

        if (isActive) {
            gsap.to(button.scale, {
                x: button.originalScale * 1.06,
                y: button.originalScale * 0.88,
                duration: 0.06,
                ease: "power2.inOut",
                onComplete: () => {
                    button._holdAnim = gsap.to(button.scale, {
                        x: button.originalScale * 1.03,
                        y: button.originalScale * 0.94,
                        duration: 0.28,
                        yoyo: true,
                        repeat: -1,
                        ease: "sine.inOut"
                    });
                }
            });
        } else {
            gsap.to(button.scale, {
                x: button.originalScale,
                y: button.originalScale,
                duration: 0.18,
                ease: "elastic.out(1, 0.5)"
            });
        }
    });
}

function removeExpiredObject(obj) {
    gsap.to(obj, {
        y: obj.y + 100,
        alpha: 0,
        duration: 0.4,
        ease: "power1.in",
        onComplete: () => {
            if (playArea.children.includes(obj)) {
                playArea.removeChild(obj);
                removeObjectFromActiveList(obj);

                if (!levelEnded && obj.type !== 'bomb') {
                    life--;
                    updateUI();
                    if (life <= 0) endGame(false);
                }
            }
        }
    });
}

function startLifetimeCheck(obj) {
    if (obj.lifetimeCheckTimeout) {
        clearTimeout(obj.lifetimeCheckTimeout);
    }

    debugSpawn('startLifetimeCheck armed', {
        type: obj.type,
        remainingLifetimeMs: obj.remainingLifetimeMs,
        hasParent: !!obj.parent
    });

    const checkLifetime = () => {
        if (!activeObjects.includes(obj)) {
            debugSpawn('lifetimeCheck stopped because object is no longer active', { type: obj.type });
            obj.lifetimeCheckTimeout = null;
            return;
        }

        // During rebuilds, overlays, or short-lived mobile viewport changes the object can be
        // temporarily detached or paused. Keep the lifetime loop alive and retry shortly.
        if (isPaused || orientationPauseActive || !obj.parent || obj.parent !== playArea) {
            debugSpawn('lifetimeCheck postponed', {
                type: obj.type,
                hasParent: !!obj.parent,
                parentMatchesPlayArea: obj.parent === playArea
            });
            obj.lifetimeCheckTimeout = setTimeout(checkLifetime, 100);
            return;
        }

        const remainingTime = syncObjectLifetime(obj);
        debugSpawn('lifetimeCheck tick', { type: obj.type, remainingTime });
        if (remainingTime <= 0) {
            debugSpawn('lifetimeCheck expired object', { type: obj.type });
            removeExpiredObject(obj);
            return;
        }

        obj.lifetimeCheckTimeout = setTimeout(checkLifetime, Math.min(remainingTime, 1000));
    };

    obj.lifetimeCheckTimeout = setTimeout(checkLifetime, 100);
}

function showFrozenWave(x, y) {
    const wave = new PIXI.Graphics();
    wave.lineStyle(10, FROZEN_WAVE_COLOR, 0.85);
    wave.drawCircle(0, 0, 36);
    wave.x = x;
    wave.y = y;
    wave.alpha = 0.9;
    wave.scale.set(0.2);
    playArea.addChild(wave);

    gsap.to(wave.scale, {
        x: 6,
        y: 6,
        duration: 0.5,
        ease: "power2.out"
    });
    gsap.to(wave, {
        alpha: 0,
        duration: 0.5,
        ease: "power1.out",
        onComplete: () => {
            if (wave.parent) wave.parent.removeChild(wave);
            wave.destroy();
        }
    });
}

function showChameleonWave(x, y) {
    const effectLayer = playArea?.parent ?? playArea;
    const waveContainer = new PIXI.Container();
    waveContainer.x = (playArea?.x ?? 0) + x;
    waveContainer.y = (playArea?.y ?? 0) + y;
    effectLayer.addChild(waveContainer);

    const animations = [];
    CHAMELEON_WAVE_COLORS.forEach((color, index) => {
        const ring = new PIXI.Graphics();
        ring.lineStyle(8, color, 0.72);
        ring.drawCircle(0, 0, 30 + index * 4);
        ring.alpha = 0.85;
        ring.scale.set(0.16);
        waveContainer.addChild(ring);

        animations.push(
            gsap.to(ring.scale, {
                x: 7.2,
                y: 7.2,
                duration: 0.7,
                delay: index * 0.03,
                ease: "power2.out"
            }),
            gsap.to(ring, {
                alpha: 0,
                duration: 0.7,
                delay: index * 0.03,
                ease: "power1.out"
            })
        );
    });

    gsap.delayedCall(0.9, () => {
        animations.forEach(anim => anim.kill());
        if (waveContainer.parent) waveContainer.parent.removeChild(waveContainer);
        waveContainer.destroy({ children: true });
    });
}

function showNeatWave(x, y) {
    const effectLayer = playArea?.parent ?? playArea;
    const waveContainer = new PIXI.Container();
    waveContainer.x = (playArea?.x ?? 0) + x;
    waveContainer.y = (playArea?.y ?? 0) + y;
    effectLayer.addChild(waveContainer);

    const animations = [];
    NEAT_WAVE_COLORS.forEach((color, index) => {
        const ring = new PIXI.Graphics();
        ring.lineStyle(10 - index, color, 0.82 - index * 0.12);
        ring.drawCircle(0, 0, 28 + index * 8);
        ring.scale.set(0.12);
        waveContainer.addChild(ring);

        animations.push(
            gsap.to(ring.scale, {
                x: 10.5,
                y: 10.5,
                duration: 0.65,
                delay: index * 0.04,
                ease: "power2.out"
            }),
            gsap.to(ring, {
                alpha: 0,
                duration: 0.65,
                delay: index * 0.04,
                ease: "power1.out"
            })
        );
    });

    gsap.delayedCall(0.85, () => {
        animations.forEach(anim => anim.kill());
        if (waveContainer.parent) waveContainer.parent.removeChild(waveContainer);
        waveContainer.destroy({ children: true });
    });
}

function animateNeatSweepRemove(obj, delay = 0, onComplete) {
    if (obj.lifetimeCheckTimeout) {
        clearTimeout(obj.lifetimeCheckTimeout);
        obj.lifetimeCheckTimeout = null;
    }

    if (obj.animations) {
        obj.animations.forEach(anim => {
            if (typeof anim.pause === 'function') anim.pause();
            if (typeof anim.kill === 'function') anim.kill();
        });
    }

    obj.interactive = false;
    obj.buttonMode = false;

    gsap.to(obj, {
        alpha: 0,
        duration: 0.28,
        delay,
        ease: "power1.inOut"
    });
    gsap.to(obj.scale, {
        x: 0.82,
        y: 0.82,
        duration: 0.28,
        delay,
        ease: "power2.in",
        onComplete: () => {
            if (obj.parent) obj.parent.removeChild(obj);
            removeObjectFromActiveList(obj);
            if (onComplete) onComplete();
        }
    });
}

function clearFieldWithNeat(triggerContainer) {
    clearSpawnTimer();
    startSpawnResumeDelay(NEAT_SPAWN_DELAY_MS);

    const targets = [...activeObjects];
    if (!targets.length) return;

    const clearedTargets = targets.filter(obj => obj !== triggerContainer);
    if (clearedTargets.length) {
        score += clearedTargets.reduce((sum, obj) => sum + getObjectScoreValue(obj), 0);
    }

    targets.forEach((obj, index) => {
        const delay = obj === triggerContainer ? 0.12 : Math.min(0.16, 0.03 + index * 0.01);
        animateNeatSweepRemove(obj, delay);
    });
}

function buildChameleonFieldOverlay(width, height, radius) {
    const overlay = new PIXI.Container();
    overlay.name = 'chameleonFieldOverlay';

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(2, Math.round(width));
    canvas.height = Math.max(2, Math.round(height));
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#ffd6e3');
    gradient.addColorStop(0.18, '#ffe2c2');
    gradient.addColorStop(0.36, '#fff1c4');
    gradient.addColorStop(0.54, '#d7f5d1');
    gradient.addColorStop(0.72, '#d7efff');
    gradient.addColorStop(1, '#eadcff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.ellipse(
            canvas.width * (0.12 + i * 0.16),
            canvas.height * (0.2 + (i % 2) * 0.28),
            canvas.width * 0.18,
            canvas.height * 0.26,
            Math.PI / 6,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }

    const texture = PIXI.Texture.from(canvas);
    const sprite = new PIXI.Sprite(texture);
    sprite.width = width;
    sprite.height = height;
    sprite.alpha = 0.55;
    overlay.addChild(sprite);

    const mask = new PIXI.Graphics();
    mask.beginFill(0xFFFFFF);
    mask.drawRoundedRect(0, 0, width, height, radius);
    mask.endFill();
    overlay.addChild(mask);
    overlay.mask = mask;

    overlay._dynamicTexture = texture;
    overlay._anims = [
        gsap.to(sprite, {
            alpha: 0.68,
            duration: 1.2,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        }),
        gsap.to(sprite, {
            x: -18,
            duration: 2.6,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        })
    ];

    return overlay;
}

function clearChameleonFieldOverlay() {
    if (!chameleonFieldOverlay) return;

    chameleonFieldOverlay._anims?.forEach(anim => anim.kill());
    if (chameleonFieldOverlay.parent) {
        chameleonFieldOverlay.parent.removeChild(chameleonFieldOverlay);
    }
    chameleonFieldOverlay._dynamicTexture?.destroy(true);
    chameleonFieldOverlay.destroy({ children: true });
    chameleonFieldOverlay = null;
}

function syncChameleonFieldOverlay() {
    if (!playArea) return;

    if (!isChameleonEffectActive()) {
        clearChameleonFieldOverlay();
        return;
    }

    const radius = playArea._fieldRadius ?? BORDER_RADIUS;
    const needsRebuild =
        !chameleonFieldOverlay ||
        chameleonFieldOverlay.parent !== playArea ||
        Math.round(chameleonFieldOverlay.width) !== Math.round(playArea._fieldWidth ?? playArea.width) ||
        Math.round(chameleonFieldOverlay.height) !== Math.round(playArea._fieldHeight ?? playArea.height);

    if (needsRebuild) {
        clearChameleonFieldOverlay();
        chameleonFieldOverlay = buildChameleonFieldOverlay(
            playArea._fieldWidth ?? playArea.width,
            playArea._fieldHeight ?? playArea.height,
            radius
        );
        playArea.addChildAt(chameleonFieldOverlay, Math.min(1, playArea.children.length));
    }
}

function finishFrozenEffect() {
    const now = Date.now();

    if (!isPaused) {
        activeObjects.forEach(obj => syncObjectLifetime(obj, now));
    }

    frozenEffectStartedAt = 0;
    frozenEffectEndsAt = 0;

    if (frozenEffectTimer) {
        clearTimeout(frozenEffectTimer);
        frozenEffectTimer = null;
    }

    if (!isPaused) {
        activeObjects.forEach(obj => applyObjectAnimationTimeScale(obj, now));
    }
}

function activateFrozenEffect() {
    const now = Date.now();

    if (isFrozenEffectActive(now) && !isPaused) {
        activeObjects.forEach(obj => syncObjectLifetime(obj, now));
    }

    frozenEffectStartedAt = now;
    frozenEffectEndsAt = now + FROZEN_EFFECT_DURATION_MS;

    if (frozenEffectTimer) {
        clearTimeout(frozenEffectTimer);
    }

    frozenEffectTimer = setTimeout(finishFrozenEffect, FROZEN_EFFECT_DURATION_MS);
    activeObjects.forEach(obj => applyObjectAnimationTimeScale(obj, now));
}

function finishChameleonEffect() {
    chameleonEffectStartedAt = 0;
    chameleonEffectEndsAt = 0;

    if (chameleonEffectTimer) {
        clearTimeout(chameleonEffectTimer);
        chameleonEffectTimer = null;
    }

    clearChameleonFieldOverlay();
}

function activateChameleonEffect() {
    const now = Date.now();

    chameleonEffectStartedAt = now;
    chameleonEffectEndsAt = now + CHAMELEON_EFFECT_DURATION_MS;
    clearActiveColor();
    syncChameleonFieldOverlay();

    if (chameleonEffectTimer) {
        clearTimeout(chameleonEffectTimer);
    }

    chameleonEffectTimer = setTimeout(finishChameleonEffect, CHAMELEON_EFFECT_DURATION_MS);
}



function freezeActiveObjects() {
  activeObjects.forEach(obj => {
    // останавливаем проверки жизни
    if (obj.lifetimeCheckTimeout) {
      clearTimeout(obj.lifetimeCheckTimeout);
      obj.lifetimeCheckTimeout = null;
    }
    // ставим на паузу анимации
    if (obj.animations) {
      obj.animations.forEach(anim => anim.pause && anim.pause());
    }
    // режем интеракцию
    obj.interactive = false;
    obj.buttonMode = false;
  });
}
        
        // Remove all active objects silently (no life penalties, no score changes)
        function removeAllActiveObjectsSilent() {
          // Work on a copy because we'll mutate activeObjects during removal
          const toRemove = [...activeObjects];
          toRemove.forEach(obj => {
            // stop lifetime checks
            if (obj.lifetimeCheckTimeout) {
              clearTimeout(obj.lifetimeCheckTimeout);
              obj.lifetimeCheckTimeout = null;
            }
            // stop/kill animations
            if (obj.animations) {
              obj.animations.forEach(anim => {
                if (typeof anim.pause === 'function') anim.pause();
                if (typeof anim.kill === 'function') anim.kill();
              });
            }
            // disable interactions
            obj.interactive = false;
            obj.buttonMode = false;
            // quick fade/slide out
            gsap.to(obj, {
              y: obj.y + 80,
              alpha: 0,
              duration: 0.25,
              ease: "power1.in",
              onComplete: () => {
                if (obj.parent) obj.parent.removeChild(obj);
                removeObjectFromActiveList(obj);
              }
            });
          });
        }

        // Мгновенное удаление всех активных объектов (без анимаций) - для перехода между уровнями
        function removeAllActiveObjectsImmediate() {
          // Work on a copy because we'll mutate activeObjects during removal
          const toRemove = [...activeObjects];
          toRemove.forEach(obj => {
            // stop lifetime checks
            if (obj.lifetimeCheckTimeout) {
              clearTimeout(obj.lifetimeCheckTimeout);
              obj.lifetimeCheckTimeout = null;
            }
            // stop/kill animations immediately
            if (obj.animations) {
              obj.animations.forEach(anim => {
                if (typeof anim.kill === 'function') anim.kill();
                if (typeof anim.pause === 'function') anim.pause();
              });
              obj.animations = [];
            }
            // disable interactions
            obj.interactive = false;
            obj.buttonMode = false;
            // remove immediately without animation
            if (obj.parent) {
              obj.parent.removeChild(obj);
            }
          });
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
    minHeight = 240,
    screenMargin = 12
} = {}) {
    const availableWidth = Math.max(220, app.screen.width - screenMargin * 2);
    const availableHeight = Math.max(180, app.screen.height - screenMargin * 2);
    const targetWidth = Math.max(Math.min(280, availableWidth), Math.round(app.screen.width * widthRatio));
    const targetHeight = Math.max(Math.min(minHeight, availableHeight), Math.round(app.screen.height * heightRatio));

    const width = Math.min(maxWidth, availableWidth, targetWidth);
    const height = Math.min(maxHeight, availableHeight, targetHeight);

    return {
        width,
        height,
        x: Math.round((app.screen.width - width) / 2),
        y: Math.round((app.screen.height - height) / 2)
    };
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
    if (isPaused) return; // Don't handle keys during pause
    
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
    if (document.hidden) clearActiveColor();
});

// ==== Стартовый экран ====

const titleStyle = new PIXI.TextStyle({
    fontSize: 72,
    fill: THEME.primary,
    fontWeight: 'bold',
    fontFamily: 'Arial',
    stroke: THEME.borderDark,
    strokeThickness: 8,
    align: 'center'
});

const title = new PIXI.Text("ЖУКОДАВ", titleStyle);
title.anchor.set(0.5);
title.x = app.screen.width / 2;
title.y = app.screen.height / 2 - 150;
startContainer.addChild(title);

// Кнопка PLAY
const playButton = new PIXI.Graphics();
const btnWidth = 200;
const btnHeight = 70;
playButton.beginFill(THEME.primary); // фон кнопки
playButton.lineStyle(6, THEME.borderDark); // обводка
playButton.drawRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 30);
playButton.endFill();
playButton.x = app.screen.width / 2;
playButton.y = app.screen.height / 2 + 50;
playButton.interactive = true;
playButton.buttonMode = true;
playButton.on('pointerdown', () => {
    showLevelSelect();
});
startContainer.addChild(playButton);

// Текст PLAY
const playText = new PIXI.Text("PLAY", {
    fontSize: 36,
    fill: THEME.white,
    fontWeight: 'bold',
    fontFamily: 'Arial'
});
playText.anchor.set(0.5);
playButton.addChild(playText);

// ==== Экран выбора уровня ====
function showLevelSelect() {
    clearSpawnTimer();
    finishFrozenEffect();
    isPaused = false;
    introActive = false;
    levelEnded = false;
    orientationPauseActive = false;
    clearActiveColor();
    objectQueue = [];

    app.stage.removeChild(startContainer);
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
        fontFamily: 'Arial'
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
    let dragging = false;
    let dragMoved = false;
    let startY = 0;
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
        button.on('pointerup', () => {
            gsap.to(button.scale, { x: 1, y: 1, duration: 0.12, ease: "back.out(1.7)" });
            if (!dragMoved && !levelSelectContainer.getChildByName('levelEntryPopup')) {
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
        const currentY = e.data.global.y;

        if (Math.abs(currentY - startY) > 8) {
            dragMoved = true;
        }

        velocity = ((currentY - lastY) / Math.max(1, deltaTime)) * 16.67;
        scrollContainer.y = applyRubberBand(startScrollY + (currentY - startY));
        
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
    popup.x = popupBounds.x;
    popup.y = popupBounds.y;
    popup.interactive = true;
    popup.hitArea = new PIXI.Rectangle(0, 0, popupWidth, popupHeight);
    popup.on('pointerdown', (event) => event.stopPropagation());
    popup.on('pointerup', (event) => event.stopPropagation());
    popup.on('pointerupoutside', (event) => event.stopPropagation());

    const bg = new PIXI.Graphics();
    bg.beginFill(THEME.cardBg);
    bg.drawRoundedRect(0, 0, popupWidth, popupHeight, 30);
    bg.endFill();

    const border = new PIXI.Graphics();
    border.lineStyle(6, THEME.border, 1);
    border.drawRoundedRect(0, 0, popupWidth, popupHeight, 30);

    popup.addChild(bg);
    popup.addChild(border);

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
        fontFamily: 'Arial',
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
  // Очищаем предыдущий уровень: останавливаем интервалы и таймеры
  cleanupLevelSelectScroll();
  clearSpawnTimer();
  clearSpawnResumeDelay();
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
  
  app.stage.removeChild(levelSelectContainer);
  app.stage.addChild(gameContainer);
  gameContainer.addChild(rootUI);
  levelData = levels[index];

  maxSimultaneousObjects = levelData.params.maxObjects;

  score = 0;
  life = levelData.lifeCount;

  const { fieldWrapper, playField } = setupPlayArea();
  playArea = playField;
  syncChameleonFieldOverlay();
  updateMobilePortraitOverlay();

    // реальный старт спавна
  const startSpawning = () => {
    prepareObjectQueue();
    scheduleNextSpawn(0);
    if (typeof levelData.onEnterLevel === 'function') levelData.onEnterLevel();
  };

  // если в конфиге уровня есть интро-попап — сначала показываем его, спавн не запускаем
  if (levelData.introPopup) {
    introActive = true; // ⬅ блокируем спавн
    showIntroPopup(levelData.introPopup, startSpawning);
  } else {
    startSpawning();
  }

}




// игровое поле
function setupPlayArea() {
    gameLayout = getGameLayout();
    rootUI.removeChildren();
    currentGameUI = { hearts: [] };
    colorButtonsMap = {};

    const coloredTypes = Object.keys(levelData.params.spawnWeights || {}).filter(type =>
        type.startsWith('coloredBug_') || type.startsWith('fatColoredBug_')
    );

    if (gameLayout.mode === 'mobile-landscape') {
        return setupMobileLandscapePlayArea(gameLayout, coloredTypes);
    }

    return setupDesktopPlayArea(gameLayout, coloredTypes);
}

function setupDesktopPlayArea(layout, coloredTypes) {
    const wideLayout = calculateGameLayout();
    buildGameBackground(wideLayout);
    buildTopHud(wideLayout, levelData);
    const { fieldWrapper, playField } = buildPlayField(wideLayout);
    buildSideColorPanels(coloredTypes, wideLayout);

    return { fieldWrapper, playField };
}

function calculateGameLayout() {
    const W = app.screen.width;
    const H = app.screen.height;
    const padding = Math.max(8, Math.min(W, H) * 0.015, CASUAL_UI.outerPadding);
    const hudH = Math.max(82, Math.min(150, H * CASUAL_UI.topHudHeightRatio));
    const gap = Math.max(8, W * CASUAL_UI.gapRatio);
    const sideW = Math.max(96, Math.min(170, W * CASUAL_UI.sidePanelWidthRatio));
    const contentY = padding + hudH + gap;
    const contentH = Math.max(220, H - contentY - padding);
    const playX = padding + sideW + gap;
    const playY = contentY;
    const playW = Math.max(320, W - padding * 2 - sideW * 2 - gap * 2);
    const playH = contentH;
    const buttonGap = Math.max(10, Math.min(24, playH * 0.045));
    const buttonSize = Math.max(58, Math.min(sideW * 0.78, (playH - buttonGap) / 2, 118));

    return {
        mode: 'desktop-wide',
        screenWidth: W,
        screenHeight: H,
        padding,
        gap,
        hud: {
            x: padding,
            y: padding,
            width: W - padding * 2,
            height: hudH,
            radius: CASUAL_UI.panelRadius
        },
        content: {
            y: contentY,
            height: contentH
        },
        leftPanel: {
            x: padding,
            y: contentY,
            width: sideW,
            height: contentH,
            radius: CASUAL_UI.panelRadius
        },
        rightPanel: {
            x: W - padding - sideW,
            y: contentY,
            width: sideW,
            height: contentH,
            radius: CASUAL_UI.panelRadius
        },
        playField: {
            x: playX,
            y: playY,
            width: playW,
            height: playH,
            radius: CASUAL_UI.playfieldRadius
        },
        buttons: {
            size: buttonSize,
            gap: buttonGap
        }
    };
}

function buildGameBackground(layout) {
    if (TEXTURES.bg_game) {
        rootUI.addChild(createCoverBackground('bg_game', layout.screenWidth, layout.screenHeight, 0xFFC55A));
        return;
    }

    const bg = new PIXI.Graphics();
    bg.beginFill(0xFFC55A);
    bg.drawRect(0, 0, layout.screenWidth, layout.screenHeight);
    bg.endFill();

    const board = new PIXI.Graphics();
    const inset = Math.max(4, Math.min(layout.screenWidth, layout.screenHeight) * 0.006);
    const radius = Math.max(22, Math.min(34, layout.screenHeight * 0.055));
    board.beginFill(0xFFE28B);
    board.drawRoundedRect(inset, inset, layout.screenWidth - inset * 2, layout.screenHeight - inset * 2, radius);
    board.endFill();
    board.lineStyle(Math.max(3, inset * 0.8), 0xB86720, 0.55);
    board.drawRoundedRect(inset, inset, layout.screenWidth - inset * 2, layout.screenHeight - inset * 2, radius);

    const topGlow = new PIXI.Graphics();
    topGlow.beginFill(0xFFF0B4, 0.58);
    topGlow.drawRoundedRect(inset + 14, inset + 8, layout.screenWidth - inset * 2 - 28, layout.screenHeight * 0.18, radius - 8);
    topGlow.endFill();

    const bottomShade = new PIXI.Graphics();
    bottomShade.beginFill(0xE9932E, 0.2);
    bottomShade.drawRoundedRect(inset + 8, layout.screenHeight - inset - 22, layout.screenWidth - inset * 2 - 16, 14, 8);
    bottomShade.endFill();

    const sparkles = new PIXI.Graphics();
    sparkles.beginFill(0xFFF5C8, 0.7);
    sparkles.drawCircle(layout.screenWidth * 0.075, layout.screenHeight * 0.18, 4);
    sparkles.drawCircle(layout.screenWidth * 0.94, layout.screenHeight * 0.56, 5);
    sparkles.drawCircle(layout.screenWidth * 0.09, layout.screenHeight * 0.91, 5);
    sparkles.drawCircle(layout.screenWidth * 0.965, layout.screenHeight * 0.92, 7);
    sparkles.endFill();

    rootUI.addChild(bg);
    rootUI.addChild(board);
    rootUI.addChild(topGlow);
    rootUI.addChild(bottomShade);
    rootUI.addChild(sparkles);
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

function addSoftLeafDetails(container, width, height, inset = 24, alpha = 0.45) {
    const details = new PIXI.Graphics();
    details.lineStyle(2, 0xE8B568, alpha);
    details.beginFill(0xFFE2A0, alpha * 0.8);
    details.drawEllipse(inset, inset + 2, 12, 5);
    details.drawEllipse(inset + 12, inset + 14, 10, 4);
    details.drawEllipse(width - inset, inset + 2, 12, 5);
    details.drawEllipse(width - inset - 12, inset + 14, 10, 4);
    details.drawEllipse(inset, height - inset - 2, 12, 5);
    details.drawEllipse(inset + 12, height - inset - 14, 10, 4);
    details.drawEllipse(width - inset, height - inset - 2, 12, 5);
    details.drawEllipse(width - inset - 12, height - inset - 14, 10, 4);
    details.endFill();
    container.addChild(details);
}

function buildTopHud(layout, level) {
    hudContainer = new PIXI.Container();
    hudContainer.name = 'topHudContainer';
    hudContainer.x = layout.hud.x;
    hudContainer.y = layout.hud.y;

    const customHud = createUIAssetSprite('game_hud_panel', layout.hud.width, layout.hud.height, { fit: 'stretch' });
    if (customHud) {
        hudContainer.addChild(customHud);
    } else {
        const hudBg = createCandyPanel(layout.hud.width, layout.hud.height, layout.hud.radius, {
            fill: 0xFFD16A,
            innerFill: 0xFFE9A6,
            border: 0xF4B04C,
            darkBorder: 0xB96420,
            borderWidth: 5,
            inset: 14
        });
        hudContainer.addChild(hudBg);

        const leftPatchW = Math.max(112, layout.hud.width * 0.12);
        const leftPatch = new PIXI.Graphics();
        leftPatch.beginFill(0xFFE9AD, 0.62);
        leftPatch.drawRoundedRect(18, 16, leftPatchW, layout.hud.height - 28, Math.max(18, layout.hud.radius - 8));
        leftPatch.endFill();
        leftPatch.lineStyle(2, 0xFFF4C8, 0.65);
        leftPatch.drawRoundedRect(18, 16, leftPatchW, layout.hud.height - 28, Math.max(18, layout.hud.radius - 8));
        hudContainer.addChild(leftPatch);
    }

    const labelStyle = new PIXI.TextStyle({
        fontSize: Math.max(24, Math.min(42, layout.hud.height * 0.34)),
        fill: 0xFFF7E8,
        fontWeight: '900',
        fontFamily: 'Arial',
        stroke: 0x9A5422,
        strokeThickness: 5,
        lineJoin: 'round'
    });

    const livesLabel = new PIXI.Text('\u0416\u0418\u0417\u041d\u0418', labelStyle);
    livesLabel.anchor.set(0, 0.5);
    livesLabel.x = Math.max(160, layout.hud.width * 0.21);
    livesLabel.y = layout.hud.height * 0.52;
    hudContainer.addChild(livesLabel);

    const pauseSize = Math.max(56, Math.min(86, layout.hud.height * 0.74));
    const pauseX = layout.hud.width - pauseSize - Math.max(18, layout.hud.width * 0.018);
    const goalBadgeW = Math.max(178, Math.min(250, layout.hud.width * 0.19));
    const goalBadgeH = Math.max(50, Math.min(70, layout.hud.height * 0.58));
    const goalBadgeX = pauseX - goalBadgeW - Math.max(24, layout.hud.width * 0.045);

    const hearts = [];
    const heartsRowX = livesLabel.x + livesLabel.width + 16;
    const maxHeartsWidth = Math.max(0, goalBadgeX - heartsRowX - 18);
    let heartSize = Math.max(24, Math.min(44, layout.hud.height * 0.36));
    const heartCount = Math.max(1, level.lifeCount);
    const naturalHeartsWidth = level.lifeCount * heartSize + Math.max(0, level.lifeCount - 1) * HEART_GAP;
    if (naturalHeartsWidth > maxHeartsWidth) {
        heartSize = Math.max(16, Math.floor((maxHeartsWidth - Math.max(0, level.lifeCount - 1) * 3) / heartCount));
    }
    const heartGap = level.lifeCount > 1
        ? Math.max(3, Math.min(HEART_GAP, (maxHeartsWidth - level.lifeCount * heartSize) / (level.lifeCount - 1)))
        : 0;
    const heartsRow = new PIXI.Container();
    heartsRow.name = 'heartsRow';
    heartsRow.x = heartsRowX;
    heartsRow.y = layout.hud.height * 0.52 - heartSize / 2;

    for (let i = 0; i < level.lifeCount; i++) {
        let heart;
        if (TEXTURES.heart) {
            heart = new PIXI.Sprite(TEXTURES.heart);
            heart.width = heartSize;
            heart.height = heartSize;
        } else {
            heart = new PIXI.Text('\u2665', {
                fontSize: heartSize,
                fill: THEME.fail,
                fontWeight: '900',
                fontFamily: 'Arial',
                stroke: 0x9A5422,
                strokeThickness: 2
            });
        }
        heart.x = i * (heartSize + heartGap);
        heartsRow.addChild(heart);
        hearts.push(heart);
    }
    hudContainer.addChild(heartsRow);

    const pauseButton = createSettingsButton(pauseSize);
    pauseButton.x = pauseX;
    pauseButton.y = (layout.hud.height - pauseSize) / 2;
    hudContainer.addChild(pauseButton);

    const customGoalBadge = createUIAssetSprite('game_goal_badge', goalBadgeW, goalBadgeH, { contain: false });
    const goalBadge = new PIXI.Container();
    if (customGoalBadge) {
        goalBadge.addChild(customGoalBadge);
    } else {
        goalBadge.addChild(createRoundedLabel('', {
            width: goalBadgeW,
            height: goalBadgeH,
            radius: Math.max(20, goalBadgeH * 0.42),
            fill: 0xFFF6E8,
            borderColor: 0xE8A24A,
            borderWidth: 4
        }));
    }
    goalBadge.x = goalBadgeX;
    goalBadge.y = (layout.hud.height - goalBadgeH) / 2;

    const goalText = new PIXI.Text(`\u0426\u0415\u041b\u042c ${level.goalBugCount}`, {
        fontSize: Math.max(20, Math.min(33, goalBadgeH * 0.46)),
        fill: 0x7A461F,
        fontWeight: '900',
        fontFamily: 'Arial',
        stroke: 0xFFFFFF,
        strokeThickness: 3
    });
    goalText.anchor.set(0.5);
    goalText.x = goalBadgeW / 2;
    goalText.y = goalBadgeH / 2;
    goalText.name = 'progText';
    goalBadge.addChild(goalText);
    hudContainer.addChild(goalBadge);

    currentGameUI = {
        mode: 'desktop-wide',
        header: hudContainer,
        progText: goalText,
        hearts
    };
    updateLevelHeader(score, life);

    rootUI.addChild(hudContainer);
    return hudContainer;
}

function createSettingsButton(size) {
    const button = new PIXI.Container();
    button.name = 'pauseButton';
    button.interactive = true;
    button.buttonMode = true;
    button.on('pointerdown', showPausePopup);

    const customBg = createUIAssetSprite('game_settings_button', size, size, { contain: false });
    if (customBg) {
        button.addChild(customBg);
    } else {
        button.addChild(createCandyPanel(size, size, Math.max(18, size * 0.24), {
            fill: 0xFFB13B,
            innerFill: 0xFFD067,
            border: 0xF0781F,
            darkBorder: 0xB45F1F,
            borderWidth: Math.max(4, size * 0.06),
            inset: Math.max(7, size * 0.12)
        }));
    }

    if (TEXTURES.gear) {
        const gear = new PIXI.Sprite(TEXTURES.gear);
        gear.anchor.set(0.5);
        const scale = Math.min((size * 0.58) / gear.texture.width, (size * 0.58) / gear.texture.height);
        gear.scale.set(scale);
        gear.x = size / 2;
        gear.y = size / 2;
        button.addChild(gear);
    } else {
        const icon = new PIXI.Text('\u2699', {
            fontSize: Math.floor(size * 0.48),
            fill: THEME.white,
            fontWeight: '900',
            fontFamily: 'Arial',
            stroke: THEME.borderDark,
            strokeThickness: 3
        });
        icon.anchor.set(0.5);
        icon.x = size / 2;
        icon.y = size / 2;
        button.addChild(icon);
    }

    return button;
}

function buildPlayField(layout) {
    playAreaFrame = new PIXI.Container();
    playAreaFrame.name = 'playAreaFrame';
    playAreaFrame.x = layout.playField.x;
    playAreaFrame.y = layout.playField.y;
    playAreaFrame.width = layout.playField.width;
    playAreaFrame.height = layout.playField.height;

    const playField = new PIXI.Container();
    playField.name = 'playArea';
    playField.width = layout.playField.width;
    playField.height = layout.playField.height;
    playField._fieldWidth = layout.playField.width;
    playField._fieldHeight = layout.playField.height;
    playField._fieldRadius = layout.playField.radius;

    const customFrame = createUIAssetSprite('game_playfield_frame', layout.playField.width, layout.playField.height, { fit: 'stretch' });
    const shell = customFrame || createCandyPanel(layout.playField.width, layout.playField.height, layout.playField.radius, {
        fill: 0xFFF2D2,
        innerFill: 0xFFF8EB,
        border: 0xF2A13A,
        darkBorder: 0xB86421,
        borderWidth: 8,
        inset: 13
    });

    const fieldInset = Math.max(18, Math.min(28, Math.min(layout.playField.width, layout.playField.height) * 0.045));
    const innerRadius = Math.max(18, layout.playField.radius - 12);
    const fieldBg = new PIXI.Graphics();
    fieldBg.beginFill(0xFFF9EF, 0.98);
    fieldBg.drawRoundedRect(fieldInset, fieldInset, layout.playField.width - fieldInset * 2, layout.playField.height - fieldInset * 2, innerRadius);
    fieldBg.endFill();
    fieldBg.lineStyle(3, 0xE7A04A, 0.85);
    fieldBg.drawRoundedRect(fieldInset, fieldInset, layout.playField.width - fieldInset * 2, layout.playField.height - fieldInset * 2, innerRadius);

    const innerHighlight = new PIXI.Graphics();
    innerHighlight.lineStyle(2, 0xFFFFFF, 0.78);
    innerHighlight.drawRoundedRect(fieldInset + 5, fieldInset + 5, layout.playField.width - fieldInset * 2 - 10, layout.playField.height - fieldInset * 2 - 10, Math.max(14, innerRadius - 5));

    playField.addChild(shell, fieldBg, innerHighlight);
    addSoftLeafDetails(playField, layout.playField.width, layout.playField.height, fieldInset + 26, 0.38);
    addSpawnZoneDebugOverlay(playField);

    playAreaFrame.addChild(playField);
    rootUI.addChild(playAreaFrame);

    return { fieldWrapper: playAreaFrame, playField };
}

function createPanelBackground(width, height, radius = CASUAL_UI.panelRadius) {
    const customPanel = createUIAssetSprite('game_side_panel', width, height, { contain: false });
    if (customPanel) {
        const panel = new PIXI.Container();
        panel.addChild(customPanel);
        return panel;
    }

    const panel = createCandyPanel(width, height, radius, {
        fill: 0xFFE1A0,
        innerFill: 0xFFF0CB,
        border: 0xF0A34A,
        darkBorder: 0xB86720,
        borderWidth: 5,
        inset: 9
    });

    const dashed = new PIXI.Graphics();
    dashed.lineStyle(2, 0xE9B86D, 0.55);
    const dash = 10;
    const gap = 8;
    const x = 14;
    const y = 16;
    const w = width - 28;
    const h = height - 32;
    for (let px = x + 12; px < x + w - 12; px += dash + gap) {
        dashed.moveTo(px, y);
        dashed.lineTo(Math.min(px + dash, x + w - 12), y);
        dashed.moveTo(px, y + h);
        dashed.lineTo(Math.min(px + dash, x + w - 12), y + h);
    }
    for (let py = y + 12; py < y + h - 12; py += dash + gap) {
        dashed.moveTo(x, py);
        dashed.lineTo(x, Math.min(py + dash, y + h - 12));
        dashed.moveTo(x + w, py);
        dashed.lineTo(x + w, Math.min(py + dash, y + h - 12));
    }
    panel.addChild(dashed);
    addSoftLeafDetails(panel, width, height, 22, 0.35);
    return panel;
}

function createRoundedLabel(text, options) {
    const {
        width,
        height,
        radius = 18,
        fill = THEME.cardBg,
        borderColor = THEME.border,
        borderWidth = 4
    } = options;
    const label = createRoundedPanel(width, height, radius, fill, borderColor, borderWidth);

    if (text) {
        const labelText = new PIXI.Text(text, {
            fontSize: Math.floor(height * 0.42),
            fill: THEME.textDark,
            fontWeight: '900',
            fontFamily: 'Arial'
        });
        labelText.anchor.set(0.5);
        labelText.x = width / 2;
        labelText.y = height / 2;
        label.addChild(labelText);
    }

    return label;
}

function setupMobileLandscapePlayArea(layout, coloredTypes) {
    rootUI.addChild(createCoverBackground('bg_game', layout.screenWidth, layout.screenHeight, 0xFFC55A));

    const header = buildMobileLevelHeader(layout, levelData);
    rootUI.addChild(header);

    const customFrame = createUIAssetSprite('game_playfield_frame', layout.fieldShell.width, layout.fieldShell.height, { fit: 'stretch' });
    const fieldShell = new PIXI.Container();
    fieldShell.addChild(customFrame || createRoundedPanel(
            layout.fieldShell.width,
            layout.fieldShell.height,
            layout.fieldShell.radius,
            THEME.cardBg,
            THEME.border,
            6
        ));
    fieldShell.x = layout.fieldShell.x;
    fieldShell.y = layout.fieldShell.y;
    fieldShell.name = 'fieldShell';

    const playField = new PIXI.Container();
    playField.x = layout.fieldShell.padding;
    playField.y = layout.fieldShell.padding;
    playField.width = layout.playField.width;
    playField.height = layout.playField.height;
    playField._fieldWidth = layout.playField.width;
    playField._fieldHeight = layout.playField.height;

    const fieldBg = new PIXI.Graphics();
    fieldBg.beginFill(THEME.fieldBg);
    fieldBg.drawRoundedRect(0, 0, layout.playField.width, layout.playField.height, layout.playField.radius);
    fieldBg.endFill();

    const fieldBorder = new PIXI.Graphics();
    fieldBorder.lineStyle(4, 0xE6B05A, 0.85);
    fieldBorder.drawRoundedRect(0, 0, layout.playField.width, layout.playField.height, layout.playField.radius);

    playField.addChild(fieldBg);
    playField.addChild(fieldBorder);
    playField._fieldRadius = layout.playField.radius;
    addSpawnZoneDebugOverlay(playField);
    fieldShell.addChild(playField);
    rootUI.addChild(fieldShell);

    buildSideColorColumns(coloredTypes, layout);
    buildMobilePauseButton(layout);

    return { fieldWrapper: fieldShell, playField };
}

function buildDesktopLevelHeader(wrapper, level, layout) {
    const { header, ui } = buildDesktopLevelHeaderUI({
        wrapper,
        level,
        layout,
        theme: THEME,
        heartSizeRatio: HEART_SIZE_PRC,
        heartGap: HEART_GAP
    });
    currentGameUI = ui;
    return header;
}

function buildMobileLevelHeader(layout, level) {
    const mobileTextures = {
        ...TEXTURES,
        goal_panel: TEXTURES.game_goal_badge || TEXTURES.goal_panel
    };
    const { header, ui } = buildMobileLevelHeaderUI({
        layout,
        level,
        theme: THEME,
        textures: mobileTextures,
        score
    });

    const customHud = createUIAssetSprite('game_hud_panel', layout.header.width, layout.header.height, { fit: 'stretch' });
    if (customHud) {
        header.addChildAt(customHud, 0);
    }

    currentGameUI = ui;
    updateLevelHeader(score, life);
    return header;
}

function buildSideColorPanels(coloredTypes, layout) {
    sidePanelsContainer = new PIXI.Container();
    sidePanelsContainer.name = 'sidePanelsContainer';
    colorButtonsContainer = sidePanelsContainer;
    colorButtonsMap = {};
    dynamicColorKeyMap = {};

    const usedColors = new Set(coloredTypes.map(type => type.split('_')[1]).filter(Boolean));

    const buildPanel = (panelLayout, side) => {
        const panel = new PIXI.Container();
        panel.name = `${side}ColorPanel`;
        panel.x = panelLayout.x;
        panel.y = panelLayout.y;
        panel.addChild(createPanelBackground(panelLayout.width, panelLayout.height, panelLayout.radius));

        const slots = COLOR_BUTTON_SLOTS.filter((slot) => slot.side === side);
        const totalButtonsH = slots.length * layout.buttons.size + (slots.length - 1) * layout.buttons.gap;
        const startY = Math.max(18, (panelLayout.height - totalButtonsH) / 2);

        slots.forEach((slot, index) => {
            const isEnabled = usedColors.has(slot.color);
            if (isEnabled) {
                dynamicColorKeyMap[slot.key] = slot.color;
            }

            const button = createColorButton(slot.color, layout.buttons.size, slot.key, !IS_TOUCH, 'side');
            button.x = (panelLayout.width - layout.buttons.size) / 2;
            button.y = startY + index * (layout.buttons.size + layout.buttons.gap);
            button.alpha = isEnabled ? 1 : 0.45;
            button.interactive = isEnabled;
            button.buttonMode = isEnabled;
            panel.addChild(button);

            if (!colorButtonsMap[slot.color]) {
                colorButtonsMap[slot.color] = [];
            }
            colorButtonsMap[slot.color].push(button);
        });

        sidePanelsContainer.addChild(panel);
    };

    buildPanel(layout.leftPanel, 'left');
    buildPanel(layout.rightPanel, 'right');
    rootUI.addChild(sidePanelsContainer);
}

function buildSideColorColumns(coloredTypes, layout) {
    colorButtonsContainer = rootUI;
    const availableColors = new Set(getUsedLevelColors());
    dynamicColorKeyMap = {};
    colorButtonsMap = {};

    const buildColumn = (columnLayout, slotColors, name) => {
        const column = new PIXI.Container();
        column.name = name;
        column.x = columnLayout.x;
        column.y = columnLayout.y;

        const buttonWidth = layout.buttons.width;
        const buttonHeight = layout.buttons.height;
        const verticalGap = layout.buttons.gap;
        const visibleColors = slotColors.filter((color) => availableColors.has(color));
        const stackHeight = visibleColors.length * buttonHeight + Math.max(0, visibleColors.length - 1) * verticalGap;
        const startY = Math.max(0, (columnLayout.height - stackHeight) / 2);
        let visibleIndex = 0;

        if (visibleColors.length) {
            column.addChild(createPanelBackground(columnLayout.width, columnLayout.height, Math.max(20, columnLayout.width * 0.28)));
        }

        visibleColors.forEach((color) => {

            const key = COLOR_BUTTON_SLOTS.find((slot) => slot.color === color)?.key || '';
            if (key) {
                dynamicColorKeyMap[key] = color;
            }
            const button = createColorButton(color, buttonWidth, key, false, 'mobile-tall', buttonHeight);
            button.x = (columnLayout.width - buttonWidth) / 2;
            button.y = startY + visibleIndex * (buttonHeight + verticalGap);
            column.addChild(button);

            if (!colorButtonsMap[color]) {
                colorButtonsMap[color] = [];
            }
            colorButtonsMap[color].push(button);
            visibleIndex++;
        });

        rootUI.addChild(column);
    };

    buildColumn(layout.leftButtons, MOBILE_FIXED_BUTTON_COLUMNS.left, 'leftColorColumn');
    buildColumn(layout.rightButtons, MOBILE_FIXED_BUTTON_COLUMNS.right, 'rightColorColumn');
}

function buildMobilePauseButton(layout) {
    const size = layout.pauseButton.size;
    const button = new PIXI.Container();
    button.name = 'pauseButton';
    button.x = layout.pauseButton.x;
    button.y = layout.pauseButton.y;
    button.interactive = true;
    button.buttonMode = true;
    button.on('pointerdown', showPausePopup);

    const customBg = createUIAssetSprite('game_settings_button', size, size, { fit: 'stretch' });
    button.addChild(customBg || createRoundedPanel(size, size, 22, 0xFFE9C2, 0xD98B32, 5));

    if (TEXTURES.gear) {
        const gear = new PIXI.Sprite(TEXTURES.gear);
        gear.anchor.set(0.5);
        const scale = Math.min((size * 0.54) / gear.texture.width, (size * 0.54) / gear.texture.height);
        gear.scale.set(scale);
        gear.x = size / 2;
        gear.y = size / 2;
        button.addChild(gear);
    } else {
        const icon = new PIXI.Text('⚙', {
            fontSize: Math.floor(size * 0.42),
            fill: THEME.textDark,
            fontWeight: '800',
            fontFamily: 'Arial',
        });
        icon.anchor.set(0.5);
        icon.x = size / 2;
        icon.y = size / 2;
        button.addChild(icon);
    }

    rootUI.addChild(button);
}

function updateLevelHeader(score, life) {
    updateLevelHeaderUI({ currentGameUI, score, life, levelData, textures: TEXTURES, theme: THEME });
    if (currentGameUI?.mode === 'desktop-wide' && currentGameUI.progText) {
        currentGameUI.progText.text = `\u0426\u0415\u041b\u042c ${Math.max(0, levelData.goalBugCount - score)}`;
    }
}

// Функция для взвешенного случайного выбора
function weightedRandomChoice(weights) {
    // Получаем все ключи и их веса
    const entries = Object.entries(weights);
    if (entries.length === 0) return null;

    // Вычисляем сумму всех весов
    const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);
    
    // Генерируем случайное число от 0 до суммы весов
    let random = Math.random() * totalWeight;
    
    // Выбираем объект на основе весов
    for (const [key, weight] of entries) {
        random -= weight;
        if (random <= 0) return key;
    }
    
    // На всякий случай возвращаем последний элемент
    return entries[entries.length - 1][0];
}

// очередь объектов
function prepareObjectQueue() {
    objectQueue = [];
    const spawnWeights = levelData.params.spawnWeights || {};

    const killableTypes = Object.keys(spawnWeights).filter(type =>
        type !== 'bomb' &&
        (type === 'bug' ||
         type === 'healer' ||
         type === 'frozen' ||
         type === 'chameleon' ||
         type === 'neat' ||
         type === 'fat' ||
         type.startsWith('coloredBug_') ||
         type.startsWith('fatColoredBug_'))
    );

    const unkillableTypes = Object.keys(spawnWeights).filter(type => type === 'bomb');
    const killableWeights = {};
    const unkillableWeights = {};

    for (const type of killableTypes) {
        killableWeights[type] = spawnWeights[type];
    }
    for (const type of unkillableTypes) {
        unkillableWeights[type] = spawnWeights[type];
    }

    const minKillableCount = levelData.goalBugCount * 3;
    let killableCount = 0;

    while (killableCount < minKillableCount) {
        const type = weightedRandomChoice(killableWeights);
        if (!type) break;

        const runtimeBalance = getRuntimeBugBalance(type);

        // Final bug params are resolved at runtime from species base values and level multipliers.
        const objectData = {
            type,
            lifetime: runtimeBalance.lifetime,
            spawnInterval: runtimeBalance.spawnInterval,
            scoreValue: runtimeBalance.scoreValue,
            healAmount: runtimeBalance.healAmount,
            spawnZone: runtimeBalance.spawnZone,
        };

        if (runtimeBalance.clicks > 1) {
            objectData.clicks = runtimeBalance.clicks;
        }
        if (type.startsWith('coloredBug_') || type.startsWith('fatColoredBug_')) {
            objectData.color = type.split('_')[1];
        }

        objectQueue.push(objectData);
        killableCount++;
    }

    const bombCount = Math.floor(killableCount * 0.2);
    for (let i = 0; i < bombCount; i++) {
        const type = weightedRandomChoice(unkillableWeights);
        if (!type) continue;

        const runtimeBalance = getRuntimeBugBalance(type);
        objectQueue.push({
            type,
            lifetime: runtimeBalance.lifetime,
            spawnInterval: runtimeBalance.spawnInterval,
            scoreValue: runtimeBalance.scoreValue,
            healAmount: runtimeBalance.healAmount,
            spawnZone: runtimeBalance.spawnZone,
        });
    }

    for (let i = objectQueue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [objectQueue[i], objectQueue[j]] = [objectQueue[j], objectQueue[i]];
    }
}

const FIELD_PULSE_SCALE = 1.2;
const DEFAULT_PULSE_DURATION = 0.2;
const FAT_PULSE_DURATION = 0.7;
const COLLISION_PADDING = 8;

function getCollisionRadius(obj) {
    const footprint = (obj && obj._footprint) ? obj._footprint : Math.max(obj.width, obj.height);
    return (footprint * FIELD_PULSE_SCALE) / 2;
}

function checkCollision(obj1, obj2) {
    const r1 = getCollisionRadius(obj1);
    const r2 = getCollisionRadius(obj2);
    const dx = (obj1.x) - (obj2.x);
    const dy = (obj1.y) - (obj2.y);
    const minDistance = r1 + r2 + COLLISION_PADDING;
    return (dx * dx + dy * dy) < (minDistance * minDistance);
}

// Проверка, что объект полностью в пределах поля
function isWithinBounds(obj, playArea) {
    return (
        obj.x - obj.width / 2 >= 0 &&
        obj.x + obj.width / 2 <= playArea.width &&
        obj.y - obj.height / 2 >= 0 &&
        obj.y + obj.height / 2 <= playArea.height
    );
}

// Add this function before spawnObject
function animateBugShake(container) {
    // Store original rotation
    const originalRotation = container.rotation;
    
    // Create a sequence of quick rotations
    const shakeSequence = [];
    for (let i = 0; i < 5; i++) {
        // Convert degrees to radians (15 degrees = 0.2618 radians)
        shakeSequence.push(
            { rotation: originalRotation + 0.2618, duration: 0.05 },
            { rotation: originalRotation - 0.2618, duration: 0.05 }
        );
    }
    // Add final return to original rotation
    shakeSequence.push({ rotation: originalRotation, duration: 0.05 });

    // Create timeline for the sequence
    const tl = gsap.timeline();
    shakeSequence.forEach(step => {
        tl.to(container, step);
    });
}

// Add this function before spawnObject
function animateFatBugSquish(container) {
    // Store original scale
    const originalScale = container.scale.x;
    
    // Create squish animation sequence
    gsap.timeline()
        .to(container.scale, {
            x: originalScale * 0.8,
            y: originalScale * 1.2, // Stretch vertically while squishing horizontally
            duration: 0.1,
            ease: "power2.out"
        })
        .to(container.scale, {
            x: originalScale,
            y: originalScale,
            duration: 0.1,
            ease: "elastic.out(1, 0.3)" // Add a slight bounce effect
        });
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

function decrementClickCounter(container, data) {
    if (typeof data.clicks !== 'number') return true;

    data.clicks--;
    const text = container.getChildByName('clickText');
    if (text) text.text = data.clicks;
    return data.clicks <= 0;
}

function addFieldPulseAnimation(container, duration = DEFAULT_PULSE_DURATION) {
    const pulseAnim = gsap.to(container.scale, {
        x: FIELD_PULSE_SCALE,
        y: FIELD_PULSE_SCALE,
        duration,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut"
    });
    container.animations.push(pulseAnim);
}

// --- Safe bounds helpers ---
// Возвращает безопасные границы спавна с учётом рамки и небольшого запаса под анимации
// Возвращает итоговый «след» объекта (размер коллизии) на этапе спавна.
// Важно: здесь учитываем реальные габариты визуала (fat = x2, fatColored = x2, остальные = x1).
function getSpawnFootprintSize(type, baseSize) {
  if (type === 'fat' || (typeof type === 'string' && type.startsWith('fatColoredBug_'))) {
    return baseSize * 2;
  }
  return baseSize;
}

function getResolvedObjectSize(type) {
  const isFat = type === 'fat' || type.startsWith('fatColoredBug_');
  const playAreaBaseSize = Math.min(playArea.width, playArea.height);
  const baseSize = Math.min(
      Math.max(
          Math.floor(playAreaBaseSize * BUG_SIZE_PRC),
          MIN_BUG_SIZE
      ),
      MAX_BUG_SIZE
  );
  const size = isFat ? baseSize * 2 / 1.5 : baseSize;
  const footprint = getSpawnFootprintSize(type, size);

  return { size, footprint, isFat };
}

function applyResolvedObjectSize(container) {
  if (!container?.type || !playArea) return;

  const { size, footprint } = getResolvedObjectSize(container.type);
  container.width = footprint;
  container.height = footprint;
  container.pivot.set(footprint / 2);
  container._footprint = footprint;

  const visual = container.getChildByName('bugVisual') ||
    container.children.find((child) => child instanceof PIXI.Sprite);

  if (visual) {
    const isFatVisual = container.type === 'fat' || container.type.startsWith('fatColoredBug_');
    const visualSize = isFatVisual ? size * 2 : size;
    visual.width = visualSize;
    visual.height = visualSize;
  }

  const clickText = container.getChildByName('clickText');
  if (clickText) {
    const textScale = Math.max(0.9, Math.min(1.45, footprint / 120));
    clickText.scale.set(textScale);
  }
}

function getSafeSpawnBounds(objSize) {
  // рамка + небольшой запас + 10% от размера под пульсации/сквиш
  const pad = FRAME_BORDER + SAFE_PADDING_EXTRA + Math.ceil(objSize * 0.1);
  const minX = pad + objSize / 2;
  const maxX = playArea.width  - pad - objSize / 2;
  const minY = pad + objSize / 2;
  const maxY = playArea.height - pad - objSize / 2;
  return { minX, maxX, minY, maxY };
}

// Подтягивает объект внутрь безопасной зоны (при ресайзе/перестроении UI)
function getSpawnRange(spawnZone, playArea) {
  const fieldLeft = 0;
  const fieldRight = playArea.width;
  const fieldWidth = playArea.width;
  const third = fieldWidth / 3;

  const leftZone = {
    min: fieldLeft,
    max: fieldLeft + third
  };
  const centerZone = {
    min: fieldLeft + third,
    max: fieldLeft + third * 2
  };
  const rightZone = {
    min: fieldLeft + third * 2,
    max: fieldRight
  };

  switch (spawnZone) {
    case 'left':
      return { minX: leftZone.min, maxX: centerZone.max };
    case 'right':
      return { minX: centerZone.min, maxX: rightZone.max };
    case 'full':
    default:
      return { minX: fieldLeft, maxX: fieldRight };
  }
}

function getConstrainedSpawnBounds(spawnZone, playArea, objSize) {
  const safeBounds = getSafeSpawnBounds(objSize);
  const zoneBounds = getSpawnRange(spawnZone, playArea);

  return {
    minX: Math.max(safeBounds.minX, zoneBounds.minX + objSize / 2),
    maxX: Math.min(safeBounds.maxX, zoneBounds.maxX - objSize / 2),
    minY: safeBounds.minY,
    maxY: safeBounds.maxY
  };
}

function addSpawnZoneDebugOverlay(playField) {
  if (!DEBUG_SHOW_SPAWN_ZONES) return;

  const overlay = new PIXI.Container();
  overlay.name = 'spawnZoneDebugOverlay';
  overlay.eventMode = 'none';

  const third = playField.width / 3;
  const zones = [
    { x: 0, width: third, color: 0x4D96FF },
    { x: third, width: third, color: 0x7BC67B },
    { x: third * 2, width: playField.width - third * 2, color: 0xFF9F43 }
  ];

  zones.forEach((zone) => {
    const rect = new PIXI.Graphics();
    rect.beginFill(zone.color, 0.15);
    rect.drawRect(zone.x, 0, zone.width, playField.height);
    rect.endFill();
    overlay.addChild(rect);
  });

  playField.addChild(overlay);
}

function clampToSafeArea(obj) {
  const size = obj._footprint || Math.max(obj.width, obj.height);
  const spawnZone = obj.spawnZone ?? getBugSpawnZone(obj.type);
  const { minX, maxX, minY, maxY } = getConstrainedSpawnBounds(spawnZone, playArea, size);
  if (minX <= maxX) obj.x = Math.min(Math.max(obj.x, minX), maxX);
  if (minY <= maxY) obj.y = Math.min(Math.max(obj.y, minY), maxY);
}

// генерация объекта
function spawnObject() {
    // Runtime spawn uses the queued bug config instead of hardcoded level spawn values.
    if (introActive || levelEnded) {
        debugSpawn('spawnObject aborted by state');
        return;
    }

    if (activeObjects.length >= levelData.params.maxObjects) {
        debugSpawn('spawnObject deferred because maxObjects reached', { maxObjects: levelData.params.maxObjects });
        scheduleNextSpawn(100);
        return;
    }
    if (objectQueue.length === 0) {
        debugSpawn('spawnObject aborted because queue is empty');
        return;
    }

    const data = objectQueue.shift();
    const type = data.type;
    debugSpawn('spawnObject picked object', {
        type,
        lifetime: data.lifetime,
        spawnInterval: data.spawnInterval
    });
    
    // Calculate actual size based on bug type
    const { size, footprint, isFat } = getResolvedObjectSize(type);
    const container = new PIXI.Container();
    container.width = footprint;
    container.height = footprint;
    container.pivot.set(footprint / 2);
    container._footprint = footprint;
    container.interactive = true;
    container.buttonMode = true;
    container.animations = [];
    container.spawnZone = data.spawnZone ?? getBugSpawnZone(type);
    container.type = type; // ✅ важно для корректной логики в resumeGame()

    // Calculate safe spawn boundaries (accounting for border and animations)
    const spawnZone = data.spawnZone ?? getBugSpawnZone(type);
    const { minX, maxX, minY, maxY } = getConstrainedSpawnBounds(spawnZone, playArea, footprint);

    // Если безопасная область не вмещает объект — отложим спавн
    if (minX > maxX || minY > maxY) {
        debugSpawn('spawnObject deferred because safe bounds are invalid', { type, minX, maxX, minY, maxY });
        objectQueue.unshift(data);
        scheduleNextSpawn(100);
        return;
    }

    let attempts = 0;
    const maxAttempts = 50;
    let positionFound = false;

    while (!positionFound && attempts < maxAttempts) {
        const x = Math.random() * (maxX - minX) + minX;
        const y = Math.random() * (maxY - minY) + minY;
        container.x = x;
        container.y = y;

        // Проверка на пересечение с другими объектами
        let hasCollision = false;
        for (const child of activeObjects) {
            if (child !== container && checkCollision(container, child)) {
                hasCollision = true;
                break;
            }
        }

        if (!hasCollision) {
            positionFound = true;
        } else {
            attempts++;
        }
    }

    // Если не найдена позиция, возвращаем объект в очередь
    if (!positionFound) {
        debugSpawn('spawnObject deferred because no free position was found', { type, attempts: maxAttempts });
        objectQueue.unshift(data);
        scheduleNextSpawn(100);
        return;
    }

    // Визуальный элемент
    let visual;
    if (type.startsWith('fatColoredBug_')) {
        const color = type.split('_')[1];
        visual = new PIXI.Sprite(TEXTURES[`coloredBug_${color}`]);
        visual.name = 'bugVisual';
        visual.anchor.set(0.5);
        visual.width = size * 2;
        visual.height = size * 2;
        container.addChild(visual);

        // White text with remaining clicks
        addClicksCounter(container, data.clicks, {
            fontSize: 28,
            fontFamily: 'Roboto',
            strokeThickness: 6
        });
    } else if (type.startsWith('coloredBug_')) {
        const color = type.split('_')[1];
        visual = new PIXI.Sprite(TEXTURES[`coloredBug_${color}`]);
        visual.name = 'bugVisual';
        visual.anchor.set(0.5);
        visual.width = size;
        visual.height = size;
        container.addChild(visual);
    } else if (type === 'fat') {
        visual = new PIXI.Sprite(TEXTURES['bug']);
        visual.name = 'bugVisual';
        visual.anchor.set(0.5);
        visual.width = size * 2;
        visual.height = size * 2;
        container.addChild(visual);
    
        // Белый текст с оставшимися кликами
        addClicksCounter(container, data.clicks, {
            fontSize: 28,
            fontFamily: 'Arial',
            strokeThickness: 4
        });
    } else if (type === 'frozen') {
        visual = new PIXI.Sprite(TEXTURES['frozen'] || TEXTURES['bug']);
        visual.name = 'bugVisual';
        visual.anchor.set(0.5);
        visual.width = size;
        visual.height = size;
        container.addChild(visual);
    } else if (type === 'chameleon') {
        visual = new PIXI.Sprite(TEXTURES['chameleon'] || TEXTURES['bug']);
        visual.name = 'bugVisual';
        visual.anchor.set(0.5);
        visual.width = size;
        visual.height = size;
        container.addChild(visual);
    } else if (type === 'neat') {
        visual = new PIXI.Sprite(TEXTURES['neat'] || TEXTURES['bug']);
        visual.name = 'bugVisual';
        visual.anchor.set(0.5);
        visual.width = size;
        visual.height = size;
        container.addChild(visual);
    } else if (type === 'healer') {
        visual = new PIXI.Sprite(TEXTURES['healer'] || TEXTURES['bug']);
        visual.name = 'bugVisual';
        visual.anchor.set(0.5);
        visual.width = size;
        visual.height = size;
        container.addChild(visual);
    } else {
        visual = new PIXI.Sprite(TEXTURES[type]);
        visual.name = 'bugVisual';
        visual.anchor.set(0.5);
        visual.width = size;
        visual.height = size;
        container.addChild(visual);
    }

    if (data.clicks > 1 && !container.getChildByName('clickText')) {
        addClicksCounter(container, data.clicks);
    }

    // Lifetime is tracked as remaining time so temporary effects can scale it at runtime.
    container.remainingLifetimeMs = data.lifetime;
    container.lastLifetimeSyncAt = Date.now();

    // Every bug gets the same field pulse; fat bugs pulse slower.
    const pulseDuration = isFat ? FAT_PULSE_DURATION : DEFAULT_PULSE_DURATION;
    addFieldPulseAnimation(container, pulseDuration);
    applyObjectAnimationTimeScale(container);

    // Click handling
    container.on('pointerdown', () => {
        if (isPaused || levelEnded) return; // Don't handle clicks while paused

        // If any color is active, only colored bugs and bombs can be clicked
        if (hasAnyActiveColor() && !isChameleonEffectActive() && !type.startsWith('coloredBug_') && !type.startsWith('fatColoredBug_') && type !== 'bomb') {
            if (type === 'fat') {
                animateFatBugSquish(container);
            } else {
                animateBugShake(container);
            }
            return;
        }

        if (type.startsWith('fatColoredBug_')) {
            const color = type.split('_')[1];
            if (isColorHeld(color) || isChameleonEffectActive()) {
                if (decrementClickCounter(container, data)) {
                    // Correct final click - remove
                    score += getObjectScoreValue(data);
                    animateRemoveObject(container, () => {
                        updateUI();
                        if (score >= levelData.goalBugCount) {
                            endGame(true);
                        } else if (life <= 0) {
                            endGame(false);
                        }
                    });
                } else {
                    // Not enough clicks yet - show squish animation
                    animateFatBugSquish(container);
                }
            } else {
                // Wrong color or no color - show shake animation
                animateBugShake(container);
            }
        } else if (type.startsWith('coloredBug_')) {
            const color = type.split('_')[1];
            if (isColorHeld(color) || isChameleonEffectActive()) {
                if (decrementClickCounter(container, data)) {
                    score += getObjectScoreValue(data);
                    animateRemoveObject(container, () => {
                        updateUI();
                        if (score >= levelData.goalBugCount) {
                            endGame(true);
                        } else if (life <= 0) {
                            endGame(false);
                        }
                    });
                } else {
                    animateBugShake(container);
                }
            } else {
                // Shake animation for wrong color or no color
                animateBugShake(container);
            }
        } else if (type === 'bomb') {
                if (levelEnded) {
                    console.log('Bomb clicked after win — no life loss');
                    showExplosion(container.x, container.y); // можно убрать, если не хочешь эффект
                    animateRemoveObject(container, () => {
                        updateUI();
                    });
                    return;
                }
            console.log('Bomb clicked at:', container.x, container.y);
            showExplosion(container.x, container.y);
            life--;
            console.log('Life decreased, current life:', life);
            animateRemoveObject(container, () => {
                updateUI();
                if (life <= 0) endGame(false);
            });
            
        } else if (type === 'fat') {
            if (decrementClickCounter(container, data)) {
                // Correct final click - remove
                score += getObjectScoreValue(data);
                animateRemoveObject(container, () => {
                    updateUI();
                    if (score >= levelData.goalBugCount) {
                        endGame(true);
                    } else if (life <= 0) {
                        endGame(false);
                    }
                });
            } else {
                // Not enough clicks yet - show squish animation
                animateFatBugSquish(container);
            }
        } else if (type === 'frozen') {
            if (!decrementClickCounter(container, data)) {
                animateBugShake(container);
                return;
            }
            score += getObjectScoreValue(data);
            container.interactive = false;
            container.buttonMode = false;
            showFrozenWave(container.x, container.y);
            activateFrozenEffect();
            gsap.delayedCall(0.12, () => {
                animateRemoveObject(container, () => {
                    updateUI();
                    if (score >= levelData.goalBugCount) {
                        endGame(true);
                    } else if (life <= 0) {
                        endGame(false);
                    }
                });
            });
        } else if (type === 'chameleon') {
            if (!decrementClickCounter(container, data)) {
                animateBugShake(container);
                return;
            }
            score += getObjectScoreValue(data);
            container.interactive = false;
            container.buttonMode = false;
            showChameleonWave(container.x, container.y);
            activateChameleonEffect();
            gsap.delayedCall(0.12, () => {
                animateRemoveObject(container, () => {
                    updateUI();
                    if (score >= levelData.goalBugCount) {
                        endGame(true);
                    } else if (life <= 0) {
                        endGame(false);
                    }
                });
            });
        } else if (type === 'neat') {
            if (!decrementClickCounter(container, data)) {
                animateBugShake(container);
                return;
            }
            score += getObjectScoreValue(data);
            container.interactive = false;
            container.buttonMode = false;
            showNeatWave(container.x, container.y);
            clearFieldWithNeat(container);
            updateUI();
            if (score >= levelData.goalBugCount) {
                endGame(true);
            } else if (life <= 0) {
                endGame(false);
            }
        } else if (type === 'healer') {
            if (!decrementClickCounter(container, data)) {
                animateBugShake(container);
                return;
            }
            score += getObjectScoreValue(data);
            container.interactive = false;
            container.buttonMode = false;

            const maxLives = levelData?.lifeCount ?? life;
            const nextLife = Math.min(maxLives, life + Math.max(0, Math.round(data.healAmount ?? 0)));
            const healTargetPoint = getHealTargetGlobalPosition(nextLife);

            animateHealingHeart(container, healTargetPoint, () => {
                healPlayer(data.healAmount);
                updateUI();
                if (score >= levelData.goalBugCount) {
                    endGame(true);
                } else if (life <= 0) {
                    endGame(false);
                }
            });

            animateRemoveObject(container);
        } else {
            // Regular bug
            if (decrementClickCounter(container, data)) {
                score += getObjectScoreValue(data);
                animateRemoveObject(container, () => {
                    updateUI();
                    if (score >= levelData.goalBugCount) {
                        endGame(true);
                    } else if (life <= 0) {
                        endGame(false);
                    }
                });
            } else {
                animateBugShake(container);
            }
        }
    });

    // Animate from a short offset above the validated spawn point without changing it.
    const targetY = container.y;
    const spawnStartY = Math.max(minY, targetY - 80);
    container.y = spawnStartY;

    // Update spawn animation
    container.alpha = 0.4;
    container.scale.set(1);
    const spawnAnim = gsap.to(container, {
        y: targetY,
        ease: "bounce.out",
        duration: 0.6,
    });
    container.animations.push(spawnAnim);

    const fadeAnim = gsap.to(container, {
        alpha: 1,
        duration: 0.3,
        delay: 0.1
    });
    container.animations.push(fadeAnim);
    applyObjectAnimationTimeScale(container);

    playArea.addChild(container);
    activeObjects.push(container);
    debugSpawn('spawnObject committed object', {
        type,
        x: container.x,
        y: container.y,
        playAreaWidth: playArea.width,
        playAreaHeight: playArea.height
    });

    // Spawned bugs start their lifetime checks from remaining lifetime state.
    startLifetimeCheck(container);

    // Schedule the next spawn using this bug type's resolved spawn interval.
    scheduleNextSpawn(data.spawnInterval);
}

// взрыв
function showExplosion(x, y) {
    console.log('Creating explosion at:', x, y);
    
    // Создаем контейнер для взрыва
    const explosionContainer = new PIXI.Container();
    explosionContainer.x = x;
    explosionContainer.y = y;
    
    // Создаем спрайт взрыва
    const boom = new PIXI.Sprite(TEXTURES['bomb_explosion']);
    boom.anchor.set(0.5);
    boom.width = 100;
    boom.height = 100;
    
    // Добавляем спрайт в контейнер
    explosionContainer.addChild(boom);
    playArea.addChild(explosionContainer);
    
    console.log('Explosion sprite created:', boom);
    
    // Удаляем взрыв через 800мс
    setTimeout(() => {
        if (playArea.children.includes(explosionContainer)) {
            playArea.removeChild(explosionContainer);
            console.log('Explosion removed');
        }
    }, 800);
}

// обновление UI
function updateUI() {
    updateLevelHeader(score, life);
}

// конец игры
function endGame(won) {
    clearSpawnTimer();
    clearSpawnResumeDelay();
    finishFrozenEffect();
    finishChameleonEffect();
    levelEnded = true;
    debugSpawn('endGame called', { won, score, life });
    freezeActiveObjects();

    // Remove remaining objects without penalties
    removeAllActiveObjectsSilent();

    // --- backend: прогресс, события, лидерборд (fire-and-forget) ---
    saveProgress(levelData.id, score, won).catch(() => {});
    trackEvent(won ? 'level_win' : 'level_lose', {
        levelId: levelData.id,
        score,
        lifeLeft: life
    }).catch(() => {});
    recalcLeaderboard(levels.length).catch(() => {});

    const idx = levelData.id - 1;
    if (won) {
        levelsSinceLastAd++;
        if (levelsSinceLastAd >= 2) {
            showInterstitialAd();
            levelsSinceLastAd = 0;
        }
        markLevelCompleted(idx);
        showWinOverlayThenPopup(idx);
    } else {
        showInterstitialAd();
        levelsSinceLastAd = 0;
        showLoseOverlayThenPopup(idx);
    }

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

function rebuildUI() {
    if (!levelData) return;
    const prevPlayAreaWidth = playArea?.width ?? 0;
    const prevPlayAreaHeight = playArea?.height ?? 0;

    // Save state
    const prevScore = score;
    const prevLife = life;
    const prevLevelIndex = levelData.id - 1;
    const prevObjectQueue = [...objectQueue];
    const prevActiveObjects = [...activeObjects];
    const prevActiveKeyboardColor = activeKeyboardColor;
    const prevActivePointerColors = new Map(activePointerColors);
    const prevColorPressStart = colorPressStart;

    // Clear rootUI
    rootUI.removeChildren();

    // Rebuild UI
    const { fieldWrapper, playField } = setupPlayArea();
    playArea = playField;
    syncChameleonFieldOverlay();
    
    // Restore state
    score = prevScore;
    life = prevLife;
    levelData = levels[prevLevelIndex];
    activeKeyboardColor = prevActiveKeyboardColor;
    activePointerColors = prevActivePointerColors;
    colorPressStart = prevColorPressStart;
    syncAllColorButtonStates();
    updateUI();

    // Redraw all active objects
    prevActiveObjects.forEach(obj => {
        if (prevPlayAreaWidth > 0) {
            obj.x = (obj.x / prevPlayAreaWidth) * playField.width;
        }
        if (prevPlayAreaHeight > 0) {
            obj.y = (obj.y / prevPlayAreaHeight) * playField.height;
        }
        applyResolvedObjectSize(obj);
        clampToSafeArea(obj);
        playField.addChild(obj);
    });

    objectQueue = prevObjectQueue;
    activeObjects = prevActiveObjects;
    updateMobilePortraitOverlay();
    ensureSpawnTimerAfterUiChange();
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
window.addEventListener('orientationchange', () => {
    scheduleResponsiveResize();

    if (pendingOrientationResizeTimeout !== null) {
        clearTimeout(pendingOrientationResizeTimeout);
    }

    pendingOrientationResizeTimeout = setTimeout(() => {
        pendingOrientationResizeTimeout = null;
        scheduleResponsiveResize();
    }, 180);
});

function resizeGame() {
    app.renderer.resize(window.innerWidth, window.innerHeight);
    const viewportMode = getViewportMode();
    const isGameScreen = app.stage.children.includes(gameContainer);

    // Стартовый экран
    if (app.stage.children.includes(startContainer)) {
        title.x = app.screen.width / 2;
        title.y = app.screen.height / 2 - 150;
        playButton.x = app.screen.width / 2;
        playButton.y = app.screen.height / 2 + 50;
    }

    // Экран выбора уровня
    if (app.stage.children.includes(levelSelectContainer)) {
        showLevelSelect();
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

    // Handle pause popup if it exists
    const pausePopup = gameContainer.getChildByName('pausePopup');
    if (pausePopup) {
        const popupBounds = getCenteredPopupBounds({
            widthRatio: 0.82,
            maxWidth: 480,
            heightRatio: 0.82,
            maxHeight: 520,
            minHeight: 300
        });
        pausePopup.x = popupBounds.x;
        pausePopup.y = popupBounds.y;
    }
    // Handle intro popup if it exists
    const introPopup = gameContainer.getChildByName('introPopup');
    if (introPopup) {
        introPopup._resizeHandler?.();
    }

    // Handle pause overlay if it exists
    const overlay = gameContainer.getChildByName('pauseOverlay');
    if (overlay) {
        overlay.width = app.screen.width;
        overlay.height = app.screen.height;
    }
    // Доп. подстройка оверлеев/попапов, если открыты
    ['pauseOverlay','winOverlay','loseOverlay','introOverlay'].forEach(n => {
    const o = gameContainer.getChildByName(n);
    if (o) { o.width = app.screen.width; o.height = app.screen.height; }
    });

    updateMobilePortraitOverlay();
}

// Вызвать resizeGame при загрузке, чтобы всё было адаптивно с самого начала
resizeGame();

// Функция для очистки всех попапов
function clearAllPopups() {
  const popups = ['winPopup','losePopup','pausePopup','pauseOverlay','winOverlay','loseOverlay','introPopup','introOverlay'];
  popups.forEach(name => {
    const node = gameContainer.getChildByName(name);
    if (node) gameContainer.removeChild(node);
  });
}


// Плавная анимация появления: масштаб 0.6 → 1.0, альфа 0 → 1
function animateAppear(obj, duration = 500) {
  const startScale = 0.6, endScale = 1.0;
  const t0 = performance.now();
  const easeOutBack = t => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };
  obj.scale.set(startScale);
  obj.alpha = 0;
  function step(now) {
    const p = Math.min((now - t0) / duration, 1);
    const s = startScale + (endScale - startScale) * easeOutBack(p);
    obj.scale.set(s);
    obj.alpha = p;
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
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
  // overlay
  const overlay = new PIXI.Graphics();
  overlay.beginFill(THEME.overlay, 0.42);
  overlay.drawRect(0, 0, app.screen.width, app.screen.height);
  overlay.endFill();
  overlay.name = 'introOverlay';
  overlay.interactive = true; // блок кликов по полю
  gameContainer.addChild(overlay);

  // контейнер элементов (без карточки, только оверлей + элементы)
  const c = new PIXI.Container();
  c.name = 'introPopup';
  gameContainer.addChild(c);

  const bg = new PIXI.Graphics();
  const border = new PIXI.Graphics();
  const descBox = new PIXI.Graphics();
  c.addChild(bg);
  c.addChild(border);
  c.addChild(descBox);

  // Заголовок
  const title = new PIXI.Text('Новый жук!', new PIXI.TextStyle({
    fontSize: 48,
    fill: THEME.primary,
    fontWeight: '900',
    stroke: THEME.white,
    strokeThickness: 6,
    align: 'center',
    wordWrap: true
  }));
  title.anchor.set(0.5, 0);
  c.addChild(title);

  // Иконка из типа
  const iconTex = getTextureForType(cfg?.type);
  const icon = new PIXI.Sprite(iconTex);
  icon.anchor.set(0.5);
  c.addChild(icon);

  // Текст-описание (берём из cfg.descryption)
  const desc = new PIXI.Text(String(cfg?.descryption ?? ''), new PIXI.TextStyle({
    fontSize: 24,
    fill: THEME.textDark,
    fontWeight: '700',
    align: 'center',
    wordWrap: true,
    breakWords: true,
    lineHeight: 30
  }));
  desc.anchor.set(0.5, 0);
  c.addChild(desc);

  // Кнопка "ОК"
  const btnH = 64;
  const ok = new PIXI.Graphics();
  ok.interactive = true;
  ok.buttonMode = true;

  const okLabel = new PIXI.Text('ОК', {
    fontSize: 32, fill: THEME.white, fontWeight: '900', stroke: THEME.borderDark, strokeThickness: 4
  });
  okLabel.anchor.set(0.5);
  ok.addChild(okLabel);
  c.addChild(ok);

  // анимация появления
  const close = () => {
    window.removeEventListener('resize', c._resizeHandler);
    if (gameContainer.getChildByName('introOverlay')) gameContainer.removeChild(overlay);
    if (gameContainer.getChildByName('introPopup')) gameContainer.removeChild(c);
    introActive = false;
    if (typeof onClose === 'function') onClose();
  };

  const layoutIntroPopup = () => {
    const fieldWrapper = playArea?.parent;
    const popupWidth = Math.min(fieldWrapper?.width ?? (app.screen.width - 24), app.screen.width - 24);
    const popupHeight = Math.min(fieldWrapper?.height ?? (app.screen.height - 24), app.screen.height - 24);
    const popupX = fieldWrapper?.x ?? ((app.screen.width - popupWidth) / 2);
    const popupY = fieldWrapper?.y ?? Math.max(12, (app.screen.height - popupHeight) / 2);
    const padX = Math.max(18, Math.round(popupWidth * 0.06));
    const padTop = Math.max(18, Math.round(popupHeight * 0.05));
    const padBottom = Math.max(18, Math.round(popupHeight * 0.05));
    const gap = Math.max(12, Math.round(popupHeight * 0.03));
    const titleWrapWidth = popupWidth - padX * 2;
    const descWrapWidth = popupWidth - padX * 2 - 24;
    const buttonHeight = Math.max(58, Math.round(popupHeight * 0.12));
    const buttonWidth = Math.min(popupWidth - padX * 2, 320);
    const descPadY = 10;
    const descBoxWidth = popupWidth - padX * 2;

    c.x = popupX;
    c.y = popupY;

    bg.clear();
    bg.beginFill(THEME.cardBg);
    bg.drawRoundedRect(0, 0, popupWidth, popupHeight, 32);
    bg.endFill();

    border.clear();
    border.lineStyle(6, THEME.border, 1);
    border.drawRoundedRect(0, 0, popupWidth, popupHeight, 32);

    title.style.fontSize = Math.max(26, Math.min(50, Math.round(popupWidth * 0.11)));
    title.style.wordWrapWidth = titleWrapWidth;
    title.style.lineHeight = Math.round(title.style.fontSize * 1.05);
    title.x = popupWidth / 2;
    title.y = padTop;

    desc.style.fontSize = Math.max(16, Math.min(24, Math.round(popupWidth * 0.05)));
    desc.style.lineHeight = Math.round(desc.style.fontSize * 1.3);
    desc.style.wordWrapWidth = descWrapWidth;

    const maxIconSize = Math.min(popupWidth * 0.34, popupHeight * 0.22);
    const remainingForIcon = popupHeight - padTop - title.height - gap - desc.height - gap - buttonHeight - padBottom - gap - descPadY * 2;
    const iconSize = Math.max(72, Math.min(maxIconSize, remainingForIcon));
    icon.width = icon.height = iconSize;
    icon.x = popupWidth / 2;
    icon.y = title.y + title.height + gap + iconSize / 2;

    descBox.clear();
    descBox.beginFill(THEME.headerBg, 0.85);
    descBox.drawRoundedRect(0, 0, descBoxWidth, desc.height + descPadY * 2, 18);
    descBox.endFill();
    descBox.x = padX;
    descBox.y = icon.y + iconSize / 2 + gap;

    desc.x = popupWidth / 2;
    desc.y = descBox.y + descPadY;

    ok.clear();
    ok.lineStyle(6, THEME.borderDark);
    ok.beginFill(THEME.primary);
    ok.drawRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 18);
    ok.endFill();
    ok.x = popupWidth / 2;
    ok.y = descBox.y + descBox.height + gap + buttonHeight / 2;

    okLabel.style.fontSize = Math.max(26, Math.min(32, Math.round(buttonHeight * 0.48)));
    okLabel.x = 0;
    okLabel.y = 0;
  };

  layoutIntroPopup();
  animateAppear(c, 400);
  c._resizeHandler = () => {
    overlay.width = app.screen.width;
    overlay.height = app.screen.height;
    layoutIntroPopup();
  };
  window.addEventListener('resize', c._resizeHandler);
  ok.on('pointerdown', close);
}



// Победа: затемняем фон, показываем «Победа!», через 1s — попап победы
function showWinOverlayThenPopup(currentLevelIndex) {
  clearAllPopups();

  const overlay = new PIXI.Graphics();
  overlay.beginFill(THEME.overlay, 0.30);
  overlay.drawRect(0, 0, app.screen.width, app.screen.height);
  overlay.endFill();
  overlay.name = 'winOverlay';
  overlay.interactive = true; // блокируем клики в поле
  gameContainer.addChild(overlay);

  const txt = new PIXI.Text('Победа!', new PIXI.TextStyle({
    fill: THEME.success,
    fontSize: Math.round(app.screen.width * 0.08),
    fontWeight: '900',
    dropShadow: true,
    dropShadowDistance: 4,
    dropShadowBlur: 2,
    dropShadowColor: 0x000000
  }));
  txt.anchor?.set ? txt.anchor.set(0.5) : null; // если anchor доступен
  // fallback, если anchor нет:
  if (!txt.anchor?.set) { txt.pivot.set(txt.width/2, txt.height/2); }
  txt.x = app.screen.width / 2;
  txt.y = app.screen.height / 2;

  overlay.addChild(txt);
  animateAppear(txt, 500);

  setTimeout(() => {
    showWinPopup(currentLevelIndex); // попап поверх overlay
  }, 1000);
}

// Поражение: затемняем фон, показываем «Поражение», через 1s — попап проигрыша
function showLoseOverlayThenPopup(currentLevelIndex) {
  clearAllPopups();

  const overlay = new PIXI.Graphics();
  overlay.beginFill(THEME.overlay, 0.30);
  overlay.drawRect(0, 0, app.screen.width, app.screen.height);
  overlay.endFill();
  overlay.name = 'loseOverlay';
  overlay.interactive = true;
  gameContainer.addChild(overlay);

  const txt = new PIXI.Text('Поражение', new PIXI.TextStyle({
    fill: THEME.fail,
    fontSize: Math.round(app.screen.width * 0.07),
    fontWeight: '900',
    dropShadow: true,
    dropShadowDistance: 4,
    dropShadowBlur: 2,
    dropShadowColor: 0x000000
  }));
  txt.anchor?.set ? txt.anchor.set(0.5) : null;
  if (!txt.anchor?.set) { txt.pivot.set(txt.width/2, txt.height/2); }
  txt.x = app.screen.width / 2;
  txt.y = app.screen.height / 2;

  overlay.addChild(txt);
  animateAppear(txt, 500);

  setTimeout(() => {
    showLosePopup(currentLevelIndex);
  }, 1000);
}


function showWinPopup(currentLevelIndex) {
    // Очищаем все существующие попапы
    clearAllPopups();


    const popupBounds = getCenteredPopupBounds({
        widthRatio: 0.8,
        maxWidth: 480,
        heightRatio: 0.62,
        maxHeight: 420,
        minHeight: 250
    });
    const popupWidth = popupBounds.width;
    const popupHeight = popupBounds.height;

    const popup = new PIXI.Container();
    popup.name = 'winPopup';
    popup.x = popupBounds.x;
    popup.y = popupBounds.y;

    // Фон
    const bg = new PIXI.Graphics();
    bg.beginFill(THEME.cardBg);
    bg.drawRoundedRect(0, 0, popupWidth, popupHeight, 36);
    bg.endFill();
    // Рамка
    const border = new PIXI.Graphics();
    border.lineStyle(8, THEME.success);
    border.drawRoundedRect(0, 0, popupWidth, popupHeight, 36);
    popup.addChild(bg);
    popup.addChild(border);

    // Заголовок
    const title = new PIXI.Text('ПОБЕДА', {
        fontSize: Math.max(28, Math.min(46, Math.round(Math.min(popupWidth * 0.1, popupHeight * 0.16)))),
        fill: THEME.textDark,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        align: 'center',
    });
    title.anchor.set(0.5, 0);
    title.x = popupWidth / 2;
    title.y = Math.max(20, Math.round(popupHeight * 0.11));
    popup.addChild(title);

    // Кнопка "Следующий уровень"
    const nextBtn = new PIXI.Graphics();
    const btnW = popupWidth * 0.8;
    const buttonLayout = getVerticalStackLayout({
        popupHeight,
        topY: title.y + title.height + Math.max(18, Math.round(popupHeight * 0.09)),
        itemCount: 2,
        bottomPadding: Math.max(20, Math.round(popupHeight * 0.1)),
        preferredHeight: 70,
        preferredGap: 18,
        minHeight: 46,
        minGap: 12
    });
    const btnH = buttonLayout.itemHeight;
    const btnFontSize = Math.max(20, Math.min(32, Math.round(btnH * 0.42)));
    nextBtn.lineStyle(4, THEME.borderDark);
    nextBtn.beginFill(THEME.primary);
    nextBtn.drawRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 18);
    nextBtn.endFill();
    nextBtn.x = popupWidth / 2;
    nextBtn.y = buttonLayout.startY;
    nextBtn.interactive = true;
    nextBtn.buttonMode = true;
    nextBtn.on('pointerdown', () => {
        clearAllPopups();
        if (levels[currentLevelIndex + 1]) {
            startLevel(currentLevelIndex + 1);
        } else {
            showLevelSelect();
        }
    });
    popup.addChild(nextBtn);

    const nextText = new PIXI.Text('СЛЕДУЮЩИЙ\nУРОВЕНЬ', {
        fontSize: btnFontSize,
        fill: THEME.white,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        align: 'center',
    });
    nextText.anchor.set(0.5);
    nextText.x = 0;
    nextText.y = 0;
    nextBtn.addChild(nextText);

    // Кнопка "Главное меню"
    const menuBtn = new PIXI.Graphics();
    menuBtn.lineStyle(4, 0xB56A2D);
    menuBtn.beginFill(THEME.secondary);
    menuBtn.drawRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 18);
    menuBtn.endFill();
    menuBtn.x = popupWidth / 2;
    menuBtn.y = buttonLayout.startY + btnH + buttonLayout.gap;
    menuBtn.interactive = true;
    menuBtn.buttonMode = true;
    menuBtn.on('pointerdown', () => {
        clearAllPopups();
        if (app.stage.children.includes(gameContainer)) {
            app.stage.removeChild(gameContainer);
        }
        gameContainer.removeChildren();
        showLevelSelect();
    });
    popup.addChild(menuBtn);

    const menuText = new PIXI.Text('ГЛАВНОЕ\nМЕНЮ', {
        fontSize: btnFontSize,
        fill: THEME.textDark,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        align: 'center',
    });
    menuText.anchor.set(0.5);
    menuText.x = 0;
    menuText.y = 0;
    menuBtn.addChild(menuText);

    gameContainer.addChild(popup);
}

function showLosePopup(currentLevelIndex) {
    const showRewardedContinue = shouldShowRewarded();
    // Очищаем все существующие попапы
    clearAllPopups();


    const popupBounds = getCenteredPopupBounds({
        widthRatio: 0.8,
        maxWidth: 480,
        heightRatio: 0.62,
        maxHeight: 420,
        minHeight: 250
    });
    const popupWidth = popupBounds.width;
    const popupHeight = popupBounds.height;

    const popup = new PIXI.Container();
    popup.name = 'losePopup';
    popup.x = popupBounds.x;
    popup.y = popupBounds.y;

    // Фон
    const bg = new PIXI.Graphics();
    bg.beginFill(THEME.cardBg);
    bg.drawRoundedRect(0, 0, popupWidth, popupHeight, 36);
    bg.endFill();
    // Рамка
    const border = new PIXI.Graphics();
    border.lineStyle(8, THEME.fail);
    border.drawRoundedRect(0, 0, popupWidth, popupHeight, 36);
    popup.addChild(bg);
    popup.addChild(border);

    // Заголовок
    const title = new PIXI.Text('НЕ ПОВЕЗЛО!', {
        fontSize: Math.max(28, Math.min(46, Math.round(Math.min(popupWidth * 0.1, popupHeight * 0.16)))),
        fill: THEME.fail,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        align: 'center',
    });
    title.anchor.set(0.5, 0);
    title.x = popupWidth / 2;
    title.y = Math.max(20, Math.round(popupHeight * 0.11));
    popup.addChild(title);

    // Кнопка "Попробовать ещё раз"
    const btnW = popupWidth * 0.8;
    const buttonLayout = getVerticalStackLayout({
        popupHeight,
        topY: title.y + title.height + Math.max(18, Math.round(popupHeight * 0.09)),
        itemCount: showRewardedContinue ? 3 : 2,
        bottomPadding: Math.max(20, Math.round(popupHeight * 0.1)),
        preferredHeight: 70,
        preferredGap: 18,
        minHeight: 46,
        minGap: 12
    });
    const btnH = buttonLayout.itemHeight;
    const btnFontSize = Math.max(20, Math.min(32, Math.round(btnH * 0.42)));
    let buttonIndex = 0;
    if (showRewardedContinue) {
        const continueBtn = createButton(btnW, btnH, 'РџР РћР”РћР›Р–РРўР¬\n+3 Р–РР—РќР', () => {
            showRewardedAd();
        }, 'success', btnFontSize);
        continueBtn.x = popupWidth / 2;
        continueBtn.y = buttonLayout.startY;
        popup.addChild(continueBtn);
        buttonIndex++;
    }
    const retryBtn = new PIXI.Graphics();
    retryBtn.lineStyle(4, THEME.borderDark);
    retryBtn.beginFill(THEME.primary);
    retryBtn.drawRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 18);
    retryBtn.endFill();
    retryBtn.x = popupWidth / 2;
    retryBtn.y = buttonLayout.startY + (btnH + buttonLayout.gap) * buttonIndex;
    retryBtn.interactive = true;
    retryBtn.buttonMode = true;
    retryBtn.on('pointerdown', () => {
        clearAllPopups();
        startLevel(currentLevelIndex);
    });
    popup.addChild(retryBtn);

    const retryText = new PIXI.Text('ПОПРОБОВАТЬ\nЕЩЕ РАЗ', {
        fontSize: btnFontSize,
        fill: THEME.white,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        align: 'center',
    });
    retryText.anchor.set(0.5);
    retryText.x = 0;
    retryText.y = 0;
    retryBtn.addChild(retryText);
    buttonIndex++;

    // Кнопка "Меню"
    const menuBtn = new PIXI.Graphics();
    menuBtn.lineStyle(4, 0xB56A2D);
    menuBtn.beginFill(THEME.secondary);
    menuBtn.drawRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 18);
    menuBtn.endFill();
    menuBtn.x = popupWidth / 2;
    menuBtn.y = buttonLayout.startY + (btnH + buttonLayout.gap) * buttonIndex;
    menuBtn.interactive = true;
    menuBtn.buttonMode = true;
    menuBtn.on('pointerdown', () => {
        clearAllPopups();
        if (app.stage.children.includes(gameContainer)) {
            app.stage.removeChild(gameContainer);
        }
        gameContainer.removeChildren();
        showLevelSelect();
    });
    popup.addChild(menuBtn);

    const menuText = new PIXI.Text('МЕНЮ', {
        fontSize: btnFontSize,
        fill: THEME.textDark,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        align: 'center',
    });
    menuText.anchor.set(0.5);
    menuText.x = 0;
    menuText.y = 0;
    menuBtn.addChild(menuText);

    gameContainer.addChild(popup);
}

function showPausePopup() {
    if (isPaused) return; // Prevent multiple popups
    isPaused = true;
    
    // Clear the spawn interval
    clearSpawnTimer();

    // Pause all active objects
    activeObjects.forEach(obj => {
        // Store the remaining lifetime
        obj.pausedLifetime = syncObjectLifetime(obj);
        
        // Clear existing lifetime check timeout
        if (obj.lifetimeCheckTimeout) {
            clearTimeout(obj.lifetimeCheckTimeout);
        }
        
        // Pause any active animations
        if (obj.animations) {
            obj.animations.forEach(anim => anim.pause());
        }
        
        // Disable interaction
        obj.interactive = false;
        obj.buttonMode = false;
    });

    // Add semi-transparent overlay FIRST
    const overlay = new PIXI.Graphics();
    overlay.beginFill(THEME.overlay, 0.34);
    overlay.drawRect(0, 0, app.screen.width, app.screen.height);
    overlay.endFill();
    overlay.name = 'pauseOverlay';
    overlay.interactive = true; // Prevent clicks through overlay
    gameContainer.addChild(overlay);

    // Create popup container
    const popupBounds = getCenteredPopupBounds({
        widthRatio: 0.82,
        maxWidth: 480,
        heightRatio: 0.82,
        maxHeight: 520,
        minHeight: 300
    });
    const popupWidth = popupBounds.width;
    const popupHeight = popupBounds.height;

    const popup = new PIXI.Container();
    popup.name = 'pausePopup';
    popup.x = popupBounds.x;
    popup.y = popupBounds.y;

    // Background
    const bg = new PIXI.Graphics();
    bg.beginFill(THEME.cardBg);
    bg.drawRoundedRect(0, 0, popupWidth, popupHeight, 40);
    bg.endFill();

    // Border
    const border = new PIXI.Graphics();
    border.lineStyle(6, THEME.pause);
    border.drawRoundedRect(0, 0, popupWidth, popupHeight, 40);
    popup.addChild(bg);
    popup.addChild(border);

    // Title
    const title = new PIXI.Text('ПАУЗА', {
        fontSize: Math.max(28, Math.min(48, Math.round(Math.min(popupWidth * 0.1, popupHeight * 0.12)))),
        fill: THEME.textDark,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        align: 'center',
    });
    title.anchor.set(0.5, 0);
    title.x = popupWidth / 2;
    title.y = Math.max(18, Math.round(popupHeight * 0.07));
    popup.addChild(title);

    // Размер иконок и кнопок
    const iconBtnSize = Math.max(50, Math.min(70, Math.round(popupHeight * 0.13)));
    const iconFontSize = Math.max(28, Math.min(44, Math.round(iconBtnSize * 0.62)));
    const iconSpacing = Math.max(18, Math.min(32, Math.round(popupWidth * 0.07)));

    // Контейнер для иконок
    const iconsRow = new PIXI.Container();
    iconsRow.x = popupWidth / 2;
    iconsRow.y = title.y + title.height + Math.max(14, Math.round(popupHeight * 0.06));

    // Load sound states from localStorage
    const isSoundEnabled = localStorage.getItem('soundEnabled') !== 'false';
    const isMusicEnabled = localStorage.getItem('musicEnabled') !== 'false';

    // Кнопка звука
    const soundBtn = new PIXI.Graphics();
    soundBtn.lineStyle(4, 0xB56A2D);
    soundBtn.beginFill(THEME.secondary);
    soundBtn.drawRoundedRect(-iconBtnSize/2, -iconBtnSize/2, iconBtnSize, iconBtnSize, 18);
    soundBtn.endFill();
    soundBtn.interactive = true;
    soundBtn.buttonMode = true;
    soundBtn.x = -iconBtnSize/2 - iconSpacing/2;

    const soundIcon = new PIXI.Text(isSoundEnabled ? '🔊' : '🔇', {
        fontSize: iconFontSize,
        fill: THEME.textDark,
        fontWeight: 'bold',
        fontFamily: 'Arial',
    });
    soundIcon.anchor.set(0.5);
    soundIcon.x = 0;
    soundIcon.y = 0;
    soundBtn.addChild(soundIcon);

    // Кнопка музыки
    const musicBtn = new PIXI.Graphics();
    musicBtn.lineStyle(4, 0x5E4AE0);
    musicBtn.beginFill(0x8E7CFF);
    musicBtn.drawRoundedRect(-iconBtnSize/2, -iconBtnSize/2, iconBtnSize, iconBtnSize, 18);
    musicBtn.endFill();
    musicBtn.interactive = true;
    musicBtn.buttonMode = true;
    musicBtn.x = iconBtnSize/2 + iconSpacing/2;

    const musicIcon = new PIXI.Text(isMusicEnabled ? '♪' : '♫', {
        fontSize: iconFontSize,
        fill: 0xFFFFFF,
        fontWeight: 'bold',
        fontFamily: 'Arial',
    });
    musicIcon.anchor.set(0.5);
    musicIcon.x = 0;
    musicIcon.y = 0;
    musicBtn.addChild(musicIcon);

    iconsRow.addChild(soundBtn);
    iconsRow.addChild(musicBtn);
    popup.addChild(iconsRow);

    const btnW = popupWidth * 0.8;
    const buttonLayout = getVerticalStackLayout({
        popupHeight,
        topY: iconsRow.y + iconBtnSize / 2 + Math.max(16, Math.round(popupHeight * 0.06)),
        itemCount: 3,
        bottomPadding: Math.max(18, Math.round(popupHeight * 0.07)),
        preferredHeight: 70,
        preferredGap: 20,
        minHeight: 44,
        minGap: 10
    });
    const btnH = buttonLayout.itemHeight;
    const btnSpacing = buttonLayout.gap;
    const btnFontSize = Math.max(20, Math.min(30, Math.round(btnH * 0.42)));

    // Game buttons container
    const buttonsContainer = new PIXI.Container();
    buttonsContainer.x = popupWidth / 2;
    buttonsContainer.y = buttonLayout.startY;

    // Helper function to clean up pause state
    const cleanupPauseState = () => {
        const overlay = gameContainer.getChildByName('pauseOverlay');
        if (overlay) {
            gameContainer.removeChild(overlay);
        }
        const popup = gameContainer.getChildByName('pausePopup');
        if (popup) {
            gameContainer.removeChild(popup);
        }
        isPaused = false;
    };

    // Update continue button handler
    const continueBtn = createButton(btnW, btnH, 'ПРОДОЛЖИТЬ', () => {
        cleanupPauseState();
        resumeGame();
    }, 'pause', btnFontSize);
    continueBtn.y = 0;
    buttonsContainer.addChild(continueBtn);

    // Retry button
    const retryBtn = createButton(btnW, btnH, 'ЗАНОВО', () => {
        cleanupPauseState();
        startLevel(levelData.id - 1);
    }, 'primary', btnFontSize);
    retryBtn.y = btnH + btnSpacing;
    buttonsContainer.addChild(retryBtn);

    // Menu button
    const menuBtn = createButton(btnW, btnH, 'МЕНЮ', () => {
        cleanupPauseState();
        if (app.stage.children.includes(gameContainer)) {
            app.stage.removeChild(gameContainer);
        }
        gameContainer.removeChildren();
        showLevelSelect();
    }, 'secondary', btnFontSize);
    menuBtn.y = (btnH + btnSpacing) * 2;
    buttonsContainer.addChild(menuBtn);

    popup.addChild(buttonsContainer);
    gameContainer.addChild(popup);
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

function updateSoundIcons(soundIcon, musicIcon, isSoundEnabled, isMusicEnabled) {
    soundIcon.text = isSoundEnabled ? '🔊' : '🔇';
    musicIcon.text = isMusicEnabled ? '♪' : '♫';
}

// Вынести удаление объекта с анимацией
function animateRemoveObject(container, onAfterRemove) {
    const size = container.width;
    const maxY = playArea.height + size;
    
    gsap.to(container.scale, {
        x: 0.95,
        y: 0.65,
        duration: 0.15,
        ease: "power2.in",
        onComplete: () => {
            gsap.to(container.scale, {
                x: 0,
                y: 0,
                duration: 0.1,
                ease: "back.in",
                onComplete: () => {
                    if (container.parent) container.parent.removeChild(container);
                    removeObjectFromActiveList(container);
                    if (onAfterRemove) onAfterRemove();
                }
            });
        }
    });
}

function resumeGame() {
    // Resume spawn timer using the next queued bug balance.
    scheduleNextSpawn();

    // Resume all active objects
    const currentTime = Date.now();
    activeObjects.forEach(obj => {
        if (obj.pausedLifetime) {
            obj.remainingLifetimeMs = obj.pausedLifetime;
            obj.lastLifetimeSyncAt = currentTime;
            delete obj.pausedLifetime;
            startLifetimeCheck(obj);
        }

        if (obj.animations) {
            applyObjectAnimationTimeScale(obj, currentTime);
            obj.animations.forEach(anim => anim.resume());
        }

        obj.interactive = true;
        obj.buttonMode = true;
    });
}

function buildBottomBar(coloredTypes) {
    const barH = Math.max(app.screen.height * BAR_H_PRC, MIN_BAR_H);
    const btnSz = Math.floor(barH * 0.72);
    const gap = GAP_HORZ;
    const fieldWrapper = playArea?.parent;
    const barWidth = fieldWrapper?.width ?? app.screen.width;
    const barX = fieldWrapper?.x ?? 0;

    if (!bottomBar) bottomBar = new PIXI.Container();
    if (!bottomBar.parent) rootUI.addChild(bottomBar);
    rootUI.setChildIndex(bottomBar, rootUI.children.length - 1);

    bottomBar.removeChildren();
    colorButtonsMap = {};

    bottomBar.x = barX;
    bottomBar.y = app.screen.height - barH;

    const bg = new PIXI.Graphics();
    bg.beginFill(THEME.cardBg);
    bg.drawRoundedRect(0, 0, barWidth, barH, 24);
    bg.endFill();

    const border = new PIXI.Graphics();
    border.lineStyle(4, THEME.border, 1);
    border.drawRoundedRect(0, 0, barWidth, barH, 24);

    bg.interactive = true;
    bg.hitArea = new PIXI.Rectangle(0, 0, barWidth, barH);

    bottomBar.addChild(bg);
    bottomBar.addChild(border);

    dynamicColorKeyMap = {};
    colorButtonsContainer = bottomBar;

    const usedColors = new Set(
        coloredTypes.map(type => type.split('_')[1]).filter(Boolean)
    );

    const pauseX = barWidth - gap - btnSz;
    const y = (barH - btnSz) / 2;

    const slotCount = COLOR_BUTTON_SLOTS.length;
    const colorGroupW = slotCount * btnSz + (slotCount - 1) * gap;
    const maxRight = pauseX - gap;
    let startX = (barWidth - colorGroupW) / 2;
    if (startX + colorGroupW > maxRight) {
        startX = Math.max(gap, maxRight - colorGroupW);
    }

    COLOR_BUTTON_SLOTS.forEach((slot, index) => {
        if (!usedColors.has(slot.color)) return;
        dynamicColorKeyMap[slot.key] = slot.color;

        const btn = createColorButton(slot.color, btnSz, slot.key, !IS_TOUCH, 'desktop');
        btn.x = startX + index * (btnSz + gap);
        btn.y = y;
        bottomBar.addChild(btn);
        colorButtonsMap[slot.color] = [btn];
    });

    let pauseButton = bottomBar.getChildByName('pauseButton');
    if (!pauseButton) {
        pauseButton = new PIXI.Container();
        pauseButton.name = 'pauseButton';

        const pbg = new PIXI.Graphics();
        pbg.lineStyle(3, 0x5E4AE0, 1);
        pbg.beginFill(0x8E7CFF);
        pbg.drawRoundedRect(0, 0, btnSz, btnSz, 18);
        pbg.endFill();

        const icon = new PIXI.Text('⏸', {
            fontSize: Math.floor(btnSz * 0.5),
            fill: 0xFFFFFF,
            fontWeight: 'bold',
        });
        icon.anchor.set(0.5);
        icon.x = btnSz / 2;
        icon.y = btnSz / 2;

        pauseButton.addChild(pbg);
        pauseButton.addChild(icon);
        pauseButton.interactive = true;
        pauseButton.buttonMode = true;
        pauseButton.on('pointerdown', showPausePopup);
    }

    pauseButton.x = pauseX;
    pauseButton.y = y;
    bottomBar.addChild(pauseButton);
}

function createColorButton(color, size, key, showKey = true, variant = 'desktop', height = size) {
    const button = new PIXI.Container();
    button.name = `colorButton_${color}`;
    button.interactive = true;
    button.buttonMode = true;

    const width = size;
    const buttonHeight = height;
    const minDimension = Math.min(width, buttonHeight);
    const isTallMobile = variant === 'mobile-tall';
    const isSideButton = variant === 'side';
    const iconSize = variant === 'mobile'
        ? width * 0.82
        : isTallMobile
            ? minDimension * 0.78
            : width * (isSideButton ? 0.78 : 0.9);

    if (isTallMobile) {
        const shell = createRoundedPanel(
            width,
            buttonHeight,
            Math.max(18, Math.min(width, buttonHeight) * 0.22),
            0xFFF8EC,
            0xE6B05A,
            4
        );
        button.addChild(shell);
    } else {
        const shadow = new PIXI.Graphics();
        shadow.beginFill(THEME.shadow, 0.18);
        shadow.drawEllipse(width / 2, buttonHeight * 0.82, width * 0.32, minDimension * 0.15);
        shadow.endFill();
        button.addChild(shadow);
    }

    const textureName = getButtonTextureName(color);
    if (TEXTURES[textureName]) {
        const sprite = new PIXI.Sprite(TEXTURES[textureName]);
        const isCustomButtonArt = textureName.startsWith('custom_button_');
        if (isCustomButtonArt) {
            const scale = Math.min((width * 0.98) / sprite.texture.width, (buttonHeight * 0.98) / sprite.texture.height);
            sprite.scale.set(scale);
            sprite.x = (width - sprite.width) / 2;
            sprite.y = (buttonHeight - sprite.height) / 2;
        } else {
            sprite.x = (width - iconSize) / 2;
            sprite.y = isTallMobile ? (buttonHeight - iconSize) / 2 : (width - iconSize) / 2;
            sprite.width = iconSize;
            sprite.height = iconSize;
        }
        sprite._usesCustomButtonArt = isCustomButtonArt;
        button.addChild(sprite);
    } else {
        const fallback = new PIXI.Graphics();
        const cy = isTallMobile ? buttonHeight / 2 : width / 2;
        fallback.beginFill(0xFFFFFF, 0.95);
        fallback.drawCircle(width / 2, cy, iconSize / 2 + 6);
        fallback.endFill();
        fallback.beginFill(COLORS[color] || THEME.primary);
        fallback.drawCircle(width / 2, cy, iconSize / 2);
        fallback.endFill();
        fallback.beginFill(0xFFFFFF, 0.3);
        fallback.drawEllipse(width * 0.4, cy - iconSize * 0.16, iconSize * 0.22, iconSize * 0.12);
        fallback.endFill();
        button.addChild(fallback);
        button.addChild(createButtonFallbackIcon(color, width / 2, cy, iconSize * 0.28));
    }

    const usesCustomButtonArt = button.children.some((child) => child._usesCustomButtonArt);
    if (!isTallMobile && !usesCustomButtonArt) {
        const rim = new PIXI.Graphics();
        rim.lineStyle(Math.max(3, width * 0.055), 0xFFF7E8, 0.88);
        rim.drawCircle(width / 2, width / 2, iconSize * 0.5);
        button.addChild(rim);

        const shine = new PIXI.Graphics();
        shine.beginFill(0xFFFFFF, 0.34);
        shine.drawEllipse(width * 0.38, width * 0.32, iconSize * 0.2, iconSize * 0.1);
        shine.endFill();
        button.addChild(shine);
    }

    const activeIndicator = new PIXI.Graphics();
    activeIndicator.beginFill(0xFFF7E8, variant === 'mobile' || isTallMobile ? 0.26 : 0.3);
    activeIndicator.drawCircle(width / 2, isTallMobile ? buttonHeight / 2 : width / 2, iconSize * 0.52);
    activeIndicator.endFill();

    activeIndicator.name = 'activeIndicator';
    activeIndicator.visible = false;
    button.addChild(activeIndicator);

    if (showKey) {
        const label = new PIXI.Text(key.toUpperCase(), {
            fontSize: width * 0.22,
            fill: THEME.white,
            fontWeight: '700',
            fontFamily: 'Arial',
            stroke: THEME.borderDark,
            strokeThickness: 3
        });
        label.anchor.set(0.5);
        label.x = width / 2;
        label.y = isTallMobile ? buttonHeight * 0.84 : width * 0.84;
        button.addChild(label);
    }

    button.originalScale = 1;

    button.on('pointerdown', (event) => {
        const pointerId = getPointerId(event);
        const pointerKey = getPointerColorKey(pointerId);

        activePointerColors.set(pointerKey, color);
        colorPressStart = Date.now();
        syncAllColorButtonStates();
    });

    const release = (event) => {
        const pointerId = getPointerId(event);
        const pointerKey = getPointerColorKey(pointerId);

        if (activePointerColors.get(pointerKey) === color) {
            activePointerColors.delete(pointerKey);
            syncAllColorButtonStates();
        }
    };

    button.on('pointerup', release);
    button.on('pointerupoutside', release);
    button.on('pointercancel', release);

    button.on('pointerover', () => {
        if (IS_TOUCH) return;
        if (!isColorHeld(color)) {
            gsap.to(button.scale, {
                x: button.originalScale * 1.06,
                y: button.originalScale * 1.06,
                duration: 0.12
            });
        }
    });

    button.on('pointerout', () => {
        if (IS_TOUCH) return;
        if (!isColorHeld(color)) {
            if (button._holdAnim) {
                button._holdAnim.kill();
                button._holdAnim = null;
            }
            gsap.to(button.scale, {
                x: button.originalScale,
                y: button.originalScale,
                duration: 0.12
            });
        }
    });

    return button;
}

function createButtonFallbackIcon(color, x, y, size) {
    const icon = new PIXI.Graphics();
    icon.beginFill(0xFFFFFF, 0.88);

    if (color === 'red') {
        icon.drawCircle(x - size * 0.32, y - size * 0.18, size * 0.32);
        icon.drawCircle(x + size * 0.32, y - size * 0.18, size * 0.32);
        icon.drawPolygon([
            x - size * 0.62, y,
            x, y + size * 0.72,
            x + size * 0.62, y
        ]);
    } else if (color === 'blue') {
        icon.moveTo(x, y - size * 0.72);
        icon.bezierCurveTo(x + size * 0.58, y - size * 0.12, x + size * 0.52, y + size * 0.62, x, y + size * 0.68);
        icon.bezierCurveTo(x - size * 0.52, y + size * 0.62, x - size * 0.58, y - size * 0.12, x, y - size * 0.72);
    } else if (color === 'yellow') {
        const points = [];
        for (let i = 0; i < 10; i++) {
            const angle = -Math.PI / 2 + i * Math.PI / 5;
            const radius = i % 2 === 0 ? size * 0.72 : size * 0.32;
            points.push(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
        }
        icon.drawPolygon(points);
    } else {
        icon.drawEllipse(x, y, size * 0.42, size * 0.72);
        icon.endFill();
        icon.lineStyle(Math.max(2, size * 0.08), COLORS[color] || 0x68B84D, 0.55);
        icon.moveTo(x, y - size * 0.45);
        icon.lineTo(x, y + size * 0.46);
        return icon;
    }

    icon.endFill();
    return icon;
}
export default levels;


