import { FOOD_TYPES } from './food-config.js';
import { HEADING_FONT } from './typography.js';
import { popupSurface } from './intro-popup.js';
import { fitDishIcon } from './dish-select.js';

const PLUM = 0x2D1738;
export function createWinPopup(textures, { hasNext, onMenu, onPrimary, theme, reward, onDishes }) {
    const popup = new PIXI.Container(); popup.name = 'winPopup'; popup.interactive = true;
    let activated = false, portrait = null;
    // Prefer the completed set when a level awards pieces for several dishes.
    const item = reward?.received.find(r => r.ready) || reward?.received.at(-1);
    const food = FOOD_TYPES[item?.foodId];
    const total = food?.maxLives || 0, collected = Math.max(0, Math.min(total, item?.count || 0));
    const ready = !!item?.ready;
    const action = callback => () => { if (activated || popup.destroyed) return; activated = true; callback(); };
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
        const narrow=viewport.width/viewport.height<.8;
        if(portrait===narrow)return;portrait=narrow;
        for(const child of popup.removeChildren())child.destroy({children:true});
        const w=narrow?740:1140,h=narrow?1210:850;
        popup._popupLayout={width:w,height:h,reference:{width:narrow?780:1400,height:narrow?1250:1000}};
        popup.hitArea=new PIXI.Rectangle(0,0,w,h);
        popup.addChild(popupSurface(textures,'panel',[0,0,w,h],theme));
        text(ready?'НОВОЕ БЛЮДО ГОТОВО!':'Ура! Вкуснятина!','winTitle',[40,22,w-80,90],ready?60:76,{fill:0xF45D53,stroke:PLUM,strokeThickness:4,
            dropShadow:true,dropShadowColor:PLUM,dropShadowDistance:4,dropShadowAngle:Math.PI/3,dropShadowBlur:0});
        const mascotRect=narrow?[195,130,350,350]:[38,140,500,530];
        const mascotTexture=ready?textures.result_mascot_happy:textures.result_mascot;
        if(mascotTexture?.valid){
            const mascot=new PIXI.Sprite(mascotTexture);mascot.name='winMascot';
            const [x,y,mw,mh]=mascotRect;mascot.scale.set(mw/mascot.texture.width);mascot.position.set(x,y);
            const mask=new PIXI.Graphics().beginFill(0xFFFFFF).drawRect(x,y,mw,mh).endFill();popup.addChild(mascot,mask);mascot.mask=mask;
        } else text(`Не найден ${ready?'mascot_loves_pizza':'mascot_show_pizza'}.png`,'missingMascot',mascotRect,26);
        const [cx,cy,cw,ch]=narrow?[55,490,630,475]:[570,140,510,530];
        const card=new PIXI.Graphics().lineStyle(4,PLUM).beginFill(0xEDE5F3).drawRoundedRect(cx,cy,cw,ch,30).endFill();card.name='rewardCard';popup.addChild(card);
        if(food){
            if(textures[food.wholeIcon]?.valid){const icon=new PIXI.Sprite(textures[food.wholeIcon]);icon.name='rewardWholeDish';fitDishIcon(icon,[cx+30,cy+18,cw-60,ch*.48]);popup.addChild(icon);}
            else text(`Нет изображения: ${food.name}`,'missingDish',[cx+25,cy+20,cw-50,ch*.48],28);
            text(ready?'Все кусочки найдены!':`Собираем ${food.collectingName}`,'rewardName',[cx+20,cy+ch*.53,cw-40,55],38);
            text(ready?`${collected}/${total} — собери ${food.collectingName}!`:`Найдено ${collected}/${total} кусочков`,'rewardCount',[cx+20,cy+ch*.65,cw-40,44],32);
            const bx=cx+40,by=cy+ch*.77,bw=cw-80,bh=26;
            const track=new PIXI.Graphics().beginFill(0xCDBFD9).drawRoundedRect(bx,by,bw,bh,13).endFill();popup.addChild(track);
            const fill=new PIXI.Graphics().beginFill(0x30D5C1).drawRoundedRect(bx,by,bw*collected/total,bh,Math.min(13,bw*collected/total/2)).endFill();fill.name='rewardProgress';
            popup.addChild(fill);
            popup.rewardProgress={collected,total,ratio:collected/total};
        }else text(reward?.repeated?'Награда уже получена':'Обед спасён!','rewardStatus',[cx+30,cy+60,cw-60,ch*.6],42);
        const link=text('К блюдам ›','resultDishes',[cx+25,cy+ch*.85,cw-50,60],34);link.interactive=link.buttonMode=true;
        link.hitArea=new PIXI.Rectangle(-link.width/2,-30,link.width,60);
        link.on('pointerover',()=>link.tint=0xF45D53);link.on('pointerout',()=>link.tint=0xFFFFFF);link.on('pointerdown',()=>link.alpha=.7);link.on('pointerup',()=>link.alpha=1);
        link.on('pointertap',action(()=>onDishes(food?.id)));
        const main=ready?'СОБРАТЬ БЛЮДО':hasNext?(narrow?'СЛЕДУЮЩИЙ УРОВЕНЬ':'СЛЕДУЮЩИЙ\nУРОВЕНЬ'):'ВЫБОР УРОВНЯ';
        button('resultMenu',narrow?[55,990,630,85]:[50,700,500,116],'В ГЛАВНОЕ МЕНЮ','home',false,onMenu);
        button('resultPrimary',narrow?[55,1090,630,85]:[590,700,500,116],main,'next',true,onPrimary);
    };
    popup.reflow({width:1920,height:1080});return popup;
}
