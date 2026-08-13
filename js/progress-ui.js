export const TOTAL_PROGRESS_LEVELS = 120;

const BUG_PROGRESS_MASK = [
    '....B........B....',
    '.....B......B.....',
    '......B....B......',
    '......BBBBBB......',
    '.....BBBBBBBB.....',
    '.....BBBBBBBB.....',
    '...B.OOOOOOOO.B...',
    '..BB.OOOOOOOO.BB..',
    '...OOOOYYYYOOOO...',
    '...OOOOYYYYOOOO...',
    '.B..OOOYYYYOOO..B.',
    '....OOOYYYYOOO....',
    '....B.OYYYYO.B....',
    '...B...YYYY...B...',
    '......OYYYYO......',
    '.......OYYO.......'
];

const PROGRESS_SCREEN_CONFIG = {
    showLevelSelectButton: true,
    grid: {
        columns: 18,
        rows: 16
    },
    card: {
        fill: 0xFFF9EC,
        border: 0xDF690E
    },
    cells: {
        neutral: 0xD9D1C3,
        colors: {
            B: 0x92481F,
            O: 0xF47712,
            Y: 0xFFB51A
        }
    }
};

function parseProgressMask(mask) {
    const cells = [];

    mask.forEach((row, rowIndex) => {
        if (row.length !== PROGRESS_SCREEN_CONFIG.grid.columns) {
            throw new Error(
                `BUG_PROGRESS_MASK row ${rowIndex + 1} must contain ${PROGRESS_SCREEN_CONFIG.grid.columns} columns, ` +
                `received ${row.length}`
            );
        }

        [...row].forEach((symbol, colIndex) => {
            if (symbol === '.') return;

            if (!PROGRESS_SCREEN_CONFIG.cells.colors[symbol]) {
                throw new Error(`BUG_PROGRESS_MASK contains unsupported cell symbol "${symbol}"`);
            }

            cells.push({ row: rowIndex, col: colIndex, symbol });
        });
    });

    return cells;
}

const PROGRESS_CELLS = parseProgressMask(BUG_PROGRESS_MASK);

if (PROGRESS_CELLS.length !== TOTAL_PROGRESS_LEVELS) {
    throw new Error(
        `BUG_PROGRESS_MASK must contain exactly ${TOTAL_PROGRESS_LEVELS} cells, ` +
        `received ${PROGRESS_CELLS.length}`
    );
}

function createCoverBackground(texture, width, height, fallbackColor) {
    const container = new PIXI.Container();
    const bg = new PIXI.Graphics();
    bg.beginFill(fallbackColor);
    bg.drawRect(0, 0, width, height);
    bg.endFill();
    container.addChild(bg);

    if (texture) {
        const sprite = new PIXI.Sprite(texture);
        const scale = Math.max(width / texture.width, height / texture.height);
        sprite.anchor.set(0.5);
        sprite.scale.set(scale);
        sprite.x = width / 2;
        sprite.y = height / 2;
        container.addChild(sprite);
    }

    return container;
}

function drawProgressCard(card, width, height, radius) {
    card.clear();
    card.beginFill(PROGRESS_SCREEN_CONFIG.card.fill, 0.94);
    card.lineStyle(Math.max(4, Math.round(Math.min(width, height) * 0.012)), PROGRESS_SCREEN_CONFIG.card.border, 1);
    card.drawRoundedRect(0, 0, width, height, radius);
    card.endFill();
}

function drawSecondaryButton(button, width, height, text) {
    button.removeChildren();

    const bg = new PIXI.Graphics();
    bg.beginFill(0xFFE8C2, 0.96);
    bg.lineStyle(Math.max(3, Math.round(height * 0.07)), 0xB56A2D, 1);
    bg.drawRoundedRect(-width / 2, -height / 2, width, height, Math.max(14, height * 0.28));
    bg.endFill();
    button.addChild(bg);

    const label = new PIXI.Text(text, {
        fontSize: Math.max(16, Math.min(24, Math.round(height * 0.35))),
        fill: 0x6B3E1F,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        align: 'center'
    });
    label.anchor.set(0.5);
    button.addChild(label);
}

