// Runs the real game in isolated headless Chrome. Firebase is stubbed only by this server.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const backend = ['initBackend','fetchRemoteLevel','saveProgress','trackEvent','recalcLeaderboard','createLevelAttempt','finishLevelAttempt'].map(name => `export async function ${name}(){return null;}`).join('\n') + '\nexport function rcNumber(key,fallback){return fallback;}';
const expose = `
window.gameTest = {
 ready: () => !!TEXTURES.gameplay_plate && !!progressContainer,
 start(index=0) { startLevel(index); app.ticker.stop(); },
 stop: () => app.ticker.stop(),
 snapshot: () => ({ life, score, time: levelTimeRemainingMs, clock: gameTimeMs, ended: levelEnded, paused: isPaused, active: activeObjects.map(o => ({type:o.type,x:o.x,y:o.y,state:o.state})), held: getActiveColor(), sceneScale: currentGameUI.scene?.scale.x }),
 step: ms => tickLevelCountdown((levelCountdownLastAt ?? performance.now()) + ms),
 configure(weights, hp=100) { levelData = {...levels[0], lifeCount:hp, durationSeconds:60, params:{...levels[0].params, maxObjects:20, spawnWeights:weights}}; life=hp; levelTimeRemainingMs=60000; removeAllActiveObjectsImmediate(); prepareObjectQueue(); const result=setupPlayArea(); playArea=result.playField; spawnDueAt=null; },
 spawn(type) { const b=getRuntimeBugBalance(type); objectQueue=[{type,...b}]; spawnObject(); spawnDueAt=null; return activeObjects.length; },
 hit(index=0) { hitFoodBug(activeObjects[index]); },
 atFood(index=0, time=400) { const o=activeObjects[index]; o.x=o.targetX; o.y=o.targetY; o.state='atFood'; o.reactionRemainingMs=time; showFoodWarning(o); },
 pause: () => showPausePopup(),
 resume() { const p=gameContainer.getChildByName('pausePopup'); const o=gameContainer.getChildByName('pauseOverlay'); p?.destroy({children:true}); o?.destroy(); isPaused=false; resumeGame(); app.ticker.stop(); },
 hold(color, id=1) { currentGameUI.buttons[color].emit('pointerdown',{data:{pointerId:id}}); },
 release(color, id=1) { currentGameUI.buttons[color].emit('pointerupoutside',{data:{pointerId:id}}); },
 setEnd(time,hp) {levelTimeRemainingMs=time;life=hp;},
 home: () => showProgressScreen(),
 render: () => app.renderer.render(app.stage),
 get ui(){return currentGameUI;}, get objects(){return activeObjects;}, get levels(){return levels;}
};`;
const server = http.createServer((req,res) => {
    const url = new URL(req.url, 'http://localhost');
    let file = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!file.startsWith(root + path.sep)) {res.writeHead(403).end();return;}
    try {
        let data = file === path.join(root,'firebase.js') ? backend : fs.readFileSync(file);
        if (file === path.join(root,'game.js')) data = data.toString() + expose;
        const mime = {'.js':'text/javascript','.html':'text/html','.png':'image/png','.gif':'image/gif','.mp3':'audio/mpeg'}[path.extname(file)] || 'application/octet-stream';
        res.writeHead(200, {'Content-Type':mime});res.end(data);
    } catch { res.writeHead(404).end(); }
});
let chrome, socket;
async function main() {
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const port = server.address().port;
    const profile = fs.mkdtempSync(path.join(os.tmpdir(),'zhukodav-gameplay-test-'));
    chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',[
        '--headless=new','--no-first-run','--no-default-browser-check','--disable-background-networking',
        '--remote-debugging-port=0',`--user-data-dir=${profile}`,'--window-size=1920,1080','--autoplay-policy=no-user-gesture-required','about:blank'
    ], {windowsHide:true,stdio:['ignore','ignore','pipe']});
    const endpoint = await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>reject(Error('Chrome startup timeout')),15000);
        chrome.stderr.on('data',data=>{const match=data.toString().match(/DevTools listening on (ws:\/\/\S+)/);if(match){clearTimeout(timer);resolve(match[1]);}});
        chrome.on('error',reject);
    });
    socket = new WebSocket(endpoint);
    await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
    let id=0;const pending=new Map();const errors=[];
    socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id){const p=pending.get(message.id);pending.delete(message.id);message.error?p.reject(Error(JSON.stringify(message.error))):p.resolve(message.result);}else if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);});
    const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});socket.send(JSON.stringify({id:n,method,params,sessionId}));});
    const {targetId}=await send('Target.createTarget',{url:'about:blank'});
    const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
    const cdp=(method,params)=>send(method,params,sessionId);
    const evaluate=async expression=>{const result=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);return result.result.value;};
    await cdp('Runtime.enable');await cdp('Page.enable');
    await cdp('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
    await cdp('Page.navigate',{url:`http://127.0.0.1:${port}/`});
    const deadline=Date.now()+45000;
    while(!await evaluate('!!window.gameTest?.ready()')) {if(Date.now()>deadline)throw Error('Loading timeout: '+errors.join('\n'));await new Promise(r=>setTimeout(r,250));}
    await evaluate('gameTest.start();gameTest.configure({coloredBug_red:1,coloredBug_yellow:1,coloredBug_purple:1,coloredBug_green:1});gameTest.render()');
    const capture=async name=>{const {data}=await cdp('Page.captureScreenshot',{format:'png'});fs.mkdirSync(path.join(root,'tests/artifacts'),{recursive:true});fs.writeFileSync(path.join(root,'tests/artifacts',name),Buffer.from(data,'base64'));};
    await capture('gameplay-1920.png');
    const check=async (expression,expected)=>assert.deepEqual(await evaluate(expression),expected,expression);
    await check('gameTest.ui.scene.children.filter(c=>c.name?.startsWith("colorButton_")).length',4);
    for(const color of ['red','yellow','purple','green']) {
        await evaluate(`gameTest.spawn('coloredBug_${color}'); gameTest.hold('${color}'); gameTest.hit(); gameTest.release('${color}'); gameTest.step(200);`);
        await check('gameTest.objects.length',0);
    }
    await evaluate("gameTest.spawn('bug');gameTest.atFood();gameTest.hit();gameTest.step(500)");
    await check('gameTest.snapshot().life',100);
    await evaluate("gameTest.spawn('bug');gameTest.atFood();gameTest.step(399)");
    await check('gameTest.snapshot().life',100);
    await evaluate('gameTest.step(1);gameTest.step(1000)');
    await check('gameTest.snapshot().life',99);
    await evaluate("gameTest.spawn('bomb');gameTest.atFood();gameTest.step(500)");
    await check('gameTest.snapshot().life',99);
    await evaluate("gameTest.spawn('bomb');gameTest.hit();gameTest.step(500)");
    await check('gameTest.snapshot().life',98);
    await evaluate("gameTest.spawn('fatColoredBug_red');gameTest.hold('red');gameTest.hit();gameTest.hit()");
    await check('gameTest.objects[0].state === "resolved"',false);
    await evaluate("gameTest.hit();gameTest.release('red');gameTest.step(200)");
    await check('gameTest.objects.length',0);
    await evaluate("gameTest.spawn('bug');gameTest.atFood();gameTest.pause()");
    const paused=await evaluate('gameTest.snapshot()');
    await evaluate('gameTest.step(10000)');
    assert.deepEqual(await evaluate('gameTest.snapshot()'),paused);
    await evaluate('gameTest.resume();gameTest.step(400)');
    await check('gameTest.snapshot().life',97);
    // Existing special bugs retain their effects and use paused game time.
    await evaluate("gameTest.spawn('healer');gameTest.hit();gameTest.step(200)");
    await check('gameTest.snapshot().life',98);
    await evaluate("gameTest.spawn('frozen');gameTest.hit();gameTest.step(200);gameTest.spawn('bug')");
    await check('gameTest.objects[0].state === "resolved"',false);
    await evaluate('gameTest.pause()');
    const frozenPause=await evaluate('gameTest.snapshot()');
    await evaluate('gameTest.step(7000)');
    assert.deepEqual(await evaluate('gameTest.snapshot()'),frozenPause);
    await evaluate('gameTest.resume();gameTest.hit();gameTest.step(200)');
    await evaluate("gameTest.spawn('chameleon');gameTest.hit();gameTest.step(200);gameTest.spawn('coloredBug_purple');gameTest.hit();gameTest.step(200)");
    await check('gameTest.objects.length',0);
    await evaluate("gameTest.spawn('bug');gameTest.spawn('bomb');gameTest.spawn('neat');gameTest.hit(2);gameTest.hit(2);gameTest.step(200)");
    await check('gameTest.objects.length',0);
    // Keyboard holds are routed through the same selected state as pointers.
    await evaluate('window.dispatchEvent(new KeyboardEvent("keydown",{key:"q"}))');
    await check('gameTest.snapshot().held','red');
    await evaluate('window.dispatchEvent(new KeyboardEvent("keyup",{key:"q"}))');
    await check('gameTest.snapshot().held',null);
    // Hidden tab handler pauses the game and clears held tools.
    await evaluate('gameTest.hold("red"); Object.defineProperty(document,"hidden",{configurable:true,get:()=>true});document.dispatchEvent(new Event("visibilitychange"))');
    await check('gameTest.snapshot().paused',true);
    await check('gameTest.snapshot().held',null);
    await evaluate('delete document.hidden;document.dispatchEvent(new Event("visibilitychange"));gameTest.resume()');
    await evaluate('gameTest.spawn("coloredBug_yellow");gameTest.spawn("coloredBug_purple");gameTest.step(1500);gameTest.render()');
    await cdp('Emulation.setDeviceMetricsOverride',{width:960,height:540,deviceScaleFactor:1,mobile:false});
    await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
    await evaluate('gameTest.render()');await capture('gameplay-960.png');
    await check('gameTest.snapshot().sceneScale',0.5);
    await evaluate('gameTest.start();gameTest.configure({coloredBug_red:1});gameTest.spawn("coloredBug_red");gameTest.atFood();gameTest.render()');
    await cdp('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    const bugPoint=await evaluate('(() => {const p=gameTest.objects[0].toGlobal(new PIXI.Point(0,0));return {x:p.x,y:p.y};})()');
    await cdp('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:70,y:130,id:1}]});
    await check('gameTest.snapshot().held','red');
    await cdp('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:70,y:130,id:1},{...bugPoint,id:2}]});
    await check('gameTest.objects[0].state','resolved');
    await cdp('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await check('gameTest.snapshot().held',null);
    // A disabled tool must not capture actual touch input.
    await cdp('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:70,y:400,id:1}]});
    await check('gameTest.snapshot().held',null);
    await cdp('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await cdp('Emulation.setDeviceMetricsOverride',{width:540,height:960,deviceScaleFactor:1,mobile:true});
    await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
    await check('!!document.getElementById("mobile-orientation-overlay")',true);
    const portrait=await evaluate('gameTest.snapshot()');
    await evaluate('gameTest.step(5000)');
    await check('gameTest.snapshot().time',portrait.time);
    await cdp('Emulation.setDeviceMetricsOverride',{width:960,height:540,deviceScaleFactor:1,mobile:false});
    await cdp('Emulation.setTouchEmulationEnabled',{enabled:false});
    await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
    await evaluate('gameTest.stop()');
    await evaluate('gameTest.start();gameTest.configure({bug:1});gameTest.spawn("bug");gameTest.atFood(0,10);gameTest.setEnd(10,1);gameTest.step(10)');
    await check('gameTest.snapshot().ended',true);await check('gameTest.snapshot().life',0);
    await evaluate('gameTest.step(10000)');await check('gameTest.objects.length',0);
    await evaluate('gameTest.start();gameTest.configure({bug:1});gameTest.setEnd(10,3);gameTest.step(10)');
    await check('gameTest.snapshot().ended',true);
    await check('JSON.parse(localStorage.getItem("completedLevels")).includes(0)',true);
    await evaluate('gameTest.home()');
    assert.deepEqual(errors,[]);
    console.log('Browser checks passed: four held tools, keyboard, real multitouch, disabled tool, portrait, hidden tab, special bugs, warning cancellation, one contact penalty, bomb rules, fat bugs, pause, resize, loss priority, win, saved progress.');
    await send('Browser.close');
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{socket?.close();chrome?.kill();server.close();});
