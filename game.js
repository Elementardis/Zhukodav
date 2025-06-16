import levels from './levels.js';

// ==== Global Constants ====
const IS_TOUCH = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const MIN_BAR_H = 110;    // px
const BAR_H_PRC = 0.14;   // 14 % экрана тест
const GAP_HORZ = 12;      // промежутки
const BORDER_RADIUS = 40;
const FRAME_BORDER = 12;
const HEADER_H_PRC = 0.10;   // 10 % высоты квадратного поля
const HEART_SIZE_PRC = 0.50;   // 50 % высоты шапки
const HEART_GAP = 6;      // px между сердцами
const BUG_SIZE_PRC = 0.15;    // 15% от размера игрового поля
const MIN_BUG_SIZE = 60;      // минимальный размер жука
const MAX_BUG_SIZE = 120;     // максимальный размер жука

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
let spawnInterval;
let score = 0;
let life = 0;

// Color button state
let activeColor = null;
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
    { name: 'bomb_explosion', path: 'images/bomb.gif' }
];

// Store loaded textures
const TEXTURES = {};

function showPreloader() {
    const preloader = document.createElement('div');
    preloader.id = 'preloader';
    preloader.style.position = 'fixed';
    preloader.style.left = '0';
    preloader.style.top = '0';
    preloader.style.width = '100vw';
    preloader.style.height = '100vh';
    preloader.style.background = '#FFF0C2';
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
    progressBar.style.background = '#FFE089';
    progressBar.style.borderRadius = '10px';
    progressBar.style.overflow = 'hidden';
    
    const progressFill = document.createElement('div');
    progressFill.style.width = '0%';
    progressFill.style.height = '100%';
    progressFill.style.background = '#FFB300';
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
    backgroundColor: 0xFFAC36,
    resolution: window.devicePixelRatio,
    autoDensity: true,
    resizeTo: window,
    roundPixels: true
});

// Add app view to DOM
document.body.appendChild(app.view);

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
    red: 0xFF0000,
    blue: 0x0000FF,
    green: 0x00FF00,
    yellow: 0xFFFF00
};

// Remove static COLOR_KEY_MAP and add dynamic mapping
let dynamicColorKeyMap = {};

// Add keyboard layout mapping in both directions
const KEY_LAYOUT_MAP = {
    // English to Russian
    'q': 'й',
    'w': 'ц',
    'e': 'у',
    'r': 'к',
    // Russian to English (reverse mapping)
    'й': 'q',
    'ц': 'w',
    'у': 'e',
    'к': 'r'
};

// Add helper function for button state updates
function updateButtonState(color, isActive) {
    const button = colorButtonsContainer?.getChildByName(`colorButton_${color}`);
    if (button) {
        const activeIndicator = button.getChildAt(3); // Active indicator is the 4th child
        activeIndicator.visible = isActive;
        gsap.to(button.scale, {
            x: isActive ? 0.9 : button.originalScale,
            y: isActive ? 0.9 : button.originalScale,
            duration: 0.1
        });
    }
}

// Update keyboard handlers to support both layouts
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

// ==== Стартовый экран ====

