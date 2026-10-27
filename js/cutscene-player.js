import { cutscenes } from '../cutscenes.js';
import { HEADING_FONT } from './typography.js';
import { safeViewport } from './adaptive-background.js';
import { popupSurface } from './intro-popup.js';
import { fitDishIcon } from './dish-select.js';

export const CUTSCENE_STORAGE_KEY = 'zhukodav.cutscenes.v1';
function seenScenes() {
    try { const ids=JSON.parse(localStorage.getItem(CUTSCENE_STORAGE_KEY)||'[]');return Array.isArray(ids)?ids:[]; } catch { return []; }
}
export function matchingCutscenes(levelId, when, won, config = cutscenes) {
    const seen=seenScenes();
    return config.filter(s=>s.levelId===levelId && s.when===when &&
        (when!=='afterLevel'||s.outcome==='any'||s.outcome===(won?'win':'lose')) &&
        (s.repeat!=='once'||!seen.includes(s.id)) && Array.isArray(s.frames) && s.frames.length);
}
const images = new Map();
function loadImage(path) {
    if (!path) return Promise.resolve(null);
    if (!images.has(path)) images.set(path, new Promise(resolve=>{
        const image=new Image(); image.onload=()=>resolve(PIXI.Texture.from(image)); image.onerror=()=>resolve(null);image.src=path;
    }));
    return images.get(path);
}

