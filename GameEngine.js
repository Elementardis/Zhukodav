import levels from './levels.js';
import { getBugBaseBalance, getBugSpawnZone } from './bug-config.js';

function weightedRandomChoice(weights) {
    const entries = Object.entries(weights);
    if (!entries.length) return null;

    const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);
    let random = Math.random() * totalWeight;

    for (const [key, weight] of entries) {
        random -= weight;
        if (random <= 0) return key;
    }

    return entries[entries.length - 1][0];
}

export default class GameEngine {
    constructor(state, options = {}) {
        this.state = state;
        this.levels = options.levels || levels;
        this.getFrozenActive = options.getFrozenActive || (() => false);
    }

    getLevels() {
        return this.levels;
    }

    startLevel(index) {
        const levelData = this.levels[index];
        this.state.resetRuntime();
        this.state.setLevelData(levelData);
        this.state.setScore(0);
        this.state.setLife(levelData.lifeCount);
        this.prepareObjectQueue();
        return levelData;
    }

    getLevelLifetimeMultiplier(type) {
        const levelData = this.state.getLevelData();
        const multiplier = levelData?.params?.lifetimeMultiplier ?? 1;
        if (typeof multiplier === 'number') return multiplier;
        return multiplier[type] ?? multiplier.default ?? 1;
    }

    getLevelSpawnIntervalMultiplier(type) {
        const levelData = this.state.getLevelData();
        const spawnMultiplier = levelData?.params?.spawnMultiplier ?? {};
        if (typeof spawnMultiplier === 'number') return spawnMultiplier;

        const interval = spawnMultiplier.intervalMultiplier;
        if (typeof interval === 'number') return interval;
        if (interval && typeof interval === 'object') {
            return interval[type] ?? interval.default ?? 1;
        }

        return spawnMultiplier.default ?? 1;
    }

    getRuntimeBugBalance(type) {
        const baseBalance = getBugBaseBalance(type);
        const frozenLifetimeMultiplier = this.getFrozenActive() ? 2 : 1;

        return {
            lifetime: baseBalance.lifetime * this.getLevelLifetimeMultiplier(type) * frozenLifetimeMultiplier,
            spawnInterval: baseBalance.spawnInterval / this.getLevelSpawnIntervalMultiplier(type),
            clicks: baseBalance.clicks,
            scoreValue: baseBalance.scoreValue ?? 1,
            healAmount: baseBalance.healAmount ?? 0,
            spawnZone: getBugSpawnZone(type),
        };
    }

    prepareObjectQueue() {
        const levelData = this.state.getLevelData();
        const spawnWeights = levelData?.params?.spawnWeights || {};
        const objectQueue = [];

        const killableTypes = Object.keys(spawnWeights).filter((type) =>
            type !== 'bomb' &&
            (
                type === 'bug' ||
                type === 'healer' ||
                type === 'frozen' ||
                type === 'chameleon' ||
                type === 'neat' ||
                type === 'fat' ||
                type.startsWith('coloredBug_') ||
                type.startsWith('fatColoredBug_')
            )
        );
        const bombTypes = Object.keys(spawnWeights).filter((type) => type === 'bomb');
        const killableWeights = {};
        const bombWeights = {};

        killableTypes.forEach((type) => { killableWeights[type] = spawnWeights[type]; });
        bombTypes.forEach((type) => { bombWeights[type] = spawnWeights[type]; });

        const minKillableCount = (levelData?.goalBugCount ?? 0) * 3;
        let killableCount = 0;

        while (killableCount < minKillableCount) {
            const type = weightedRandomChoice(killableWeights);
            if (!type) break;

            const runtimeBalance = this.getRuntimeBugBalance(type);
            const objectData = {
                id: `obj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${killableCount}`,
                type,
                lifetime: runtimeBalance.lifetime,
                spawnInterval: runtimeBalance.spawnInterval,
                scoreValue: runtimeBalance.scoreValue,
                healAmount: runtimeBalance.healAmount,
                spawnZone: runtimeBalance.spawnZone,
                clicks: runtimeBalance.clicks,
            };

            if (type.startsWith('coloredBug_') || type.startsWith('fatColoredBug_')) {
                objectData.color = type.split('_')[1];
            }

            objectQueue.push(objectData);
            killableCount++;
        }

        const bombCount = Math.floor(killableCount * 0.2);
        for (let i = 0; i < bombCount; i++) {
            const type = weightedRandomChoice(bombWeights);
            if (!type) continue;

            const runtimeBalance = this.getRuntimeBugBalance(type);
            objectQueue.push({
                id: `obj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_b${i}`,
                type,
                lifetime: runtimeBalance.lifetime,
                spawnInterval: runtimeBalance.spawnInterval,
                scoreValue: runtimeBalance.scoreValue,
                healAmount: runtimeBalance.healAmount,
                spawnZone: runtimeBalance.spawnZone,
                clicks: runtimeBalance.clicks,
            });
        }

        for (let i = objectQueue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [objectQueue[i], objectQueue[j]] = [objectQueue[j], objectQueue[i]];
        }

        this.state.setObjectQueue(objectQueue);
        return objectQueue;
    }