const titleStyle = new PIXI.TextStyle({
    fontSize: 72,
    fill: 0xFFB300,
    fontWeight: 'bold',
    fontFamily: 'Arial',
    stroke: 0x3C1B00,
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
playButton.beginFill(0xFFB300); // фон кнопки
playButton.lineStyle(6, 0x3C1B00); // обводка
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
    fill: 0x3C1B00,
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
        fill: 0x4A1E0C,
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
        shadow.beginFill(0xD07A1A, 0.3);
        shadow.drawRoundedRect(4, 4, buttonSize, buttonSize, 20);
        shadow.endFill();

        // Кнопка
        const button = new PIXI.Graphics();
        button.beginFill(0xFFE089);
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
            fill: 0x4A1E0C,
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
                fill: 0xFFD600,
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
    app.stage.removeChild(levelSelectContainer);
    app.stage.addChild(gameContainer);
    gameContainer.addChild(rootUI);
    levelData = levels[index];

    activeObjects = [];
    maxSimultaneousObjects = levelData.params.maxObjects;

    score = 0;
    life = levelData.lifeCount;

    const { fieldWrapper, playField } = setupPlayArea();
    playArea = playField; // Keep playArea reference for backward compatibility

    prepareObjectQueue();
    spawnInterval = setInterval(spawnObject, levelData.params.spawnInterval);

    // Call onEnterLevel if defined
    if (typeof levelData.onEnterLevel === 'function') {
        levelData.onEnterLevel();
    }
}



// игровое поле
function setupPlayArea() {
    const barH = Math.max(window.innerHeight * BAR_H_PRC, MIN_BAR_H);
    const topMargin = 20;

    // Calculate play area size
    const size = Math.min(
        window.innerWidth - 40,
        window.innerHeight - barH - topMargin - GAP_HORZ
    );

    // Create field wrapper container
    const fieldWrapper = new PIXI.Container();
    fieldWrapper.x = (window.innerWidth - size) / 2;
    fieldWrapper.y = topMargin;
    fieldWrapper.width = size;
    fieldWrapper.height = size;

    // Create play field container
    const playField = new PIXI.Container();
    const headerH = Math.floor(size * HEADER_H_PRC);
    playField.width = size;
    playField.height = size - headerH;
    playField.y = headerH;  // Shift play field down by header height

    // Background and border
    const background = new PIXI.Graphics();
    background.beginFill(0xFFF0C2); // внутренний цвет
    background.drawRoundedRect(0, 0, size, size, BORDER_RADIUS);
    background.endFill();

    const border = new PIXI.Graphics();
    border.lineStyle(FRAME_BORDER, 0xF68722); // внешняя рамка
    border.drawRoundedRect(0, 0, size, size, BORDER_RADIUS);

    playField.addChild(background);
    playField.addChild(border);
    fieldWrapper.addChild(playField);

    // Add field wrapper to rootUI
    rootUI.addChild(fieldWrapper);

    // Build level header
    const header = buildLevelHeader(fieldWrapper, levelData);

    // Setup bottom bar with colored types
    const coloredTypes = Object.keys(levelData.spawnWeights).filter(type => 
        type.startsWith('coloredBug_') || type.startsWith('fatColoredBug_')
    );
    buildBottomBar(coloredTypes);

    return { fieldWrapper, playField };
}

function buildLevelHeader(wrapper, level) {
    // --- контейнер шапки ---
    const headerH = Math.floor(wrapper.height * HEADER_H_PRC);
    const header = new PIXI.Container();
    header.name = 'levelHeader';
    wrapper.addChild(header);

    // --- фон полосы ---
    const bar = new PIXI.Graphics();
    bar.beginFill(0xFFE3A3)
       .drawRoundedRect(0, 0, wrapper.width, headerH, 14)
       .endFill();
    header.addChild(bar);

    // --- текст "Уровень N" (слева) ---
    const lvlText = new PIXI.Text(`Уровень ${level.id}`, {
        fontSize: headerH * 0.35,
        fill: 0x5B250D,
        fontWeight: 'bold',
        fontFamily: 'Arial',
    });
    lvlText.y = headerH * 0.15;
    lvlText.x = 18;
    header.addChild(lvlText);

    // --- текст прогресса (справа) ---
    const progText = new PIXI.Text(`0/${level.goalBugCount}`, {
        fontSize: headerH * 0.35,
        fill: 0x5B250D,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        align: 'right',
    });
    progText.anchor.set(1, 0);
    progText.x = wrapper.width - 18;
    progText.y = headerH * 0.15;
    progText.name = 'progText';
    header.addChild(progText);

    // --- строка сердечек ---
    const heartSz = Math.floor(headerH * HEART_SIZE_PRC);
    const hearts = new PIXI.Container();
    hearts.name = 'heartsRow';
    header.addChild(hearts);

    // иконка-текстура (можно заменить на спрайт из атласа)
    const heartStyle = {
        fontSize: heartSz,
        fill: 0xFF4B30,
        fontFamily: 'Arial',
    };

    // Рисуем сердечки по количеству жизней
    for (let i = 0; i < level.lifeCount; i++) {
        const h = new PIXI.Text('❤', heartStyle);
        h.x = i * (heartSz + HEART_GAP);
        hearts.addChild(h);
    }

    // центрируем строку по ширине полосы
    hearts.x = (wrapper.width - hearts.width) / 2;
    hearts.y = headerH - heartSz - HEART_GAP;

    return header;
}

function updateLevelHeader(score, life) {
    const header = playArea.parent.getChildByName('levelHeader');
    if (!header) return;

    // счётчик X/Y
    const progText = header.getChildByName('progText');
    progText.text = `${score}/${levelData.goalBugCount}`;

    // перекраска сердечек
    const hearts = header.getChildByName('heartsRow');
    for (let i = 0; i < hearts.children.length; i++) {
        hearts.children[i].style.fill =
            i < life ? 0xFF4B30 : 0xFFDB8F;   // заполненные / пустые
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

    // Разделяем типы на убиваемые и неубиваемые
    const killableTypes = Object.keys(levelData.spawnWeights).filter(type => 
        type !== 'bomb' && 
        (type === 'bug' || 
         type === 'fat' || 
         type.startsWith('coloredBug_') || 
         type.startsWith('fatColoredBug_'))
    );

    const unkillableTypes = Object.keys(levelData.spawnWeights).filter(type => 
        type === 'bomb'
    );

    // Создаем отдельные веса для убиваемых и неубиваемых
    const killableWeights = {};
    const unkillableWeights = {};

    for (const type of killableTypes) {
        killableWeights[type] = levelData.spawnWeights[type];
    }
    for (const type of unkillableTypes) {
        unkillableWeights[type] = levelData.spawnWeights[type];
    }

    // Генерируем убиваемых жуков (минимум goalBugCount * 3)
    const minKillableCount = levelData.goalBugCount * 3;
    let killableCount = 0;
    
    while (killableCount < minKillableCount) {
        const type = weightedRandomChoice(killableWeights);
        if (!type) break;

        // Создаем объект с нужными параметрами
        const objectData = { type };
        
        // Добавляем специфичные параметры для разных типов
        if (type === 'fat' || type.startsWith('fatColoredBug_')) {
            objectData.clicks = 3; // Требуется 3 клика для уничтожения толстого жука
        }
        if (type.startsWith('coloredBug_') || type.startsWith('fatColoredBug_')) {
            objectData.color = type.split('_')[1];
        }

        objectQueue.push(objectData);
        killableCount++;
    }

    // Добавляем неубиваемых (бомбы)
    const bombCount = Math.floor(killableCount * 0.2); // 20% от количества убиваемых
    for (let i = 0; i < bombCount; i++) {
        const type = weightedRandomChoice(unkillableWeights);
        if (type) {
            objectQueue.push({ type });
        }
    }

    // Перемешиваем очередь
    for (let i = objectQueue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [objectQueue[i], objectQueue[j]] = [objectQueue[j], objectQueue[i]];
    }
}

// Проверка пересечения двух объектов
function checkCollision(obj1, obj2) {
    const padding = 4;
    return Math.abs(obj1.x - obj2.x) < (obj1.width + obj2.width) / 2 + padding &&
           Math.abs(obj1.y - obj2.y) < (obj1.height + obj2.height) / 2 + padding;
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

// генерация объекта
function spawnObject() {
    if (activeObjects.length >= levelData.params.maxObjects) return;
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
    const size = isFat ? baseSize * 2 : baseSize;

    const container = new PIXI.Container();
    container.width = size;
    container.height = size;
    container.pivot.set(size / 2);
    container.interactive = true;
    container.buttonMode = true;
    container.animations = [];

    // Calculate safe spawn boundaries
    const minX = size / 2;
    const maxX = playArea.width - size / 2;
    const minY = size / 2;
    const maxY = playArea.height - size / 2;

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
        for (const child of playArea.children) {
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

        // Add glow effect for colored bugs
        const glow = new PIXI.Graphics();
        glow.beginFill(COLORS[color], 0.3);
        glow.drawCircle(0, 0, size * 1.2);
        glow.endFill();
        container.addChildAt(glow, 0);

        // Pulse animation for colored bugs
        const pulseAnim = gsap.to(glow, {
            alpha: 0.1,
            duration: 0.8,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut"
        });
        container.animations.push(pulseAnim);

        // White text with remaining clicks
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
    } else if (type.startsWith('coloredBug_')) {
        const color = type.split('_')[1];
        visual = new PIXI.Sprite(TEXTURES[`coloredBug_${color}`]);
        visual.anchor.set(0.5);
        visual.width = size;
        visual.height = size;
        container.addChild(visual);

        // Add glow effect for colored bugs
        const glow = new PIXI.Graphics();
        glow.beginFill(COLORS[color], 0.3);
        glow.drawCircle(0, 0, size * 0.6);
        glow.endFill();
        container.addChildAt(glow, 0);

        // Pulse animation for colored bugs
        const pulseAnim = gsap.to(glow, {
            alpha: 0.1,
            duration: 0.8,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut"
        });
        container.animations.push(pulseAnim);
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
    } else {
        visual = new PIXI.Sprite(TEXTURES[type]);
        visual.anchor.set(0.5);
        visual.width = size;
        visual.height = size;
        container.addChild(visual);
        
        // Пульсация для бомбы
        const pulseAnim = gsap.to(container.scale, {
            x: 1.2,
            y: 1.2,
            duration: 0.2,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut"
        });
        container.animations.push(pulseAnim);
    }

    // Store lifetime end time
    container.lifetimeEnd = Date.now() + levelData.params.objectLifetime;

    // Update animation code to store animations
    if (type === 'bomb') {
        const pulseAnim = gsap.to(container.scale, {
            x: 1.2,
            y: 1.2,
            duration: 0.2,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut"
        });
        container.animations.push(pulseAnim);
    }

    // Click handling
    container.on('pointerdown', () => {
        if (isPaused) return; // Don't handle clicks while paused

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

    // Update lifetime timeout to use stored end time
    const checkLifetime = () => {
        if (!playArea.children.includes(container)) return;
        
        const remainingTime = container.lifetimeEnd - Date.now();
        if (remainingTime <= 0 && !isPaused) { // Only remove if not paused
            // Lifetime expired - remove object
            gsap.to(container, {
                y: container.y + 100,
                alpha: 0,
                duration: 0.4,
                ease: "power1.in",
                onComplete: () => {
                    if (playArea.children.includes(container)) {
                        playArea.removeChild(container);
                        activeObjects = activeObjects.filter(o => o !== container);

                        if (type !== 'bomb') {
                            life--;
                            updateUI();
                            if (life <= 0) endGame(false);
                        }
                    }
                }
            });
        } else {
            // Check again in a bit, but more frequently if paused
            const checkInterval = isPaused ? 100 : Math.min(remainingTime, 1000);
            container.lifetimeCheckTimeout = setTimeout(checkLifetime, checkInterval);
        }
    };
    container.lifetimeCheckTimeout = setTimeout(checkLifetime, 100);

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
    clearInterval(spawnInterval);
    if (won) {
        markLevelCompleted(levelData.id - 1);
        showWinPopup(levelData.id - 1);
        return;
    }
    showLosePopup(levelData.id - 1);
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
    // Save state
    const prevScore = score;
    const prevLife = life;
    const prevLevel = levelData.id;
    const prevObjectQueue = [...objectQueue];
    const prevActiveObjects = [...activeObjects];
    const prevActiveColor = activeColor;
    const prevColorPressStart = colorPressStart;

    // Clear rootUI
    rootUI.removeChildren();

    // Rebuild UI
    const { fieldWrapper, playField } = setupPlayArea();
    
    // Restore state
    score = prevScore;
    life = prevLife;
    levelData = levels[prevLevel];
    activeColor = prevActiveColor;
    colorPressStart = prevColorPressStart;
    updateUI();

    // Redraw all active objects
    prevActiveObjects.forEach(obj => {
        playField.addChild(obj);
    });
    objectQueue = prevObjectQueue;
    activeObjects = prevActiveObjects;
}

window.addEventListener('resize', resizeGame);

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
        rebuildUI();
    }

    // Handle pause popup if it exists
    const pausePopup = gameContainer.getChildByName('pausePopup');
    if (pausePopup) {
        const popupWidth = Math.min(app.screen.width * 0.8, 480);
        const popupHeight = Math.min(app.screen.height * 0.7, 420);
        pausePopup.x = (app.screen.width - popupWidth) / 2;
        pausePopup.y = (app.screen.height - popupHeight) / 2;
    }

    // Handle pause overlay if it exists
    const overlay = gameContainer.getChildByName('pauseOverlay');
    if (overlay) {
        overlay.width = app.screen.width;
        overlay.height = app.screen.height;
    }
}

// Вызвать resizeGame при загрузке, чтобы всё было адаптивно с самого начала
resizeGame();

// Функция для очистки всех попапов
function clearAllPopups() {
    const popups = ['winPopup', 'losePopup', 'pausePopup', 'pauseOverlay'];
    popups.forEach(popupName => {
        const popup = gameContainer.getChildByName(popupName);
        if (popup) {
            gameContainer.removeChild(popup);
        }
    });
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
    bg.beginFill(0xFFF0C2);
    bg.drawRoundedRect(0, 0, popupWidth, popupHeight, 36);
    bg.endFill();
    // Рамка
    const border = new PIXI.Graphics();
    border.lineStyle(8, 0xE47B1C);
    border.drawRoundedRect(0, 0, popupWidth, popupHeight, 36);
    popup.addChild(bg);
    popup.addChild(border);

    // Заголовок
    const title = new PIXI.Text('ПОБЕДА', {
        fontSize: Math.max(48, popupWidth * 0.12),
        fill: 0x4A1E0C,
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
    nextBtn.lineStyle(4, 0xA05A1C);
    nextBtn.beginFill(0xFFE089);
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
        fill: 0x4A1E0C,
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
    menuBtn.lineStyle(4, 0xA05A1C);
    menuBtn.beginFill(0xFFE089);
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
        fill: 0x4A1E0C,
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
    bg.beginFill(0xFFF0C2);
    bg.drawRoundedRect(0, 0, popupWidth, popupHeight, 36);
    bg.endFill();
    // Рамка
    const border = new PIXI.Graphics();
    border.lineStyle(8, 0x3C1B00);
    border.drawRoundedRect(0, 0, popupWidth, popupHeight, 36);
    popup.addChild(bg);
    popup.addChild(border);

    // Заголовок
    const title = new PIXI.Text('НЕ ПОВЕЗЛО!', {
        fontSize: Math.max(48, popupWidth * 0.12),
        fill: 0x4A1E0C,
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
    retryBtn.lineStyle(4, 0xA05A1C);
    retryBtn.beginFill(0xFFE089);
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
        fill: 0x4A1E0C,
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
    menuBtn.lineStyle(4, 0xA05A1C);
    menuBtn.beginFill(0xFFE089);
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
        fill: 0x4A1E0C,
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
    clearInterval(spawnInterval);

    // Pause all active objects
    activeObjects.forEach(obj => {
        // Store the remaining lifetime
        const remainingTime = obj.lifetimeEnd - Date.now();
        obj.pausedLifetime = remainingTime;
        
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
    overlay.beginFill(0x000000, 0.5);
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
    bg.beginFill(0xFFF0C2);
    bg.drawRoundedRect(0, 0, popupWidth, popupHeight, 40);
    bg.endFill();

    // Border
    const border = new PIXI.Graphics();
    border.lineStyle(8, 0x4A1E0C);
    border.drawRoundedRect(0, 0, popupWidth, popupHeight, 40);
    popup.addChild(bg);
    popup.addChild(border);

    // Title
    const title = new PIXI.Text('ПАУЗА', {
        fontSize: 52,
        fill: 0x4A1E0C,
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
    soundBtn.lineStyle(4, 0x4A1E0C);
    soundBtn.beginFill(0xFFE089);
    soundBtn.drawRoundedRect(-iconBtnSize/2, -iconBtnSize/2, iconBtnSize, iconBtnSize, 18);
    soundBtn.endFill();
    soundBtn.interactive = true;
    soundBtn.buttonMode = true;
    soundBtn.x = -iconBtnSize/2 - iconSpacing/2;

    const soundIcon = new PIXI.Text(isSoundEnabled ? '🔊' : '🔇', {
        fontSize: iconFontSize,
        fill: 0x4A1E0C,
        fontWeight: 'bold',
        fontFamily: 'Arial',
    });
    soundIcon.anchor.set(0.5);
    soundIcon.x = 0;
    soundIcon.y = 0;
    soundBtn.addChild(soundIcon);

    // Кнопка музыки
    const musicBtn = new PIXI.Graphics();
    musicBtn.lineStyle(4, 0x4A1E0C);
    musicBtn.beginFill(0xFFE089);
    musicBtn.drawRoundedRect(-iconBtnSize/2, -iconBtnSize/2, iconBtnSize, iconBtnSize, 18);
    musicBtn.endFill();
    musicBtn.interactive = true;
    musicBtn.buttonMode = true;
    musicBtn.x = iconBtnSize/2 + iconSpacing/2;

    const musicIcon = new PIXI.Text(isMusicEnabled ? '♪' : '♫', {
        fontSize: iconFontSize,
        fill: 0x4A1E0C,
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
    });
    continueBtn.y = 0;
    buttonsContainer.addChild(continueBtn);

    // Retry button
    const retryBtn = createButton(btnW, btnH, 'ЗАНОВО', () => {
        cleanupPauseState();
        startLevel(levelData.id - 1);
    });
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
    });
    menuBtn.y = (btnH + btnSpacing) * 2;
    buttonsContainer.addChild(menuBtn);

    popup.addChild(buttonsContainer);
    gameContainer.addChild(popup);
}

function createButton(width, height, text, onClick) {
    const btn = new PIXI.Graphics();
    btn.lineStyle(4, 0x4A1E0C);
    btn.beginFill(0xFFE089);
    btn.drawRoundedRect(-width/2, -height/2, width, height, 18);
    btn.endFill();
    btn.interactive = true;
    btn.buttonMode = true;
    btn.on('pointerdown', onClick);

    const btnText = new PIXI.Text(text, {
        fontSize: 32,
        fill: 0x4A1E0C,
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
    // Resume spawn interval
    spawnInterval = setInterval(spawnObject, levelData.params.spawnInterval);

    // Resume all active objects
    const currentTime = Date.now();
    activeObjects.forEach(obj => {
        if (obj.pausedLifetime) {
            // Update lifetime end based on remaining time
            obj.lifetimeEnd = currentTime + obj.pausedLifetime;
            delete obj.pausedLifetime;
            
            // Restart lifetime check
            const checkLifetime = () => {
                if (!playArea.children.includes(obj)) return;
                
                const remainingTime = obj.lifetimeEnd - Date.now();
                if (remainingTime <= 0 && !isPaused) {
                    // Lifetime expired - remove object
                    gsap.to(obj, {
                        y: obj.y + 100,
                        alpha: 0,
                        duration: 0.4,
                        ease: "power1.in",
                        onComplete: () => {
                            if (playArea.children.includes(obj)) {
                                playArea.removeChild(obj);
                                activeObjects = activeObjects.filter(o => o !== obj);
                                
                                const type = obj.type;
                                if (type !== 'bomb') {
                                    life--;
                                    updateUI();
                                    if (life <= 0) endGame(false);
                                }
                            }
                        }
                    });
                } else {
                    // Check again in a bit
                    const checkInterval = isPaused ? 100 : Math.min(remainingTime, 1000);
                    obj.lifetimeCheckTimeout = setTimeout(checkLifetime, checkInterval);
                }
            };
            obj.lifetimeCheckTimeout = setTimeout(checkLifetime, 100);
        }
        
        // Resume any active animations
        if (obj.animations) {
            obj.animations.forEach(anim => anim.resume());
        }
        
        // Re-enable interaction
        obj.interactive = true;
        obj.buttonMode = true;
    });
}

function buildBottomBar(coloredTypes) {
    // единый контейнер панели
    if (!bottomBar) {
        bottomBar = new PIXI.Container();
        rootUI.addChild(bottomBar);
    }
    bottomBar.removeChildren();

    const barH = Math.max(window.innerHeight * BAR_H_PRC, MIN_BAR_H);
    const btnSz = Math.floor(barH * 0.8);          // 80 % высоты панели
    const pauseW = btnSz;
    const n = coloredTypes.length;                 // 0–4
    const gap = GAP_HORZ;

    const totalW = (btnSz * n) + pauseW + gap * (n + 2);
    let x = (window.innerWidth - totalW) / 2 + gap;

    // Reset dynamic key mapping
    dynamicColorKeyMap = {};

    // Get button order from level data or use default
    const defaultOrder = ['red', 'blue', 'green', 'yellow'];
    const buttonOrder = levelData.colorButtonOrder || defaultOrder;

    // Цветные кнопки
    const keys = ['q', 'w', 'e', 'r'];
    buttonOrder.forEach((color, i) => {
        // Check if this color is used in the level
        const isUsed = coloredTypes.some(type => type.endsWith(`_${color}`));
        if (isUsed) {
            // Map key to color based on button position
            dynamicColorKeyMap[keys[i]] = color;
            
            const btn = createColorButton(color, btnSz, keys[i], !IS_TOUCH);
            btn.x = x;
            btn.y = window.innerHeight - barH + (barH - btnSz) / 2;
            bottomBar.addChild(btn);
            x += btnSz + gap;
        }
    });

    // Create pause button if it doesn't exist
    if (!bottomBar.getChildByName('pauseButton')) {
        const pauseButton = new PIXI.Container();
        pauseButton.name = 'pauseButton';

        const bg = new PIXI.Graphics();
        bg.beginFill(0xFFB74D);
        bg.drawRoundedRect(0, 0, btnSz, btnSz, 10);
        bg.endFill();

        const icon = new PIXI.Text('⏸', {
            fontSize: Math.floor(btnSz * 0.5),
            fill: 0x6A1B0A,
            fontWeight: 'bold',
        });
        icon.anchor.set(0.5);
        icon.x = btnSz / 2;
        icon.y = btnSz / 2;

        pauseButton.addChild(bg);
        pauseButton.addChild(icon);
        pauseButton.interactive = true;
        pauseButton.buttonMode = true;
        pauseButton.on('pointerdown', () => {
            showPausePopup();
        });

        bottomBar.addChild(pauseButton);
    }

    // Position pause button
    const pauseButton = bottomBar.getChildByName('pauseButton');
    pauseButton.width = pauseButton.height = btnSz;
    pauseButton.x = window.innerWidth - gap - btnSz;
    pauseButton.y = window.innerHeight - barH + (barH - btnSz) / 2;
}

function createColorButton(color, size, key, showKey = true) {
    const button = new PIXI.Container();
    button.name = `colorButton_${color}`;
    button.interactive = true;
    button.buttonMode = true;

    // Background circle
    const bg = new PIXI.Graphics();
    bg.beginFill(COLORS[color]);
    bg.drawCircle(size/2, size/2, size/2);
    bg.endFill();

    // Highlight effect
    const highlight = new PIXI.Graphics();
    highlight.beginFill(0xFFFFFF, 0.3);
    highlight.drawCircle(size/2, size/3, size/4);
    highlight.endFill();

    // Border
    const border = new PIXI.Graphics();
    border.lineStyle(3, 0x000000, 0.3);
    border.drawCircle(size/2, size/2, size/2);

    // Active state indicator (initially invisible)
    const activeIndicator = new PIXI.Graphics();
    activeIndicator.beginFill(0xFFFFFF, 0.5);
    activeIndicator.drawCircle(size/2, size/2, size/2);
    activeIndicator.endFill();
    activeIndicator.visible = false;

    button.addChild(bg);
    button.addChild(highlight);
    button.addChild(border);
    button.addChild(activeIndicator);

    // Add key label only if showKey is true
    if (showKey) {
        const label = new PIXI.Text(
            key.toUpperCase(),
            { 
                fontSize: size * 0.35, 
                fill: 0xffffff, 
                fontWeight: '700',
                fontFamily: 'Arial',
                stroke: 0x000000,
                strokeThickness: 3
            }
        );
        label.anchor.set(0.5);
        label.position.set(size/2);
        button.addChild(label);
    }

    // Store original scale for animation
    button.originalScale = 1;

    // Update interaction handlers
    button.on('pointerdown', () => {
        if (activeColor !== color) {
            activeColor = color;
            colorPressStart = Date.now();
            updateButtonState(color, true);
        }
    });

    button.on('pointerup', () => {
        if (activeColor === color) {
            activeColor = null;
            updateButtonState(color, false);
        }
    });

    button.on('pointerupoutside', () => {
        if (activeColor === color) {
            activeColor = null;
            updateButtonState(color, false);
        }
    });

    // Add hover effect (only when button is not active)
    button.on('pointerover', () => {
        if (activeColor !== color) {
            gsap.to(button.scale, {
                x: button.originalScale * 1.1,
                y: button.originalScale * 1.1,
                duration: 0.1
            });
        }
    });

    button.on('pointerout', () => {
        if (activeColor !== color) {
            gsap.to(button.scale, {
                x: button.originalScale,
                y: button.originalScale,
                duration: 0.1
            });
        }
    });

    return button;
}

export default levels;
