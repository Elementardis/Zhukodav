import levels from './levels.js';
import { getBugBaseBalance } from './bug-config.js';
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

// ==== Global Variables ====
let activeObjects = [];
let maxSimultaneousObjects = 4;
let rootUI = new PIXI.Container();
let gameContainer = new PIXI.Container();
let bottomBar = null;
let playArea, scoreText, lifeText;
let levelData;
let objectQueue = [];
let isPaused = false;
let spawnTimer = null;
let score = 0;
let life = 0;
let orientationPauseActive = false;
let frozenEffectStartedAt = 0;
let frozenEffectEndsAt = 0;
let frozenEffectTimer = null;
let gameLayout = null;
let currentGameUI = { hearts: [] };
let colorButtonsMap = {};
const DEBUG_SPAWN = true;

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
    };
}

function clearSpawnTimer() {
    if (spawnTimer) {
        clearTimeout(spawnTimer);
        spawnTimer = null;
    }
}

function scheduleNextSpawn(delay) {
    clearSpawnTimer();

    if (isPaused || introActive || levelEnded) {
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
    if (spawnTimer || orientationPauseActive || isPaused || introActive || levelEnded) return;
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
let activeColor = null;
let activeColorPointerId = null;
let colorPressStart = 0;
let colorButtonsContainer = null;



// ==== UI Containers ====
const startContainer = new PIXI.Container();
const levelSelectContainer = new PIXI.Container();
let selectedLevelIndex = null;

PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

// ==== SPRITE PRELOADER (PIXI.Loader) ====
const SPRITE_PATHS = [
    { name: 'bug', path: 'images/bug.png' },
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
    { name: 'heart', path: 'images/ui/heart.png' },
    { name: 'gear', path: 'images/ui/gear.png' }
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
    return getButtonTextureNameUI(color);
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
        TEXTURES[name] = loader.resources[name].texture;
    });
    hidePreloader();
    resizeGame();
    app.stage.addChild(startContainer);
});

// ...весь остальной код...

// Color definitions and key mappings
const COLORS = {
    red: 0xFF6B6B,
    blue: 0xA46BFF,
    green: 0x58D68D,
    yellow: 0xFFD75E,
    purple: THEME.pause
};


// Color buttons always keep the same left-to-right slots.
const COLOR_BUTTON_SLOTS = [
    { color: 'red', key: 'q' },
    { color: 'blue', key: 'w' },
    { color: 'green', key: 'e' },
    { color: 'yellow', key: 'r' },
];

const MOBILE_FIXED_BUTTON_COLUMNS = {
    left: ['red', 'blue'],
    right: ['green', 'yellow']
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
    activeColor = null;
    activeColorPointerId = null;

    if (colorButtonsContainer) {
        ['red', 'blue', 'green', 'yellow'].forEach(color => updateButtonState(color, false));
    }
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
    
    if (color && activeColor !== color) {
        activeColor = color;
        colorPressStart = Date.now();
        updateButtonState(color, true);
    }
});