    spawnObject() {
        const levelData = this.state.getLevelData();
        if (this.state.isIntroActive() || this.state.isLevelEnded()) return null;
        if (this.state.getActiveObjects().length >= (levelData?.params?.maxObjects ?? 0)) return null;
        if (!this.state.getObjectQueue().length) return null;

        return this.state.shiftObjectQueue();
    }

    getObjectScoreValue(objectData) {
        return Math.max(0, objectData?.scoreValue ?? 1);
    }

    canClickObject(objectData, inputState = {}, flags = {}) {
        const activeColor = inputState.activeColor;
        const anyColorActive = inputState.hasAnyActiveColor;
        const chameleonActive = !!flags.chameleonActive;

        if (anyColorActive && !chameleonActive && !objectData.type.startsWith('coloredBug_') && !objectData.type.startsWith('fatColoredBug_') && objectData.type !== 'bomb') {
            return false;
        }

        if (objectData.type.startsWith('coloredBug_') || objectData.type.startsWith('fatColoredBug_')) {
            return chameleonActive || activeColor === objectData.color;
        }

        return true;
    }

    applyObjectClick(objectData) {
        const result = {
            removed: false,
            shake: false,
            squish: false,
            explode: false,
            frozenWave: false,
            chameleonWave: false,
            neatWave: false,
            heal: false,
            clearField: false,
            won: false,
            lost: false,
        };

        if (objectData.clicks > 1) {
            objectData.clicks -= 1;
            if (objectData.type === 'fat' || objectData.type.startsWith('fatColoredBug_')) {
                result.squish = true;
            } else {
                result.shake = true;
            }
            return result;
        }

        if (objectData.type === 'bomb') {
            this.state.addLife(-1);
            result.removed = true;
            result.explode = true;
        } else {
            this.state.addScore(this.getObjectScoreValue(objectData));
            result.removed = true;

            if (objectData.type === 'frozen') result.frozenWave = true;
            if (objectData.type === 'chameleon') result.chameleonWave = true;
            if (objectData.type === 'neat') {
                result.neatWave = true;
                result.clearField = true;
            }
            if (objectData.type === 'healer') {
                const maxLives = this.state.getLevelData()?.lifeCount ?? this.state.getLife();
                this.state.setLife(Math.min(maxLives, this.state.getLife() + Math.max(0, Math.round(objectData.healAmount ?? 0))));
                result.heal = true;
            }
        }

        const levelData = this.state.getLevelData();
        result.won = this.state.getScore() >= (levelData?.goalBugCount ?? Number.MAX_SAFE_INTEGER);
        result.lost = this.state.getLife() <= 0;
        return result;
    }

    applyExpiredObject(objectData) {
        if (objectData.type !== 'bomb' && !this.state.isLevelEnded()) {
            this.state.addLife(-1);
        }

        return {
            lost: this.state.getLife() <= 0,
        };
    }

    endGame(won) {
        this.state.setLevelEnded(true);
        return {
            won,
            score: this.state.getScore(),
            life: this.state.getLife(),
            levelData: this.state.getLevelData(),
        };
    }
}
