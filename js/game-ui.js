export function isMobileDevice(maxViewport) {
    const ua = navigator.userAgent || '';
    const mobileUa = /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(ua);
    const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    return mobileUa || (coarsePointer && Math.max(window.innerWidth, window.innerHeight) <= maxViewport);
}

export function getViewportMode({ maxViewport, minLandscapeRatio }) {
    const mobile = isMobileDevice(maxViewport);
    const isLandscape = window.innerWidth >= window.innerHeight * minLandscapeRatio;

    if (!mobile) return 'desktop';
    return isLandscape ? 'mobile-landscape' : 'mobile-portrait';
}

export function getUsedLevelColors(level, colorButtonSlots) {
    const spawnWeights = level?.params?.spawnWeights || {};
    const usedColors = new Set();

    Object.keys(spawnWeights).forEach((type) => {
        if (type.startsWith('coloredBug_') || type.startsWith('fatColoredBug_')) {
            const color = type.split('_')[1];
            if (color) usedColors.add(color);
        }
    });

    return colorButtonSlots
        .map((slot) => slot.color)
        .filter((color) => usedColors.has(color));
}

export function getButtonTextureName(color) {
    if (color === 'blue') return 'button_purple';
    return `button_${color}`;
}

export function getGameLayout({
    mode,
    screenWidth,
    screenHeight,
    barHeightRatio,
    minBarHeight,
    gapHorizontal,
    headerHeightRatio,
    borderRadius,
    colorButtonSlots
}) {
    if (mode !== 'mobile-landscape') {
        const barH = Math.max(screenHeight * barHeightRatio, minBarHeight);
        const topMargin = 20;
        const size = Math.min(
            screenWidth - 40,
            screenHeight - barH - topMargin - gapHorizontal
        );

        return {
            mode: 'desktop',
            screenWidth,
            screenHeight,
            header: { height: Math.floor(size * headerHeightRatio) },
            fieldWrapper: {
                x: (screenWidth - size) / 2,
                y: topMargin,
                width: size,
                height: size
            },
            playField: {
                x: 0,
                y: Math.floor(size * headerHeightRatio),
                width: size,
                height: size - Math.floor(size * headerHeightRatio),
                radius: borderRadius
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
    const fieldHeight = Math.max(220, screenHeight - topInset - bottomInset - headerHeight - gap);
    const panelRadius = Math.max(24, Math.min(36, fieldHeight * 0.08));
    const fieldPadding = Math.max(12, Math.min(20, fieldHeight * 0.05));
    const playFieldHeight = fieldHeight - fieldPadding * 2;
    const sideButtonGap = Math.max(8, Math.min(16, gap * 0.8));
    const stackedButtonGap = Math.max(8, Math.min(18, playFieldHeight * 0.045));
    const buttonHeight = Math.max(76, (playFieldHeight - stackedButtonGap) / 2);
    const desiredButtonWidth = buttonHeight / 1.8;
    const buttonWidth = Math.max(44, Math.min(desiredButtonWidth, screenWidth * 0.13, 92));
    const columnWidth = buttonWidth;
    const fieldWidth = Math.max(
        300,
        screenWidth - sideInset * 2 - columnWidth * 2 - sideButtonGap * 2
    );
    const fieldX = sideInset + columnWidth + sideButtonGap;
    const fieldY = topInset + headerHeight + gap;
    const playFieldX = fieldX + fieldPadding;
    const playFieldY = fieldY + fieldPadding;

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
            x: playFieldX,
            y: playFieldY,
            width: fieldWidth - fieldPadding * 2,
            height: playFieldHeight,
            radius: Math.max(18, panelRadius - 8)
        },
        leftButtons: {
            x: playFieldX - sideButtonGap - columnWidth,
            y: playFieldY,
            width: columnWidth,
            height: playFieldHeight
        },
        rightButtons: {
            x: playFieldX + (fieldWidth - fieldPadding * 2) + sideButtonGap,
            y: playFieldY,
            width: columnWidth,
            height: playFieldHeight
        },
        pauseButton: {
            x: screenWidth - sideInset - pauseButtonSize,
            y: topInset + Math.max(0, (headerHeight - pauseButtonSize) / 2),
            size: pauseButtonSize
        },
        buttons: {
            width: buttonWidth,
            height: buttonHeight,
            gap: stackedButtonGap
        }
    };
}

export function createRoundedPanel({ width, height, radius, fill, borderColor, borderWidth, theme }) {
    const panel = new PIXI.Container();

    const shadow = new PIXI.Graphics();
    shadow.beginFill(theme.shadow, 0.18);
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

export function createLabelSprite({ textureName, maxWidth, maxHeight, textures }) {
    const texture = textures[textureName];
    if (!texture) return null;

    const sprite = new PIXI.Sprite(texture);
    sprite.anchor.set(0.5, 0);
    const scale = Math.min(maxWidth / texture.width, maxHeight / texture.height);
    sprite.scale.set(scale);
    return sprite;
}

export function ensureMobilePortraitOverlay({ overlayId, message }) {
    let overlay = document.getElementById(overlayId);
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = overlayId;
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
    text.textContent = message;
    text.style.fontSize = 'clamp(22px, 3vw, 30px)';
    text.style.fontWeight = '700';
    text.style.lineHeight = '1.2';
    text.style.maxWidth = '420px';

    overlay.appendChild(phone);
    overlay.appendChild(text);
    document.body.appendChild(overlay);
    return overlay;
}

export function syncMobilePortraitOverlay({
    overlayId,
    shouldShow,
    message,
    setGameVisible,
    onPause,
    onResume
}) {
    const overlay = ensureMobilePortraitOverlay({ overlayId, message });
    overlay.style.display = shouldShow ? 'flex' : 'none';
    setGameVisible(!shouldShow);

    if (shouldShow) {
        onPause();
    } else {
        onResume();
    }
}

export function buildDesktopLevelHeader({ wrapper, level, layout, theme, heartSizeRatio, heartGap }) {
    const headerH = Math.floor(layout.header.height);
    const header = new PIXI.Container();
    header.name = 'levelHeader';
    wrapper.addChild(header);

    const bar = new PIXI.Graphics();
    bar.beginFill(theme.headerBg)
       .drawRoundedRect(0, 0, wrapper.width, headerH, 14)
       .endFill();
    header.addChild(bar);

    const lvlText = new PIXI.Text(`Уровень ${level.id}`, {
        fontSize: headerH * 0.35,
        fill: theme.textDark,
        fontWeight: 'bold',
        fontFamily: 'Arial',
    });
    lvlText.y = headerH * 0.15;
    lvlText.x = 18;
    header.addChild(lvlText);

    const progText = new PIXI.Text(`0/${level.goalBugCount}`, {
        fontSize: headerH * 0.35,
        fill: theme.textDark,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        align: 'right',
    });
    progText.anchor.set(1, 0);
    progText.x = wrapper.width - 18;
    progText.y = headerH * 0.15;
    progText.name = 'progText';
    header.addChild(progText);

    const heartSz = Math.floor(headerH * heartSizeRatio);
    const hearts = new PIXI.Container();
    hearts.name = 'heartsRow';
    header.addChild(hearts);

    const heartStyle = {
        fontSize: heartSz,
        fill: theme.fail,
        fontFamily: 'Arial',
    };

    const heartRefs = [];
    for (let i = 0; i < level.lifeCount; i++) {
        const h = new PIXI.Text('❤', heartStyle);
        h.x = i * (heartSz + heartGap);
        hearts.addChild(h);
        heartRefs.push(h);
    }

    hearts.x = (wrapper.width - hearts.width) / 2;
    hearts.y = headerH - heartSz - heartGap;

    return {
        header,
        ui: {
            mode: 'desktop',
            header,
            progText,
            hearts: heartRefs
        }
    };
}

export function buildMobileLevelHeader({ layout, level, theme, textures, score }) {
    const header = new PIXI.Container();
    header.name = 'topHudContainer';
    header.x = layout.header.x;
    header.y = layout.header.y;

    const levelTexture = textures.level_panel;
    const goalTexture = textures.goal_panel;
    const baseGap = 18;
    const targetHeight = layout.header.height;

    const levelBaseWidth = levelTexture?.width ?? 540;
    const levelBaseHeight = levelTexture?.height ?? 124;
    const goalBaseWidth = goalTexture?.width ?? 220;
    const goalBaseHeight = goalTexture?.height ?? 124;

    const scaleByHeight = targetHeight / Math.max(levelBaseHeight, goalBaseHeight);
    const scaleByWidth = layout.header.width / (levelBaseWidth + goalBaseWidth + baseGap);
    const hudScale = Math.min(scaleByHeight, scaleByWidth, 1);
    const scaledGap = baseGap * hudScale;
    const totalWidth = (levelBaseWidth + goalBaseWidth) * hudScale + scaledGap;
    const startX = Math.max(0, (layout.header.width - totalWidth) / 2);
    const topOffset = Math.max(0, (layout.header.height - Math.max(levelBaseHeight, goalBaseHeight) * hudScale) / 2);

    const levelPanelContainer = new PIXI.Container();
    levelPanelContainer.name = 'levelPanelContainer';
    levelPanelContainer.x = startX;
    levelPanelContainer.y = topOffset;
    levelPanelContainer.scale.set(hudScale);
    header.addChild(levelPanelContainer);

    if (levelTexture) {
        levelPanelContainer.addChild(new PIXI.Sprite(levelTexture));
    }

    const levelTextStyle = new PIXI.TextStyle({
        fontSize: 34,
        fill: theme.white,
        fontWeight: '900',
        fontFamily: 'Arial',
        stroke: theme.borderDark,
        strokeThickness: 6,
        lineJoin: 'round'
    });
    const valueTextStyle = new PIXI.TextStyle({
        fontSize: 38,
        fill: theme.white,
        fontWeight: '900',
        fontFamily: 'Arial',
        stroke: theme.borderDark,
        strokeThickness: 6,
        lineJoin: 'round'
    });

    const levelLabelText = new PIXI.Text('LEVEL', levelTextStyle);
    levelLabelText.anchor.set(0, 0.5);
    levelLabelText.x = 46;
    levelLabelText.y = levelBaseHeight * 0.52;
    levelPanelContainer.addChild(levelLabelText);

    const levelValueText = new PIXI.Text(String(level.id), valueTextStyle);
    levelValueText.anchor.set(0, 0.5);
    levelValueText.x = levelLabelText.x + levelLabelText.width + 16;
    levelValueText.y = levelLabelText.y;
    levelPanelContainer.addChild(levelValueText);

    const heartsContainer = new PIXI.Container();
    heartsContainer.name = 'heartsRow';
    levelPanelContainer.addChild(heartsContainer);

    const goalPanelContainer = new PIXI.Container();
    goalPanelContainer.name = 'goalPanelContainer';
    goalPanelContainer.x = startX + levelBaseWidth * hudScale + scaledGap;
    goalPanelContainer.y = topOffset;
    goalPanelContainer.scale.set(hudScale);
    header.addChild(goalPanelContainer);

    if (goalTexture) {
        goalPanelContainer.addChild(new PIXI.Sprite(goalTexture));
    }

    const goalLabelText = new PIXI.Text('ЦЕЛЬ:', levelTextStyle);
    goalLabelText.anchor.set(0, 0.5);
    goalLabelText.x = 28;
    goalLabelText.y = goalBaseHeight * 0.52;
    goalPanelContainer.addChild(goalLabelText);

    const goalValueText = new PIXI.Text(String(Math.max(0, level.goalBugCount - score)), valueTextStyle);
    goalValueText.anchor.set(1, 0.5);
    goalValueText.x = goalBaseWidth - 28;
    goalValueText.y = goalLabelText.y;
    goalPanelContainer.addChild(goalValueText);

    return {
        header,
        ui: {
            mode: 'mobile-landscape',
            header,
            levelValueText,
            goalValueText,
            heartsContainer,
            heartSize: 34,
            heartGap: 8,
            heartRightX: levelBaseWidth - 34,
            heartCenterY: levelBaseHeight * 0.52,
            hearts: []
        }
    };
}

export function updateLevelHeaderUI({ currentGameUI, score, life, levelData, textures, theme }) {
    if (!currentGameUI) return;

    if (currentGameUI.mode === 'mobile-landscape') {
        if (currentGameUI.levelValueText) {
            currentGameUI.levelValueText.text = String(levelData.id);
        }

        if (currentGameUI.goalValueText) {
            currentGameUI.goalValueText.text = String(Math.max(0, levelData.goalBugCount - score));
        }

        if (currentGameUI.heartsContainer) {
            currentGameUI.heartsContainer.removeChildren();
            currentGameUI.hearts = [];

            const heartSize = currentGameUI.heartSize ?? 34;
            const heartGap = currentGameUI.heartGap ?? 8;
            const totalWidth = life > 0 ? life * heartSize + (life - 1) * heartGap : 0;
            const startX = (currentGameUI.heartRightX ?? 0) - totalWidth;

            for (let i = 0; i < life; i++) {
                let heart;
                if (textures.heart) {
                    heart = new PIXI.Sprite(textures.heart);
                    heart.width = heartSize;
                    heart.height = heartSize;
                } else {
                    heart = new PIXI.Text('❤', {
                        fontSize: heartSize,
                        fill: theme.fail,
                        fontWeight: '700',
                        fontFamily: 'Arial'
                    });
                }

                heart.x = startX + i * (heartSize + heartGap);
                heart.y = (currentGameUI.heartCenterY ?? 0) - heartSize / 2;
                currentGameUI.heartsContainer.addChild(heart);
                currentGameUI.hearts.push(heart);
            }
        }

        return;
    }

    if (currentGameUI.progText) {
        currentGameUI.progText.text = `${score}/${levelData.goalBugCount}`;
    }

    currentGameUI.hearts.forEach((heart, index) => {
        const isAlive = index < life;
        if (heart instanceof PIXI.Sprite) {
            heart.alpha = isAlive ? 1 : 0.24;
            heart.tint = isAlive ? 0xFFFFFF : 0xC78B65;
        } else {
            heart.text = isAlive ? '❤' : '♡';
            heart.style.fill = isAlive ? theme.fail : theme.headerBg;
        }
    });
}
