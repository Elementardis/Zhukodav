// Food defines health: one visible piece is exactly one life.
// Пример: cake с pieces: 6 получает maxLives: 6 и части cake_01 … cake_06.
// Награда в levels.js: loot: [{ id: 'cake-first', type: 'foodPiece', foodId: 'cake', pieceId: 'cake_01' }].
// Для cake_01 используются images/food/cake/cake_slice_01.png и текстура gameplay_food_cake_1.
// puzzlePieces, maxLives и assemblyOrder вычисляются ниже — вручную дублировать их не нужно.
// Порядок сборки по умолчанию: 1 … pieces; drawOrder задаёт другой порядок.
// Например, у greek_salad drawOrder: [5, 4, 3, 2, 1] означает сборку слоёв
// greek_salad_05 → greek_salad_04 → … → greek_salad_01.
// geometry ниже назначает салатам layers, остальным блюдам sectors; starter — только пицце.
const FOOD_CATALOG = {
    pizza: Object.freeze({ name: 'Пицца', pieces: 8, partsPath: 'images/food/pizza', filePrefix: 'pizza_slice_', removalOrder: Object.freeze([3, 4, 5, 6, 7, 8, 1, 2]) }),
    cake: Object.freeze({ name: 'Торт', pieces: 6, partsPath: 'images/food/cake', filePrefix: 'cake_slice_', removalOrder: Object.freeze([3, 4, 5, 6, 1, 2]) }),
    pie: Object.freeze({ name: 'Пирог', pieces: 10, partsPath: 'images/food/pie', filePrefix: 'pie_slice_', removalOrder: Object.freeze([3, 4, 5, 6, 7, 8, 1, 2, 9, 10]) }),
    bundt_cake: Object.freeze({ name: 'Круговой кекс', pieces: 12, partsPath: 'images/food/bundt_cake', filePrefix: 'bundt_slice_', removalOrder: Object.freeze([3, 4, 5, 6, 7, 8, 1, 2, 9, 10, 11, 12
    ]) }),
    greek_salad: Object.freeze({ name: 'Греческий салат', pieces: 5, partsPath: 'images/food/greek_salad', filePrefix: 'salad_', removalOrder: Object.freeze([1, 2, 3, 4, 5]), drawOrder: Object.freeze([5, 4, 3, 2, 1]) }),
    // First lost life hides 07, then 06, down to 01.
    dressed_herring: Object.freeze({ name: 'Селёдка под шубой', pieces: 7, partsPath: 'images/food/dressed_herring', filePrefix: 'dressed_herring_', removalOrder: Object.freeze([7, 6, 5, 4, 3, 2, 1]) })
};

// Пример для торта: wholeIcon: 'dish_cake' — уже загруженная целая иконка
// images/dishes/icons/cake_icon.png; collectingName: 'торт' → «Собираем торт».
// Это иллюстрация коллекции, она не открывает блюдо и не меняет прогресс.
const FOOD_PRESENTATION = {
    pizza: { wholeIcon: 'dish_pizza', collectingName: 'пиццу' },
    cake: { wholeIcon: 'dish_cake', collectingName: 'торт' },
    pie: { wholeIcon: 'dish_pie', collectingName: 'пирог' },
    bundt_cake: { wholeIcon: 'dish_bundt', collectingName: 'круговой кекс' },
    greek_salad: { wholeIcon: 'dish_salad', collectingName: 'греческий салат' },
    dressed_herring: { wholeIcon: 'dish_dressed_herring', collectingName: 'селёдку под шубой' }
};

