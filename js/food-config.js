// Food defines health: one visible piece is exactly one life.
// unlockLevel: 0 — доступно сразу; X — после победы на уровне X (нумерация с 1);
// null — закрыто, «Скоро». Например, unlockLevel: 5 открывает блюдо после уровня 5.
export const FOOD_TYPES = Object.freeze({
    pizza: Object.freeze({ name: 'Пицца', pieces: 8, unlockLevel: 0, partsPath: 'images/food/pizza', filePrefix: 'pizza_slice_', removalOrder: Object.freeze([3, 4, 5, 6, 7, 8, 1, 2]) }),
    cake: Object.freeze({ name: 'Торт', pieces: 6, unlockLevel: 30, partsPath: 'images/food/cake', filePrefix: 'cake_slice_', removalOrder: Object.freeze([3, 4, 5, 6, 1, 2]) }),
    pie: Object.freeze({ name: 'Пирог', pieces: 10, unlockLevel: 7, partsPath: 'images/food/pie', filePrefix: 'pie_slice_', removalOrder: Object.freeze([3, 4, 5, 6, 7, 8, 1, 2, 9, 10]) }),
    bundt_cake: Object.freeze({ name: 'Круговой кекс', pieces: 12, unlockLevel: 16, partsPath: 'images/food/bundt_cake', filePrefix: 'bundt_slice_', removalOrder: Object.freeze([3, 4, 5, 6, 7, 8, 1, 2, 9, 10, 11, 12
    ]) }),
    greek_salad: Object.freeze({ name: 'Греческий салат', pieces: 5, unlockLevel: 25, partsPath: 'images/food/greek_salad', filePrefix: 'salad_', removalOrder: Object.freeze([1, 2, 3, 4, 5]), drawOrder: Object.freeze([5, 4, 3, 2, 1]) }),
    // First lost life hides 07, then 06, down to 01.
    dressed_herring: Object.freeze({ name: 'Селёдка под шубой', pieces: 7, unlockLevel: 35, partsPath: 'images/food/dressed_herring', filePrefix: 'dressed_herring_', removalOrder: Object.freeze([7, 6, 5, 4, 3, 2, 1]) })
});

export function isFoodUnlocked(food, completedLevels = []) {
    const required = food?.unlockLevel;
    return Number.isInteger(required) && required >= 0 &&
        (required === 0 || (Array.isArray(completedLevels) && completedLevels.includes(required - 1)));
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
    return getFoodDefinition(level).pieces;
}
