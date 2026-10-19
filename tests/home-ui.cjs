const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const point = () => ({ x: 0, y: 0, set(x, y = x) { this.x = x; this.y = y; }, copyFrom(p) { this.set(p.x, p.y); } });
class Container {
    constructor() { this.children = []; this.position = point(); this.scale = point(); this.events = {}; }
    addChild(child) { this.children.push(child); }
    on(event, fn) { this.events[event] = fn; }
}
class Sprite extends Container {
    constructor(texture) { super(); this.texture = texture; this.anchor = point(); }
}
const context = vm.createContext({ PIXI: { Container, Sprite, Rectangle: class {}, SCALE_MODES: { LINEAR: 1 } } });
vm.runInContext(fs.readFileSync('js/home-ui.js', 'utf8').replace(/export /g, '') + '\nglobalThis.layout = HOME_LAYOUT;', context);
const layout = JSON.parse(fs.readFileSync('images/home/layout.json'));
assert.equal(JSON.stringify(context.layout), JSON.stringify(layout));
const textures = {};
for (const layer of layout.layers) {
    const png = fs.readFileSync(`images/home/${layer.name}.png`);
    assert.equal(png.readUInt32BE(16), layer.width);
    assert.equal(png.readUInt32BE(20), layer.height);
    textures[`home_${layer.name}`] = { baseTexture: {}, orig: { width: layer.width, height: layer.height } };
}
let plays = 0;
const home = context.createHomeScreen(textures, { onPlay: () => plays++, onSettings() {} });
assert.equal(home.children.length, 9);
assert.equal(home.children.filter(c => c.interactive).length, 2);
assert.equal(home.children.find(c => c.name === '08_button_dishes').interactive, false);
const play = home.children.find(c => c.name === '09_button_play');
play.events.pointerdown(); assert.equal(play.tint, 0xDDDDDD);
play.events.pointerupoutside(); assert.equal(play.tint, 0xFFFFFF);
play.events.pointertap(); assert.equal(plays, 1);
for (const [width, height] of [[1920,1080], [960,540], [1280,590], [390,844]]) {
    context.layoutHomeScreen(home, { width, height });
    assert.equal(home.scale.x, home.scale.y);
    assert.ok(home.position.x >= 0 && home.position.y >= 0);
    assert.ok(home.position.x + 1920 * home.scale.x <= width + 1e-8);
    assert.ok(home.position.y + 1080 * home.scale.y <= height + 1e-8);
}
const game = fs.readFileSync('game.js', 'utf8');
const next = game.slice(game.indexOf('function getNextPlayableLevelIndex()'), game.indexOf('function clearProgressPopup()'));
const progress = vm.createContext({ levels: [{}, {}, {}], getCompletedLevels: () => [0, 2] });
vm.runInContext(next, progress);
assert.equal(progress.getNextPlayableLevelIndex(), 1);
progress.getCompletedLevels = () => [0, 1, 2];
assert.equal(progress.getNextPlayableLevelIndex(), -1);
console.log('Home UI: asset dimensions, kit coordinates, layers, disabled dishes, press reset, viewport fitting and saved progress passed.');
