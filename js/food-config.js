// Food defines health: one visible piece is exactly one life.
export const FOOD_TYPES = Object.freeze({
    pizza: Object.freeze({ pieces: 8, removalOrder: Object.freeze([3, 4, 5, 6, 7, 8, 1, 2]) })
});

export function getFoodDefinition(level) {
    const food = FOOD_TYPES[level.food];
    if (!food) throw new Error(`Unknown level food: ${level.food}`);
    return food;
}

export function getFoodMaxLives(level) {
    return getFoodDefinition(level).pieces;
}
