const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync('js/food-config.js','utf8').replace(/export /g,'') + '\nglobalThis.pizza = FOOD_TYPES.pizza;', context);
vm.runInContext(fs.readFileSync('js/food-rules.js','utf8').replace(/export /g,'') + '\nglobalThis.rules = FOOD_RULES;', context);
vm.runInContext(fs.readFileSync('js/gameplay-scene.js','utf8').replace(/export /g,''), context);
const rect = {width:1340,height:926};
assert.equal(context.levelDurationMs({durationSeconds:10}),10000);
assert.equal(context.levelDurationMs({}),30000);
for(const side of ['left','right','top','bottom']) {
    const entry=context.chooseEntry(rect,side,50,[],()=>0.5);
    assert.ok(entry.x<0 || entry.y<0 || entry.x>rect.width || entry.y>rect.height);
}
assert.equal(context.chooseEntry(rect,'right',50,[],()=>0.5,'left'),null);
assert.equal(context.chooseEntry(rect,'left',50,[],()=>0.5,'right'),null);
for(const side of ['top','bottom']) {
    assert.ok(context.chooseEntry(rect,side,50,[],()=>0.9,'left').x<rect.width/2);
    assert.ok(context.chooseEntry(rect,side,50,[],()=>0.1,'right').x>rect.width/2);
}
const entry=context.chooseEntry(rect,'left',50,[],()=>0.5);
assert.equal(context.chooseEntry(rect,'left',50,[{...entry,radius:50}],()=>0.5),null);
assert.equal(context.weightedType({bug:0,bomb:1},()=>0.5),'bomb');
assert.equal(context.weightedType({bug:1,bomb:3},()=>0.24),'bug');
assert.equal(context.weightedType({bug:1,bomb:3},()=>0.26),'bomb');
assert.equal(context.weightedType({bug:0,bomb:-1}),null);
function actor(type='bug') {
    return {...context.createApproach(entry,{x:670,y:416,radius:185},50,2200),type};
}
const a=actor(),b=actor();
context.advanceApproach(a,2000,rect);
for(let i=0;i<200;i++) context.advanceApproach(b,10,rect);
assert.ok(Math.abs(a.x-b.x)<1e-8 && Math.abs(a.y-b.y)<1e-8);
const frozen=actor();context.advanceApproach(frozen,2000,rect,0.5);
const normal=actor();context.advanceApproach(normal,1000,rect);
assert.ok(Math.abs(frozen.x-normal.x)<1e-8);
const contact=actor();contact.x=contact.targetX;contact.y=contact.targetY;
assert.equal(context.advanceApproach(contact,1,rect),'warning');
assert.equal(context.advanceApproach(contact,398,rect),null);
assert.equal(context.advanceApproach(contact,1,rect),'damage');
assert.equal(context.advanceApproach(contact,5000,rect),null);
const killed=actor();killed.state='resolved';assert.equal(context.advanceApproach(killed,10000,rect),null);
const bomb=actor('bomb');assert.equal(context.advanceApproach(bomb,10000,rect),'departed');
assert.equal(context.elapsedSegments(30000,30000),0);
assert.equal(context.elapsedSegments(15000,30000),3);
assert.equal(context.elapsedSegments(0,30000),7);
assert.equal(context.remainingSliceIndices(8,context.pizza).length,8);
assert.equal(context.remainingSliceIndices(7,context.pizza).includes(3),false);
assert.equal(context.remainingSliceIndices(6,context.pizza).includes(4),false);
assert.equal(context.remainingSliceIndices(0,context.pizza).length,0);
assert.equal(context.getFoodMaxLives({food:'pizza',lifeCount:100}),8);
const timed=actor();
context.advanceApproach(timed,2199,rect);
assert.notEqual(timed.state,'atFood');
context.advanceApproach(timed,1.000001,rect);
assert.equal(timed.state,'atFood');
assert.ok(Math.abs(timed.reactionRemainingMs-400)<0.001);
vm.runInContext(fs.readFileSync('levels.js','utf8').replace('export default levels;','globalThis.testLevels = levels;'),context);
assert.ok(context.testLevels.every(level => level.food === 'pizza' && !('lifeCount' in level)));
console.log('Food rules passed: pizza defines eight lives, independent time bar, exact lifetime travel, weighted bombs, spawn sides, collisions, FPS independence, slow effect, warning and one damage.');
