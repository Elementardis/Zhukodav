import levels from './levels.js';
import { getBugBaseBalance } from './bug-config.js';
import { initBackend, fetchRemoteLevel, saveProgress, trackEvent, recalcLeaderboard, rcNumber } from './firebase.js';
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

    if (isPaused || introActive || levelEnded) return;
    if (objectQueue.length === 0) return;

    const nextDelay = Math.max(50, Math.round(delay ?? objectQueue[0].spawnInterval ?? 450));
    spawnTimer = setTimeout(spawnObject, nextDelay);
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
    { name: 'gear', path: 'images/ui/gear.png' },
    { name: 'level_label', path: 'images/ui/level_label.png' },
    { name: 'goals_label', path: 'images/ui/goals_label.png' }
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
    const ua = navigator.userAgent || '';
    const mobileUa = /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(ua);
    const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    return mobileUa || (coarsePointer && Math.max(window.innerWidth, window.innerHeight) <= MOBILE_MAX_VIEWPORT);
}

function getViewportMode() {
    const mobile = isMobileDevice();
    const isLandscape = window.innerWidth >= window.innerHeight * MOBILE_LANDSCAPE_MIN_RATIO;

    if (!mobile) return 'desktop';
    return isLandscape ? 'mobile-landscape' : 'mobile-portrait';
}

function getUsedLevelColors(level = levelData) {
    const spawnWeights = level?.params?.spawnWeights || {};
    const usedColors = new Set();

    Object.keys(spawnWeights).forEach((type) => {
        if (type.startsWith('coloredBug_') || type.startsWith('fatColoredBug_')) {
            const color = type.split('_')[1];
            if (color) usedColors.add(color);
        }
    });

    return COLOR_BUTTON_SLOTS
        .map((slot) => slot.color)
        .filter((color) => usedColors.has(color));
}

function splitColorsForMobileColumns(colors) {
    const leftCount = Math.ceil(colors.length / 2);
    return {
        left: colors.slice(0, leftCount),
        right: colors.slice(leftCount)
    };
}

function getGameLayout() {
    const mode = getViewportMode();
    const screenWidth = app?.screen?.width ?? window.innerWidth;
    const screenHeight = app?.screen?.height ?? window.innerHeight;

    if (mode !== 'mobile-landscape') {
        const barH = Math.max(screenHeight * BAR_H_PRC, MIN_BAR_H);
        const topMargin = 20;
        const size = Math.min(
            screenWidth - 40,
            screenHeight - barH - topMargin - GAP_HORZ
        );

        return {
            mode: 'desktop',
            screenWidth,
            screenHeight,
            header: { height: Math.floor(size * HEADER_H_PRC) },
            fieldWrapper: {
                x: (screenWidth - size) / 2,
                y: topMargin,
                width: size,
                height: size
            },
            playField: {
                x: 0,
                y: Math.floor(size * HEADER_H_PRC),
                width: size,
                height: size - Math.floor(size * HEADER_H_PRC),
                radius: BORDER_RADIUS
            },
            bottomBar: {
                x: 20,
                y: screenHeight - barH,
                width: screenWidth - 40,
                height: barH
            }
        };
    }

    const outerPad = Math.max(12, Math.min(screenWidth, screenHeight) * 0.022);
    const topInset = outerPad;
    const sideInset = outerPad + (screenWidth < 740 ? 4 : 10);
    const bottomInset = outerPad;
    const headerHeight = Math.max(68, Math.min(110, screenHeight * 0.16));
    const gap = Math.max(10, Math.min(22, screenWidth * 0.016));
    const pauseButtonSize = Math.max(58, Math.min(92, screenHeight * 0.14));
    const rightSideHeight = screenHeight - topInset - bottomInset - headerHeight - gap;
    const buttonCount = Math.max(1, getUsedLevelColors().length);
    const rows = Math.max(2, Math.ceil(buttonCount / 2));
    const maxButtonByHeight = (rightSideHeight - pauseButtonSize - gap * (rows + 1)) / rows;
    const maxButtonByWidth = Math.min(screenWidth * 0.12, 92);
    const buttonSize = Math.max(56, Math.min(maxButtonByHeight, maxButtonByWidth));
    const columnWidth = buttonSize + gap * 2;
    const fieldHeight = Math.max(220, screenHeight - topInset - bottomInset - headerHeight - gap);
    const fieldWidth = Math.max(
        300,
        screenWidth - sideInset * 2 - columnWidth * 2 - gap * 2
    );
    const fieldX = sideInset + columnWidth + gap;
    const fieldY = topInset + headerHeight + gap;
    const panelRadius = Math.max(24, Math.min(36, fieldHeight * 0.08));
    const fieldPadding = Math.max(12, Math.min(20, fieldHeight * 0.05));

    return {
        mode: 'mobile-landscape',
        screenWidth,
        screenHeight,
        gap,
        sideInset,
        topInset,
        bottomInset,
        header: {
            x: sideInset,
            y: topInset,
            width: screenWidth - sideInset * 2,
            height: headerHeight
        },
        fieldShell: {
            x: fieldX,
            y: fieldY,
            width: fieldWidth,
            height: fieldHeight,
            radius: panelRadius,
            padding: fieldPadding
        },
        playField: {
            x: fieldX + fieldPadding,
            y: fieldY + fieldPadding,
            width: fieldWidth - fieldPadding * 2,
            height: fieldHeight - fieldPadding * 2,
            radius: Math.max(18, panelRadius - 8)
        },
        leftColumn: {
            x: sideInset,
            y: fieldY,
            width: columnWidth,
            height: fieldHeight
        },
        rightColumn: {
            x: fieldX + fieldWidth + gap,
            y: fieldY,
            width: columnWidth,
            height: fieldHeight - pauseButtonSize - gap
        },
        pauseButton: {
            x: fieldX + fieldWidth + gap + (columnWidth - pauseButtonSize) / 2,
            y: fieldY + fieldHeight - pauseButtonSize,
            size: pauseButtonSize
        },
        buttons: {
            size: buttonSize,
            gap,
            rows
        }
    };
}

