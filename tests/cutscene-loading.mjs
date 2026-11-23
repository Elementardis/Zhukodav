import assert from 'node:assert/strict';
globalThis.document = { fonts: { load: () => Promise.resolve([]) } };
const { preloadCutsceneImages } = await import('../js/cutscene-player.js');

const requests = [];
const active = [];
globalThis.PIXI = { Loader: { shared: { resources: {} } }, Texture: { from: image => ({ image }) } };
globalThis.Image = class {
    set src(path) { this.path = path; requests.push(path); active.push(this); }
};
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
const finish = (failed = false) => {
    const image = active.shift();
    if (failed) image.onerror(); else image.onload();
};

const warming = preloadCutsceneImages(['one', 'two', 'three', 'one']);
assert.deepEqual(requests, ['one', 'two'], 'background loading has two workers');
const duplicate = preloadCutsceneImages(['one']);
assert.equal(requests.length, 2, 'concurrent requests share the same promise');
finish(); await flush();
assert.deepEqual(requests, ['one', 'two', 'three']);
finish(); finish();
await Promise.all([warming, duplicate]);
await preloadCutsceneImages(['one', 'two', 'three']);
assert.equal(requests.length, 3, 'loaded images remain cached');

const failure = preloadCutsceneImages(['retry']);
finish(true); await failure;
const retry = preloadCutsceneImages(['retry']);
assert.equal(requests.filter(path => path === 'retry').length, 2);
finish(); await retry;

PIXI.Loader.shared.resources.existing = { texture: { valid: true } };
await preloadCutsceneImages(['existing']);
assert.ok(!requests.includes('existing'), 'reuse existing Pixi resources');
console.log('Cutscene loading: bounded concurrency, deduplication, cache reuse, retry passed.');
