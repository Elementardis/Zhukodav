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
const flyingBomb = {...context.createApproach(entry,{x:670,y:416,radius:0},0,450,0), type:'bomb', bombTriggered:true};
assert.equal(context.advanceApproach(flyingBomb,449,rect),null);
assert.equal(context.advanceApproach(flyingBomb,1.001,rect),'damage');
assert.ok(Math.abs(flyingBomb.x-670)<1e-8);
assert.ok(Math.abs(flyingBomb.y-416)<1e-8);
assert.equal(context.advanceApproach(flyingBomb,1000,rect),null);
const plate = {x:670,y:416,radius:250};
for (const side of ['left','right','top','bottom']) {
    for (let i=0;i<100;i++) {
        const start=context.chooseEntry(rect,side,50,[],Math.random,'full',plate);
        if (!start) continue;
        const crossing={...context.createCrossing(start,rect,side,50,2000),type:'bomb'};
        for (let step=0;step<125;step++) {
            context.advanceApproach(crossing,16,rect);
            assert.ok(Math.hypot(crossing.x-plate.x,crossing.y-plate.y)>plate.radius+50+context.rules.hopHeight);
            assert.notEqual(crossing.state,'atFood');
        }
        const expectedEvent = crossing.state==='resolved' ? null : 'departed';
        assert.equal(context.advanceApproach(crossing,1,rect),expectedEvent);
        assert.equal(crossing.state,'resolved');
        assert.ok(crossing.x<0 || crossing.x>rect.width || crossing.y<0 || crossing.y>rect.height);
    }
}
assert.equal(context.elapsedSegments(30000,30000),0);
assert.equal(context.elapsedSegments(15000,30000),3);
assert.equal(context.elapsedSegments(0,30000),7);
assert.equal(context.remainingSliceIndices(8,context.pizza).length,8);
assert.equal(context.remainingSliceIndices(7,context.pizza).includes(3),false);
assert.equal(context.remainingSliceIndices(6,context.pizza).includes(4),false);
assert.equal(context.remainingSliceIndices(0,context.pizza).length,0);
assert.equal(context.getFoodMaxLives({food:'pizza',lifeCount:100}),8);
const herring = context.getFoodDefinition({food:'dressed_herring'});
const salad = context.getFoodDefinition({food:'greek_salad'});
assert.deepEqual(Array.from(salad.drawOrder),[5,4,3,2,1]);
for (let lives=5; lives>=0; lives--) {
    assert.deepEqual(Array.from(context.remainingSliceIndices(lives,salad)),Array.from({length:lives},(_,i)=>6-lives+i));
}
for (let lives = 7; lives >= 0; lives--) {
    const visible = Array.from(context.remainingSliceIndices(lives, herring)).sort((a,b)=>a-b);
    assert.deepEqual(visible, Array.from({length:lives}, (_, i)=>i+1), `Herring at ${lives} lives`);
}
for (const [id, pieces] of Object.entries({cake:6,pie:10,bundt_cake:12,greek_salad:5,dressed_herring:7})) {
    const food = context.getFoodDefinition({food:id});
    assert.equal(context.getFoodMaxLives({food:id}),pieces);
    assert.equal(context.remainingSliceIndices(pieces,food).length,pieces);
    assert.equal(context.remainingSliceIndices(0,food).length,0);
    assert.equal(new Set(food.removalOrder).size,pieces);
    const assets = context.getFoodAssets([{food:id},{food:id}]);
    assert.equal(assets.length,pieces);
    assert.equal(assets[0].path,`${food.partsPath}/${food.filePrefix || 'part_'}01.png`);
    assert.equal(assets[pieces-1].name,`gameplay_food_${id}_${pieces}`);
}
for (const asset of context.getFoodAssets([{food:'pizza'}])) assert.ok(fs.existsSync(asset.path));
const timed=actor();
context.advanceApproach(timed,2199,rect);
assert.notEqual(timed.state,'atFood');
context.advanceApproach(timed,1.000001,rect);
assert.equal(timed.state,'atFood');
assert.ok(Math.abs(timed.reactionRemainingMs-400)<0.001);
vm.runInContext(fs.readFileSync('levels.js','utf8').replace('export default levels;','globalThis.testLevels = levels;'),context);
assert.ok(context.testLevels.every(level => !('food' in level) && !('lifeCount' in level)));
for (const asset of context.getFoodAssets()) {
    assert.ok(fs.existsSync(asset.path), `Missing food image: ${asset.path}`);
}
for (const asset of vm.runInContext('GAMEPLAY_ASSETS', context)) {
    assert.ok(fs.existsSync(asset.path), `Missing gameplay image: ${asset.path}`);
}
console.log('Food rules passed: pizza defines eight lives, independent time bar, exact lifetime travel, weighted bombs, spawn sides, collisions, FPS independence, slow effect, warning and one damage.');

// Orbit stays clear of the plate, exits through the nearest edge and respects time scaling.
for (const side of ['left','right','top','bottom']) {
    for (const direction of [0.1, 0.9]) {
        const start = context.chooseEntry(rect, side, 50, [], () => 0.5);
        const make = () => ({...context.createBombOrbit(start, plate, 50, 6000, () => direction), type:'bomb'});
        const orbit = make();
        for (let ms=0; ms<4800; ms+=10) {
            assert.equal(context.advanceApproach(orbit,10,rect),null);
            assert.ok(Math.hypot(orbit.x-plate.x,orbit.y-plate.y) > plate.radius+50+context.rules.hopHeight);
        }
        const distances = [orbit.x,rect.width-orbit.x,orbit.y,rect.height-orbit.y];
        const nearest = distances.indexOf(Math.min(...distances));
        assert.ok([orbit.targetX<0,orbit.targetX>rect.width,orbit.targetY<0,orbit.targetY>rect.height][nearest]);
        assert.equal(context.advanceApproach(orbit,1200,rect),'departed');
        assert.equal(context.advanceApproach(orbit,1,rect),null);
        const one=make(),many=make(),slow=make();
        context.advanceApproach(one,3500,rect);
        context.advanceApproach(slow,7000,rect,0.5);
        for(let i=0;i<350;i++) context.advanceApproach(many,10,rect);
        for (const other of [many,slow]) assert.ok(Math.hypot(one.x-other.x,one.y-other.y)<1e-7);
        const paused=make();context.advanceApproach(paused,9000,rect,0);
        assert.equal(paused.x,start.x);assert.equal(paused.y,start.y);
        const clicked=make();context.advanceApproach(clicked,3000,rect);
        Object.assign(clicked,context.createApproach(clicked,plate,0,450,0),{bombTriggered:true});
        assert.equal(context.advanceApproach(clicked,451,rect),'damage');
    }
}
assert.equal(context.testLevels.length,40);
for (const [color,first] of [['red',5],['purple',16],['green',23],['yellow',31]]) {
    const type='coloredBug_'+color;
    assert.equal(context.testLevels.find(l=>l.params.spawnWeights[type]>0).id,first);
    assert.deepEqual(Object.keys(context.testLevels[first-1].params.spawnWeights),[type]);
    for (const level of context.testLevels.slice(36)) assert.ok(level.params.spawnWeights[type]>0);
}
console.log('Campaign and bomb orbits passed: four introductions, mixed finale, clearance, nearest exit, frame independence, freeze and triggered damage.');