function getProgressLayout(width, height) {
    const base = Math.min(width, height);
    const playSize = Math.max(76, Math.min(132, height * 0.26, width * 0.14));
    const playRight = Math.max(18, width * 0.025);
    const playBottom = Math.max(18, height * 0.045);
    const playX = width - playRight - playSize / 2;
    const playY = height - playBottom - playSize / 2;
    const levelSelectHeight = Math.max(42, Math.min(62, playSize * 0.45));
    const levelSelectWidth = Math.max(160, Math.min(260, width * 0.22));
    const levelSelectGap = Math.max(14, width * 0.018);

    const cardWidth = Math.max(300, Math.min(width * 0.49, 520, width - 32));
    const cardHeight = Math.max(220, Math.min(height * 0.70, 360, height - 32));
    const cardX = (width - cardWidth) / 2;
    const cardY = (height - cardHeight) / 2;

    const innerPadX = Math.max(28, cardWidth * 0.12);
    const innerPadY = Math.max(24, cardHeight * 0.11);
    const availableGridWidth = cardWidth - innerPadX * 2;
    const availableGridHeight = cardHeight - innerPadY * 2;
    const gap = Math.max(1, Math.min(4, Math.floor(base * 0.005)));
    const cellSize = Math.floor(Math.min(
        (availableGridWidth - (PROGRESS_SCREEN_CONFIG.grid.columns - 1) * gap) / PROGRESS_SCREEN_CONFIG.grid.columns,
        (availableGridHeight - (PROGRESS_SCREEN_CONFIG.grid.rows - 1) * gap) / PROGRESS_SCREEN_CONFIG.grid.rows
    ));
    const finalCellSize = Math.max(3, cellSize);
    const gridWidth = PROGRESS_SCREEN_CONFIG.grid.columns * finalCellSize + (PROGRESS_SCREEN_CONFIG.grid.columns - 1) * gap;
    const gridHeight = PROGRESS_SCREEN_CONFIG.grid.rows * finalCellSize + (PROGRESS_SCREEN_CONFIG.grid.rows - 1) * gap;

    return {
        width,
        height,
        card: {
            x: cardX,
            y: cardY,
            width: cardWidth,
            height: cardHeight,
            radius: Math.max(28, Math.min(42, cardHeight * 0.12))
        },
        grid: {
            x: (cardWidth - gridWidth) / 2,
            y: (cardHeight - gridHeight) / 2,
            width: gridWidth,
            height: gridHeight,
            cellSize: finalCellSize,
            gap
        },
        play: {
            x: playX,
            y: playY,
            size: playSize
        },
        levelSelect: {
            x: playX - playSize / 2 - levelSelectGap - levelSelectWidth / 2,
            y: playY,
            width: levelSelectWidth,
            height: levelSelectHeight
        }
    };
}

function isLevelCompleted(completedLevels, levelNumber) {
    const zeroBasedIndex = levelNumber - 1;
    return completedLevels.includes(zeroBasedIndex);
}

function drawCell(cell, color, size) {
    cell.clear();
    cell.beginFill(color, 1);
    cell.drawRect(0, 0, size, size);
    cell.endFill();
}

export function createProgressScreen({
    backgroundTexture,
    playTexture,
    showLevelSelectButton = PROGRESS_SCREEN_CONFIG.showLevelSelectButton,
    completedLevels,
    onPlay,
    onLevelSelect
}) {
    const container = new PIXI.Container();
    container.name = 'progressContainer';

    const backgroundLayer = new PIXI.Container();
    backgroundLayer.name = 'progressBackground';
    container.addChild(backgroundLayer);

    const card = new PIXI.Container();
    card.name = 'progressCard';

    const cardBackground = new PIXI.Graphics();
    cardBackground.name = 'cardBackground';
    card.addChild(cardBackground);

    const bugProgressContainer = new PIXI.Container();
    bugProgressContainer.name = 'bugProgressContainer';
    card.addChild(bugProgressContainer);

    const cells = PROGRESS_CELLS.map((cellData, index) => {
        const cell = new PIXI.Graphics();
        cell.name = `progressCell_${index + 1}`;
        cell._progressCellData = cellData;
        bugProgressContainer.addChild(cell);
        return cell;
    });

    container.addChild(card);

    const controlsLayer = new PIXI.Container();
    controlsLayer.name = 'progressControlsLayer';
    container.addChild(controlsLayer);

    const playButton = new PIXI.Container();
    playButton.name = 'progressPlayButton';
    playButton.interactive = true;
    playButton.buttonMode = true;
    playButton.on('pointerover', () => {
        gsap.to(playButton.scale, { x: 1.04, y: 1.04, duration: 0.12 });
    });
    playButton.on('pointerout', () => {
        gsap.to(playButton.scale, { x: 1, y: 1, duration: 0.12 });
    });
    playButton.on('pointerdown', () => {
        gsap.to(playButton.scale, { x: 0.94, y: 0.94, duration: 0.08 });
    });
    playButton.on('pointerup', () => {
        gsap.to(playButton.scale, { x: 1, y: 1, duration: 0.12, ease: 'back.out(1.6)' });
        onPlay?.();
    });
    playButton.on('pointerupoutside', () => {
        gsap.to(playButton.scale, { x: 1, y: 1, duration: 0.12 });
    });
    controlsLayer.addChild(playButton);

    let levelSelectButton = null;
    if (showLevelSelectButton) {
        levelSelectButton = new PIXI.Container();
        levelSelectButton.name = 'progressLevelSelectButton';
        levelSelectButton.interactive = true;
        levelSelectButton.buttonMode = true;
        levelSelectButton.on('pointerover', () => {
            gsap.to(levelSelectButton.scale, { x: 1.03, y: 1.03, duration: 0.12 });
        });
        levelSelectButton.on('pointerout', () => {
            gsap.to(levelSelectButton.scale, { x: 1, y: 1, duration: 0.12 });
        });
        levelSelectButton.on('pointerdown', () => {
            gsap.to(levelSelectButton.scale, { x: 0.96, y: 0.96, duration: 0.08 });
        });
        levelSelectButton.on('pointerup', () => {
            gsap.to(levelSelectButton.scale, { x: 1, y: 1, duration: 0.12, ease: 'back.out(1.4)' });
            onLevelSelect?.();
        });
        levelSelectButton.on('pointerupoutside', () => {
            gsap.to(levelSelectButton.scale, { x: 1, y: 1, duration: 0.12 });
        });
        controlsLayer.addChild(levelSelectButton);
    }

    container._progressState = {
        backgroundLayer,
        backgroundTexture,
        card,
        cardBackground,
        bugProgressContainer,
        controlsLayer,
        cells,
        playButton,
        levelSelectButton,
        playTexture,
        completedLevels: completedLevels || []
    };

    return container;
}

