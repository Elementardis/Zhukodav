import assert from 'node:assert/strict';
import levels from '../levels.js';
import { BUG_BALANCE } from '../bug-config.js';
import { createEndlessLevel, endlessUnlocked } from '../js/endless-mode.js';
import { helperCanSpawn } from '../js/spawn-rules.js';

assert.equal(levels[36].durationSeconds, 45);
assert.ok(levels[36].params.spawnWeights.neat > 0);
assert.equal(levels[39].durationSeconds, 90);
assert.equal(levels[39].ensureAllTypes, true);
assert.deepEqual(Object.keys(levels[39].params.spawnWeights).sort(), Object.keys(BUG_BALANCE).sort());
assert.equal(helperCanSpawn(60000, 40000, 3, [], levels[39].params.helperLimit), true);
assert.equal(helperCanSpawn(60000, 40000, 3, []), false);
const completed = levels.map((_, i) => i);
assert.equal(endlessUnlocked(levels, completed, { foods: { cake: { completed: false } } }), false);
assert.equal(endlessUnlocked(levels, completed.slice(1), { foods: { cake: { completed: true } } }), false);
assert.equal(endlessUnlocked(levels, completed, { foods: { cake: { completed: true } } }), true);
let seed = 123;
const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const catalog = JSON.stringify(levels), sets = new Set();
for (let i = 0; i < 100; i++) {
    const level = createEndlessLevel(random);
    assert.equal(level.endless, true);
    assert.equal(level.durationSeconds, 90);
    assert.deepEqual(level.loot, []);
    assert.ok(level.params.spawnWeights.bug > 0);
    for (const [type, weight] of Object.entries(level.params.spawnWeights)) {
        assert.ok(BUG_BALANCE[type]); assert.ok(weight > 0);
    }
    sets.add(Object.keys(level.params.spawnWeights).sort().join(','));
}
assert.ok(sets.size > 30);
assert.equal(JSON.stringify(levels), catalog);
console.log('Endless mode: unlock conditions, varied valid levels, unchanged campaign, final-level species and helper limits passed.');
