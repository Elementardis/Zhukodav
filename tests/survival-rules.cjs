const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('game.js', 'utf8');
const timerCode = source.slice(source.indexOf('function stopLevelCountdown()'), source.indexOf('function updateUI()'));
function setup() {
    const callbacks = new Set();
    const state = {
        levelTimeRemainingMs: 10000, levelCountdownTicker: null, levelCountdownLastAt: null,
        levelEnded: false, isPaused: false, introActive: false, orientationPauseActive: false,
        life: 5, score: 100000, document: { hidden: false }, performance: { now: () => 0 },
        getViewportMode: () => 'desktop', updateUI() {}, results: [],
        app: { ticker: { add: fn => callbacks.add(fn), remove: fn => callbacks.delete(fn) } }
    };
    const context = vm.createContext(state);
    vm.runInContext(timerCode, context);
    state.endGame = won => { state.results.push(won); state.levelEnded = true; state.stopLevelCountdown(); };
    state.startLevelCountdown();
    return { state, callbacks };
}
{
    const { state, callbacks } = setup();
    state.tickLevelCountdown(9999);
    assert.equal(state.levelTimeRemainingMs, 1);
    assert.deepEqual(state.results, []); // Even a huge score cannot win early.
    state.tickLevelCountdown(10000);
    assert.deepEqual(state.results, [true]);
    assert.equal(callbacks.size, 0);
    state.tickLevelCountdown(11000);
    assert.equal(state.results.length, 1);
}
for (const flag of ['isPaused', 'introActive', 'orientationPauseActive', 'hidden', 'portrait']) {
    const { state } = setup();
    state.tickLevelCountdown(1000);
    if (flag === 'hidden') state.document.hidden = true;
    else if (flag === 'portrait') state.getViewportMode = () => 'mobile-portrait';
    else state[flag] = true;
    state.tickLevelCountdown(20000);
    assert.equal(state.levelTimeRemainingMs, 9000, flag);
    state.document.hidden = false;
    state.getViewportMode = () => 'desktop';
    state[flag] = false;
    state.tickLevelCountdown(21000);
    state.tickLevelCountdown(22000);
    assert.equal(state.levelTimeRemainingMs, 8000, flag);
}
{
    const { state } = setup();
    state.life = 0;
    state.tickLevelCountdown(10000);
    assert.deepEqual(state.results, [false]);
}
{
    const { state, callbacks } = setup();
    state.stopLevelCountdown();
    assert.equal(callbacks.size, 0);
    state.levelTimeRemainingMs = 15000;
    state.startLevelCountdown();
    assert.equal(callbacks.size, 1);
    state.tickLevelCountdown(1000);
    assert.equal(state.levelTimeRemainingMs, 14000);
}
assert.equal((source.match(/endGame\(true\)/g) || []).length, 1);
assert.ok(!source.includes('goalBugCount'));
const levelsCode = fs.readFileSync('levels.js', 'utf8').replace('export default levels;', 'globalThis.testLevels = levels;');
const config = vm.createContext({});
vm.runInContext(levelsCode, config);
assert.ok(config.testLevels.every(level => Number.isFinite(level.durationSeconds) && level.durationSeconds > 0));
console.log('Survival rules: countdown, pauses, life priority, restart and level configuration passed.');
