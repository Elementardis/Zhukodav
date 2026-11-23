import { BUG_BALANCE } from '../bug-config.js';

export function endlessUnlocked(levels, completed, foodProgress) {
    return levels.every((_, index) => completed.includes(index)) && !!foodProgress.foods.cake?.completed;
}

export function createEndlessLevel(random = Math.random) {
    const types = Object.keys(BUG_BALANCE);
    for (let i = types.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [types[i], types[j]] = [types[j], types[i]];
    }
    const selected = types.slice(0, 3 + Math.floor(random() * (types.length - 2)));
    // Always include an ordinary attacker so helper cooldowns cannot stall the round.
    if (!selected.includes('bug')) selected.push('bug');
    return {
        id: '∞', endless: true, durationSeconds: 90, loot: [], ensureAllTypes: true,
        params: { maxObjects: 5, lifetimeMultiplier: 1.3, spawnMultiplier: 1.1, helperLimit: 4,
            spawnWeights: Object.fromEntries(selected.map(type => [type, 0.5 + random()])) }
    };
}
