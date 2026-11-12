import { FOOD_TYPES } from './food-config.js';
import { FOOD_TEST_MODE } from './food-test-config.js';
import { restoreFoodStory, recordFoodStory } from './food-story.js';

export const FOOD_SAVE_KEY = FOOD_TEST_MODE ? 'foodPuzzleProgress.test.v1' : 'foodPuzzleProgress.v1';
export function prepareFoodTest(foodId, storage = localStorage) {
    if (!FOOD_TEST_MODE || !FOOD_TYPES[foodId] || FOOD_TYPES[foodId].starter) return false;
    const state = readFoodProgress(storage);
    state.foods[foodId] = { collected: FOOD_TYPES[foodId].puzzlePieces.map(p => p.id), placed: [], completed: false };
    if (state.selected === foodId) state.selected = 'pizza';
    saveFoodProgress(state, storage);
    return true;
}
export function readFoodProgress(storage = localStorage) {
    let raw;
    try { raw = JSON.parse(storage.getItem(FOOD_SAVE_KEY) || '{}'); } catch { raw = {}; }
    const state = { foods: {}, rewards: Array.isArray(raw?.rewards) ? raw.rewards : [],
        wins: Array.isArray(raw?.wins) ? raw.wins : [], selected: raw?.selected || 'pizza' };
    for (const [id, food] of Object.entries(FOOD_TYPES)) {
        const saved = raw?.foods?.[id];
        const valid = food.puzzlePieces.map(p => p.id);
        const collected = valid.filter(p => Array.isArray(saved?.collected) && saved.collected.includes(p));
        const placed = collected.filter(p => Array.isArray(saved?.placed) && saved.placed.includes(p));
        state.foods[id] = { collected, placed, completed: food.starter || placed.length === food.maxLives };
    }
    if (!state.foods[state.selected]?.completed) state.selected = 'pizza';
    state.story = restoreFoodStory(raw?.story, state.foods);
    return state;
}
export function saveFoodProgress(state, storage = localStorage) { storage.setItem(FOOD_SAVE_KEY, JSON.stringify(state)); }
export function awardFoodLoot(level, storage = localStorage) {
    const state = readFoodProgress(storage), received = [];
    const repeated = state.wins.includes(level.id);
    for (const entry of level.loot || []) {
        if (entry.type !== 'foodPiece') continue;
        const food = FOOD_TYPES[entry.foodId];
        if (!food?.puzzlePieces.some(p => p.id === entry.pieceId)) continue;
        const key = `${level.id}:${entry.id || `${entry.foodId}:${entry.pieceId}`}`;
        if (repeated || state.rewards.includes(key)) continue;
        state.rewards.push(key);
        const progress = state.foods[food.id];
        if (!progress.collected.includes(entry.pieceId)) {
            progress.collected.push(entry.pieceId);
            recordFoodStory(state, key, food.id, entry.pieceId);
            received.push({ ...entry, count: progress.collected.length, total: food.maxLives,
                ready: progress.collected.length === food.maxLives && !progress.completed });
        }
    }
    if (!repeated) state.wins.push(level.id);
    saveFoodProgress(state, storage);
    return { repeated, received };
}
export function placeFoodPiece(foodId, pieceId, storage = localStorage) {
    const state = readFoodProgress(storage), food = FOOD_TYPES[foodId], progress = state.foods[foodId];
    if (!food || progress.completed || progress.collected.length !== food.maxLives ||
        !progress.collected.includes(pieceId) || progress.placed.includes(pieceId)) return false;
    if (food.geometry === 'layers' && food.assemblyOrder.find(p => !progress.placed.includes(p)) !== pieceId) return false;
    progress.placed.push(pieceId);
    progress.completed = food.puzzlePieces.every(p => progress.placed.includes(p.id));
    saveFoodProgress(state, storage);
    return true;
}
export function validateFoodLoot(levels) {
    const errors = [], assigned = new Set();
    for (const food of Object.values(FOOD_TYPES)) {
        if (new Set(food.puzzlePieces.map(p => p.id)).size !== food.maxLives) errors.push(`${food.id}: число частей не равно maxLives`);
    }
    for (const level of levels) {
        if (level.lootRequired && !level.loot?.length) errors.push(`Уровень ${level.id}: отсутствует обязательный лут`);
        for (const entry of level.loot || []) {
            if (entry.type !== 'foodPiece') continue;
            const key = `${entry.foodId}:${entry.pieceId}`;
            if (!FOOD_TYPES[entry.foodId]?.puzzlePieces.some(p => p.id === entry.pieceId)) errors.push(`Уровень ${level.id}: неизвестная часть ${key}`);
            if (assigned.has(key)) errors.push(`Уровень ${level.id}: повторная часть ${key}`);
            assigned.add(key);
        }
    }
    for (const food of Object.values(FOOD_TYPES).filter(f => !f.starter)) {
        const missing = food.puzzlePieces.filter(p => !assigned.has(`${food.id}:${p.id}`));
        if (missing.length) errors.push(`${food.name}: недостижим полный комплект, не назначено ${missing.length} частей`);
    }
    return errors;
}
