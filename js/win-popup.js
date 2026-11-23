import { t } from './i18n.js';
import { FOOD_TYPES } from './food-config.js';
import { HEADING_FONT } from './typography.js';
import { popupSurface } from './intro-popup.js';
import { fitDishIcon } from './dish-select.js';
import { fitPopup } from './popup-layout.js';
import { loadStoryImage } from './story-images.js';

const PLUM = 0x2D1738;
export function createWinPopup(textures, { hasNext, onMenu, onPrimary, theme, reward, onDishes, stories = [], onStorySeen = () => {} }) {
    const popup = new PIXI.Container(); popup.name = 'winPopup'; popup.interactive = true;
    let activated = false, portrait = null, layoutRevision = 0;
    let blockedUntil = performance.now() + 1000, opening = null;
    popup.animateOpen = getViewport => {
        blockedUntil = performance.now() + 1000;
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        popup._appearance = reduced ? 1 : 0.12;
        popup.alpha = reduced ? 1 : 0;
        fitPopup(popup, getViewport());
        opening?.kill();
        opening = gsap.to(popup, { _appearance: 1, alpha: 1, duration: reduced ? 0 : 0.38, ease: 'power3.out',
            onUpdate: () => { if (!popup.destroyed) fitPopup(popup, getViewport()); } });
    };
    const destroy = popup.destroy.bind(popup);
    popup.destroy = (...args) => { opening?.kill(); destroy(...args); };
    let storyIndex=0, lastAction=-Infinity, lastViewport={width:1920,height:1080};
    // Prefer the completed set when a level awards pieces for several dishes.
    const item = reward?.received.find(r => r.ready) || reward?.received.at(-1);
    const food = FOOD_TYPES[item?.foodId];
    const total = food?.maxLives || 0, collected = Math.max(0, Math.min(total, item?.count || 0));
    const ready = !!item?.ready;
    const action = callback => () => {
        if (activated || popup.destroyed || performance.now()<blockedUntil || performance.now()-lastAction<350) return;
        lastAction=performance.now();
        if(stories[storyIndex]){
            onStorySeen(stories[storyIndex]);
            if(storyIndex<stories.length-1){storyIndex++;portrait=null;popup.reflow(lastViewport);return;}
        }
        activated = true; callback();
    };
    function text(value, name, rect, size, style = {}) {
        const t = new PIXI.Text(value, { fontFamily: HEADING_FONT, fontWeight: 'bold', fontSize: size, fill: PLUM,
            align: 'center', wordWrap: true, wordWrapWidth: rect[2], lineJoin: 'round', ...style });
        t.name = name; t.resolution = 2; t.anchor.set(.5);
        t.scale.set(Math.min(1, rect[2] / t.width, rect[3] / t.height));
        t.position.set(rect[0] + rect[2] / 2, rect[1] + rect[3] / 2); popup.addChild(t); return t;
    }
    function button(name, rect, label, icon, primary, callback) {
        const [x,y,w,h] = rect, b = new PIXI.Container(); b.name = name;
        b.position.set(x+w/2,y+h/2);b.pivot.set(w/2,h/2);b.interactive=b.buttonMode=true;b.interactiveChildren=false;
        b.hitArea = new PIXI.Rectangle(0,0,w,h);
        const bg=popupSurface(textures,primary?'button_primary':'button_menu',[0,0,w,h],theme);b.addChild(bg);
        if(textures[`result_${icon}`]?.valid){const s=new PIXI.Sprite(textures[`result_${icon}`]);s.position.set(20,(h-56)/2);s.width=s.height=56;b.addChild(s);}
        const t=text(label,`${name}Label`,[x+86,y+12,w-104,h-30],30);popup.removeChild(t);t.position.set(86+(w-104)/2,12+(h-30)/2);b.addChild(t);
        b.on('pointerover',()=>{bg.tint=0xECE5F2;});b.on('pointerdown',()=>b.scale.set(.97));
        for(const e of ['pointerout','pointerup','pointerupoutside','pointercancel'])b.on(e,()=>{bg.tint=0xFFFFFF;b.scale.set(1);});
        b.on('pointertap',action(callback));popup.addChild(b);
    }
    popup.reflow = viewport => {
        lastViewport=viewport;
        const narrow=viewport.width/viewport.height<.8;
        if(portrait===narrow)return;portrait=narrow;
        const revision = ++layoutRevision;
        for(const child of popup.removeChildren())child.destroy({children:true});
        const extra=stories.length?(narrow?240:190):0;
        const w=narrow?740:1140,h=(narrow?1210:850)+extra;
        popup._popupLayout={width:w,height:h,reference:{width:narrow?780:1400,height:(narrow?1250:1000)+extra}};
        popup.hitArea=new PIXI.Rectangle(0,0,w,h);
        popup.addChild(popupSurface(textures,'panel',[0,0,w,h],theme));
        text(ready?t('win_popup.001'):t('win_popup.002'),'winTitle',[40,22,w-80,90],ready?60:76,{fill:0xF45D53,stroke:PLUM,strokeThickness:4,
            dropShadow:true,dropShadowColor:PLUM,dropShadowDistance:4,dropShadowAngle:Math.PI/3,dropShadowBlur:0});
        const mascotRect=narrow?[195,130,350,350]:[38,140,500,530];
        const mascotTexture=ready?textures.result_mascot_happy:textures.result_mascot;
        if(mascotTexture?.valid){
            const mascot=new PIXI.Sprite(mascotTexture);mascot.name='winMascot';
            const [x,y,mw,mh]=mascotRect;mascot.scale.set(mw/mascot.texture.width);mascot.position.set(x,y);
            const mask=new PIXI.Graphics().beginFill(0xFFFFFF).drawRect(x,y,mw,mh).endFill();popup.addChild(mascot,mask);mascot.mask=mask;
        } else text(t('win_popup.003', { p0: (ready?'mascot_loves_pizza':'mascot_show_pizza') }),'missingMascot',mascotRect,26);
        const storyImage = stories[storyIndex]?.frames[0]?.image;
        if (storyImage) {
            // Capture this layout's sprite: a resize or next line invalidates it.
            const previous = popup.getChildByName('winMascot');
            const currentStoryIndex = storyIndex;
            loadStoryImage(storyImage).then(texture => {
                if (!texture || popup.destroyed || revision !== layoutRevision || storyIndex !== currentStoryIndex ||
                    (previous && (previous.destroyed || previous.parent !== popup))) return;
                const mascot = previous || new PIXI.Sprite(texture);
                if (!previous) { mascot.name = 'winMascot'; popup.addChild(mascot); }
                mascot.texture = texture;
                // Preserve the original waist-up portrait framing for every emotion.
                const [x,y,mw,mh] = mascotRect;
                mascot.scale.set(mw / texture.width);
                mascot.position.set(x,y);
                if (!mascot.mask) {
                    const mask = new PIXI.Graphics().beginFill(0xFFFFFF).drawRect(x,y,mw,mh).endFill();
                    popup.addChild(mask); mascot.mask = mask;
                }
                const missing = popup.getChildByName('missingMascot');
                if (missing) { popup.removeChild(missing); missing.destroy(); }
            });
        }
        const [cx,cy,cw,ch]=narrow?[55,490,630,475]:[570,140,510,530];
        const card=new PIXI.Graphics().lineStyle(4,PLUM).beginFill(0xEDE5F3).drawRoundedRect(cx,cy,cw,ch,30).endFill();card.name='rewardCard';popup.addChild(card);
        if(food){
            if(textures[food.wholeIcon]?.valid){const icon=new PIXI.Sprite(textures[food.wholeIcon]);icon.name='rewardWholeDish';fitDishIcon(icon,[cx+30,cy+18,cw-60,ch*.48]);popup.addChild(icon);}
            else text(t('win_popup.004', { p0: (food.name) }),'missingDish',[cx+25,cy+20,cw-50,ch*.48],28);
            text(ready?t('win_popup.005'):t('win_popup.006', { p0: (food.collectingName) }),'rewardName',[cx+20,cy+ch*.53,cw-40,55],38);
            text(ready?t('win_popup.007', { p0: (collected), p1: (total), p2: (food.collectingName) }):t('win_popup.008', { p0: (collected), p1: (total) }),'rewardCount',[cx+20,cy+ch*.65,cw-40,44],32);
            const bx=cx+40,by=cy+ch*.77,bw=cw-80,bh=26;
            const track=new PIXI.Graphics().beginFill(0xCDBFD9).drawRoundedRect(bx,by,bw,bh,13).endFill();popup.addChild(track);
            const fill=new PIXI.Graphics().beginFill(0x30D5C1).drawRoundedRect(bx,by,bw*collected/total,bh,Math.min(13,bw*collected/total/2)).endFill();fill.name='rewardProgress';
            popup.addChild(fill);
            popup.rewardProgress={collected,total,ratio:collected/total};
        }else text(reward?.repeated?t('win_popup.009'):t('win_popup.010'),'rewardStatus',[cx+30,cy+60,cw-60,ch*.6],42);
        const link=text(t('win_popup.011'),'resultDishes',[cx+25,cy+ch*.85,cw-50,60],34);link.interactive=link.buttonMode=true;
        link.hitArea=new PIXI.Rectangle(-link.width/2,-30,link.width,60);
        link.on('pointerover',()=>link.tint=0xF45D53);link.on('pointerout',()=>link.tint=0xFFFFFF);link.on('pointerdown',()=>link.alpha=.7);link.on('pointerup',()=>link.alpha=1);
        link.on('pointertap',action(()=>onDishes(food?.id)));
        if(stories[storyIndex]){
            const y=narrow?985:690,sh=narrow?220:170;
            const speech=new PIXI.Graphics().lineStyle(3,PLUM).beginFill(0xFFF9EE).drawRoundedRect(50,y,w-100,sh,22).endFill();
            speech.name='victoryStoryPanel';popup.addChild(speech);
            text(stories[storyIndex].frames[0].text,'victoryStory',[75,y+15,w-150,sh-30],narrow?28:30);
        }
        const main=storyIndex<stories.length-1?t('win_popup.012'):ready?t('win_popup.013'):hasNext?(narrow?t('win_popup.014'):t('win_popup.015')):t('win_popup.016');
        button('resultMenu',narrow?[55,990+extra,630,85]:[50,700+extra,500,116],t('win_popup.017'),'home',false,onMenu);
        button('resultPrimary',narrow?[55,1090+extra,630,85]:[590,700+extra,500,116],main,'next',true,onPrimary);
    };
    popup.reflow({width:1920,height:1080});return popup;
}