function createRoundedPanel(width, height, radius, fill = THEME.cardBg, borderColor = THEME.border, borderWidth = 4) {
    const panel = new PIXI.Container();

    const shadow = new PIXI.Graphics();
    shadow.beginFill(THEME.shadow, 0.18);
    shadow.drawRoundedRect(0, 4, width, height, radius);
    shadow.endFill();

    const bg = new PIXI.Graphics();
    bg.beginFill(fill);
    bg.drawRoundedRect(0, 0, width, height, radius);
    bg.endFill();

    const border = new PIXI.Graphics();
    border.lineStyle(borderWidth, borderColor, 1);
    border.drawRoundedRect(0, 0, width, height, radius);

    panel.addChild(shadow);
    panel.addChild(bg);
    panel.addChild(border);
    return panel;
}

function createLabelSprite(textureName, maxWidth, maxHeight) {
    const texture = TEXTURES[textureName];
    if (!texture) return null;

    const sprite = new PIXI.Sprite(texture);
    sprite.anchor.set(0.5, 0);
    const scale = Math.min(maxWidth / texture.width, maxHeight / texture.height);
    sprite.scale.set(scale);
    return sprite;
}

function ensureMobilePortraitOverlay() {
    let overlay = document.getElementById(MOBILE_OVERLAY_ID);
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = MOBILE_OVERLAY_ID;
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.display = 'none';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.flexDirection = 'column';
    overlay.style.gap = '14px';
    overlay.style.padding = '24px';
    overlay.style.background = 'rgba(48, 28, 10, 0.72)';
    overlay.style.backdropFilter = 'blur(6px)';
    overlay.style.zIndex = '10000';
    overlay.style.color = '#FFF7E8';
    overlay.style.fontFamily = 'Arial, sans-serif';
    overlay.style.textAlign = 'center';
    overlay.style.pointerEvents = 'auto';

    const phone = document.createElement('div');
    phone.style.width = '78px';
    phone.style.height = '54px';
    phone.style.border = '4px solid #FFF3D9';
    phone.style.borderRadius = '14px';
    phone.style.transform = 'rotate(90deg)';
    phone.style.boxSizing = 'border-box';
    phone.style.position = 'relative';

    const notch = document.createElement('div');
    notch.style.position = 'absolute';
    notch.style.top = '50%';
    notch.style.right = '-8px';
    notch.style.width = '6px';
    notch.style.height = '18px';
    notch.style.transform = 'translateY(-50%)';
    notch.style.borderRadius = '3px';
    notch.style.background = '#FFF3D9';
    phone.appendChild(notch);

    const text = document.createElement('div');
    text.textContent = 'Поверни телефон горизонтально, чтобы играть';
    text.style.fontSize = 'clamp(22px, 3vw, 30px)';
    text.style.fontWeight = '700';
    text.style.lineHeight = '1.2';
    text.style.maxWidth = '420px';

    overlay.appendChild(phone);
    overlay.appendChild(text);
    document.body.appendChild(overlay);
    return overlay;
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
}