window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    // Convert Russian key to English if needed
    const englishKey = KEY_LAYOUT_MAP[key] || key;
    const color = dynamicColorKeyMap[englishKey];
    
    if (color && activeColor === color) {
        activeColor = null;
        updateButtonState(color, false);
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

    // Удаляем старый обработчик wheel, если он есть
    if (levelSelectContainer.wheelHandler) {
        document.removeEventListener('wheel', levelSelectContainer.wheelHandler);
    }

    levelSelectContainer.removeChildren();

    // Новый стиль заголовка
    const title = new PIXI.Text("ВЫБЕРИ УРОВЕНЬ", {
        fontSize: 52,
        fill: THEME.textDark,
        fontWeight: 'bold',
        fontFamily: 'Arial'
    });
    title.anchor.set(0.5);
    title.x = app.screen.width / 2;
    title.y = 60;
    levelSelectContainer.addChild(title);

    // Скроллируемый контейнер
    const scrollContainer = new PIXI.Container();
    scrollContainer.y = 120;
    levelSelectContainer.addChild(scrollContainer);
    levelSelectContainer.scrollContainer = scrollContainer;

    const buttonSize = 100;
    const spacing = 20;
    const cols = 4;
    const totalLevels = levels.length;
    const rows = Math.ceil(totalLevels / cols);

    const offsetX = (app.screen.width - (buttonSize + spacing) * cols + spacing) / 2;

    const completed = getCompletedLevels();

    for (let i = 0; i < totalLevels; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;

        // Тень под кнопкой
        const shadow = new PIXI.Graphics();
        shadow.beginFill(THEME.shadow, 0.18);
        shadow.drawRoundedRect(0, 0, buttonSize, buttonSize, 6);
        shadow.endFill();

        // Кнопка
        const button = new PIXI.Graphics();
        button.lineStyle(completed.includes(i) ? 4 : 3, completed.includes(i) ? THEME.success : 0xE09A49, 1);
        button.beginFill(completed.includes(i) ? THEME.levelDoneGlow : THEME.cardBg);
        button.drawRoundedRect(0, 0, buttonSize, buttonSize, 20);
        button.endFill();
        button.x = offsetX + col * (buttonSize + spacing);
        button.y = row * (buttonSize + spacing);
        button.interactive = true;
        button.buttonMode = true;
        button.on('pointerdown', () => {
            showLevelEntryPopup(i);
        });

        button.addChild(shadow); // тень ДО фона

        // Текст уровня
        const label = new PIXI.Text("" + (i + 1), {
            fontSize: 36,
            fill: THEME.textDark,
            fontWeight: 'bold',
            fontFamily: 'Arial'
        });
        label.anchor.set(0.5);
        label.x = buttonSize / 2;
        label.y = buttonSize / 2;

        button.addChild(label);
        scrollContainer.addChild(button);

        // Если уровень пройден — рисуем жёлтую звёздочку справа от цифры
        if (completed.includes(i)) {
            const star = new PIXI.Text('★', {
                fontSize: 32,
                fill: THEME.star,
                fontWeight: 'bold',
                fontFamily: 'Arial'
            });
            star.anchor.set(0, 0.5);
            star.x = button.x + buttonSize - 18;
            star.y = button.y + buttonSize / 2;
            scrollContainer.addChild(star);
        }
    }

    // Высота области для скролла
    const visibleHeight = app.screen.height - 120 - 40;
    const contentHeight = rows * (buttonSize + spacing);

    // Маска для скролла
    const mask = new PIXI.Graphics();
    mask.beginFill(0xffffff);
    mask.drawRect(0, 0, app.screen.width, visibleHeight);
    mask.endFill();
    mask.y = 120;
    scrollContainer.mask = mask;
    levelSelectContainer.addChild(mask);

    // Скролл мышью/тачем
    let startY = 0;
    let startScrollY = 0;
    let dragging = false;
    let lastY = 0;
    let velocity = 0;
    let lastTime = Date.now();

    scrollContainer.interactive = true;
    scrollContainer.on('pointerdown', (e) => {
        dragging = true;
        startY = e.data.global.y;
        startScrollY = scrollContainer.y;
        lastY = e.data.global.y;
        lastTime = Date.now();
        velocity = 0;
    });

    scrollContainer.on('pointerup', () => {
        dragging = false;
        // Добавляем инерцию после отпускания
        if (Math.abs(velocity) > 0.35) {
            const animateScroll = () => {
                if (Math.abs(velocity) < 0.35) return;
                
                let newY = scrollContainer.y - velocity;
                newY = Math.min(120, newY);
                newY = Math.max(120 - (contentHeight - visibleHeight), newY);
                scrollContainer.y = newY;
                
                velocity *= 0.97; // Более мягкое замедление
                requestAnimationFrame(animateScroll);
            };
            requestAnimationFrame(animateScroll);
        }
    });

    scrollContainer.on('pointerupoutside', () => {
        dragging = false;
    });

    scrollContainer.on('pointermove', (e) => {
        if (!dragging) return;
        
        const currentTime = Date.now();
        const deltaTime = currentTime - lastTime;
        const currentY = e.data.global.y;
        
        // Вычисляем скорость скролла
        velocity = (lastY - currentY) / Math.max(1, deltaTime) * 22; // Чуть более отзывчивый drag
        
        let newY = startScrollY + (currentY - startY);
        // Ограничения прокрутки
        newY = Math.min(120, newY);
        newY = Math.max(120 - (contentHeight - visibleHeight), newY);
        scrollContainer.y = newY;
        
        lastY = currentY;
        lastTime = currentTime;
    });

    // Обработчик колеса мыши на уровне документа
    const wheelHandler = (e) => {
        e.preventDefault();
        const delta = e.deltaY || e.detail || e.wheelDelta;
        const scrollSpeed = 0.8; // Более лёгкий и быстрый скролл
        
        let newY = scrollContainer.y - delta * scrollSpeed;
        newY = Math.min(120, newY);
        newY = Math.max(120 - (contentHeight - visibleHeight), newY);
        
        // Плавная анимация скролла
        gsap.to(scrollContainer, {
            y: newY,
            duration: 0.38,
            ease: "power2.out"
        });
    };

    // Сохраняем обработчик для возможности его удаления
    levelSelectContainer.wheelHandler = wheelHandler;
    document.addEventListener('wheel', wheelHandler, { passive: false });

    // Сброс позиции скролла при открытии
    scrollContainer.y = 120;
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
    overlay.on('pointerdown', closeLevelEntryPopup);
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

    const bg = new PIXI.Graphics();
    bg.beginFill(THEME.cardBg);
    bg.drawRoundedRect(0, 0, popupWidth, popupHeight, 30);
    bg.endFill();

    const border = new PIXI.Graphics();
    border.lineStyle(6, THEME.border, 1);
    border.drawRoundedRect(0, 0, popupWidth, popupHeight, 30);

    popup.addChild(bg);
    popup.addChild(border);

    const title = new PIXI.Text(`Уровень ${levelIndex + 1}`, {
        fontSize: Math.max(24, Math.min(42, Math.round(Math.min(popupWidth * 0.09, popupHeight * 0.14)))),
        fill: THEME.textDark,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        align: 'center',
    });
    title.anchor.set(0.5, 0);
    title.x = popupWidth / 2;
    title.y = Math.max(18, Math.round(popupHeight * 0.11));
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
  clearSpawnTimer();
  finishFrozenEffect();
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
    const fieldWrapper = new PIXI.Container();
    fieldWrapper.x = layout.fieldWrapper.x;
    fieldWrapper.y = layout.fieldWrapper.y;
    fieldWrapper.width = layout.fieldWrapper.width;
    fieldWrapper.height = layout.fieldWrapper.height;

    const playField = new PIXI.Container();
    playField.width = layout.playField.width;
    playField.height = layout.playField.height;
    playField.y = layout.playField.y;

    const background = new PIXI.Graphics();
    background.beginFill(THEME.fieldBg);
    background.drawRoundedRect(0, 0, layout.fieldWrapper.width, layout.fieldWrapper.height, BORDER_RADIUS);
    background.endFill();

    const border = new PIXI.Graphics();
    border.lineStyle(4, THEME.border, 1);
    border.drawRoundedRect(0, 0, layout.fieldWrapper.width, layout.fieldWrapper.height, BORDER_RADIUS);

    playField.addChild(background);
    playField.addChild(border);
    fieldWrapper.addChild(playField);
    rootUI.addChild(fieldWrapper);

    buildDesktopLevelHeader(fieldWrapper, levelData, layout);
    buildBottomBar(coloredTypes);

    return { fieldWrapper, playField };
}