// Эффекты выбранной еды. Пример для пиццы:
// travelTimeMultiplier: 1 — время движения = lifetime жука × коэффициент уровня × 1.
// 0.8 сокращает время движения на 20% (жук быстрее), 1.1 увеличивает на 10%.
// foodWaitSeconds: 1.5 — жук стоит у еды с алертом 1,5 секунды; это НЕ коэффициент.
// maxBugs: 5 — не больше 5 активных жуков; меньший maxObjects уровня сохраняется.
// Например, при maxObjects: 8 будет 5 жуков, при maxObjects: 3 — только 3.
// Время у еды заменяет старый foodReactionMs уровня. Бомбы идут мимо еды,
// поэтому для них действует коэффициент движения и лимит, но нет ожидания у еды.
const FOOD_EFFECTS = {
    pizza: { travelTimeMultiplier: 1, foodWaitSeconds: 1.5, maxBugs: 5 },
    pie: { travelTimeMultiplier: 1, foodWaitSeconds: 0.5, maxBugs: 4 },
    greek_salad: { travelTimeMultiplier: 0.8, foodWaitSeconds: 3, maxBugs: 3 },
    bundt_cake: { travelTimeMultiplier: 1.1, foodWaitSeconds: 1, maxBugs: 4 },
    dressed_herring: { travelTimeMultiplier: 0.9, foodWaitSeconds: 2, maxBugs: 4 },
    cake: { travelTimeMultiplier: 1, foodWaitSeconds: 3, maxBugs: 4 }
};

export const FOOD_TYPES = Object.freeze(Object.fromEntries(Object.entries(FOOD_CATALOG).map(([id, food]) => {
    const definition = food;
    const order = food.drawOrder || Array.from({ length: food.pieces }, (_, i) => i + 1);
    return [id, Object.freeze({ ...definition, ...FOOD_PRESENTATION[id], id, maxLives: food.pieces, starter: id === 'pizza',
        effects: Object.freeze(FOOD_EFFECTS[id]),
        geometry: id === 'greek_salad' || id === 'dressed_herring' ? 'layers' : 'sectors',
        assemblyOrder: Object.freeze(order.map(i => `${id}_${String(i).padStart(2, '0')}`)),
        puzzlePieces: Object.freeze(order.map(i => Object.freeze({
            id: `${id}_${String(i).padStart(2, '0')}`, texture: `gameplay_food_${id}_${i}`,
            resource: `${food.partsPath}/${food.filePrefix}${String(i).padStart(2, '0')}.png`,
            target: Object.freeze({ x: 40, y: 40, width: 560, height: 560 })
        })))
    })];
})));

export function isFoodUnlocked(food, completedLevels = []) {
    return !!food?.starter || !!completedLevels?.foods?.[food?.id]?.completed;
}

export function getFoodDefinition(level) {
    const food = FOOD_TYPES[level.food];
    if (!food) throw new Error(`Unknown level food: ${level.food}`);
    return {
        ...food,
        id: level.food,
        removalOrder: food.removalOrder || Array.from({ length: food.pieces }, (_, i) => i + 1)
    };
}

// Preload every selectable dish; the player's choice is independent of levels.
export function getFoodAssets(levels = Object.keys(FOOD_TYPES).map(food => ({ food }))) {
    return [...new Set(levels.map(level => level.food))].flatMap(id => {
        const food = getFoodDefinition({ food: id });
        return Array.from({ length: food.pieces }, (_, i) => ({
            name: `gameplay_food_${id}_${i + 1}`,
            path: `${food.partsPath}/${food.filePrefix || 'part_'}${String(i + 1).padStart(2, '0')}.png`
        }));
    });
}

export function getFoodMaxLives(level) {
    return getFoodDefinition(level).maxLives;
}

export function getFoodBugLimit(level) {
    const limit = getFoodDefinition(level).effects.maxBugs;
    const levelLimit = level.params?.maxObjects;
    return Number.isFinite(levelLimit) ? Math.max(0, Math.min(Math.floor(levelLimit), limit)) : limit;
}

export function describeFoodEffects(id) {
    const e = FOOD_TYPES[id].effects;
    const number = value => String(value).replace('.', ',');
    return `Время пути ×${number(e.travelTimeMultiplier)} · У еды ${number(e.foodWaitSeconds)} с\nНа поле не больше ${e.maxBugs} жуков`;
}