function updateMobilePortraitOverlay() {
    const overlay = ensureMobilePortraitOverlay();
    const isGameScreen = app?.stage?.children?.includes(gameContainer);
    const shouldShow = isGameScreen && getViewportMode() === 'mobile-portrait';

    overlay.style.display = shouldShow ? 'flex' : 'none';

    if (isGameScreen) {
        rootUI.visible = !shouldShow;
    }

    if (shouldShow) {
        pauseGameplayForOverlay();
    } else {
        resumeGameplayFromOverlay();
    }
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
    const button = colorButtonsMap[color] || colorButtonsContainer?.getChildByName(`colorButton_${color}`);
    if (!button) return;

    const activeIndicator = button.getChildByName('activeIndicator');
    if (activeIndicator) {
        activeIndicator.visible = isActive;
    }

    

    // Останавливаем предыдущую удерживающую анимацию, если была
    if (button._holdAnim) {
        button._holdAnim.kill();
        button._holdAnim = null;
    }

    if (isActive) {
        // Быстрый «вдавленный» клик: сквиш вниз и чуть шире
        gsap.to(button.scale, {
            x: button.originalScale * 1.06,
            y: button.originalScale * 0.88,
            duration: 0.06,
            ease: "power2.inOut",
            onComplete: () => {
                // Переходим в мягкий пульс, пока кнопка удерживается
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
        // Возврат к исходному масштабу с лёгкой пружиной
        gsap.to(button.scale, {
            x: button.originalScale,
            y: button.originalScale,
            duration: 0.18,
            ease: "elastic.out(1, 0.5)"
        });
    }
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
                activeObjects = activeObjects.filter(o => o !== obj);

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

    const checkLifetime = () => {
        if (!playArea.children.includes(obj) || isPaused) return;

        const remainingTime = syncObjectLifetime(obj);
        if (remainingTime <= 0) {
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
                activeObjects = activeObjects.filter(o => o !== obj);
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
            startLevel(i);
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
        if (Math.abs(velocity) > 0.5) {
            const animateScroll = () => {
                if (Math.abs(velocity) < 0.5) return;
                
                let newY = scrollContainer.y - velocity;
                newY = Math.min(120, newY);
                newY = Math.max(120 - (contentHeight - visibleHeight), newY);
                scrollContainer.y = newY;
                
                velocity *= 0.95; // Замедление
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
        velocity = (lastY - currentY) / deltaTime * 16; // Нормализуем скорость
        
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
        const scrollSpeed = 0.5; // Настройка скорости скролла
        
        let newY = scrollContainer.y - delta * scrollSpeed;
        newY = Math.min(120, newY);
        newY = Math.max(120 - (contentHeight - visibleHeight), newY);
        
        // Плавная анимация скролла
        gsap.to(scrollContainer, {
            y: newY,
            duration: 0.3,
            ease: "power2.out"
        });
    };

    // Сохраняем обработчик для возможности его удаления
    levelSelectContainer.wheelHandler = wheelHandler;
    document.addEventListener('wheel', wheelHandler, { passive: false });

    // Сброс позиции скролла при открытии
    scrollContainer.y = 120;
}

// запускаем уровень
function startLevel(index) {
  // Очищаем предыдущий уровень: останавливаем интервалы и таймеры
  clearSpawnTimer();
  finishFrozenEffect();
  
  // Мгновенно удаляем все активные объекты предыдущего уровня
  if (activeObjects.length > 0) {
    removeAllActiveObjectsImmediate();
  }
  
  app.stage.removeChild(levelSelectContainer);
  app.stage.addChild(gameContainer);
  gameContainer.addChild(rootUI);
  levelData = levels[index];
  levelEnded = false;
  orientationPauseActive = false;

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
    const headerH = Math.floor(layout.header.height);
    const header = new PIXI.Container();
    header.name = 'levelHeader';
    wrapper.addChild(header);

    const bar = new PIXI.Graphics();
    bar.beginFill(THEME.headerBg)
       .drawRoundedRect(0, 0, wrapper.width, headerH, 14)
       .endFill();
    header.addChild(bar);

    const lvlText = new PIXI.Text(`Уровень ${level.id}`, {
        fontSize: headerH * 0.35,
        fill: THEME.textDark,
        fontWeight: 'bold',
        fontFamily: 'Arial',
    });
    lvlText.y = headerH * 0.15;
    lvlText.x = 18;
    header.addChild(lvlText);

    const progText = new PIXI.Text(`0/${level.goalBugCount}`, {
        fontSize: headerH * 0.35,
        fill: THEME.textDark,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        align: 'right',
    });
    progText.anchor.set(1, 0);
    progText.x = wrapper.width - 18;
    progText.y = headerH * 0.15;
    progText.name = 'progText';
    header.addChild(progText);

    const heartSz = Math.floor(headerH * HEART_SIZE_PRC);
    const hearts = new PIXI.Container();
    hearts.name = 'heartsRow';
    header.addChild(hearts);

    const heartStyle = {
        fontSize: heartSz,
        fill: THEME.fail,
        fontFamily: 'Arial',
    };

    const heartRefs = [];
    for (let i = 0; i < level.lifeCount; i++) {
        const h = new PIXI.Text('❤', heartStyle);
        h.x = i * (heartSz + HEART_GAP);
        hearts.addChild(h);
        heartRefs.push(h);
    }

    hearts.x = (wrapper.width - hearts.width) / 2;
    hearts.y = headerH - heartSz - HEART_GAP;

    currentGameUI = {
        mode: 'desktop',
        header,
        progText,
        hearts: heartRefs
    };

    return header;
}

function buildMobileLevelHeader(layout, level) {
    const header = createRoundedPanel(
        layout.header.width,
        layout.header.height,
        Math.max(22, Math.floor(layout.header.height * 0.34)),
        THEME.headerBg,
        THEME.border,
        5
    );
    header.name = 'levelHeader';
    header.x = layout.header.x;
    header.y = layout.header.y;

    const sectionGap = Math.max(8, layout.gap);
    const leftWidth = Math.max(120, layout.header.width * 0.23);
    const rightWidth = Math.max(150, layout.header.width * 0.25);
    const centerWidth = layout.header.width - leftWidth - rightWidth - sectionGap * 2;
    const badgeY = Math.max(8, layout.header.height * 0.14);
    const badgeHeight = layout.header.height - badgeY * 2;

    const levelBadge = createRoundedPanel(leftWidth, badgeHeight, 24, THEME.cardBg, 0xE5AA54, 4);
    levelBadge.x = sectionGap;
    levelBadge.y = badgeY;
    header.addChild(levelBadge);

    const levelLabel = createLabelSprite('level_label', leftWidth * 0.62, badgeHeight * 0.35);
    if (levelLabel) {
        levelLabel.x = leftWidth / 2;
        levelLabel.y = 8;
        levelBadge.addChild(levelLabel);
    }

    const levelText = new PIXI.Text(`LEVEL ${level.id}`, {
        fontSize: Math.min(28, badgeHeight * 0.32),
        fill: THEME.textDark,
        fontWeight: '800',
        fontFamily: 'Arial'
    });
    levelText.anchor.set(0.5, 1);
    levelText.x = leftWidth / 2;
    levelText.y = badgeHeight - 10;
    levelBadge.addChild(levelText);

    const heartsBadge = createRoundedPanel(centerWidth, badgeHeight, 24, 0xFFF8EC, 0xE5AA54, 4);
    heartsBadge.x = leftWidth + sectionGap;
    heartsBadge.y = badgeY;
    header.addChild(heartsBadge);

    const heartSize = Math.max(26, Math.min(38, badgeHeight * 0.5));
    const heartsRow = new PIXI.Container();
    const heartRefs = [];
    for (let i = 0; i < level.lifeCount; i++) {
        let heart;
        if (TEXTURES.heart) {
            heart = new PIXI.Sprite(TEXTURES.heart);
            heart.width = heartSize;
            heart.height = heartSize;
        } else {
            heart = new PIXI.Text('❤', {
                fontSize: heartSize,
                fill: THEME.fail,
                fontWeight: '700',
                fontFamily: 'Arial'
            });
        }
        heart.x = i * (heartSize + 8);
        heartRefs.push(heart);
        heartsRow.addChild(heart);
    }
    heartsRow.x = (centerWidth - heartsRow.width) / 2;
    heartsRow.y = (badgeHeight - heartSize) / 2;
    heartsBadge.addChild(heartsRow);

    const goalBadge = createRoundedPanel(rightWidth, badgeHeight, 24, THEME.cardBg, 0xE5AA54, 4);
    goalBadge.x = layout.header.width - rightWidth - sectionGap;
    goalBadge.y = badgeY;
    header.addChild(goalBadge);

    const goalLabel = createLabelSprite('goals_label', rightWidth * 0.62, badgeHeight * 0.35);
    if (goalLabel) {
        goalLabel.x = rightWidth / 2;
        goalLabel.y = 8;
        goalBadge.addChild(goalLabel);
    }

    const progText = new PIXI.Text(`ЦЕЛЬ: 0/${level.goalBugCount}`, {
        fontSize: Math.min(24, badgeHeight * 0.28),
        fill: THEME.textDark,
        fontWeight: '800',
        fontFamily: 'Arial',
        align: 'center'
    });
    progText.anchor.set(0.5, 1);
    progText.x = rightWidth / 2;
    progText.y = badgeHeight - 10;
    progText.name = 'progText';
    goalBadge.addChild(progText);

    currentGameUI = {
        mode: 'mobile-landscape',
        header,
        progText,
        hearts: heartRefs
    };

    return header;
}

function buildSideColorColumns(coloredTypes, layout) {
    colorButtonsContainer = rootUI;
    const colors = getUsedLevelColors();
    const columns = splitColorsForMobileColumns(colors);
    dynamicColorKeyMap = {};

    const buildColumn = (columnLayout, colorList, name) => {
        const column = createRoundedPanel(
            columnLayout.width,
            columnLayout.height,
            28,
            THEME.cardBg,
            THEME.border,
            5
        );
        column.name = name;
        column.x = columnLayout.x;
        column.y = columnLayout.y;

        const verticalGap = Math.max(10, layout.buttons.gap);
        const totalHeight = colorList.length * layout.buttons.size + Math.max(0, colorList.length - 1) * verticalGap;
        const startY = (columnLayout.height - totalHeight) / 2;

        colorList.forEach((color, index) => {
            const key = COLOR_BUTTON_SLOTS.find((slot) => slot.color === color)?.key || '';
            if (key) {
                dynamicColorKeyMap[key] = color;
            }
            const button = createColorButton(color, layout.buttons.size, key, false, 'mobile');
            button.x = (columnLayout.width - layout.buttons.size) / 2;
            button.y = startY + index * (layout.buttons.size + verticalGap);
            column.addChild(button);
            colorButtonsMap[color] = button;
        });

        rootUI.addChild(column);
    };

    buildColumn(layout.leftColumn, columns.left, 'leftColorColumn');
    buildColumn(layout.rightColumn, columns.right, 'rightColorColumn');
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
    if (!currentGameUI) return;

    if (currentGameUI.progText) {
        currentGameUI.progText.text = currentGameUI.mode === 'mobile-landscape'
            ? `ЦЕЛЬ: ${score}/${levelData.goalBugCount}`
            : `${score}/${levelData.goalBugCount}`;
    }

    currentGameUI.hearts.forEach((heart, index) => {
        const isAlive = index < life;
        if (heart instanceof PIXI.Sprite) {
            heart.alpha = isAlive ? 1 : 0.24;
            heart.tint = isAlive ? 0xFFFFFF : 0xC78B65;
        } else {
            heart.text = isAlive ? '❤' : '♡';
            heart.style.fill = isAlive ? THEME.fail : THEME.headerBg;
        }
    });
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
    if (introActive || levelEnded) return;

    if (activeObjects.length >= levelData.params.maxObjects) {
        scheduleNextSpawn(100);
        return;
    }
    if (objectQueue.length === 0) return;

    const data = objectQueue.shift();
    const type = data.type;
    
    // Calculate actual size based on bug type
    const isFat = type === 'fat' || type.startsWith('fatColoredBug_');
    const baseSize = Math.min(
        Math.max(
            Math.floor(playArea.width * BUG_SIZE_PRC),
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

    // Spawn animation with safe boundaries
    const spawnY = Math.min(container.y + 80, playArea.height - size / 2);
    container.y = spawnY - 80;

    // Update spawn animation
    container.alpha = 0.4;
    container.scale.set(1);
    const spawnAnim = gsap.to(container, {
        y: container.y + 80,
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

    // Spawned bugs start their lifetime checks from remaining lifetime state.
    startLifetimeCheck(container);

    // Schedule the next spawn using this bug type's resolved spawn interval.
    scheduleNextSpawn(data.spawnInterval);

    playArea.addChild(container);
    activeObjects.push(container);
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
        }
    }

    // Handle pause popup if it exists
    const pausePopup = gameContainer.getChildByName('pausePopup');
    if (pausePopup) {
        const popupWidth = Math.min(app.screen.width * 0.8, 480);
        const popupHeight = Math.min(app.screen.height * 0.7, 420);
        pausePopup.x = (app.screen.width - popupWidth) / 2;
        pausePopup.y = (app.screen.height - popupHeight) / 2;
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


    const popupWidth = Math.min(app.screen.width * 0.8, 480);
    const popupHeight = Math.min(app.screen.height * 0.7, 420);
    const popupX = (app.screen.width - popupWidth) / 2;
    const popupY = (app.screen.height - popupHeight) / 2;

    const popup = new PIXI.Container();
    popup.name = 'winPopup';
    popup.x = popupX;
    popup.y = popupY;

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
        fontSize: Math.max(48, popupWidth * 0.12),
        fill: THEME.textDark,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        align: 'center',
    });
    title.anchor.set(0.5, 0);
    title.x = popupWidth / 2;
    title.y = 40;
    popup.addChild(title);

    // Кнопка "Следующий уровень"
    const nextBtn = new PIXI.Graphics();
    const btnW = popupWidth * 0.8;
    const btnH = 70;
    nextBtn.lineStyle(4, THEME.borderDark);
    nextBtn.beginFill(THEME.primary);
    nextBtn.drawRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 18);
    nextBtn.endFill();
    nextBtn.x = popupWidth / 2;
    nextBtn.y = popupHeight / 2 - 20;
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
        fontSize: 32,
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
    menuBtn.y = popupHeight / 2 + btnH + 18;
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
        fontSize: 32,
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


    const popupWidth = Math.min(app.screen.width * 0.8, 480);
    const popupHeight = Math.min(app.screen.height * 0.7, 420);
    const popupX = (app.screen.width - popupWidth) / 2;
    const popupY = (app.screen.height - popupHeight) / 2;

    const popup = new PIXI.Container();
    popup.name = 'losePopup';
    popup.x = popupX;
    popup.y = popupY;

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
        fontSize: Math.max(48, popupWidth * 0.12),
        fill: THEME.fail,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        align: 'center',
    });
    title.anchor.set(0.5, 0);
    title.x = popupWidth / 2;
    title.y = 40;
    popup.addChild(title);

    // Кнопка "Попробовать ещё раз"
    const retryBtn = new PIXI.Graphics();
    const btnW = popupWidth * 0.8;
    const btnH = 70;
    retryBtn.lineStyle(4, THEME.borderDark);
    retryBtn.beginFill(THEME.primary);
    retryBtn.drawRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 18);
    retryBtn.endFill();
    retryBtn.x = popupWidth / 2;
    retryBtn.y = popupHeight / 2 - 20;
    retryBtn.interactive = true;
    retryBtn.buttonMode = true;
    retryBtn.on('pointerdown', () => {
        clearAllPopups();
        startLevel(currentLevelIndex);
    });
    popup.addChild(retryBtn);

    const retryText = new PIXI.Text('ПОПРОБОВАТЬ\nЕЩЕ РАЗ', {
        fontSize: 32,
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
    menuBtn.y = popupHeight / 2 + btnH + 18;
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
        fontSize: 32,
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
    const popupWidth = Math.min(app.screen.width * 0.8, 480);
    const popupHeight = Math.min(app.screen.height * 0.7, 420);
    const popupX = (app.screen.width - popupWidth) / 2;
    const popupY = (app.screen.height - popupHeight) / 2;

    const popup = new PIXI.Container();
    popup.name = 'pausePopup';
    popup.x = popupX;
    popup.y = popupY;

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
        fontSize: 52,
        fill: THEME.textDark,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        align: 'center',
    });
    title.anchor.set(0.5, 0);
    title.x = popupWidth / 2;
    title.y = 32;
    popup.addChild(title);

    // Размер иконок и кнопок
    const iconBtnSize = 70;
    const iconFontSize = 44;
    const iconSpacing = 32;

    // Контейнер для иконок
    const iconsRow = new PIXI.Container();
    iconsRow.x = popupWidth / 2;
    iconsRow.y = title.y + title.height + 40;

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
    const btnH = 70;
    const btnSpacing = 20;

    // Game buttons container
    const buttonsContainer = new PIXI.Container();
    buttonsContainer.x = popupWidth / 2;
    buttonsContainer.y = iconsRow.y + iconBtnSize + 40;

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
    }, 'pause');
    continueBtn.y = 0;
    buttonsContainer.addChild(continueBtn);

    // Retry button
    const retryBtn = createButton(btnW, btnH, 'ЗАНОВО', () => {
        cleanupPauseState();
        startLevel(levelData.id - 1);
    }, 'primary');
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
    }, 'secondary');
    menuBtn.y = (btnH + btnSpacing) * 2;
    buttonsContainer.addChild(menuBtn);

    popup.addChild(buttonsContainer);
    gameContainer.addChild(popup);
}

