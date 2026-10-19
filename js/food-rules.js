// Initial tuning values; travel speed and reaction time need playtesting.
export const FOOD_RULES = {
    fallbackDurationSeconds: 30,
    bugSize: 100,
    fatSizeMultiplier: 1.4,
    tapRadiusMultiplier: 0.58,
    travelTimeMultiplier: 1.8,
    minimumTravelMs: 1200,
    reactionMs: 400,
    entryGap: 10,
    spawnSeparation: 16,
    spawnAttempts: 32,
    retrySpawnMs: 100,
    simulationStepMs: 16,
    textureForwardAngle: -Math.PI / 2
};

export function levelDurationMs(level) {
    const milliseconds = level?.params?.durationMs;
    if (Number.isFinite(milliseconds) && milliseconds > 0) return milliseconds;
    const seconds = level?.durationSeconds;
    return (Number.isFinite(seconds) && seconds > 0 ? seconds : FOOD_RULES.fallbackDurationSeconds) * 1000;
}

export function weightedType(weights, random = Math.random) {
    const entries = Object.entries(weights || {}).filter(([, weight]) => Number.isFinite(weight) && weight > 0);
    let choice = random() * entries.reduce((sum, [, weight]) => sum + weight, 0);
    for (const [type, weight] of entries) {
        choice -= weight;
        if (choice < 0) return type;
    }
    return entries.at(-1)?.[0] ?? null;
}

// A shuffled bag gives every edge a turn without a fixed clockwise pattern.
export function shuffledSides(random = Math.random) {
    const sides = ['left', 'right', 'top', 'bottom'];
    for (let i = 3; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [sides[i], sides[j]] = [sides[j], sides[i]];
    }
    return sides;
}

export function chooseEntry(rect, side, radius, actors, random = Math.random, zone = 'full') {
    if ((zone === 'left' && side === 'right') || (zone === 'right' && side === 'left')) return null;
    for (let i = 0; i < FOOD_RULES.spawnAttempts; i++) {
        const offset = radius + FOOD_RULES.entryGap;
        let x = radius + random() * Math.max(0, rect.width - 2 * radius);
        let y = radius + random() * Math.max(0, rect.height - 2 * radius);
        if (zone === 'left') x = radius + random() * Math.max(0, rect.width / 2 - 2 * radius);
        if (zone === 'right') x = rect.width / 2 + radius + random() * Math.max(0, rect.width / 2 - 2 * radius);
        if (side === 'left') x = -offset;
        if (side === 'right') x = rect.width + offset;
        if (side === 'top') y = -offset;
        if (side === 'bottom') y = rect.height + offset;
        if (actors.every(actor => actor.state === 'resolved' || Math.hypot(x - actor.x, y - actor.y) >= radius + actor.radius + FOOD_RULES.spawnSeparation)) return { x, y };
    }
    return null;
}

export function createApproach(position, food, radius, lifetime, reactionMs = FOOD_RULES.reactionMs) {
    const angle = Math.atan2(food.y - position.y, food.x - position.x);
    const distance = Math.max(0, Math.hypot(food.x - position.x, food.y - position.y) - food.radius - radius * 0.5);
    return {
        ...position, radius, state: 'entering', angle,
        targetX: position.x + Math.cos(angle) * distance,
        targetY: position.y + Math.sin(angle) * distance,
        speed: distance / Math.max(FOOD_RULES.minimumTravelMs, lifetime * FOOD_RULES.travelTimeMultiplier),
        reactionRemainingMs: reactionMs
    };
}

// No timers or damage callbacks are stored on actors. Resolution is synchronous.
export function advanceApproach(actor, dt, rect, rate = 1) {
    if (actor.state === 'resolved') return null;
    let time = dt * rate;
    let arrived = false;
    if (actor.state !== 'atFood') {
        const distance = Math.hypot(actor.targetX - actor.x, actor.targetY - actor.y);
        const needed = actor.speed > 0 ? distance / actor.speed : 0;
        if (time < needed) {
            actor.x += Math.cos(actor.angle) * actor.speed * time;
            actor.y += Math.sin(actor.angle) * actor.speed * time;
            if (actor.x >= 0 && actor.x <= rect.width && actor.y >= 0 && actor.y <= rect.height) actor.state = 'approaching';
            return null;
        }
        actor.x = actor.targetX;
        actor.y = actor.targetY;
        actor.state = 'atFood';
        time -= needed;
        arrived = true;
    }
    // Bombs leave on arrival without damaging food.
    if (actor.type === 'bomb') {
        actor.state = 'resolved';
        return 'departed';
    }
    actor.reactionRemainingMs -= time;
    if (actor.reactionRemainingMs <= 0) {
        actor.state = 'resolved';
        return 'damage';
    }
    return arrived ? 'warning' : null;
}