export function layoutProgressScreen(container, {
    width,
    height
}) {
    if (!container?._progressState) return;

    const state = container._progressState;
    const layout = getProgressLayout(width, height);

    state.backgroundLayer.removeChildren();
    state.backgroundLayer.addChild(createCoverBackground(state.backgroundTexture, width, height, 0xFFD984));

    state.card.x = layout.card.x;
    state.card.y = layout.card.y;
    drawProgressCard(state.cardBackground, layout.card.width, layout.card.height, layout.card.radius);

    state.bugProgressContainer.x = layout.grid.x;
    state.bugProgressContainer.y = layout.grid.y;
    state.cellSize = layout.grid.cellSize;

    state.cells.forEach((cell) => {
        const data = cell._progressCellData;
        cell.x = data.col * (layout.grid.cellSize + layout.grid.gap);
        cell.y = data.row * (layout.grid.cellSize + layout.grid.gap);
    });

    state.playButton.removeChildren();
    if (state.playTexture) {
        const playSprite = new PIXI.Sprite(state.playTexture);
        const scale = layout.play.size / Math.max(state.playTexture.width, state.playTexture.height);
        playSprite.anchor.set(0.5);
        playSprite.scale.set(scale);
        state.playButton.addChild(playSprite);
    } else {
        const fallback = new PIXI.Graphics();
        fallback.beginFill(0xFFB84D);
        fallback.lineStyle(4, 0xDF690E);
        fallback.drawRoundedRect(-layout.play.size / 2, -layout.play.size / 2, layout.play.size, layout.play.size, layout.play.size * 0.18);
        fallback.endFill();
        fallback.beginFill(0xE86F0E);
        fallback.moveTo(-layout.play.size * 0.16, -layout.play.size * 0.26);
        fallback.lineTo(layout.play.size * 0.28, 0);
        fallback.lineTo(-layout.play.size * 0.16, layout.play.size * 0.26);
        fallback.closePath();
        fallback.endFill();
        state.playButton.addChild(fallback);
    }

    state.playButton.x = layout.play.x;
    state.playButton.y = layout.play.y;
    state.playButton.hitArea = new PIXI.Rectangle(
        -layout.play.size / 2,
        -layout.play.size / 2,
        layout.play.size,
        layout.play.size
    );

    if (state.levelSelectButton) {
        state.levelSelectButton.x = layout.levelSelect.x;
        state.levelSelectButton.y = layout.levelSelect.y;
        state.levelSelectButton.hitArea = new PIXI.Rectangle(
            -layout.levelSelect.width / 2,
            -layout.levelSelect.height / 2,
            layout.levelSelect.width,
            layout.levelSelect.height
        );
        drawSecondaryButton(state.levelSelectButton, layout.levelSelect.width, layout.levelSelect.height, 'ВЫБОР УРОВНЯ');
    }

    updateProgressScreen(container, state.completedLevels);
}

export function updateProgressScreen(container, completedLevels = []) {
    if (!container?._progressState) return;

    const state = container._progressState;
    state.completedLevels = completedLevels;
    const cellSize = state.cellSize || 8;

    state.cells.forEach((cell, index) => {
        const levelNumber = index + 1;
        const data = cell._progressCellData;
        const color = isLevelCompleted(completedLevels, levelNumber)
            ? PROGRESS_SCREEN_CONFIG.cells.colors[data.symbol]
            : PROGRESS_SCREEN_CONFIG.cells.neutral;
        drawCell(cell, color, cellSize);
    });
}

export function destroyProgressScreen(container) {
    if (!container) return;

    if (container.parent) {
        container.parent.removeChild(container);
    }
    container.destroy({ children: true });
}