function createButton(width, height, text, onClick, variant = 'primary') {
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
        fontSize: 32,
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
                    activeObjects = activeObjects.filter(o => o !== container);
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
        colorButtonsMap[slot.color] = btn;
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

    let activeIndicator;

    if (variant === 'mobile' && TEXTURES[`button_${color}`]) {
        const shadow = new PIXI.Graphics();
        shadow.beginFill(THEME.shadow, 0.18);
        shadow.drawRoundedRect(0, 4, size, size, Math.max(18, size * 0.24));
        shadow.endFill();
        button.addChild(shadow);

        const panel = new PIXI.Graphics();
        panel.beginFill(0xFFF7E8);
        panel.drawRoundedRect(0, 0, size, size, Math.max(18, size * 0.24));
        panel.endFill();
        button.addChild(panel);

        const sprite = new PIXI.Sprite(TEXTURES[`button_${color}`]);
        sprite.width = size;
        sprite.height = size;
        button.addChild(sprite);

        const border = new PIXI.Graphics();
        border.lineStyle(4, 0xD48730, 0.9);
        border.drawRoundedRect(0, 0, size, size, Math.max(18, size * 0.24));
        button.addChild(border);

        activeIndicator = new PIXI.Graphics();
        activeIndicator.beginFill(0xFFFBEF, 0.28);
        activeIndicator.drawRoundedRect(2, 2, size - 4, size - 4, Math.max(16, size * 0.22));
        activeIndicator.endFill();
    } else {
        const bg = new PIXI.Graphics();
        bg.beginFill(COLORS[color]);
        bg.drawCircle(size / 2, size / 2, size / 2);
        bg.endFill();

        const highlight = new PIXI.Graphics();
        highlight.beginFill(0xFFFFFF, 0.24);
        highlight.drawCircle(size / 2, size / 3, size / 4);
        highlight.endFill();

        const border = new PIXI.Graphics();
        border.lineStyle(3, THEME.borderDark, 0.35);
        border.drawCircle(size / 2, size / 2, size / 2);

        activeIndicator = new PIXI.Graphics();
        activeIndicator.beginFill(0xFFF7E8, 0.55);
        activeIndicator.drawCircle(size / 2, size / 2, size / 2);
        activeIndicator.endFill();

        button.addChild(bg);
        button.addChild(highlight);
        button.addChild(border);
    }

    activeIndicator.name = 'activeIndicator';
    activeIndicator.visible = false;
    button.addChild(activeIndicator);

    if (showKey) {
        const label = new PIXI.Text(key.toUpperCase(), {
            fontSize: size * (variant === 'mobile' ? 0.24 : 0.35),
            fill: 0xffffff,
            fontWeight: '700',
            fontFamily: 'Arial',
            stroke: THEME.borderDark,
            strokeThickness: variant === 'mobile' ? 2 : 3
        });
        label.anchor.set(0.5);
        label.position.set(size / 2);
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


