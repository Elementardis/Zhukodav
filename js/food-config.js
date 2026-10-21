// Food defines health: one visible piece is exactly one life.
export const FOOD_TYPES = Object.freeze({
    pizza: Object.freeze({ name: 'Пицца', pieces: 8, partsPath: 'images/food/pizza', filePrefix: 'pizza_slice_', removalOrder: Object.freeze([3, 4, 5, 6, 7, 8, 1, 2]) }),
    cake: Object.freeze({ name: 'Торт', pieces: 6, partsPath: 'images/food/cake' }),
    pie: Object.freeze({ name: 'Пирог', pieces: 10, partsPath: 'images/food/pie' }),
    bundt_cake: Object.freeze({ name: 'Круговой кекс', pieces: 12, partsPath: 'images/food/bundt_cake' }),
    greek_salad: Object.freeze({ name: 'Греческий салат', pieces: 5, partsPath: 'images/food/greek_salad' }),
    // First lost life hides 07, then 06, down to 01.
    dressed_herring: Object.freeze({ name: 'Селёдка под шубой', pieces: 7, partsPath: 'images/food/dressed_herring', filePrefix: 'dressed_herring_', removalOrder: Object.freeze([7, 6, 5, 4, 3, 2, 1]) })
});

export function getFoodDefinition(level) {
    const food = FOOD_TYPES[level.food];
    if (!food) throw new Error(`Unknown level food: ${level.food}`);
    return {
        ...food,
        id: level.food,
        removalOrder: food.removalOrder || Array.from({ length: food.pieces }, (_, i) => i + 1)
    };
}

// Only load foods used by levels; catalog entries may await their artwork.
export function getFoodAssets(levels) {
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
