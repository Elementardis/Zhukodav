import levels from './levels.js';
import { saveProgress, trackEvent, recalcLeaderboard } from './firebase.js';
import {
    isMobileDevice as isMobileDeviceUI,
    getViewportMode as getViewportModeUI,
    getUsedLevelColors as getUsedLevelColorsUI,
    getButtonTextureName as getButtonTextureNameUI,
    getGameLayout as getGameLayoutUI,
    createRoundedPanel as createRoundedPanelUI,
    syncMobilePortraitOverlay,
    buildDesktopLevelHeader as buildDesktopLevelHeaderUI,
    buildMobileLevelHeader as buildMobileLevelHeaderUI,
    updateLevelHeaderUI
} from './js/game-ui.js';

const MOBILE_MAX_VIEWPORT = 1366;
const MOBILE_LANDSCAPE_MIN_RATIO = 1.15;
const MOBILE_OVERLAY_ID = 'mobile-orientation-overlay';
const MIN_BAR_H = 110;
const BAR_H_PRC = 0.16;
const GAP_HORZ = 12;
const BORDER_RADIUS = 40;
const HEADER_H_PRC = 0.10;
const HEART_SIZE_PRC = 0.50;
const HEART_GAP = 6;
const BUG_SIZE_PRC = 0.15;
const MIN_BUG_SIZE = 60;
const MAX_BUG_SIZE = 120;
const SAFE_PADDING_EXTRA = 6;
const NEAT_SPAWN_DELAY_MS = 1500;
const COLOR_BUTTON_SLOTS = [
    { color: 'red', key: 'q' },
    { color: 'blue', key: 'w' },
    { color: 'green', key: 'e' },
    { color: 'yellow', key: 'r' },
];
const COLORS = {
    red: 0xFF6B6B,
    blue: 0xA46BFF,
    green: 0x58D68D,
    yellow: 0xFFD75E,
    purple: 0x7C6CF2
};