function setupMobileLandscapePlayArea(layout, coloredTypes) {
    const header = buildMobileLevelHeader(layout, levelData);
    rootUI.addChild(header);

    const fieldShell = createRoundedPanel(
        layout.fieldShell.width,
        layout.fieldShell.height,
        layout.fieldShell.radius,
        THEME.cardBg,
        THEME.border,
        6
    );
    fieldShell.x = layout.fieldShell.x;
    fieldShell.y = layout.fieldShell.y;
    fieldShell.name = 'fieldShell';

    const playField = new PIXI.Container();
    playField.x = layout.fieldShell.padding;
    playField.y = layout.fieldShell.padding;
    playField.width = layout.playField.width;
    playField.height = layout.playField.height;

    const fieldBg = new PIXI.Graphics();
    fieldBg.beginFill(THEME.fieldBg);
    fieldBg.drawRoundedRect(0, 0, layout.playField.width, layout.playField.height, layout.playField.radius);
    fieldBg.endFill();

    const fieldBorder = new PIXI.Graphics();
    fieldBorder.lineStyle(4, 0xE6B05A, 0.85);
    fieldBorder.drawRoundedRect(0, 0, layout.playField.width, layout.playField.height, layout.playField.radius);

    playField.addChild(fieldBg);
    playField.addChild(fieldBorder);
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
    const { header, ui } = buildMobileLevelHeaderUI({
        layout,
        level,
        theme: THEME,
        textures: TEXTURES,
        score
    });
    currentGameUI = ui;
    updateLevelHeader(score, life);
    return header;
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

        const verticalGap = Math.max(10, layout.buttons.gap);
        const totalHeight = slotColors.length * layout.buttons.size + Math.max(0, slotColors.length - 1) * verticalGap;
        const startY = (columnLayout.height - totalHeight) / 2;

        slotColors.forEach((color, index) => {
            const slotBlock = createRoundedPanel(
                layout.buttons.size,
                layout.buttons.size,
                Math.max(18, layout.buttons.size * 0.22),
                0xFFF8EC,
                0xFFF8EC,
                0
            );
            slotBlock.x = (columnLayout.width - layout.buttons.size) / 2;
            slotBlock.y = startY + index * (layout.buttons.size + verticalGap);
            column.addChild(slotBlock);

            if (!availableColors.has(color)) {
                slotBlock.alpha = 0.35;
                return;
            }

            const key = COLOR_BUTTON_SLOTS.find((slot) => slot.color === color)?.key || '';
            if (key) {
                dynamicColorKeyMap[key] = color;
            }
            const button = createColorButton(color, layout.buttons.size, key, false, 'mobile');
            button.x = slotBlock.x;
            button.y = slotBlock.y;
            column.addChild(button);
            if (!colorButtonsMap[color]) {
                colorButtonsMap[color] = [];
            }
            colorButtonsMap[color].push(button);
        });

        rootUI.addChild(column);
    };

    const mirroredColors = COLOR_BUTTON_SLOTS.map((slot) => slot.color);
    buildColumn(layout.leftColumn, mirroredColors, 'leftColorColumn');
    buildColumn(layout.rightColumn, mirroredColors, 'rightColorColumn');
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

    const panel = createRoundedPanel(size, size, 22, 0xFFE9C2, 0xD98B32, 5);
    button.addChild(panel);

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
         type === 'frozen' ||
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
        };

        if (type === 'fat' || type.startsWith('fatColoredBug_')) {
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
function clampToSafeArea(obj) {
  const size = obj._footprint || Math.max(obj.width, obj.height);
  const { minX, maxX, minY, maxY } = getSafeSpawnBounds(size);
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
    const isFat = type === 'fat' || type.startsWith('fatColoredBug_');
    const playAreaBaseSize = Math.min(playArea.width, playArea.height);
    const baseSize = Math.min(
        Math.max(
            Math.floor(playAreaBaseSize * BUG_SIZE_PRC),
            MIN_BUG_SIZE
        ),
        MAX_BUG_SIZE
    );
    const size = isFat ? baseSize * 2/1.5 : baseSize;

    
    const footprint = getSpawnFootprintSize(type, size);
const container = new PIXI.Container();
    container.width = footprint;
    container.height = footprint;
    container.pivot.set(footprint / 2);
    container._footprint = footprint;
    container.interactive = true;
    container.buttonMode = true;
    container.animations = [];
    container.type = type; // ✅ важно для корректной логики в resumeGame()

    // Calculate safe spawn boundaries (accounting for border and animations)
    const { minX, maxX, minY, maxY } = getSafeSpawnBounds(footprint);

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
        visual.anchor.set(0.5);
        visual.width = size * 2;
        visual.height = size * 2;
        container.addChild(visual);

        // White text with remaining clicks
        const countText = new PIXI.Text(data.clicks, {
            fontSize: 28,
            fill: 0xFFFFFF,
            fontWeight: 'bold',
            fontFamily: 'Roboto',
            stroke: 0x000000,
            strokeThickness: 6
        });
        countText.anchor.set(0.5);
        countText.name = 'clickText';
        container.addChild(countText);
    } else if (type.startsWith('coloredBug_')) {
        const color = type.split('_')[1];
        visual = new PIXI.Sprite(TEXTURES[`coloredBug_${color}`]);
        visual.anchor.set(0.5);
        visual.width = size;
        visual.height = size;
        container.addChild(visual);
    } else if (type === 'fat') {
        visual = new PIXI.Sprite(TEXTURES['bug']);
        visual.anchor.set(0.5);
        visual.width = size * 2;
        visual.height = size * 2;
        container.addChild(visual);
    
        // Белый текст с оставшимися кликами
        const countText = new PIXI.Text(data.clicks, {
            fontSize: 28,
            fill: 0xFFFFFF,
            fontWeight: 'bold',
            fontFamily: 'Arial',
            stroke: 0x000000,
            strokeThickness: 4
        });
        countText.anchor.set(0.5);
        countText.name = 'clickText';
        container.addChild(countText);
    } else if (type === 'frozen') {
        visual = new PIXI.Sprite(TEXTURES['frozen'] || TEXTURES['bug']);
        visual.anchor.set(0.5);
        visual.width = size;
        visual.height = size;
        container.addChild(visual);
    } else {
        visual = new PIXI.Sprite(TEXTURES[type]);
        visual.anchor.set(0.5);
        visual.width = size;
        visual.height = size;
        container.addChild(visual);
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
        if (activeColor !== null && !type.startsWith('coloredBug_') && !type.startsWith('fatColoredBug_') && type !== 'bomb') {
            if (type === 'fat') {
                animateFatBugSquish(container);
            } else {
                animateBugShake(container);
            }
            return;
        }

        if (type.startsWith('fatColoredBug_')) {
            const color = type.split('_')[1];
            if (activeColor === color) {
                data.clicks--;
                const text = container.getChildByName('clickText');
                if (text) text.text = data.clicks;

                if (data.clicks <= 0) {
                    // Correct final click - remove
                    score++;
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
            if (activeColor === color) {
                score++;
                animateRemoveObject(container, () => {
                    updateUI();
                    if (score >= levelData.goalBugCount) {
                        endGame(true);
                    } else if (life <= 0) {
                        endGame(false);
                    }
                });
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
            data.clicks--;
            const text = container.getChildByName('clickText');
            if (text) text.text = data.clicks;

            if (data.clicks <= 0) {
                // Correct final click - remove
                score++;
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
            score++;
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
        } else {
            // Regular bug
            score++;
            animateRemoveObject(container, () => {
                updateUI();
                if (score >= levelData.goalBugCount) {
                    endGame(true);
                } else if (life <= 0) {
                    endGame(false);
                }
            });
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
    finishFrozenEffect();
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
        markLevelCompleted(idx);
        showWinOverlayThenPopup(idx);
    } else {
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

    // Save state
    const prevScore = score;
    const prevLife = life;
    const prevLevelIndex = levelData.id - 1;
    const prevObjectQueue = [...objectQueue];
    const prevActiveObjects = [...activeObjects];
    const prevActiveColor = activeColor;
    const prevColorPressStart = colorPressStart;

    // Clear rootUI
    rootUI.removeChildren();

    // Rebuild UI
    const { fieldWrapper, playField } = setupPlayArea();
    playArea = playField;
    
    // Restore state
    score = prevScore;
    life = prevLife;
    levelData = levels[prevLevelIndex];
    activeColor = prevActiveColor;
    colorPressStart = prevColorPressStart;
    updateUI();

    // Redraw all active objects
    prevActiveObjects.forEach(obj => {
        clampToSafeArea(obj);
        playField.addChild(obj);
    });

    objectQueue = prevObjectQueue;
    activeObjects = prevActiveObjects;
    updateMobilePortraitOverlay();
    ensureSpawnTimerAfterUiChange();
}

window.addEventListener('resize', resizeGame);
window.addEventListener('orientationchange', resizeGame);

function resizeGame() {
    app.renderer.resize(window.innerWidth, window.innerHeight);

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
    if (app.stage.children.includes(gameContainer)) {
        if (getViewportMode() === 'mobile-portrait') {
            rootUI.visible = false;
            updateMobilePortraitOverlay();
        } else {
            rootUI.visible = true;
            rebuildUI();
            ensureSpawnTimerAfterUiChange();
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
    ensureSpawnTimerAfterUiChange();

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
  if (t === 'frozen') {
    return TEXTURES['frozen'] || TEXTURES['bug'];
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
        itemCount: 2,
        bottomPadding: Math.max(20, Math.round(popupHeight * 0.1)),
        preferredHeight: 70,
        preferredGap: 18,
        minHeight: 46,
        minGap: 12
    });
    const btnH = buttonLayout.itemHeight;
    const btnFontSize = Math.max(20, Math.min(32, Math.round(btnH * 0.42)));
    const retryBtn = new PIXI.Graphics();
    retryBtn.lineStyle(4, THEME.borderDark);
    retryBtn.beginFill(THEME.primary);
    retryBtn.drawRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 18);
    retryBtn.endFill();
    retryBtn.x = popupWidth / 2;
    retryBtn.y = buttonLayout.startY;
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

    // Кнопка "Меню"
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
    btn.on('pointerdown', onClick);

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

function createColorButton(color, size, key, showKey = true, variant = 'desktop') {
    const button = new PIXI.Container();
    button.name = `colorButton_${color}`;
    button.interactive = true;
    button.buttonMode = true;

    const iconSize = variant === 'mobile' ? size * 0.82 : size * 0.9;
    const shadow = new PIXI.Graphics();
    shadow.beginFill(THEME.shadow, 0.18);
    shadow.drawEllipse(size / 2, size * 0.78, size * 0.28, size * 0.14);
    shadow.endFill();
    button.addChild(shadow);

    const textureName = getButtonTextureName(color);
    if (TEXTURES[textureName]) {
        const sprite = new PIXI.Sprite(TEXTURES[textureName]);
        sprite.x = (size - iconSize) / 2;
        sprite.y = (size - iconSize) / 2;
        sprite.width = iconSize;
        sprite.height = iconSize;
        button.addChild(sprite);
    } else {
        const fallback = new PIXI.Graphics();
        fallback.beginFill(COLORS[color] || THEME.primary);
        fallback.drawCircle(size / 2, size / 2, iconSize / 2);
        fallback.endFill();
        button.addChild(fallback);
    }

    const activeIndicator = new PIXI.Graphics();
    activeIndicator.beginFill(0xFFF7E8, variant === 'mobile' ? 0.26 : 0.3);
    activeIndicator.drawCircle(size / 2, size / 2, iconSize * 0.52);
    activeIndicator.endFill();

    activeIndicator.name = 'activeIndicator';
    activeIndicator.visible = false;
    button.addChild(activeIndicator);

    if (showKey) {
        const label = new PIXI.Text(key.toUpperCase(), {
            fontSize: size * 0.22,
            fill: THEME.white,
            fontWeight: '700',
            fontFamily: 'Arial',
            stroke: THEME.borderDark,
            strokeThickness: 3
        });
        label.anchor.set(0.5);
        label.x = size / 2;
        label.y = size * 0.84;
        button.addChild(label);
    }

    button.originalScale = 1;

    const getPointerId = (event) =>
        event?.data?.pointerId ??
        event?.data?.originalEvent?.pointerId ??
        null;

    button.on('pointerdown', (event) => {
        const pointerId = getPointerId(event);

        activeColor = color;
        activeColorPointerId = pointerId;
        colorPressStart = Date.now();

        updateButtonState(color, true);
    });

    const release = (event) => {
        const pointerId = getPointerId(event);

        if (activeColor === color) {
            if (activeColorPointerId === null || pointerId === null || activeColorPointerId === pointerId) {
                activeColor = null;
                activeColorPointerId = null;
                updateButtonState(color, false);
            }
        }
    };

    button.on('pointerup', release);
    button.on('pointerupoutside', release);
    button.on('pointercancel', release);

    button.on('pointerover', () => {
        if (IS_TOUCH) return;
        if (activeColor !== color) {
            gsap.to(button.scale, {
                x: button.originalScale * 1.06,
                y: button.originalScale * 1.06,
                duration: 0.12
            });
        }
    });

    button.on('pointerout', () => {
        if (IS_TOUCH) return;
        if (activeColor !== color) {
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
export default levels;


