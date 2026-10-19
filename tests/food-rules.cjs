const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const context = vm.createContext({});
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
assert.equal(context.dirtySegments(100,100),0);
assert.equal(context.dirtySegments(99,100),0);
assert.equal(context.dirtySegments(0,100),7);
assert.equal(context.remainingSliceIndices(30000,30000).length,8);
assert.equal(context.remainingSliceIndices(26250,30000).includes(3),false);
assert.equal(context.remainingSliceIndices(22500,30000).includes(4),false);
assert.equal(context.remainingSliceIndices(0,30000).length,0);
console.log('Food rules passed: weighted bombs, perimeter/side constraints, collisions, FPS independence, slow effect, contact grace, one damage, cancellation, HP and independent food timer.');