export function playCutscenes({ scenes, host, app, textures, theme, onComplete }) {
    let disposed=false, sceneIndex=0, frameIndex=0, revision=0, lastTap=-Infinity, currentImage=null;
    const root=new PIXI.Container();root.name='cutscene';root.interactive=true;
    const room=new PIXI.Sprite(textures.home_01_background);room.anchor.set(0.5);root.addChild(room);
    const content=new PIXI.Container();content.name='cutsceneContent';root.addChild(content);
    const art=(texture,x,y,w,h)=>{const s=new PIXI.Sprite(texture);s.position.set(x,y);s.width=w;s.height=h;content.addChild(s);return s;};
    art(textures.home_02_decor,65,0,1635,430);
    const character=new PIXI.Container();content.addChild(character);
    art(textures.home_05_table,248,100,1672,904);
    if(textures.dish_pizza?.valid){const pizza=new PIXI.Sprite(textures.dish_pizza);fitDishIcon(pizza,[1210,570,260,210],true);content.addChild(pizza);}
    const panel=new PIXI.Graphics();panel.beginFill(0x2D1738).drawRoundedRect(68,802,1800,230,38).endFill();
    panel.lineStyle(6,0x2D1738).beginFill(0xF7F7F3).drawRoundedRect(60,790,1800,230,38).endFill();content.addChild(panel);
    const text=new PIXI.Text('',{fontFamily:HEADING_FONT,fontWeight:'bold',fontSize:42,lineHeight:52,fill:0x2D1738,wordWrap:true,wordWrapWidth:1210,breakWords:true});text.resolution=2;text.position.set(110,830);content.addChild(text);
    const mask=new PIXI.Graphics().beginFill(0xFFFFFF).drawRect(110,825,1230,155).endFill();content.addChild(mask);text.mask=mask;
    const scrollArea=new PIXI.Container();scrollArea.position.set(110,825);scrollArea.interactive=true;scrollArea.hitArea=new PIXI.Rectangle(0,0,1230,155);content.addChild(scrollArea);
    scrollArea.name='cutsceneScroll';
    const track=new PIXI.Graphics();content.addChild(track);
    let scrollY=0, dragY=null;
    const scroll=delta=>{
        const maximum=Math.max(0,text.height-145);scrollY=Math.max(0,Math.min(maximum,scrollY+delta));text.y=830-scrollY;track.clear();
        if(maximum){const h=Math.max(15,145*145/text.height);track.beginFill(0x2D1738,0.5).drawRoundedRect(1335,830+scrollY/maximum*(145-h),4,h,2).endFill();}
    };
    scrollArea.on('pointerdown',e=>{dragY=e.data.getLocalPosition(content).y;});
    scrollArea.on('pointermove',e=>{if(dragY===null)return;const y=e.data.getLocalPosition(content).y;scroll(dragY-y);dragY=y;});
    for(const event of ['pointerup','pointerupoutside','pointercancel'])scrollArea.on(event,()=>{dragY=null;});
    const wheel=e=>{
        if(disposed)return;const rect=app.view.getBoundingClientRect();const p=content.toLocal(new PIXI.Point((e.clientX-rect.left)*app.screen.width/rect.width,(e.clientY-rect.top)*app.screen.height/rect.height));
        if(p.x<110||p.x>1340||p.y<825||p.y>980)return;e.preventDefault();scroll(e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?145:1)/content.scale.y);
    };
    app.view.addEventListener('wheel',wheel,{passive:false});
    const button=new PIXI.Container();button.name='cutsceneNext';button.position.set(1390,834);button.interactive=button.buttonMode=true;button.interactiveChildren=false;button.hitArea=new PIXI.Rectangle(0,0,410,135);
    button.addChild(popupSurface(textures,'button_primary',[0,0,410,135],theme));
    const caption=new PIXI.Text('',{fontFamily:HEADING_FONT,fontWeight:'bold',fontSize:42,lineHeight:46,fill:0x2D1738,align:'center',wordWrap:true,wordWrapWidth:370,breakWords:true});caption.resolution=2;caption.anchor.set(0.5);caption.position.set(205,67);button.addChild(caption);content.addChild(button);
    function resize(){const safe=safeViewport(app.screen),scale=Math.min(safe.width/1920,safe.height/1080);content.scale.set(scale);content.position.set(safe.x+(safe.width-1920*scale)/2,safe.y+(safe.height-1080*scale)/2);room.scale.set(Math.max(app.screen.width/room.texture.width,app.screen.height/room.texture.height));room.position.set(app.screen.width/2,app.screen.height/2);root.hitArea=new PIXI.Rectangle(0,0,app.screen.width,app.screen.height);}
    function showFrame(){
        const frame=scenes[sceneIndex].frames[frameIndex], token=++revision;
        text.text=String(frame.text??'');scrollY=0;scroll(0);
        caption.text=String(frame.buttonText??'Далее');caption.style.fontSize=42;caption.style.lineHeight=46;
        while(caption.height>92&&caption.style.fontSize>24){caption.style.fontSize--;caption.style.lineHeight=caption.style.fontSize*1.1;}
        caption.scale.set(Math.min(1,370/caption.width,104/caption.height));
        if(currentImage===frame.image&&character.children.length)return;
        currentImage=frame.image;
        for(const child of character.removeChildren())child.destroy();
        loadImage(frame.image).then(texture=>{
            if(disposed||token!==revision||!texture)return;
            const sprite=new PIXI.Sprite(texture);sprite.anchor.set(0.5,1);sprite.position.set(810,790);sprite.scale.set(Math.min(850/texture.width,735/texture.height));character.addChild(sprite);
        });
    }
    const destroyRoot=root.destroy.bind(root);
    function dispose(){if(disposed)return;disposed=true;revision++;app.view.removeEventListener('wheel',wheel);gsap.killTweensOf(button.scale);destroyRoot({children:true});}
    root.destroy=dispose;
    button.on('pointertap',()=>{
        const now=performance.now();if(disposed||document.hidden||now-lastTap<350)return;lastTap=now;
        if(++frameIndex>=scenes[sceneIndex].frames.length){
            const scene=scenes[sceneIndex];if(scene.repeat==='once'){try{localStorage.setItem(CUTSCENE_STORAGE_KEY,JSON.stringify([...new Set([...seenScenes(),scene.id])]));}catch{}}
            frameIndex=0;sceneIndex++;
            if(sceneIndex===scenes.length){dispose();onComplete();return;}
        }
        showFrame();
    });
    for(const scene of scenes)for(const frame of scene.frames)loadImage(frame.image);
    host.addChild(root);resize();showFrame();
    return { resize, dispose, root, get frameIndex(){return frameIndex;}, get sceneIndex(){return sceneIndex;}, get text(){return text.text;}, get imageCount(){return character.children.length;}, get scrollY(){return scrollY;} };
}
