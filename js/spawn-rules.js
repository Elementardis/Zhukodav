export const HELPER_TYPES = ['healer', 'frozen', 'chameleon', 'neat'];
export const HELPER_RULES = { maxShare: 0.08, firstAtMs: 5000, cooldownMs: 12000, maxPerLevel: 2 };
export const BOMB_RULES = { maxShare: 0.1, cooldownMs: 8000 };

export function bombCanSpawn(time, lastTime, actors) {
    return time - lastTime >= BOMB_RULES.cooldownMs
        && !actors.some(actor => actor.type === 'bomb' && actor.state !== 'resolved');
}

export function limitBombWeights(weights) {
    const result = { ...weights };
    const ordinary = Object.entries(result).reduce((sum, [type, weight]) =>
        sum + (type !== 'bomb' && !HELPER_TYPES.includes(type) ? Math.max(0, weight) : 0), 0);
    if (result.bomb > 0) result.bomb = Math.min(result.bomb, ordinary * BOMB_RULES.maxShare / (1 - BOMB_RULES.maxShare));
    return result;
}

export function helperCanSpawn(time, lastTime, count, actors, maxPerLevel = HELPER_RULES.maxPerLevel) {
    return time >= HELPER_RULES.firstAtMs && time - lastTime >= HELPER_RULES.cooldownMs
        && count < maxPerLevel
        && !actors.some(actor => HELPER_TYPES.includes(actor.type) && actor.state !== 'resolved');
}

export function limitHelperWeights(weights) {
    const result = { ...weights };
    const total = Object.entries(result).reduce((sum, [type, weight]) => sum + (!HELPER_TYPES.includes(type) ? Math.max(0, weight) : 0), 0);
    const helpers = HELPER_TYPES.reduce((sum, type) => sum + Math.max(0, result[type] || 0), 0);
    const cap = total * HELPER_RULES.maxShare / (1 - HELPER_RULES.maxShare);
    if (helpers > cap) for (const type of HELPER_TYPES) if (result[type] > 0) result[type] *= cap / helpers;
    return result;
}
