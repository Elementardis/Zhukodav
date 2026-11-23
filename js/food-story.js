import { t } from './i18n.js';
import { FOOD_STORIES } from './food-story-config.js';
import { FOOD_TYPES } from './food-config.js';

function completeSets(state, ids) {
    return ids.every(id => FOOD_TYPES[id].puzzlePieces.every(p => state.foods[id]?.collected.includes(p.id)));
}

// Stored in the same document as collected pieces, so a reward and its story are atomic.
export function restoreFoodStory(raw, foods) {
    if (raw?.version === 1 && Array.isArray(raw.events)) {
        return { version: 1, events: raw.events.filter(e => e && typeof e.rewardKey === 'string'),
            seen: Array.isArray(raw.seen) ? [...new Set(raw.seen)] : [] };
    }
    const story = { version: 1, events: [], seen: [] };
    // Legacy pieces already earned before story support never produce a backlog.
    for (const [foodId, lines] of Object.entries(FOOD_STORIES)) {
        (foods[foodId]?.collected || []).forEach((pieceId, index) => {
            const line = lines[index];
            story.events.push({ rewardKey: `legacy:${foodId}:${pieceId}`, foodId, pieceId, lineId: line?.id || null });
            if (line) story.seen.push(line.id);
        });
    }
    return story;
}

export function recordFoodStory(state, rewardKey, foodId, pieceId) {
    const lines = FOOD_STORIES[foodId];
    if (!lines || state.story.events.some(e => e.foodId === foodId && e.pieceId === pieceId)) return;
    const index = state.story.events.filter(e => e.foodId === foodId).length;
    const deferFinale = !!lines[index]?.finale && !completeSets(state, Object.keys(FOOD_STORIES).filter(id => id !== 'cake'));
    state.story.events.push({ rewardKey, foodId, pieceId, lineId: lines[index]?.id || null, deferFinale });
}

export function pendingFoodStories(state) {
    const othersComplete = completeSets(state, Object.keys(FOOD_STORIES).filter(id => id !== 'cake'));
    const campaignComplete = completeSets(state, Object.keys(FOOD_STORIES));
    return state.story.events.flatMap(event => {
        const line = FOOD_STORIES[event.foodId]?.find(line => line.id === event.lineId);
        if (!line || state.story.seen.includes(line.id) || (line.finale && !(event.deferFinale ? campaignComplete : othersComplete))) return [];
        return [{ id: line.id, repeat: 'story', foodId: event.foodId,
            frames: [{ image: line.image, text: line.text, buttonText: t('food_story.001') }], finale: !!line.finale }];
    }).sort((a,b) => Number(a.finale) - Number(b.finale));
}

export function validateFoodStories(levels) {
    const errors = [];
    for (const [id, lines] of Object.entries(FOOD_STORIES)) {
        if (lines.length !== FOOD_TYPES[id]?.maxLives) errors.push(t('food_story.002', { p0: (id), p1: (lines.length), p2: (FOOD_TYPES[id]?.maxLives) }));
        const assigned = new Set(levels.flatMap(l => (l.loot || []).filter(r => r.type === 'foodPiece' && r.foodId === id).map(r => r.pieceId)));
        if (assigned.size !== FOOD_TYPES[id]?.maxLives) errors.push(t('food_story.003', { p0: (id), p1: (assigned.size) }));
    }
    return errors;
}