export const THEME = {
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

export default class RenderLayer {
    constructor({ app, state, engine, input, textures }) {
        this.app = app;
        this.state = state;
        this.engine = engine;
        this.input = input;
        this.textures = textures;

        this.rootUI = new PIXI.Container();
        this.gameContainer = new PIXI.Container();
        this.startContainer = new PIXI.Container();
        this.levelSelectContainer = new PIXI.Container();
        this.bottomBar = null;
        this.playArea = null;
        this.currentGameUI = { hearts: [] };
        this.colorButtonsMap = {};
        this.colorButtonsContainer = null;
        this.dynamicColorKeyMap = {};
        this.selectedLevelIndex = null;
        this.spawnTimer = null;
        this.spawnResumeDelayTimer = null;
        this.spawnResumeDelayBlocked = false;
        this.frozenEffectEndsAt = 0;
        this.chameleonEffectEndsAt = 0;
        this.pendingResizeFrame = null;

        PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
        this.bindInputSync();
        this.buildStartScreen();
        this.attachWindowListeners();
    }

    bindInputSync() {
        this.input.listeners.onColorStateChange = () => this.syncAllColorButtonStates();
    }

    isMobileDevice() {
        return isMobileDeviceUI(MOBILE_MAX_VIEWPORT);
    }

    getViewportMode() {
        return getViewportModeUI({
            maxViewport: MOBILE_MAX_VIEWPORT,
            minLandscapeRatio: MOBILE_LANDSCAPE_MIN_RATIO
        });
    }

    getUsedLevelColors(level = this.state.getLevelData()) {
        return getUsedLevelColorsUI(level, COLOR_BUTTON_SLOTS);
    }

    getButtonTextureName(color) {
        return getButtonTextureNameUI(color);
    }

    getGameLayout() {
        return getGameLayoutUI({
            mode: this.getViewportMode(),
            screenWidth: this.app.screen.width,
            screenHeight: this.app.screen.height,
            barHeightRatio: BAR_H_PRC,
            minBarHeight: MIN_BAR_H,
            gapHorizontal: GAP_HORZ,
            headerHeightRatio: HEADER_H_PRC,
            borderRadius: BORDER_RADIUS,
            colorButtonSlots: COLOR_BUTTON_SLOTS
        });
    }

    createRoundedPanel(width, height, radius, fill = THEME.cardBg, borderColor = THEME.border, borderWidth = 4) {
        return createRoundedPanelUI({ width, height, radius, fill, borderColor, borderWidth, theme: THEME });
    }

    attachWindowListeners() {
        window.addEventListener('resize', () => this.scheduleResponsiveResize());
        window.addEventListener('orientationchange', () => this.scheduleResponsiveResize());
    }

    scheduleResponsiveResize() {
        if (this.pendingResizeFrame !== null) {
            cancelAnimationFrame(this.pendingResizeFrame);
        }

        this.pendingResizeFrame = requestAnimationFrame(() => {
            this.pendingResizeFrame = null;
            this.resizeGame();
        });
    }

    resizeGame() {
        this.app.renderer.resize(window.innerWidth, window.innerHeight);

        if (this.app.stage.children.includes(this.startContainer)) {
            this.buildStartScreen();
        }

        if (this.app.stage.children.includes(this.levelSelectContainer)) {
            this.showLevelSelect();
        }

        if (this.app.stage.children.includes(this.gameContainer) && this.state.getLevelData()) {
            this.setupPlayArea();
            this.redrawActiveObjects();
        }

        this.updateMobilePortraitOverlay();
    }

    updateMobilePortraitOverlay() {
        const isGameScreen = this.app.stage.children.includes(this.gameContainer);
        const shouldShow = isGameScreen && this.getViewportMode() === 'mobile-portrait';

        syncMobilePortraitOverlay({
            overlayId: MOBILE_OVERLAY_ID,
            shouldShow,
            message: 'Поверни телефон горизонтально, чтобы играть',
            setGameVisible: (visible) => {
                if (isGameScreen) this.rootUI.visible = visible;
            },
            onPause: () => {
                this.state.setOrientationPauseActive(true);
                this.clearSpawnTimer();
            },
            onResume: () => {
                this.state.setOrientationPauseActive(false);
                this.ensureSpawnTimer();
            }
        });
    }

    mountStartScreen() {
        this.app.stage.removeChildren();
        this.app.stage.addChild(this.startContainer);
        this.resizeGame();
    }

    buildStartScreen() {
        this.startContainer.removeChildren();

        const titleStyle = new PIXI.TextStyle({
            fontSize: 72,
            fill: THEME.primary,
            fontWeight: 'bold',
            fontFamily: 'Arial',
            stroke: THEME.borderDark,
            strokeThickness: 8,
            align: 'center'
        });

        const title = new PIXI.Text('ЖУКОДАВ', titleStyle);
        title.anchor.set(0.5);
        title.x = this.app.screen.width / 2;
        title.y = this.app.screen.height / 2 - 150;
        this.startContainer.addChild(title);

        const playButton = this.createButton(200, 70, 'PLAY', () => this.showLevelSelect(), 'primary', 36);
        playButton.x = this.app.screen.width / 2;
        playButton.y = this.app.screen.height / 2 + 50;
        this.startContainer.addChild(playButton);
    }

    showLevelSelect() {
        this.clearSpawnTimer();
        this.state.setPaused(false);
        this.state.setIntroActive(false);
        this.state.setLevelEnded(false);
        this.input.clearActiveColor();

        this.app.stage.removeChildren();
        this.levelSelectContainer.removeChildren();
        this.app.stage.addChild(this.levelSelectContainer);

        const title = new PIXI.Text('ВЫБЕРИ УРОВЕНЬ', {
            fontSize: 52,
            fill: THEME.textDark,
            fontWeight: 'bold',
            fontFamily: 'Arial'
        });
        title.anchor.set(0.5);
        title.x = this.app.screen.width / 2;
        title.y = 60;
        this.levelSelectContainer.addChild(title);

        const buttonSize = 100;
        const spacing = 20;
        const cols = 4;
        const totalLevels = levels.length;
        const rows = Math.ceil(totalLevels / cols);
        const offsetX = (this.app.screen.width - (buttonSize + spacing) * cols + spacing) / 2;
        const completed = this.getCompletedLevels();
        const scrollContainer = new PIXI.Container();
        scrollContainer.y = 120;
        this.levelSelectContainer.addChild(scrollContainer);

        for (let i = 0; i < totalLevels; i++) {
            const row = Math.floor(i / cols);
            const col = i % cols;
            const button = new PIXI.Graphics();
            button.lineStyle(completed.includes(i) ? 4 : 3, completed.includes(i) ? THEME.success : 0xE09A49, 1);
            button.beginFill(completed.includes(i) ? THEME.levelDoneGlow : THEME.cardBg);
            button.drawRoundedRect(0, 0, buttonSize, buttonSize, 20);
            button.endFill();
            button.x = offsetX + col * (buttonSize + spacing);
            button.y = row * (buttonSize + spacing);
            button.interactive = true;
            button.buttonMode = true;
            button.on('pointerdown', () => this.showLevelEntryPopup(i));

            const label = new PIXI.Text(String(i + 1), {
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
        }

        const visibleHeight = this.app.screen.height - 160;
        const contentHeight = rows * (buttonSize + spacing);
        const mask = new PIXI.Graphics();
        mask.beginFill(0xffffff);
        mask.drawRect(0, 0, this.app.screen.width, visibleHeight);
        mask.endFill();
        mask.y = 120;
        scrollContainer.mask = mask;
        this.levelSelectContainer.addChild(mask);

        scrollContainer.interactive = true;
        let startY = 0;
        let startScrollY = 0;
        let dragging = false;
        scrollContainer.on('pointerdown', (e) => {
            dragging = true;
            startY = e.data.global.y;
            startScrollY = scrollContainer.y;
        });
        scrollContainer.on('pointerup', () => { dragging = false; });
        scrollContainer.on('pointerupoutside', () => { dragging = false; });
        scrollContainer.on('pointermove', (e) => {
            if (!dragging) return;
            let newY = startScrollY + (e.data.global.y - startY);
            newY = Math.min(120, newY);
            newY = Math.max(120 - Math.max(0, contentHeight - visibleHeight), newY);
            scrollContainer.y = newY;
        });
    }

    showLevelEntryPopup(levelIndex) {
        this.closeLevelEntryPopup();
        this.selectedLevelIndex = levelIndex;

        const overlay = new PIXI.Graphics();
        overlay.beginFill(THEME.overlay, 0.34);
        overlay.drawRect(0, 0, this.app.screen.width, this.app.screen.height);
        overlay.endFill();
        overlay.name = 'levelEntryOverlay';
        overlay.interactive = true;
        overlay.on('pointerdown', () => this.closeLevelEntryPopup());
        this.levelSelectContainer.addChild(overlay);

        const popup = new PIXI.Container();
        popup.name = 'levelEntryPopup';
        popup.x = this.app.screen.width / 2 - 180;
        popup.y = this.app.screen.height / 2 - 120;

        const bg = this.createRoundedPanel(360, 240, 30, THEME.cardBg, THEME.border, 6);
        popup.addChild(bg);

        const title = new PIXI.Text(`Уровень ${levelIndex + 1}`, {
            fontSize: 30,
            fill: THEME.textDark,
            fontWeight: 'bold',
            fontFamily: 'Arial'
        });
        title.anchor.set(0.5);
        title.x = 180;
        title.y = 60;
        popup.addChild(title);

        const playBtn = this.createButton(240, 56, 'ИГРАТЬ', () => {
            this.closeLevelEntryPopup();
            this.startLevel(levelIndex);
        }, 'primary', 28);
        playBtn.x = 180;
        playBtn.y = 140;
        popup.addChild(playBtn);

        const backBtn = this.createButton(240, 56, 'НАЗАД', () => this.closeLevelEntryPopup(), 'secondary', 28);
        backBtn.x = 180;
        backBtn.y = 205;
        popup.addChild(backBtn);

        this.levelSelectContainer.addChild(popup);
    }

    closeLevelEntryPopup() {
        const popup = this.levelSelectContainer.getChildByName('levelEntryPopup');
        const overlay = this.levelSelectContainer.getChildByName('levelEntryOverlay');
        if (popup) this.levelSelectContainer.removeChild(popup);
        if (overlay) this.levelSelectContainer.removeChild(overlay);
        this.selectedLevelIndex = null;
    }

    startLevel(index) {
        this.clearSpawnTimer();
        this.state.resetRuntime();
        const levelData = this.engine.startLevel(index);
        this.app.stage.removeChildren();
        this.gameContainer.removeChildren();
        this.app.stage.addChild(this.gameContainer);
        this.gameContainer.addChild(this.rootUI);
        this.setupPlayArea();
        this.updateHeader();

        if (levelData.introPopup) {
            this.state.setIntroActive(true);
            this.showIntroPopup(levelData.introPopup, () => {
                this.state.setIntroActive(false);
                this.ensureSpawnTimer();
            });
        } else {
            this.ensureSpawnTimer();
        }
    }

    setupPlayArea() {
        const levelData = this.state.getLevelData();
        if (!levelData) return;

        const gameLayout = this.getGameLayout();
        this.rootUI.removeChildren();
        this.currentGameUI = { hearts: [] };
        this.colorButtonsMap = {};

        const coloredTypes = Object.keys(levelData.params.spawnWeights || {}).filter((type) =>
            type.startsWith('coloredBug_') || type.startsWith('fatColoredBug_')
        );

        if (gameLayout.mode === 'mobile-landscape') {
            const { header, ui } = buildMobileLevelHeaderUI({
                layout: gameLayout,
                level: levelData,
                theme: THEME,
                textures: this.textures,
                score: this.state.getScore()
            });
            this.currentGameUI = ui;
            this.rootUI.addChild(header);
        } else {
            const fieldWrapper = new PIXI.Container();
            fieldWrapper.x = gameLayout.fieldWrapper.x;
            fieldWrapper.y = gameLayout.fieldWrapper.y;
            this.rootUI.addChild(fieldWrapper);

            const { header, ui } = buildDesktopLevelHeaderUI({
                wrapper: fieldWrapper,
                level: levelData,
                layout: gameLayout,
                theme: THEME,
                heartSizeRatio: HEART_SIZE_PRC,
                heartGap: HEART_GAP
            });
            this.currentGameUI = ui;
            fieldWrapper.addChild(header);
        }

        const panel = new PIXI.Container();
        const fieldLayout = gameLayout.mode === 'mobile-landscape'
            ? { x: gameLayout.fieldShell.x, y: gameLayout.fieldShell.y, width: gameLayout.playField.width, height: gameLayout.playField.height, radius: gameLayout.playField.radius, padding: gameLayout.fieldShell.padding }
            : { x: gameLayout.fieldWrapper.x, y: gameLayout.fieldWrapper.y + gameLayout.playField.y, width: gameLayout.playField.width, height: gameLayout.playField.height, radius: BORDER_RADIUS, padding: 0 };

        panel.x = fieldLayout.x;
        panel.y = fieldLayout.y;

        const bg = new PIXI.Graphics();
        bg.beginFill(THEME.fieldBg);
        bg.drawRoundedRect(0, 0, fieldLayout.width + fieldLayout.padding * 2, fieldLayout.height + fieldLayout.padding * 2, fieldLayout.radius);
        bg.endFill();
        panel.addChild(bg);

        const border = new PIXI.Graphics();
        border.lineStyle(4, THEME.border, 1);
        border.drawRoundedRect(0, 0, fieldLayout.width + fieldLayout.padding * 2, fieldLayout.height + fieldLayout.padding * 2, fieldLayout.radius);
        panel.addChild(border);

        this.playArea = new PIXI.Container();
        this.playArea.x = fieldLayout.padding;
        this.playArea.y = fieldLayout.padding;
        this.playArea._fieldWidth = fieldLayout.width;
        this.playArea._fieldHeight = fieldLayout.height;
        this.playArea._fieldRadius = fieldLayout.radius;
        panel.addChild(this.playArea);
        this.rootUI.addChild(panel);

        this.buildBottomBar(coloredTypes);
        this.syncAllColorButtonStates();
        this.updateHeader();
        this.updateMobilePortraitOverlay();
    }

    redrawActiveObjects() {
        const objects = [...this.state.getActiveObjects()];
        this.playArea?.removeChildren();
        objects.forEach((objectData) => {
            if (objectData.displayObject) {
                this.playArea.addChild(objectData.displayObject);
            } else {
                this.createBug(objectData);
            }
        });
        this.updateHeader();
    }

    clearSpawnTimer() {
        if (this.spawnTimer) {
            clearTimeout(this.spawnTimer);
            this.spawnTimer = null;
        }
    }

    ensureSpawnTimer(delay = 0) {
        this.clearSpawnTimer();
        if (this.spawnResumeDelayBlocked) return;
        if (this.state.isPaused() || this.state.isIntroActive() || this.state.isLevelEnded() || this.state.isOrientationPauseActive()) return;
        if (this.getViewportMode() === 'mobile-portrait') return;
        const nextObject = this.state.getObjectQueue()[0];
        if (!nextObject) return;
        const nextDelay = Math.max(50, Math.round(delay || nextObject.spawnInterval || 450));
        this.spawnTimer = setTimeout(() => this.spawnNextObject(), nextDelay);
    }

    spawnNextObject() {
        const objectData = this.engine.spawnObject();
        if (!objectData) {
            this.ensureSpawnTimer(100);
            return;
        }

        this.createBug(objectData);
        this.ensureSpawnTimer(objectData.spawnInterval);
    }

    getResolvedObjectSize(type) {
        const baseSize = Math.max(MIN_BUG_SIZE, Math.min(MAX_BUG_SIZE, Math.round(Math.min(this.playArea._fieldWidth, this.playArea._fieldHeight) * BUG_SIZE_PRC)));
        const isFat = type === 'fat' || type.startsWith('fatColoredBug_');
        return {
            size: baseSize,
            footprint: isFat ? Math.round(baseSize * 1.6) : baseSize,
            isFat
        };
    }

    getConstrainedSpawnBounds(spawnZone, objSize) {
        const width = this.playArea._fieldWidth;
        const height = this.playArea._fieldHeight;
        let minX = objSize / 2 + SAFE_PADDING_EXTRA;
        let maxX = width - objSize / 2 - SAFE_PADDING_EXTRA;
        const minY = objSize / 2 + SAFE_PADDING_EXTRA;
        const maxY = height - objSize / 2 - SAFE_PADDING_EXTRA;

        if (spawnZone === 'left') maxX = width / 2 - objSize / 2;
        if (spawnZone === 'right') minX = width / 2 + objSize / 2;

        return { minX, maxX, minY, maxY };
    }

    checkCollision(obj1, obj2) {
        const r1 = (obj1._footprint || Math.max(obj1.width, obj1.height)) / 2;
        const r2 = (obj2._footprint || Math.max(obj2.width, obj2.height)) / 2;
        const dx = obj1.x - obj2.x;
        const dy = obj1.y - obj2.y;
        return dx * dx + dy * dy < Math.pow(r1 + r2 + 8, 2);
    }

    createBug(objectData) {
        const { size, footprint } = this.getResolvedObjectSize(objectData.type);
        const container = new PIXI.Container();
        container._footprint = footprint;
        container.type = objectData.type;
        container.interactive = true;
        container.buttonMode = true;
        container.animations = [];

        const texture = this.getTextureForType(objectData.type);
        const visual = new PIXI.Sprite(texture);
        visual.name = 'bugVisual';
        visual.anchor.set(0.5);
        visual.width = (objectData.type === 'fat' || objectData.type.startsWith('fatColoredBug_')) ? size * 2 : size;
        visual.height = visual.width;
        container.addChild(visual);

        if (objectData.clicks > 1) {
            this.addClicksCounter(container, objectData.clicks);
        }

        const bounds = this.getConstrainedSpawnBounds(objectData.spawnZone, footprint);
        let attempts = 0;
        while (attempts < 50) {
            container.x = Math.random() * (bounds.maxX - bounds.minX) + bounds.minX;
            container.y = Math.random() * (bounds.maxY - bounds.minY) + bounds.minY;
            const collides = this.state.getActiveObjects().some((active) => active.displayObject && this.checkCollision(container, active.displayObject));
            if (!collides) break;
            attempts++;
        }

        container.alpha = 0.4;
        const targetY = container.y;
        container.y = Math.max(bounds.minY, targetY - 80);
        container.remainingLifetimeMs = objectData.lifetime;
        container.lastLifetimeSyncAt = Date.now();
        objectData.displayObject = container;

        container.on('pointerdown', () => this.onBugPointerDown(objectData));
        this.playArea.addChild(container);
        this.state.addActiveObject(objectData);
        this.startLifetimeCheck(objectData);

        container.animations.push(gsap.to(container, { y: targetY, ease: 'bounce.out', duration: 0.6 }));
        container.animations.push(gsap.to(container, { alpha: 1, duration: 0.3, delay: 0.1 }));
        return objectData;
    }

    removeBug(objectData, onAfterRemove) {
        const container = objectData.displayObject;
        if (!container) return;

        gsap.to(container.scale, {
            x: 0,
            y: 0,
            duration: 0.15,
            ease: 'back.in',
            onComplete: () => {
                if (container.parent) container.parent.removeChild(container);
                this.state.removeActiveObject(objectData);
                if (onAfterRemove) onAfterRemove();
                this.ensureSpawnTimer();
            }
        });
    }

    addClicksCounter(container, clicks) {
        const text = new PIXI.Text(String(clicks), {
            fontSize: 28,
            fill: THEME.white,
            fontWeight: 'bold',
            fontFamily: 'Arial',
            stroke: THEME.borderDark,
            strokeThickness: 4
        });
        text.name = 'clickText';
        text.anchor.set(0.5);
        container.addChild(text);
    }

    updateClicksCounter(container, clicks) {
        const text = container.getChildByName('clickText');
        if (text) text.text = String(clicks);
    }

    onBugPointerDown(objectData) {
        if (this.state.isPaused() || this.state.isLevelEnded()) return;

        const allowed = this.engine.canClickObject(objectData, {
            activeColor: this.input.getActiveColor(),
            hasAnyActiveColor: this.input.hasAnyActiveColor()
        }, {
            chameleonActive: this.isChameleonEffectActive()
        });

        if (!allowed) {
            this.animateShake(objectData.displayObject);
            return;
        }

        if (objectData.clicks > 1) {
            objectData.clicks -= 1;
            this.updateClicksCounter(objectData.displayObject, objectData.clicks);
            if (objectData.type === 'fat' || objectData.type.startsWith('fatColoredBug_')) {
                this.animateSquish(objectData.displayObject);
            } else {
                this.animateShake(objectData.displayObject);
            }
            return;
        }

        const result = this.engine.applyObjectClick(objectData);

        if (result.explode) this.showExplosion(objectData.displayObject.x, objectData.displayObject.y);
        if (result.frozenWave) this.activateFrozenEffect(objectData.displayObject.x, objectData.displayObject.y);
        if (result.chameleonWave) this.activateChameleonEffect(objectData.displayObject.x, objectData.displayObject.y);
        if (result.neatWave) this.clearFieldWithNeat(objectData);

        this.removeBug(objectData, () => {
            this.updateHeader();
            this.checkEndState(result);
        });
    }

    checkEndState(result = {}) {
        if (result.won) {
            this.endGame(true);
        } else if (result.lost) {
            this.endGame(false);
        }
    }

    startLifetimeCheck(objectData) {
        const container = objectData.displayObject;
        if (!container) return;
        if (container.lifetimeCheckTimeout) clearTimeout(container.lifetimeCheckTimeout);

        const tick = () => {
            if (!this.state.getActiveObjects().includes(objectData)) return;
            if (this.state.isPaused() || this.state.isOrientationPauseActive()) {
                container.lifetimeCheckTimeout = setTimeout(tick, 100);
                return;
            }

            const now = Date.now();
            const timeScale = this.isFrozenEffectActive() ? 0.5 : 1;
            const elapsed = now - (container.lastLifetimeSyncAt || now);
            container.lastLifetimeSyncAt = now;
            container.remainingLifetimeMs = Math.max(0, (container.remainingLifetimeMs || 0) - elapsed * timeScale);

            if (container.remainingLifetimeMs <= 0) {
                const outcome = this.engine.applyExpiredObject(objectData);
                this.removeExpiredObject(objectData, outcome);
                return;
            }

            container.lifetimeCheckTimeout = setTimeout(tick, Math.min(container.remainingLifetimeMs, 1000));
        };

        container.lifetimeCheckTimeout = setTimeout(tick, 100);
    }

    removeExpiredObject(objectData, outcome) {
        const container = objectData.displayObject;
        if (!container) return;
        gsap.to(container, {
            y: container.y + 100,
            alpha: 0,
            duration: 0.4,
            ease: 'power1.in',
            onComplete: () => {
                if (container.parent) container.parent.removeChild(container);
                this.state.removeActiveObject(objectData);
                this.updateHeader();
                if (outcome.lost) {
                    this.endGame(false);
                } else {
                    this.ensureSpawnTimer();
                }
            }
        });
    }

    animateShake(container) {
        gsap.fromTo(container, { x: container.x - 6 }, {
            x: container.x + 6,
            duration: 0.05,
            repeat: 3,
            yoyo: true
        });
    }

    animateSquish(container) {
        gsap.to(container.scale, {
            x: 1.12,
            y: 0.82,
            duration: 0.08,
            yoyo: true,
            repeat: 1
        });
    }

    showExplosion(x, y) {
        const explosion = new PIXI.Sprite(this.textures.bomb_explosion || this.textures.bomb);
        explosion.anchor.set(0.5);
        explosion.x = x;
        explosion.y = y;
        explosion.width = 100;
        explosion.height = 100;
        this.playArea.addChild(explosion);
        setTimeout(() => {
            if (explosion.parent) explosion.parent.removeChild(explosion);
        }, 800);
    }

    activateFrozenEffect(x, y) {
        this.frozenEffectEndsAt = Date.now() + 5000;
        const wave = new PIXI.Graphics();
        wave.lineStyle(10, 0x8FE8FF, 0.85);
        wave.drawCircle(0, 0, 36);
        wave.x = x;
        wave.y = y;
        wave.scale.set(0.2);
        this.playArea.addChild(wave);
        gsap.to(wave.scale, { x: 6, y: 6, duration: 0.5, ease: 'power2.out' });
        gsap.to(wave, {
            alpha: 0,
            duration: 0.5,
            onComplete: () => {
                if (wave.parent) wave.parent.removeChild(wave);
            }
        });
    }

    isFrozenEffectActive() {
        return this.frozenEffectEndsAt > Date.now();
    }

    activateChameleonEffect(x, y) {
        this.chameleonEffectEndsAt = Date.now() + 5000;
        this.input.clearActiveColor();
        const wave = new PIXI.Graphics();
        wave.lineStyle(8, 0xFFD7A8, 0.8);
        wave.drawCircle(0, 0, 30);
        wave.x = x;
        wave.y = y;
        wave.scale.set(0.2);
        this.playArea.addChild(wave);
        gsap.to(wave.scale, { x: 7, y: 7, duration: 0.7, ease: 'power2.out' });
        gsap.to(wave, {
            alpha: 0,
            duration: 0.7,
            onComplete: () => {
                if (wave.parent) wave.parent.removeChild(wave);
            }
        });
    }

    isChameleonEffectActive() {
        return this.chameleonEffectEndsAt > Date.now();
    }

    clearFieldWithNeat(triggerObject) {
        this.clearSpawnTimer();
        this.spawnResumeDelayBlocked = true;
        if (this.spawnResumeDelayTimer) clearTimeout(this.spawnResumeDelayTimer);
        this.spawnResumeDelayTimer = setTimeout(() => {
            this.spawnResumeDelayBlocked = false;
            this.ensureSpawnTimer();
        }, NEAT_SPAWN_DELAY_MS);

        const others = [...this.state.getActiveObjects()].filter((objectData) => objectData !== triggerObject);
        others.forEach((objectData, index) => {
            this.state.addScore(this.engine.getObjectScoreValue(objectData));
            gsap.to(objectData.displayObject, {
                alpha: 0,
                delay: Math.min(0.16, 0.03 + index * 0.01),
                duration: 0.28,
                onComplete: () => {
                    if (objectData.displayObject?.parent) objectData.displayObject.parent.removeChild(objectData.displayObject);
                    this.state.removeActiveObject(objectData);
                    this.updateHeader();
                }
            });
        });
    }

    endGame(won) {
        this.clearSpawnTimer();
        const payload = this.engine.endGame(won);
        this.state.getActiveObjects().forEach((objectData) => {
            const container = objectData.displayObject;
            if (!container) return;
            container.interactive = false;
            container.buttonMode = false;
        });

        saveProgress(payload.levelData.id, payload.score, won).catch(() => {});
        trackEvent(won ? 'level_win' : 'level_lose', {
            levelId: payload.levelData.id,
            score: payload.score,
            lifeLeft: payload.life
        }).catch(() => {});
        recalcLeaderboard(levels.length).catch(() => {});

        if (won) {
            this.markLevelCompleted(payload.levelData.id - 1);
            this.showResultPopup(true);
        } else {
            this.showResultPopup(false);
        }
    }

    showResultPopup(won) {
        const overlay = new PIXI.Graphics();
        overlay.beginFill(THEME.overlay, 0.34);
        overlay.drawRect(0, 0, this.app.screen.width, this.app.screen.height);
        overlay.endFill();
        overlay.name = 'resultOverlay';
        overlay.interactive = true;
        this.gameContainer.addChild(overlay);

        const popup = new PIXI.Container();
        popup.name = 'resultPopup';
        popup.x = this.app.screen.width / 2 - 220;
        popup.y = this.app.screen.height / 2 - 170;
        popup.addChild(this.createRoundedPanel(440, 340, 36, THEME.cardBg, won ? THEME.success : THEME.fail, 8));

        const title = new PIXI.Text(won ? 'ПОБЕДА' : 'НЕ ПОВЕЗЛО!', {
            fontSize: 40,
            fill: won ? THEME.textDark : THEME.fail,
            fontWeight: 'bold',
            fontFamily: 'Arial'
        });
        title.anchor.set(0.5);
        title.x = 220;
        title.y = 58;
        popup.addChild(title);

        const retryLabel = won && levels[this.state.getLevelData().id] ? 'СЛЕДУЮЩИЙ\nУРОВЕНЬ' : 'ПОПРОБОВАТЬ\nЕЩЕ РАЗ';
        const primaryBtn = this.createButton(320, 70, retryLabel, () => {
            this.clearAllPopups();
            if (won && levels[this.state.getLevelData().id]) {
                this.startLevel(this.state.getLevelData().id);
            } else {
                this.startLevel(this.state.getLevelData().id - 1);
            }
        }, 'primary', 28);
        primaryBtn.x = 220;
        primaryBtn.y = 170;
        popup.addChild(primaryBtn);

        const menuBtn = this.createButton(320, 70, 'МЕНЮ', () => {
            this.clearAllPopups();
            this.showLevelSelect();
        }, 'secondary', 28);
        menuBtn.x = 220;
        menuBtn.y = 255;
        popup.addChild(menuBtn);

        this.gameContainer.addChild(popup);
    }

    clearAllPopups() {
        ['resultOverlay', 'resultPopup', 'introOverlay', 'introPopup'].forEach((name) => {
            const node = this.gameContainer.getChildByName(name);
            if (node) this.gameContainer.removeChild(node);
        });
    }

    showIntroPopup(cfg, onClose) {
        const overlay = new PIXI.Graphics();
        overlay.beginFill(THEME.overlay, 0.42);
        overlay.drawRect(0, 0, this.app.screen.width, this.app.screen.height);
        overlay.endFill();
        overlay.name = 'introOverlay';
        overlay.interactive = true;
        this.gameContainer.addChild(overlay);

        const popup = new PIXI.Container();
        popup.name = 'introPopup';
        popup.x = this.app.screen.width / 2 - 240;
        popup.y = this.app.screen.height / 2 - 200;
        popup.addChild(this.createRoundedPanel(480, 400, 32, THEME.cardBg, THEME.border, 6));

        const title = new PIXI.Text('Новый жук!', {
            fontSize: 42,
            fill: THEME.primary,
            fontWeight: '900',
            fontFamily: 'Arial'
        });
        title.anchor.set(0.5);
        title.x = 240;
        title.y = 48;
        popup.addChild(title);

        const icon = new PIXI.Sprite(this.getTextureForType(cfg?.type));
        icon.anchor.set(0.5);
        icon.x = 240;
        icon.y = 150;
        icon.width = 120;
        icon.height = 120;
        popup.addChild(icon);

        const desc = new PIXI.Text(String(cfg?.descryption ?? ''), {
            fontSize: 22,
            fill: THEME.textDark,
            fontWeight: '700',
            fontFamily: 'Arial',
            align: 'center',
            wordWrap: true,
            wordWrapWidth: 400
        });
        desc.anchor.set(0.5);
        desc.x = 240;
        desc.y = 255;
        popup.addChild(desc);

        const ok = this.createButton(220, 60, 'ОК', () => {
            this.clearAllPopups();
            onClose?.();
        }, 'primary', 28);
        ok.x = 240;
        ok.y = 345;
        popup.addChild(ok);

        this.gameContainer.addChild(popup);
    }

    buildBottomBar(coloredTypes) {
        const usedColors = new Set(coloredTypes.map((type) => type.split('_')[1]).filter(Boolean));
        const barH = Math.max(this.app.screen.height * BAR_H_PRC, MIN_BAR_H);
        const btnSz = Math.floor(barH * 0.72);
        const gap = GAP_HORZ;
        const fieldWrapper = this.playArea?.parent;
        const barWidth = fieldWrapper?.width ?? this.app.screen.width;
        const barX = fieldWrapper?.x ?? 0;

        if (!this.bottomBar) this.bottomBar = new PIXI.Container();
        if (!this.bottomBar.parent) this.rootUI.addChild(this.bottomBar);
        this.bottomBar.removeChildren();
        this.colorButtonsMap = {};

        this.bottomBar.x = barX;
        this.bottomBar.y = this.app.screen.height - barH;

        const bg = new PIXI.Graphics();
        bg.beginFill(THEME.cardBg);
        bg.drawRoundedRect(0, 0, barWidth, barH, 24);
        bg.endFill();
        this.bottomBar.addChild(bg);

        this.dynamicColorKeyMap = {};
        this.colorButtonsContainer = this.bottomBar;

        let index = 0;
        COLOR_BUTTON_SLOTS.forEach((slot) => {
            if (!usedColors.has(slot.color)) return;
            this.dynamicColorKeyMap[slot.key] = slot.color;
            const button = this.createColorButton(slot.color, btnSz, slot.key);
            button.x = 24 + index * (btnSz + gap);
            button.y = (barH - btnSz) / 2;
            this.bottomBar.addChild(button);
            this.colorButtonsMap[slot.color] = [button];
            index++;
        });

        this.input.setDynamicColorKeyMap(this.dynamicColorKeyMap);

        const pauseButton = this.createButton(btnSz, btnSz, 'II', () => this.togglePause(), 'pause', Math.floor(btnSz * 0.45));
        pauseButton.x = barWidth - btnSz / 2 - gap;
        pauseButton.y = barH / 2;
        this.bottomBar.addChild(pauseButton);
    }

    createColorButton(color, size, key) {
        const button = new PIXI.Container();
        button.name = `colorButton_${color}`;
        button.interactive = true;
        button.buttonMode = true;
        button.originalScale = 1;

        const shadow = new PIXI.Graphics();
        shadow.beginFill(THEME.shadow, 0.18);
        shadow.drawEllipse(size / 2, size * 0.78, size * 0.28, size * 0.14);
        shadow.endFill();
        button.addChild(shadow);

        const textureName = this.getButtonTextureName(color);
        if (this.textures[textureName]) {
            const sprite = new PIXI.Sprite(this.textures[textureName]);
            const iconSize = size * 0.9;
            sprite.x = (size - iconSize) / 2;
            sprite.y = (size - iconSize) / 2;
            sprite.width = iconSize;
            sprite.height = iconSize;
            button.addChild(sprite);
        } else {
            const fallback = new PIXI.Graphics();
            fallback.beginFill(COLORS[color] || THEME.primary);
            fallback.drawCircle(size / 2, size / 2, size * 0.4);
            fallback.endFill();
            button.addChild(fallback);
        }

        const activeIndicator = new PIXI.Graphics();
        activeIndicator.beginFill(0xFFF7E8, 0.3);
        activeIndicator.drawCircle(size / 2, size / 2, size * 0.46);
        activeIndicator.endFill();
        activeIndicator.name = 'activeIndicator';
        activeIndicator.visible = false;
        button.addChild(activeIndicator);

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

        button.on('pointerdown', (event) => this.input.pressPointerColor(color, event));
        button.on('pointerup', (event) => this.input.releasePointerColor(color, event));
        button.on('pointerupoutside', (event) => this.input.releasePointerColor(color, event));
        button.on('pointercancel', (event) => this.input.releasePointerColor(color, event));
        return button;
    }

    syncAllColorButtonStates() {
        const colors = new Set([...Object.keys(this.colorButtonsMap), 'red', 'blue', 'green', 'yellow']);
        colors.forEach((color) => this.updateButtonState(color, this.input.isColorHeld(color)));
    }

    updateButtonState(color, isActive) {
        const buttons = this.colorButtonsMap[color] || [];
        buttons.forEach((button) => {
            const indicator = button.getChildByName('activeIndicator');
            if (indicator) indicator.visible = isActive;

            gsap.to(button.scale, {
                x: isActive ? button.originalScale * 1.03 : button.originalScale,
                y: isActive ? button.originalScale * 0.94 : button.originalScale,
                duration: 0.16,
                ease: 'sine.inOut'
            });
        });
    }

    togglePause() {
        this.state.setPaused(!this.state.isPaused());
        if (this.state.isPaused()) {
            this.clearSpawnTimer();
        } else {
            this.ensureSpawnTimer();
        }
    }

    updateHeader() {
        updateLevelHeaderUI({
            currentGameUI: this.currentGameUI,
            score: this.state.getScore(),
            life: this.state.getLife(),
            levelData: this.state.getLevelData(),
            textures: this.textures,
            theme: THEME
        });
    }

    createButton(width, height, text, onClick, variant = 'primary', fontSize = 32) {
        const styles = {
            primary: { fill: THEME.primary, border: THEME.borderDark, text: THEME.white },
            secondary: { fill: THEME.secondary, border: 0xB56A2D, text: THEME.textDark },
            pause: { fill: 0x8E7CFF, border: 0x5E4AE0, text: THEME.white }
        };
        const style = styles[variant] || styles.primary;

        const btn = new PIXI.Graphics();
        btn.lineStyle(4, style.border);
        btn.beginFill(style.fill);
        btn.drawRoundedRect(-width / 2, -height / 2, width, height, 18);
        btn.endFill();
        btn.interactive = true;
        btn.buttonMode = true;
        btn.on('pointerdown', onClick);

        const btnText = new PIXI.Text(text, {
            fontSize,
            fill: style.text,
            fontWeight: 'bold',
            fontFamily: 'Arial',
            align: 'center'
        });
        btnText.anchor.set(0.5);
        btn.addChild(btnText);
        return btn;
    }

    getTextureForType(type) {
        if (!type) return this.textures.bug;
        if (type === 'healer') return this.textures.healer || this.textures.bug;
        if (type === 'frozen') return this.textures.frozen || this.textures.bug;
        if (type === 'chameleon') return this.textures.chameleon || this.textures.bug;
        if (type === 'neat') return this.textures.neat || this.textures.bug;
        if (type.startsWith('fatColoredBug_')) {
            const color = type.split('_')[1];
            return this.textures[`coloredBug_${color}`] || this.textures.bug;
        }
        return this.textures[type] || this.textures.bug;
    }

    getCompletedLevels() {
        try {
            return JSON.parse(localStorage.getItem('completedLevels') || '[]');
        } catch {
            return [];
        }
    }

    markLevelCompleted(index) {
        const completed = this.getCompletedLevels();
        if (!completed.includes(index)) {
            completed.push(index);
            localStorage.setItem('completedLevels', JSON.stringify(completed));
        }
    }
}
