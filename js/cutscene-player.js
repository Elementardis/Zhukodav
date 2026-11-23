import { t } from './i18n.js';
import { loadStoryImage as loadImage } from './story-images.js';
export { preloadCutsceneImages } from './story-images.js';
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
export function playCutscenes({ scenes, host, app, textures, theme, onComplete, onSceneComplete = () => {} }) {
    let disposed=false, finishing=false, completionTimer=null, sceneIndex=0, frameIndex=0, revision=0, lastTap=performance.now(), currentImage=null;
    const root=new PIXI.Container();root.name='cutscene';root.interactive=true;
    const room=new PIXI.Sprite(textures.home_01_background);room.anchor.set(0.5);root.addChild(room);
    // Keep the home-screen scale; anchor the cropped asset to the right/bottom edge.
    const table=new PIXI.Sprite(textures.home_05_table);table.name='cutsceneTable';root.addChild(table);
    const content=new PIXI.Container();content.name='cutsceneContent';root.addChild(content);
    const art=(texture,x,y,w,h)=>{const s=new PIXI.Sprite(texture);s.position.set(x,y);s.width=w;s.height=h;content.addChild(s);return s;};
    art(textures.home_02_decor,65,0,1635,430);
    if(textures.dish_pizza?.valid){const pizza=new PIXI.Sprite(textures.dish_pizza);pizza.name='cutscenePizza';fitDishIcon(pizza,[1260,515,380,360],true);content.addChild(pizza);}
    const character=new PIXI.Container();character.name='cutsceneCharacter';content.addChild(character);
    const characterMask=new PIXI.Graphics().beginFill(0xFFFFFF).drawRect(0,0,1920,910).endFill();content.addChild(characterMask);character.mask=characterMask;
    const storyDialogue=scenes.every(scene=>scene.repeat==='story');
    const panelY=storyDialogue?800:880, panelHeight=1060-panelY, textY=panelY+30, textViewHeight=panelHeight-65;
    const panel=new PIXI.Graphics();panel.beginFill(0x2D1738).drawRoundedRect(68,panelY+12,1800,panelHeight,38).endFill();
    panel.lineStyle(6,0x2D1738).beginFill(0xF7F7F3).drawRoundedRect(60,panelY,1800,panelHeight,38).endFill();content.addChild(panel);
    const text=new PIXI.Text('',{fontFamily:HEADING_FONT,fontWeight:'bold',fontSize:42,lineHeight:52,fill:0x2D1738,wordWrap:true,wordWrapWidth:1210,breakWords:true});text.resolution=2;text.position.set(110,textY);content.addChild(text);
    const mask=new PIXI.Graphics().beginFill(0xFFFFFF).drawRect(110,textY-5,1230,textViewHeight+10).endFill();content.addChild(mask);text.mask=mask;
    const scrollArea=new PIXI.Container();scrollArea.position.set(110,textY-5);scrollArea.interactive=true;scrollArea.hitArea=new PIXI.Rectangle(0,0,1230,textViewHeight+10);content.addChild(scrollArea);
    scrollArea.name='cutsceneScroll';
    const track=new PIXI.Graphics();content.addChild(track);
    let scrollY=0, dragY=null;
    const scroll=delta=>{
        const maximum=Math.max(0,text.height-textViewHeight);scrollY=Math.max(0,Math.min(maximum,scrollY+delta));text.y=textY-scrollY;track.clear();
        if(maximum){const h=Math.max(15,textViewHeight*textViewHeight/text.height);track.beginFill(0x2D1738,0.5).drawRoundedRect(1335,textY+scrollY/maximum*(textViewHeight-h),4,h,2).endFill();}
    };
    scrollArea.on('pointerdown',e=>{dragY=e.data.getLocalPosition(content).y;});
    scrollArea.on('pointermove',e=>{if(dragY===null)return;const y=e.data.getLocalPosition(content).y;scroll(dragY-y);dragY=y;});
    for(const event of ['pointerup','pointerupoutside','pointercancel'])scrollArea.on(event,()=>{dragY=null;});
    const wheel=e=>{
        if(disposed)return;const rect=app.view.getBoundingClientRect();const p=content.toLocal(new PIXI.Point((e.clientX-rect.left)*app.screen.width/rect.width,(e.clientY-rect.top)*app.screen.height/rect.height));
        if(p.x<110||p.x>1340||p.y<textY-5||p.y>textY+textViewHeight+5)return;e.preventDefault();scroll(e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?textViewHeight:1)/content.scale.y);
    };
    app.view.addEventListener('wheel',wheel,{passive:false});
    const button=new PIXI.Container();button.name='cutsceneNext';button.position.set(1390,panelY+(panelHeight-135)/2);button.interactive=button.buttonMode=true;button.interactiveChildren=false;button.hitArea=new PIXI.Rectangle(0,0,410,135);
    button.addChild(popupSurface(textures,'button_primary',[0,0,410,135],theme));
    const caption=new PIXI.Text('',{fontFamily:HEADING_FONT,fontWeight:'bold',fontSize:42,lineHeight:46,fill:0x2D1738,align:'center',wordWrap:true,wordWrapWidth:370,breakWords:true});caption.resolution=2;caption.anchor.set(0.5);caption.position.set(205,67);button.addChild(caption);content.addChild(button);
    function resize(){
        const safe=safeViewport(app.screen),scale=Math.min(safe.width/1920,safe.height/1080);
        content.scale.set(scale);content.position.set(safe.x+(safe.width-1920*scale)/2,safe.y+(safe.height-1080*scale)/2);
        room.scale.set(Math.max(app.screen.width/room.texture.width,app.screen.height/room.texture.height));room.position.set(app.screen.width/2,app.screen.height/2);
        table.scale.set(scale);
        table.position.set(app.screen.width-table.texture.width*scale,app.screen.height-table.texture.height*scale);
        root.hitArea=new PIXI.Rectangle(0,0,app.screen.width,app.screen.height);
    }
    function showFrame(){
        const frame=scenes[sceneIndex].frames[frameIndex], token=++revision;
        text.text=String(frame.text??'');scrollY=0;scroll(0);
        caption.text=String(frame.buttonText??t('cutscene_player.001'));caption.style.fontSize=42;caption.style.lineHeight=46;
        while(caption.height>92&&caption.style.fontSize>24){caption.style.fontSize--;caption.style.lineHeight=caption.style.fontSize*1.1;}
        caption.scale.set(Math.min(1,370/caption.width,104/caption.height));
        if(currentImage===frame.image&&character.children.length)return;
        loadImage(frame.image).then(texture=>{
            if(disposed||token!==revision||!texture)return;
            const sprite=new PIXI.Sprite(texture);
            // Fit visible pixels above the dialogue, keeping feet and height stable.
            fitDishIcon(sprite,storyDialogue?[440,20,1040,panelY-40]:[440,20,1040,1050],true);
            for(const child of character.removeChildren())child.destroy();
            character.addChild(sprite);currentImage=frame.image;
        });
    }
    const destroyRoot=root.destroy.bind(root);
    function dispose(){if(disposed)return;disposed=true;clearTimeout(completionTimer);revision++;app.view.removeEventListener('wheel',wheel);gsap.killTweensOf(button.scale);destroyRoot({children:true});}
    root.destroy=dispose;
    button.on('pointertap',event=>{
        event?.stopPropagation?.();
        const now=performance.now();if(disposed||finishing||document.hidden||now-lastTap<350)return;lastTap=now;
        if(++frameIndex>=scenes[sceneIndex].frames.length){
            const scene=scenes[sceneIndex];if(scene.repeat==='once'){try{localStorage.setItem(CUTSCENE_STORAGE_KEY,JSON.stringify([...new Set([...seenScenes(),scene.id])]));}catch{}}
            onSceneComplete(scene);
            frameIndex=0;sceneIndex++;
            if(sceneIndex===scenes.length){finishing=true;completionTimer=setTimeout(()=>{dispose();onComplete();},360);return;}
        }
        showFrame();
    });
    for(const scene of scenes)for(const frame of scene.frames)loadImage(frame.image);
    host.addChild(root);resize();showFrame();
    return { resize, dispose, root, get frameIndex(){return frameIndex;}, get sceneIndex(){return sceneIndex;}, get text(){return text.text;}, get imageCount(){return character.children.length;}, get scrollY(){return scrollY;} };
}
