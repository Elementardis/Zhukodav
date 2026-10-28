// Runs the real game in isolated headless Chrome. Firebase is stubbed only by this server.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const backend = ['initBackend','fetchRemoteLevel','saveProgress','trackEvent','recalcLeaderboard','createLevelAttempt','finishLevelAttempt','loadDishPreference','saveDishPreference'].map(name => `export async function ${name}(){window.backendCalls??={};window.backendCalls['${name}']=(window.backendCalls['${name}']||0)+1;return null;}`).join('\n') + '\nexport function rcNumber(key,fallback){return fallback;}';
const expose = `
window.gameTest = {
 ready: () => !!TEXTURES.gameplay_plate && !!progressContainer,
 start(index=0) { startLevel(index); app.ticker.stop(); },
 stop: () => app.ticker.stop(),
 snapshot: () => ({ life, score, time: levelTimeRemainingMs, clock: gameTimeMs, ended: levelEnded, paused: isPaused, active: activeObjects.map(o => ({type:o.type,x:o.x,y:o.y,state:o.state})), held: getActiveColor(), sceneScale: currentGameUI.scene?.scale.x }),
 step: ms => tickLevelCountdown((levelCountdownLastAt ?? performance.now()) + ms),
 configure(weights, hp=8) { levelData = {...levels[0], food:"pizza", durationSeconds:60, params:{...levels[0].params, maxObjects:20, spawnWeights:weights}}; life=hp; levelTimeRemainingMs=60000; removeAllActiveObjectsImmediate(); prepareObjectQueue(); const result=setupPlayArea(); playArea=result.playField; spawnDueAt=null; },
 spawn(type) { const b=getRuntimeBugBalance(type); objectQueue=[{type,...b}]; spawnObject(); spawnDueAt=null; return activeObjects.length; },
 hit(index=0) { hitFoodBug(activeObjects[index]); },
 atFood(index=0, time=400) { const o=activeObjects[index]; o.x=o.targetX; o.y=o.targetY; o.state='atFood'; o.reactionRemainingMs=time; showFoodWarning(o); },
 pause: () => showPausePopup(),
 get cutscene(){return activeCutscene;},
 end: won => endGame(won),
 get introActive(){return introActive;},
 confirmIntro(){gameContainer.getChildByName('introPopup')?.getChildByName('introConfirm').emit('pointertap');app.ticker.stop();},
 background: () => { const b=adaptiveBackground.layer.getBounds();return {visible:adaptiveBackground.layer.visible,x:b.x,y:b.y,width:b.width,height:b.height,count:app.stage.children.filter(c=>c.name==='backgroundLayer').length}; },
 safe: () => safeViewport(app.screen),
 viewport: () => ({width:app.screen.width,height:app.screen.height}),
 dishes: () => showDishSelect(),
 selectDish,
 get dishScene(){return dishSelectScene;},
 get homeScene(){return progressContainer.getChildByName('homeContainer');},
 get selectedDish(){return selectedDishId;},
 musicVolume: () => getEffectiveAudioVolume('levelMusic'),
 stopSpawns: () => { spawnDueAt=null; },
 settings: () => showPausePopup(true),
 get settingsNode(){return progressContainer.getChildByName('pausePopup');},
 resume() { const p=gameContainer.getChildByName('pausePopup'); const o=gameContainer.getChildByName('pauseOverlay'); p?.destroy({children:true}); o?.destroy(); isPaused=false; resumeGame(); app.ticker.stop(); },
 hold(color, id=1) { currentGameUI.buttons[color].emit('pointerdown',{data:{pointerId:id}}); },
 release(color, id=1) { currentGameUI.buttons[color].emit('pointerupoutside',{data:{pointerId:id}}); },
 setEnd(time,hp) {levelTimeRemainingMs=time;life=hp;},
 home: () => showProgressScreen(),
 result(won,index=0) { clearAllPopups(); introActive=false; endGame(won); showResultPopup({won,levelIndex:index}); },
 resultButton(name) { const popup=gameContainer.children.find(c=>c.name==='winPopup'||c.name==='losePopup');return popup.getChildByName(name); },
 resultCounts: () => gameContainer.children.filter(c=>['winPopup','losePopup','winOverlay','loseOverlay'].includes(c.name)).length,
 isHome: () => app.stage.children.includes(progressContainer),
 debugState: () => ({select:app.stage.children.includes(levelSelectContainer),game:app.stage.children.includes(gameContainer),levelId:levelData?.id,active:activeObjects.length}),
 showTestPopup(kind) {
   clearAllPopups(); isPaused=false; introActive=false; levelEnded=kind==='win'||kind==='lose';
   if(kind==='pause') showPausePopup();
   if(kind==='win') showWinPopup(0);
   if(kind==='lose') showLosePopup(0);
   if(kind==='intro') { introActive=true; const longest=levels.map(l=>l.introPopup).filter(Boolean).sort((a,b)=>b.descryption.length-a.descryption.length)[0];showIntroPopup(longest,()=>{introActive=false;}); }
 },
 popupInfo() {
   const popup=gameContainer.children.find(c=>c._popupLayout);
   if(!popup)return null;
   const bounds=popup.getBounds();
   return {name:popup.name,x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height,scaleX:popup.scale.x,scaleY:popup.scale.y};
 },
 popupButtonPoint(text) {
   const popup=gameContainer.children.find(c=>c._popupLayout);
   function find(node) {if(node.text===text)return node;for(const child of node.children||[]){const found=find(child);if(found)return found;}}
   const bounds=find(popup).getBounds();return {x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2};
 },
 selectTestLevel(index) { showLevelEntryPopup(index); const popup=levelSelectContainer.getChildByName('levelEntryPopup'); popup.children.find(c=>c.children?.some(t=>t.text==='ИГРАТЬ')).emit('pointerdown',{stopPropagation(){}}); app.ticker.stop(); },
 render: () => app.renderer.render(app.stage),
 indicators: () => ({slices:currentGameUI.slices.filter(s=>s.visible).length, timeFresh:currentGameUI.segments.filter(s=>s.texture===TEXTURES.gameplay_hp_fresh).length}),
 intro(cfg) { this.confirmations=0; showIntroPopup(cfg,()=>{this.confirmations++;}); },
 get introNode(){return gameContainer.getChildByName('introPopup');},
 get textures(){return TEXTURES;},
 get ui(){return currentGameUI;}, get objects(){return activeObjects;}, get levels(){return levels;}
};`;
const server = http.createServer((req,res) => {
    const url = new URL(req.url, 'http://localhost');
    let file = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!file.startsWith(root + path.sep)) {res.writeHead(403).end();return;}
    try {
        let data = file === path.join(root,'firebase.js') ? backend : fs.readFileSync(file);
        if (file === path.join(root,'game.js')) data = data.toString() + expose;
        // Gameplay/UI suites are independent of the user's editable story sequence.
        if (file === path.join(root,'cutscenes.js') && !process.argv.includes('--cutscenes') && !process.argv.includes('--story-layout')) data = 'export const cutscenes = [];';
        // Test fixture only: production unlock levels stay user-configured.
        if (process.argv.includes('--dishes') && file === path.join(root,'js','food-config.js')) {
            data = data.toString().replace("name: 'Пирог', pieces: 10, unlockLevel: null", "name: 'Пирог', pieces: 10, unlockLevel: 2");
        }
        const mime = {'.js':'text/javascript','.html':'text/html','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.gif':'image/gif','.mp3':'audio/mpeg'}[path.extname(file)] || 'application/octet-stream';
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
    const debugSelect = process.argv.includes('--debug-select');
    if (!process.argv.includes('--cutscenes')) await cdp('Page.addScriptToEvaluateOnNewDocument',{source:'localStorage.setItem("zhukodav.cutscenes.v1",JSON.stringify(["welcome"]))'});
    await cdp('Page.navigate',{url:`http://127.0.0.1:${port}/${debugSelect ? '?debug=1' : ''}`});
    const deadline=Date.now()+45000;
    while(!await evaluate('!!window.gameTest?.ready()')) {if(Date.now()>deadline)throw Error('Loading timeout: '+await evaluate('document.querySelector(' + JSON.stringify('[role=status]') + ')?.textContent')+' '+errors.join('\n'));await new Promise(r=>setTimeout(r,250));}
    assert.equal(await evaluate('document.fonts.check(\'700 32px "Balsamiq Sans"\')'),true);
    if (process.argv.includes('--story-layout')) {
        await evaluate('localStorage.removeItem("zhukodav.cutscenes.v1");gameTest.start()');
        const deadline=Date.now()+10000;
        while(!await evaluate('gameTest.cutscene?.imageCount')){if(Date.now()>deadline)throw Error('Story image timeout');await new Promise(r=>setTimeout(r,100));}
        for(const [width,height] of [[1920,1080],[1912,905],[852,393],[2560,1080]]) {
            await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
            await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
            await evaluate('gameTest.render()');
            assert.equal(await evaluate(`(()=>{const t=gameTest.cutscene.root.getChildByName('cutsceneTable'),b=t.getBounds(),c=gameTest.cutscene.root.getChildByName('cutsceneContent');return t.scale.x===c.scale.x&&t.scale.y===c.scale.y&&Math.abs(b.x+b.width-${width})<.01&&Math.abs(b.y+b.height-${height})<.01;})()`),true);
            const {data}=await cdp('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(root,'tests/artifacts',`story-layout-${width}.png`),Buffer.from(data,'base64'));
        }
        assert.deepEqual(errors,[]);console.log('Story layout passed: four viewports, actual configured mascot, table covers viewport edges.');await send('Browser.close');return;
    }
    if (process.argv.includes('--cutscenes')) {
        const click=async()=>{await evaluate('gameTest.cutscene.root.getChildByName("cutsceneContent").getChildByName("cutsceneNext").emit("pointertap")');};
        await evaluate('gameTest.start()');
        assert.equal(await evaluate('gameTest.cutscene.text'),'Приветствую на празднике!');
        await evaluate('new Promise(r=>setTimeout(r,200));');
        await evaluate('gameTest.render()');
        {const {data}=await cdp('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(root,'tests/artifacts','cutscene-welcome.png'),Buffer.from(data,'base64'));}
        const before=await evaluate('gameTest.snapshot()');await evaluate('gameTest.step(10000);gameTest.spawn("bug");gameTest.hold("red")');
        assert.deepEqual(await evaluate('gameTest.snapshot()'),before);
        await evaluate('gameTest.home()');assert.equal(await evaluate('JSON.parse(localStorage.getItem("zhukodav.cutscenes.v1")||"[]").includes("welcome")'),false);
        await evaluate('gameTest.start()');await click();await evaluate('gameTest.stop()');
        assert.equal(await evaluate('JSON.parse(localStorage.getItem("zhukodav.cutscenes.v1")).includes("welcome")'),true);
        await cdp('Page.reload');
        const storyReload=Date.now()+45000;
        while(!await evaluate('!!window.gameTest?.ready()')){if(Date.now()>storyReload)throw Error('story reload timeout');await new Promise(r=>setTimeout(r,250));}
        await evaluate('gameTest.start()');assert.equal(await evaluate('gameTest.cutscene===null'),true);
        await evaluate(`(async()=>{window.storyConfig=(await import('./cutscenes.js')).cutscenes;storyConfig.splice(0,storyConfig.length,
            {id:'multi',levelId:gameTest.levels[0].id,when:'beforeLevel',repeat:'always',frames:[{image:'images/home/04_mascot.png',text:'Первый',buttonText:'Привет!'},{image:null,text:'Длинный текст. '.repeat(100),buttonText:'Продолжить разговор'},{image:'images/missing-character.png',text:'Без картинки',buttonText:'Начать'}]},
            {id:'empty',levelId:gameTest.levels[0].id,when:'beforeLevel',repeat:'once',frames:[]},
            {id:'second',levelId:gameTest.levels[0].id,when:'beforeLevel',repeat:'always',frames:[{image:null,text:'Вторая сцена',buttonText:'Далее'}]},
            ...['win','lose'].map(outcome=>({id:outcome,levelId:gameTest.levels[0].id,when:'afterLevel',outcome,repeat:'always',frames:[{image:null,text:outcome,buttonText:'Результат'}]})));
            gameTest.levels[0].introPopup={type:'bug',descryption:'Тест интро'};gameTest.levels[0].onEnterLevel=()=>{window.starts=(window.starts||0)+1};})()`);
        await evaluate('gameTest.start()');await click();await click();assert.equal(await evaluate('gameTest.cutscene.frameIndex'),1);
        assert.equal(await evaluate('gameTest.cutscene.imageCount'),0);
        await evaluate('(()=>{const area=gameTest.cutscene.root.getChildByName("cutsceneContent").getChildByName("cutsceneScroll");area.emit("pointerdown",{data:{getLocalPosition:()=>({y:950})}});area.emit("pointermove",{data:{getLocalPosition:()=>({y:850})}});area.emit("pointerup");})()');
        assert.equal(await evaluate('gameTest.cutscene.scrollY'),100);
        for(const [width,height] of [[1920,1080],[852,393]]) {
            await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
            await evaluate('document.documentElement.style.setProperty("--safe-left","59px");window.dispatchEvent(new Event("resize"));new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
            assert.equal(await evaluate('gameTest.cutscene.frameIndex'),1);
            assert.equal(await evaluate('gameTest.cutscene.scrollY'),100);
            await evaluate('gameTest.render()');const {data}=await cdp('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(root,'tests/artifacts',`cutscene-${width}.png`),Buffer.from(data,'base64'));
        }
        await new Promise(r=>setTimeout(r,360));await click();assert.equal(await evaluate('gameTest.cutscene.text'),'Без картинки');
        await new Promise(r=>setTimeout(r,360));await click();assert.equal(await evaluate('gameTest.cutscene.text'),'Вторая сцена');
        await new Promise(r=>setTimeout(r,360));await click();assert.equal(await evaluate('gameTest.introActive'),true);
        await evaluate('gameTest.confirmIntro();gameTest.confirmIntro()');assert.equal(await evaluate('window.starts'),1);
        await evaluate('storyConfig.splice(0,3)');
        for(const won of [true,false]) {
            await evaluate('gameTest.start();gameTest.confirmIntro()');
            const saves=await evaluate('backendCalls.saveProgress||0');
            await evaluate(`gameTest.end(${won});gameTest.end(${won})`);assert.equal(await evaluate('backendCalls.saveProgress'),saves+1);
            assert.equal(await evaluate('gameTest.cutscene.text'),won?'win':'lose');
            await click();assert.equal(await evaluate('gameTest.resultCounts()'),2);
        }
        assert.deepEqual(errors,[]);console.log('Cutscenes passed: welcome once/interruption, frames, null/missing art, double tap, sequential scenes, safe-area resize, bug intro, start once, win/loss and single save.');
        await send('Browser.close');return;
    }
    if (process.argv.includes('--background')) {
        const readyDeadline=Date.now()+20000;
        while(await evaluate('!!document.getElementById("preloader")')) { if(Date.now()>readyDeadline)throw Error('Preloader did not close');await new Promise(r=>setTimeout(r,100)); }
        await evaluate('gameTest.start()');
        for(const [width,height] of [[1920,1080],[1280,720],[852,393],[844,390],[1024,768],[2560,1080]]) {
            await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:false});
            await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
            const b=await evaluate('gameTest.background()');
            assert.ok(b.visible && b.count===1 && b.x<=0.01 && b.y<=0.01 && b.x+b.width>=width-0.01 && b.y+b.height>=height-0.01);
            assert.equal(await evaluate('gameTest.ui.scene.children.some(c=>c.texture===gameTest.textures.gameplay_tablecloth)'),false);
            for(const [left,right] of [[59,0],[0,59]]) {
                await evaluate(`document.documentElement.style.setProperty('--safe-left','${left}px');document.documentElement.style.setProperty('--safe-right','${right}px');document.documentElement.style.setProperty('--safe-bottom','21px');window.dispatchEvent(new Event('resize'))`);
                await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
                const safe=await evaluate('gameTest.safe()');assert.equal(safe.x,left);assert.equal(safe.width,width-left-right);
                const pose=await evaluate('({x:gameTest.ui.scene.x,y:gameTest.ui.scene.y,scale:gameTest.ui.scene.scale.x})');
                assert.ok(pose.x>=left && pose.x+1920*pose.scale<=width-right+0.01 && pose.y+1080*pose.scale<=height-21+0.01);
                await evaluate('gameTest.render()');
                const point=await evaluate('(()=>{const b=gameTest.ui.scene.children.find(c=>c.texture===gameTest.textures.gameplay_settings).getBounds();return {x:b.x+b.width/2,y:b.y+b.height/2};})()');
                await cdp('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
                await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
                assert.equal(await evaluate('gameTest.snapshot().paused'),true,JSON.stringify({width,height,left,right,point}));
                const p=await evaluate('gameTest.popupInfo()');assert.ok(p.x>=left && p.x+p.width<=width-right+0.01);
                assert.equal(await evaluate(`(()=>{const p=gameTest.ui.scene.parent.parent.getChildByName('pauseOverlay').getBounds();return p.x===0&&p.y===0&&p.width===${width}&&p.height===${height};})()`),true);
                await evaluate('gameTest.resume();gameTest.stop()');
            }
            await evaluate('gameTest.render()');
            const {data}=await cdp('Page.captureScreenshot',{format:'png'});
            fs.writeFileSync(path.join(root,'tests/artifacts',`background-${width}.png`),Buffer.from(data,'base64'));
        }
        await evaluate('document.documentElement.style.removeProperty("--safe-left");document.documentElement.style.removeProperty("--safe-right");document.documentElement.style.removeProperty("--safe-bottom");gameTest.home()');
        assert.equal(await evaluate('gameTest.background().visible'),false);
        await evaluate('gameTest.dishes()');assert.equal(await evaluate('gameTest.background().visible'),false);
        await evaluate('gameTest.home();gameTest.start();gameTest.home();gameTest.start()');assert.equal(await evaluate('gameTest.background().count'),1);
        assert.deepEqual(errors,[]);console.log('Background passed: cover at six sizes, DPR 2, simulated left/right safe areas, popup backdrop, menu/dishes visibility, repeated transitions.');
        await send('Browser.close');return;
    }
    if (process.argv.includes('--loading')) {
        const loadingDeadline = Date.now()+20000;
        while (await evaluate('!!document.getElementById("preloader")')) {
            const failure = await evaluate('document.querySelector(".loading-fallback button")?.hidden === false ? document.querySelector(".loading-fallback [role=status]").textContent : null');
            assert.equal(failure,null,JSON.stringify(errors));
            if (Date.now()>loadingDeadline) throw Error('Loading screen did not finish: '+JSON.stringify(errors));
            await new Promise(resolve=>setTimeout(resolve,100));
        }
        assert.equal(await evaluate('document.getElementById("preloader") === null'),true,'menu finishes loading');
        assert.deepEqual(errors,[]);
        const markup = fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script[\s\S]*?<\/script>/g,'');
        await evaluate(`document.body.innerHTML = ${JSON.stringify(markup.match(/<body>([\s\S]*)<\/body>/)[1])}; delete window.gamePreloader;`);
        await evaluate(fs.readFileSync(path.join(root,'js/preloader.js'),'utf8'));
        await evaluate('gamePreloader.ready');
        const bugCount=await evaluate('document.querySelectorAll(".loading-bug").length');
        assert.ok(bugCount>1);
        const pose=await evaluate('getComputedStyle(document.querySelector(".loading-bug")).transform');
        await new Promise(r=>setTimeout(r,200));
        assert.notEqual(await evaluate('getComputedStyle(document.querySelector(".loading-bug")).transform'),pose);
        const bugPoint=await evaluate('(()=>{const b=document.querySelector(".loading-bug").getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2};})()');
        await cdp('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...bugPoint});
        await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...bugPoint});
        assert.equal(await evaluate('document.querySelectorAll(".loading-bug").length'),bugCount-1);
        const touchPoint=await evaluate('(()=>{const b=document.querySelector(".loading-bug").getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2};})()');
        await cdp('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...touchPoint,id:1}]});
        await cdp('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        assert.equal(await evaluate('document.querySelectorAll(".loading-bug").length'),bugCount-2);
        await evaluate('document.querySelectorAll(".loading-bug").forEach(b=>b.click())');
        assert.equal(await evaluate('document.querySelectorAll(".loading-bug").length'),0);
        await new Promise(r=>setTimeout(r,500));
        assert.equal(await evaluate('document.querySelectorAll(".loading-bug").length'),bugCount);
        assert.equal(await evaluate('document.getElementById("preloader").getAttribute("aria-valuenow")'),'0');
        for (const [width,height] of [[1920,1080],[1280,720],[852,393],[844,390],[1024,768],[2560,1080],[390,844]]) {
            await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
            await evaluate('window.dispatchEvent(new Event("resize"))');
            await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
            const bounds=await evaluate('document.querySelector(".loading-scene").getBoundingClientRect().toJSON()');
            assert.ok(bounds.x>=-1 && bounds.y>=-1 && bounds.right<=width+1 && bounds.bottom<=height+1);
            assert.equal(await evaluate('getComputedStyle(document.getElementById("preloader")).backgroundSize'),'cover');
            assert.equal(await evaluate('!!document.querySelector(".loading-scene img[src*=tablecloth]")'),false);
        }
        for (const progress of [0,0.01,0.5,1]) {
            await evaluate(`gamePreloader.update(${progress})`);
            assert.equal(await evaluate('Number(document.getElementById("preloader").getAttribute("aria-valuenow"))'),progress*100);
            const widths=await evaluate('(()=>{const image=[...document.images].find(img=>img.src.endsWith("preloader_fill.png"));return [parseFloat(image.style.width),parseFloat(image.parentElement.style.width)];})()');
            assert.deepEqual(widths,[1072,progress*100]);
        }
        await evaluate('gamePreloader.error()');
        assert.equal(await evaluate('document.querySelector(".loading-scene").getAnimations({subtree:true}).length'),0);
        assert.equal(await evaluate('document.querySelector(".loading-fallback button").hidden'),false);
        assert.equal(await evaluate('document.querySelectorAll("#preloader").length'),1);
        assert.deepEqual(errors,[]);
        console.log('Loading screen passed: menu starts, overlay removed, four viewport sizes, 0/1/50/100% reveal without texture scaling, retry UI.');
        await send('Browser.close');
        return;
    }
    if (debugSelect) {
        assert.equal(await evaluate('gameTest.debugState().select'),true);
        await evaluate('gameTest.selectTestLevel(gameTest.levels.length-1)');
        assert.equal(await evaluate('gameTest.debugState().levelId === gameTest.levels.at(-1).id'),true);
        assert.equal(await evaluate('gameTest.debugState().game'),true);
        await evaluate('gameTest.spawn("bug");gameTest.atFood();gameTest.pause();document.getElementById("debug-level-select").click()');
        assert.equal(await evaluate('gameTest.debugState().select'),true);
        assert.equal(await evaluate('gameTest.debugState().game'),false);
        assert.equal(await evaluate('gameTest.debugState().active'),0);
        await evaluate('document.getElementById("debug-level-select").click()');
        assert.equal(await evaluate('document.querySelectorAll("#debug-level-select").length'),1);
        await evaluate('gameTest.selectTestLevel(2);document.getElementById("debug-level-select").click()');
        assert.equal(await evaluate('gameTest.debugState().select'),true);
        assert.deepEqual(errors,[]);
        console.log('Debug level selection passed: all levels accessible, last level starts, exit during pause/contact/intro clears gameplay, repeated open has one button.');
        await send('Browser.close');
        return;
    }
    assert.equal(await evaluate('document.getElementById("debug-level-select") === null'),true);
    if (process.argv.includes('--results')) {
        await evaluate('new Promise(resolve=>{const poll=()=>document.getElementById("preloader")?setTimeout(poll,100):resolve();poll();})');
        for (const won of [false,true]) {
            await evaluate(`gameTest.start();gameTest.result(${won})`);
            for (const [width,height] of [[1920,1080],[1280,720],[844,390]]) {
                await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
                await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
                const info=await evaluate('gameTest.popupInfo()');
                assert.equal(info.scaleX,Math.min(width/1920,height/1080));
                assert.equal(info.scaleX,info.scaleY);
            }
            const before=await evaluate('gameTest.snapshot()');
            await cdp('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,x:10,y:10});
            await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,x:10,y:10});
            await evaluate('gameTest.step(5000)');
            assert.deepEqual(await evaluate('gameTest.snapshot()'),before,'result blocks gameplay');
            assert.equal(await evaluate('gameTest.snapshot().ended'),true);
            assert.equal(await evaluate('gameTest.resultCounts()'),2);
            await evaluate('(()=>{const b=gameTest.resultButton("resultPrimary");b.emit("pointertap");b.emit("pointertap");gameTest.stop();})()');
            assert.equal(await evaluate('gameTest.debugState().levelId'),won?2:1);
            assert.equal(await evaluate('gameTest.resultCounts()'),0);
            await evaluate(`gameTest.result(${won});gameTest.result(${won})`);
            assert.equal(await evaluate('gameTest.resultCounts()'),2);
            const point=await evaluate('gameTest.popupButtonPoint("В ГЛАВНОЕ МЕНЮ")');
            await cdp('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
            await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
            assert.equal(await evaluate('gameTest.isHome()'),true);
            assert.equal(await evaluate('gameTest.debugState().game'),false);
        }
        await evaluate('gameTest.start(gameTest.levels.length-1);gameTest.result(true,gameTest.levels.length-1);gameTest.resultButton("resultPrimary").emit("pointertap")');
        assert.equal(await evaluate('gameTest.debugState().select'),true);
        assert.equal(await evaluate('gameTest.debugState().game'),false);
        assert.deepEqual(errors,[]);
        console.log('Result transitions passed: retry, next, last level, home, duplicate tap, repeated opens, ended simulation, three viewports.');
        await send('Browser.close');
        return;
    }
    if (process.argv.includes('--menus')) {
        for(const [width,height] of [[1920,1080],[852,393],[390,844],[768,1024],[2560,1080]]) {
            await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
            await evaluate('document.documentElement.style.setProperty("--safe-left","20px");window.dispatchEvent(new Event("resize"));gameTest.home()');
            await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
            for(const kind of ['home','dishes']) {
                if(kind==='dishes')await evaluate('gameTest.dishes()');
                await evaluate('gameTest.render()');
                const scene=kind==='home'?'homeScene':'dishScene';
                if(kind==='home')assert.equal(await evaluate(`(()=>{const b=gameTest.homeScene.getChildByName('05_table').getBounds();return b.x+b.width>=${width}-.01;})()`),true);
                assert.equal(await evaluate(`(()=>{const b=gameTest.${scene}.getChildByName('01_background').getBounds();return b.x<=0.01&&b.y<=0.01&&b.x+b.width>=${width}-.01&&b.y+b.height>=${height}-.01;})()`),true);
                const names=kind==='home'?['07_button_settings','08_button_dishes','09_button_play']:['dishCard_pizza','dishCard_pie','dishCard_cake','dishCard_bundt_cake','dishCard_greek_salad','dishCard_dressed_herring','dishBack'];
                for(const name of names)assert.equal(await evaluate(`(()=>{const b=gameTest.${scene}.getChildByName('${name}').getBounds();return b.x>=19&&b.y>=-1&&b.x+b.width<=${width}+1&&b.y+b.height<=${height}+1;})()`),true,`${kind} ${name} ${width}x${height}`);
                const {data}=await cdp('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(root,'tests/artifacts',`${kind}-${width}x${height}.png`),Buffer.from(data,'base64'));
            }
        }
        assert.deepEqual(errors,[]);console.log('Menus passed: home and six dishes, portrait/landscape, safe-area, full room background, five viewport sizes.');await send('Browser.close');return;
    }
    if (process.argv.includes('--dishes')) {
        await evaluate('gameTest.home();gameTest.dishes()');
        assert.equal(await evaluate('gameTest.dishScene.children.filter(c=>c.name?.startsWith("dishCard_")).length'),6);
        assert.equal(await evaluate('gameTest.selectDish("greek_salad")'),false);
        assert.equal(await evaluate('gameTest.selectedDish'), 'pizza');
        for(const [width,height] of [[1920,1080],[1280,720],[844,390]]) {
            await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
            await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
            assert.equal(await evaluate(`gameTest.dishScene.children.filter(c=>c.name?.startsWith('dishCard_')).every(c=>{const b=c.getBounds();return b.x>=0&&b.y>=0&&b.x+b.width<=${width}+1&&b.y+b.height<=${height}+1})`),true);
            await evaluate('gameTest.render()');
            const {data}=await cdp('Page.captureScreenshot',{format:'png'});
            fs.writeFileSync(path.join(root,'tests/artifacts',`dishes-${width}.png`),Buffer.from(data,'base64'));
        }
        await evaluate(`(async()=>{const m=await import('./js/dish-select.js');
            if(m.canSelectDish('pie',[])||m.canSelectDish('pie',[0])||m.canSelectDish('pie',[2])||!m.canSelectDish('pie',[1]))throw Error('Unlock policy');
            const layout=await (await fetch('images/dishes/layout.json')).json();let selected='pizza';
            let completed=[];
            const scene=m.createDishSelect(gameTest.textures,layout,{getSelected:()=>selected,getCompletedLevels:()=>completed,onSelect:id=>{selected=id;},onBack(){}});
            const host=new PIXI.Container();host.addChild(scene);
            const card=scene.getChildByName('dishCard_pie');
            if(card.getChildByName('unlockLabel').text!=='После уровня 2')throw Error('Unlock label');
            card.getChildByName('select_pie').emit('pointertap');
            if(selected!=='pizza')throw Error('Locked selection');
            completed=[1];scene.refresh();
            scene.getChildByName('dishCard_pie').getChildByName('select_pie').emit('pointertap');
            if(selected!=='pie'||scene.getChildByName('dishCard_pie').getChildByName('select_pie').visible||!scene.getChildByName('dishCard_pizza').getChildByName('select_pizza').visible)throw Error('Selection swap');
            scene.destroy();host.destroy();
        })()`);
        await evaluate('localStorage.setItem("completedLevels","[1]")');
        assert.equal(await evaluate('gameTest.selectDish("pie")'),true);
        await evaluate('gameTest.start()');
        assert.equal(await evaluate('gameTest.snapshot().life'),10);
        assert.equal(await evaluate('gameTest.indicators().slices'),10);
        await evaluate('gameTest.start()');
        assert.equal(await evaluate('gameTest.snapshot().life'),10);
        await evaluate('gameTest.home();gameTest.dishes()');
        await evaluate('gameTest.dishScene.getChildByName("dishBack").emit("pointertap");gameTest.dishes();gameTest.dishScene.getChildByName("dishBack").emit("pointertap")');
        assert.equal(await evaluate('gameTest.isHome()'),true);
        await cdp('Page.reload');
        const reloadEnd=Date.now()+45000;
        while(!await evaluate('!!window.gameTest?.ready()')){if(Date.now()>reloadEnd)throw Error('reload timeout');await new Promise(r=>setTimeout(r,250));}
        assert.equal(await evaluate('gameTest.selectedDish'),'pie');
        await evaluate('gameTest.start()');
        assert.equal(await evaluate('gameTest.indicators().slices'),10);
        await evaluate('localStorage.setItem("selectedDishId","invalid")');
        await cdp('Page.reload');
        const end=Date.now()+45000;
        while(!await evaluate('!!window.gameTest?.ready()')){if(Date.now()>end)throw Error('reload timeout');await new Promise(r=>setTimeout(r,250));}
        assert.equal(await evaluate('gameTest.selectedDish'),'pizza');
        await evaluate('gameTest.start()');
        assert.equal(await evaluate('gameTest.snapshot().life'),8);
        assert.deepEqual(errors,[]);
        console.log('Dishes passed: six cards, three sizes, locked selection, character-level policy, back/reopen, reload and invalid-ID fallback.');
        await send('Browser.close');return;
    }
    if (process.argv.includes('--settings')) {
        await evaluate('gameTest.home();gameTest.settings()');
        for (const [name,key] of [['soundToggle','soundEnabled'],['musicToggle','musicEnabled']]) {
            const before = await evaluate(`localStorage.getItem('${key}') !== 'false'`);
            await evaluate(`gameTest.settingsNode.getChildByName('${name}').emit('pointertap')`);
            assert.equal(await evaluate(`localStorage.getItem('${key}') !== 'false'`),!before);
            assert.equal(await evaluate(`gameTest.settingsNode.getChildByName('${name}').enabled`),!before);
        }
        await evaluate('gameTest.settingsNode.getChildByName("settingsClose").emit("pointertap");gameTest.settings()');
        assert.equal(await evaluate('gameTest.settingsNode.getChildByName("soundToggle").enabled === (localStorage.getItem("soundEnabled") !== "false")'),true);
        for (const [width,height] of [[1920,1080],[844,390]]) {
            await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
            await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
            const bounds=await evaluate('(()=>{const b=gameTest.settingsNode.getBounds();return {x:b.x,y:b.y,width:b.width,height:b.height};})()');
            assert.ok(bounds.x>=0 && bounds.y>=0 && bounds.x+bounds.width<=width && bounds.y+bounds.height<=height);
            await evaluate('gameTest.render()');
            const {data}=await cdp('Page.captureScreenshot',{format:'png'});
            fs.writeFileSync(path.join(root,'tests/artifacts',`popup-settings-${width}.png`),Buffer.from(data,'base64'));
        }
        await evaluate('gameTest.settingsNode.getChildByName("settingsClose").emit("pointertap");gameTest.start();gameTest.pause()');
        const before=await evaluate('gameTest.snapshot()');
        await evaluate('gameTest.step(10000)');
        assert.deepEqual(await evaluate('gameTest.snapshot()'),before);
        await evaluate('gameTest.ui.scene.parent.parent.getChildByName("pausePopup").getChildByName("pauseRetry").emit("pointertap");gameTest.stop()');
        assert.equal(await evaluate('gameTest.snapshot().paused'),false);
        await evaluate('gameTest.pause();gameTest.ui.scene.parent.parent.getChildByName("pausePopup").getChildByName("pauseMenu").emit("pointertap")');
        assert.equal(await evaluate('gameTest.isHome()'),true);
        assert.deepEqual(errors,[]);
        console.log('Settings checks passed: audio toggles, persistence, home close/reopen, two sizes, pause clock, restart and menu.');
        await send('Browser.close'); return;
    }
    if (process.argv.includes('--intro')) {
        await evaluate('gameTest.start()');
        for (const index of await evaluate('gameTest.levels.map((l,i)=>l.introPopup ? i : -1).filter(i=>i>=0)')) {
            await evaluate(`gameTest.intro(gameTest.levels[${index}].introPopup)`);
            assert.equal(await evaluate(`gameTest.introNode.getChildByName('introDescription').text === gameTest.levels[${index}].introPopup.descryption`),true);
            assert.equal(await evaluate('gameTest.introNode.getChildByName("introIcon").texture.valid'),true);
            assert.equal(await evaluate('gameTest.introNode.getChildByName("introTitle").text.includes("_")'),false);
            const before=await evaluate('gameTest.snapshot()');
            await evaluate('gameTest.step(10000);gameTest.spawn("bug")');
            assert.deepEqual(await evaluate('gameTest.snapshot()'),before);
            await evaluate('{ const b=gameTest.introNode.getChildByName("introConfirm");b.emit("pointertap");b.emit("pointertap"); }');
            assert.equal(await evaluate('gameTest.confirmations'),1);
        }
        await evaluate('gameTest.intro({title:"Очень длинное название нового необычного жука",descryption:"Длинная инструкция. ".repeat(100),type:"bomb"})');
        assert.equal(await evaluate('gameTest.introNode.getChildByName("introDescription").style.fontSize'),28);
        assert.equal(await evaluate('!!gameTest.introNode.getChildByName("introDescriptionScroll")'),true);
        await evaluate('const a=gameTest.introNode.getChildByName("introDescriptionScroll");a.emit("pointerdown",{data:{getLocalPosition:()=>({y:600})}});a.emit("pointermove",{data:{getLocalPosition:()=>({y:550})}});a.emit("pointerup")');
        assert.equal(await evaluate('gameTest.introNode.getChildByName("introDescription").y < 555'),true);
        await evaluate('window.oldIntro=gameTest.introNode;window.oldConfirm=oldIntro.getChildByName("introConfirm");gameTest.home();oldConfirm.emit("pointertap")');
        assert.equal(await evaluate('oldIntro._destroyed && gameTest.confirmations===0'),true);
        await evaluate('gameTest.start();gameTest.intro({type:"fat"});window.oldIntro=gameTest.introNode;gameTest.start()');
        assert.equal(await evaluate('oldIntro._destroyed && gameTest.confirmations===0'),true);
        assert.equal(await evaluate('gameTest.textures.result_panel.baseTexture.realWidth >= 2280'),true);
        await evaluate(`(async()=>{const fallback = (await import('./js/intro-popup.js')).createIntroPopup({},await (await fetch('images/ui/results/intro-layout.json')).json(),['Arial'],{},null,()=>{},document.querySelector('canvas'));fallback.destroy({children:true});})()`);
        assert.deepEqual(errors,[]);
        console.log('Intro checks passed: all configured types, original descriptions, blocked simulation/spawn, double confirmation, long text scrolling, external cleanup/restart, missing textures and 2x SVG rasterization.');
        await send('Browser.close'); return;
    }
    if (process.argv.includes('--popups')) {
        await evaluate('gameTest.start()');
        const dimensions=[[1920,1080],[960,540],[844,390],[568,320],[320,568],[2560,1080]];
        for(const kind of ['intro','pause','win','lose']) {
            await evaluate(`gameTest.showTestPopup('${kind}')`);
            for(const [width,height] of dimensions) {
                await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
                await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
                const info=await evaluate('gameTest.popupInfo()');
                assert.ok(info,kind);
                assert.equal(info.scaleX,info.scaleY);
                assert.ok(info.x>=0 && info.y>=0 && info.x+info.width<=width && info.y+info.height<=height,`${kind} ${width}x${height}: ${JSON.stringify(info)}`);
                assert.ok(Math.abs(info.x+info.width/2-width/2)<8,kind+' centered horizontally');
                assert.ok(Math.abs(info.y+info.height/2-height/2)<8,kind+' centered vertically');
                if(width===844 || width===1920) {
                    await evaluate('gameTest.render()');
                    const {data}=await cdp('Page.captureScreenshot',{format:'png'});
                    fs.mkdirSync(path.join(root,'tests/artifacts'),{recursive:true});
                    fs.writeFileSync(path.join(root,'tests/artifacts',`popup-${kind}-${width}.png`),Buffer.from(data,'base64'));
                }
            }
        }
        await evaluate("gameTest.showTestPopup('pause')");
        await cdp('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:false});
        await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
        const point=await evaluate('gameTest.popupButtonPoint(\"ПРОДОЛЖИТЬ\")');
        await cdp('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
        await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
        assert.equal(await evaluate('gameTest.snapshot().paused'),false);
        await evaluate('gameTest.stop()');
        assert.deepEqual(errors,[]);
        console.log('Popup checks passed: intro (longest text), pause, win and lose at six viewports, live resize, uniform scale, centering, bounds and real resume click after resize.');
        await send('Browser.close');
        return;
    }
    await evaluate('gameTest.start();gameTest.configure({coloredBug_red:1,coloredBug_yellow:1,coloredBug_purple:1,coloredBug_green:1});gameTest.render()');
    const musicVolume = await evaluate('gameTest.musicVolume()');
    for (const color of ['red','yellow','purple','green']) {
        await evaluate(`gameTest.hold('${color}')`);
        assert.equal(await evaluate('gameTest.musicVolume()'),musicVolume);
        await evaluate(`gameTest.release('${color}')`);
        assert.equal(await evaluate('gameTest.musicVolume()'),musicVolume);
    }
    const capture=async name=>{const {data}=await cdp('Page.captureScreenshot',{format:'png'});fs.mkdirSync(path.join(root,'tests/artifacts'),{recursive:true});fs.writeFileSync(path.join(root,'tests/artifacts',name),Buffer.from(data,'base64'));};
    await capture('gameplay-1920.png');
    const check=async (expression,expected)=>assert.deepEqual(await evaluate(expression),expected,expression);
    await check('gameTest.ui.scene.children.filter(c=>c.name?.startsWith("colorButton_")).length',4);
    await check('gameTest.indicators()', {slices:8,timeFresh:7});
    await evaluate('gameTest.spawn("coloredBug_red");gameTest.spawn("coloredBug_yellow");gameTest.hold("red")');
    await check('gameTest.objects.map(o=>o.highlight.visible)',[true,false]);
    await evaluate('gameTest.release("red")');
    await check('gameTest.objects.map(o=>o.highlight.visible)',[false,false]);
    await evaluate('gameTest.configure({coloredBug_red:1,coloredBug_yellow:1,coloredBug_purple:1,coloredBug_green:1})');
    for(const color of ['red','yellow','purple','green']) {
        await evaluate(`gameTest.spawn('coloredBug_${color}'); gameTest.hold('${color}'); gameTest.hit(); gameTest.release('${color}');`);
        const pose = await evaluate('gameTest.objects.map(o=>({x:o.x,y:o.y,hop:o.hop.y,alpha:o.alpha,scale:o.body.scale.x}))');
        await check('gameTest.objects[0].alpha',0.3);
        await check('gameTest.ui.effects.children.some(e=>e.name==="colorHit")',true);
        await check('gameTest.objects[0].interactive',false);
        const scoreBeforeRepeat = await evaluate('gameTest.snapshot().score');
        await evaluate('gameTest.hit();gameTest.step(499)');
        assert.deepEqual(await evaluate('gameTest.objects.map(o=>({x:o.x,y:o.y,hop:o.hop.y,alpha:o.alpha,scale:o.body.scale.x}))'),pose);
        await check('gameTest.snapshot().score',scoreBeforeRepeat);
        await evaluate('gameTest.step(1)');
        await check('gameTest.objects.length',0);
    }
    await evaluate("gameTest.spawn('bug');gameTest.atFood();gameTest.hit();gameTest.step(500)");
    await check('gameTest.snapshot().life',8);
    await evaluate("gameTest.spawn('bug');gameTest.atFood();gameTest.step(399)");
    await check('gameTest.snapshot().life',8);
    await evaluate('gameTest.step(1);gameTest.step(1000)');
    await check('gameTest.snapshot().life',7);
    await evaluate("gameTest.spawn('bomb');gameTest.atFood();gameTest.step(500)");
    await check('gameTest.snapshot().life',7);
    await evaluate("gameTest.spawn('bomb');gameTest.hit()");
    await check('gameTest.snapshot().life',7);
    await check('Math.abs(gameTest.objects[0].hitArea.radius - 58) < 0.00001',true);
    await check('!!gameTest.ui.effects.getChildByName("bombExplosion")',false);
    await evaluate('gameTest.hit();gameTest.step(449)');
    await check('gameTest.snapshot().life',7);
    await evaluate('gameTest.step(1)');
    await check('gameTest.ui.effects.getChildByName("bombExplosion").animationFrames.length',17);
    await evaluate('gameTest.step(200)');
    await check('gameTest.ui.effects.getChildByName("bombExplosion").texture === gameTest.ui.effects.getChildByName("bombExplosion").animationFrames[2]',true);
    await check('gameTest.indicators().slices',6);
    await evaluate('gameTest.step(300)');
    await check('gameTest.snapshot().life',6);
    await evaluate("gameTest.spawn('fatColoredBug_red');gameTest.hold('red');gameTest.hit();gameTest.hit()");
    await check('gameTest.objects[0].state === "resolved"',false);
    await evaluate("gameTest.hit();gameTest.release('red');gameTest.step(500)");
    await check('gameTest.objects.length',0);
    await evaluate("gameTest.spawn('bug');gameTest.atFood();gameTest.pause()");
    await check('Math.abs(gameTest.objects[0].hitArea.radius - 66.7) < 0.00001',true);
    const paused=await evaluate('gameTest.snapshot()');
    await evaluate('gameTest.step(10000)');
    assert.deepEqual(await evaluate('gameTest.snapshot()'),paused);
    await evaluate('gameTest.resume();gameTest.step(400)');
    await check('gameTest.snapshot().life',5);
    // Existing special bugs retain their effects and use paused game time.
    await evaluate("gameTest.spawn('healer');gameTest.hit();gameTest.step(200)");
    await check('gameTest.snapshot().life',6);
    await evaluate("gameTest.spawn('frozen');gameTest.hit();gameTest.step(200);gameTest.spawn('bug')");
    await check('gameTest.objects[0].state === "resolved"',false);
    await check('gameTest.ui.foodAccent.geometry.graphicsData.length > 0',true);
    await evaluate('gameTest.pause()');
    const frozenPause=await evaluate('gameTest.snapshot()');
    await evaluate('gameTest.step(7000)');
    assert.deepEqual(await evaluate('gameTest.snapshot()'),frozenPause);
    await evaluate('gameTest.resume();gameTest.stopSpawns();gameTest.hit();gameTest.step(500)');
    await evaluate("gameTest.spawn('chameleon');gameTest.hit();gameTest.step(200);gameTest.spawn('coloredBug_purple');gameTest.hit();gameTest.step(500)");
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
    await cdp('Emulation.setUserAgentOverride',{userAgent:'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36'});
    await cdp('Emulation.setDeviceMetricsOverride',{width:540,height:960,deviceScaleFactor:1,mobile:true});
    await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
    await check('!!document.getElementById("mobile-orientation-overlay")',true);
    const portrait=await evaluate('gameTest.snapshot()');
    await evaluate('gameTest.step(5000)');
    await check('gameTest.snapshot().time',portrait.time);
    await cdp('Emulation.setUserAgentOverride',{userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36'});
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
