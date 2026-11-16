import assert from 'node:assert/strict';
import levels from '../levels.js';
import { BUG_BALANCE } from '../bug-config.js';
import { BUG_TUTORIALS } from '../js/bug-tutorial-config.js';
import { HELPER_TYPES, HELPER_RULES, BOMB_RULES, helperCanSpawn, limitHelperWeights, bombCanSpawn, limitBombWeights } from '../js/spawn-rules.js';

for (const type of Object.keys(BUG_BALANCE)) {
    assert.ok(BUG_TUTORIALS[type]?.text.trim(), `Missing tutorial: ${type}`);
}
for (const type of HELPER_TYPES) assert.ok(levels.some(level => level.params.spawnWeights[type] > 0), `Missing helper: ${type}`);
for (const level of levels) {
    const original = JSON.stringify(level.params.spawnWeights);
    const weights = limitHelperWeights(limitBombWeights(level.params.spawnWeights));
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    const helpers = HELPER_TYPES.reduce((sum, type) => sum + (weights[type] || 0), 0);
    assert.ok(helpers / total <= HELPER_RULES.maxShare + 1e-12, `Too many helpers: ${level.id}`);
    assert.ok((weights.bomb || 0) / total <= BOMB_RULES.maxShare + 1e-12, `Too many bombs: ${level.id}`);
    const rawTotal = Object.values(level.params.spawnWeights).reduce((a, b) => a + b, 0);
    if (level.id >= 5) {
        const coloredWeight = Object.entries(level.params.spawnWeights)
            .filter(([type]) => /^(coloredBug|fatColoredBug)_/.test(type))
            .reduce((sum, [, weight]) => sum + weight, 0);
        assert.ok(coloredWeight / rawTotal >= 0.6 - 1e-12, `Color tools must remain the main mechanic: level ${level.id}`);
    }
    assert.ok((level.params.spawnWeights.bomb || 0) / rawTotal <= BOMB_RULES.maxShare, `Bomb-heavy level config: ${level.id}`);
    assert.equal(JSON.stringify(level.params.spawnWeights), original);
}
assert.equal(helperCanSpawn(4999, -Infinity, 0, []), false);
assert.equal(helperCanSpawn(5000, -Infinity, 0, []), true);
assert.equal(helperCanSpawn(16999, 5000, 1, []), false);
assert.equal(helperCanSpawn(17000, 5000, 1, []), true);
assert.equal(helperCanSpawn(45000, 17000, 2, []), false);
for (const type of HELPER_TYPES) {
    assert.equal(helperCanSpawn(17000, 5000, 1, [{ type, state: 'approaching' }]), false);
    assert.equal(helperCanSpawn(17000, 5000, 1, [{ type, state: 'resolved' }]), true);
}
console.log('Spawn rules passed: all species have tutorial text, all helpers appear, <=8% combined weight, 5s opening, 12s cooldown, two per level, no simultaneous helpers.');
assert.equal(bombCanSpawn(0, -Infinity, []), true);
assert.equal(bombCanSpawn(7999, 0, []), false);
assert.equal(bombCanSpawn(8000, 0, []), true);
assert.equal(bombCanSpawn(12000, 0, [{ type: 'bomb', state: 'approaching' }]), false);
assert.equal(bombCanSpawn(12000, 0, [{ type: 'bomb', state: 'resolved' }]), true);
assert.equal(bombCanSpawn(12000, 0, [{ type: 'bug', state: 'approaching' }]), true);
const capped = limitHelperWeights(limitBombWeights({ bug: 1, bomb: 100, healer: 100 }));
const cappedTotal = Object.values(capped).reduce((a, b) => a + b, 0);
assert.ok(capped.bomb / cappedTotal <= 0.1);
assert.ok(capped.healer / cappedTotal <= 0.08 + 1e-12);
console.log('Bomb balance passed: <=10% share, one active bomb, 8s cooldown, ordinary bugs remain eligible.');
