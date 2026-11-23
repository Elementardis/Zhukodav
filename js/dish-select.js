import { t } from './i18n.js';
import { readFoodProgress, prepareFoodTest } from './food-progress.js';
import { FOOD_TEST_MODE } from './food-test-config.js';
import { createFoodPuzzle } from './food-puzzle.js';
import { FOOD_TYPES, isFoodUnlocked, describeFoodEffects } from './food-config.js';
import { HOME_LAYOUT, layoutHomeScreen } from './home-ui.js';
import { HEADING_FONT } from './typography.js';

export const DISH_IDS = { pizza: 'pizza', pie: 'pie', cake: 'cake', bundt: 'bundt_cake', salad: 'greek_salad', dressed_herring: 'dressed_herring' };
export function canSelectDish(id, completedLevels = []) {
    if (id === 'pizza') return true;
    return isFoodUnlocked(FOOD_TYPES[id], readFoodProgress());
}
export function normalizeDish(id, completedLevels = []) {
    const internal = DISH_IDS[id] || id;
    return canSelectDish(internal, completedLevels) ? internal : 'pizza';
}
export const DISH_ASSETS = [
    ...Object.keys(DISH_IDS).map(id => ({ name: `dish_${id}`, path: `images/dishes/icons/${id}_icon.png`, optional: true })),
    ...['card','lock','check','heart','back_arrow','back_button'].map(id => ({ name: `dish_${id}`, path: `images/dishes/ui/${id}.svg`, optional: true })),
    { name: 'dish_layout', path: 'images/dishes/layout.json', dataResource: true }
];
const boundsCache = new WeakMap();
function alphaBounds(texture) {
    if (boundsCache.has(texture)) return boundsCache.get(texture);
    const source = texture.baseTexture.resource.source;
    const canvas = document.createElement('canvas'); canvas.width = texture.width; canvas.height = texture.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(source, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let left=canvas.width, top=canvas.height, right=0, bottom=0;
    for(let y=0;y<canvas.height;y++) for(let x=0;x<canvas.width;x++) if(data[(y*canvas.width+x)*4+3]>16){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
    const bounds = right>left ? {x:left,y:top,w:right-left+1,h:bottom-top+1} : {x:0,y:0,w:canvas.width,h:canvas.height};
    boundsCache.set(texture,bounds); return bounds;
}
export function fitDishIcon(sprite, rect, bottomAligned = false) {
    const b=alphaBounds(sprite.texture), [x,y,w,h]=rect;
    const scale=Math.min(w/b.w,h/b.h);
    sprite.scale.set(scale); sprite.position.set(x+w/2-(b.x+b.w/2)*scale,bottomAligned ? y+h-(b.y+b.h)*scale : y+h/2-(b.y+b.h/2)*scale);
}
export function createDishSelect(textures, layout, { getSelected, getCompletedLevels, onSelect, onBack }) {
    const scene=new PIXI.Container(); scene.name='dishSelect';
    let puzzle=null;
    const closePuzzle=()=>{puzzle?.destroy();puzzle=null;scene.refresh();};
    const openPuzzle=id=>{if(puzzle)return;puzzle=createFoodPuzzle(textures,id,{onClose:closePuzzle,onSelect:id=>{onSelect(id);closePuzzle();}});scene.addChild(puzzle);puzzle.fit(scene.logicalSize || {width:1920,height:1080});};
    const filters=[]; const buttons=[];
    const sprite=(key,rect) => {
        if (!textures[key]?.valid) return new PIXI.Container();
        const s=new PIXI.Sprite(textures[key]); s.position.set(rect[0],rect[1]);s.width=rect[2];s.height=rect[3];return s;
    };
    for(const l of HOME_LAYOUT.layers.filter(l=>['01_background','02_decor','05_table'].includes(l.name))) {const s=sprite(`home_${l.name}`,[l.x,l.y,l.width,l.height]);s.name=l.name;scene.addChild(s);}
    const label=(value,rect,size)=>{
        const t=new PIXI.Text(value,{fontFamily:HEADING_FONT,fontWeight:'bold',fontSize:size,fill:0x2D1738,align:'center',wordWrap:true,wordWrapWidth:rect[2],breakWords:true});
        t.resolution=2;t.anchor.set(0.5);t.scale.set(Math.min(1,rect[2]/t.width,rect[3]/t.height));t.position.set(rect[0]+rect[2]/2,rect[1]+rect[3]/2);return t;
    };
    const surface=(key,rect)=>{
        if(textures[key]?.valid)return sprite(key,rect);
        const g=new PIXI.Graphics().lineStyle(5,0x2D1738).beginFill(key==='result_button_primary'?0x30D5C1:0xF7F7F3).drawRoundedRect(rect[0],rect[1],rect[2],rect[3],26).endFill();return g;
    };
    const button=(host,name,text,rect,key,callback)=>{
        const b=new PIXI.Container();b.name=name;b.position.set(rect[0]+rect[2]/2,rect[1]+rect[3]/2);b.pivot.set(rect[2]/2,rect[3]/2);
        b.interactive=b.buttonMode=true;b.interactiveChildren=false;b.hitArea=new PIXI.Rectangle(0,0,rect[2],rect[3]);
        b.addChild(surface(key,[0,0,rect[2],rect[3]]),label(text,[10,5,rect[2]-20,rect[3]-10],30));
        b.on('pointerover',()=>b.scale.set(1.025));b.on('pointerdown',()=>b.scale.set(0.97));
        for(const e of ['pointerout','pointerup','pointerupoutside','pointercancel'])b.on(e,()=>b.scale.set(1));
        b.on('pointertap',()=>{if(scene.parent)callback();});buttons.push(b);host.addChild(b);return b;
    };
    const heading=label(FOOD_TEST_MODE?t('dish_select.001'):t('dish_select.002'),layout.headerRect,layout.fontSizes.header);scene.addChild(heading);
    const back=button(scene,'dishBack',t('dish_select.003'),[...layout.backRect],'dish_back_button',onBack);
    back.addChild(sprite('dish_back_arrow',[15,30,40,40]));
    const cards=[];
    for(const [i,dish] of layout.dishes.entries()){
        const id=DISH_IDS[dish.id], card=new PIXI.Container(); card.name=`dishCard_${id}`;
        card.position.set(layout.grid.start[0]+i%3*(528+28),layout.grid.start[1]+Math.floor(i/3)*(430+25));
        card.addChild(surface('dish_card',[0,0,528,430]));
        const accent=new PIXI.Graphics().lineStyle(7,0x30D5C1).drawRoundedRect(8,8,510,410,30);card.addChild(accent);
        card.addChild(label(FOOD_TYPES[id].name,layout.localCard.nameRect,34));
        let icon=null, filter=null;
        if(textures[`dish_${dish.id}`]?.valid){icon=new PIXI.Sprite(textures[`dish_${dish.id}`]);fitDishIcon(icon,layout.localCard.iconRect);filter=new PIXI.filters.ColorMatrixFilter();filter.desaturate();filters.push(filter);card.addChild(icon);}
        const health=new PIXI.Container();health.addChild(sprite('dish_heart',[110,248,30,26]),label(t('dish_select.004', { p0: (FOOD_TYPES[id].pieces) }),layout.localCard.healthRect,28));card.addChild(health);
        const effect=label(describeFoodEffects(id),[28,276,472,40],20);card.addChild(effect);
        const lock=sprite('dish_lock',layout.localCard.lockRect);card.addChild(lock);
        const unlock=label('',[30,280,468,32],24);unlock.name='unlockLabel';card.addChild(unlock);
        const selected=new PIXI.Container();selected.addChild(label(t('dish_select.005'),[110,318,320,84],34),sprite('dish_check',[75,340,45,40]));card.addChild(selected);
        const select=button(card,`select_${id}`,t('dish_select.006'),layout.localCard.buttonRect,'result_button_primary',()=>{
            if(!canSelectDish(id,getCompletedLevels())){if(readFoodProgress().foods[id].collected.length===FOOD_TYPES[id].maxLives)openPuzzle(id);return;}
            onSelect(id);scene.refresh();
        });
        const bar=new PIXI.Graphics();card.addChild(bar);
        if(FOOD_TEST_MODE && !FOOD_TYPES[id].starter){
            if(icon)fitDishIcon(icon,[60,60,408,125]);
            button(card,`testFood_${id}`,t('dish_select.007'),[94,190,340,50],'test_button',()=>{
                if(!prepareFoodTest(id))return;
                if(getSelected()===id)onSelect('pizza');
                scene.refresh();openPuzzle(id);
            });
        }
        cards.push({id,card,accent,health,effect,lock,unlock,selected,select,icon,filter,bar});scene.addChild(card);
    }
    scene.refresh=()=>{for(const c of cards){const open=canSelectDish(c.id,getCompletedLevels()), chosen=open&&getSelected()===c.id;
        c.accent.visible=c.selected.visible=chosen;c.accent.tint=0xFFFFFF;c.health.visible=true;c.effect.visible=open;c.lock.visible=false;c.unlock.visible=!open;
        const progress=readFoodProgress().foods[c.id],total=FOOD_TYPES[c.id].maxLives,ready=progress.collected.length===total;
        c.unlock.text=ready?t('dish_select.008'):t('dish.remaining', {collected: progress.collected.length, total});
        c.bar.clear();if(!open)c.bar.beginFill(0x2D1738,.15).drawRoundedRect(90,310,348,5,2).endFill().beginFill(0x30D5C1).drawRoundedRect(90,310,348*progress.collected.length/total,5,2).endFill();
        const caption=c.select.children[1];caption.text=open?t('dish_select.010'):progress.placed.length?t('dish_select.011'):t('dish_select.012');
        caption.scale.set(Math.min(1,280/caption.texture.width));
        // Draw the brand color directly: tint multiplies the turquoise texture into dark brown.
        if(c.select._assemblyStyle!==!open){
            c.select._assemblyStyle=!open;
            c.select.removeChildAt(0).destroy();
            const [, , w,h]=layout.localCard.buttonRect;
            const background=open?surface('result_button_primary',[0,0,w,h]):new PIXI.Graphics()
                .beginFill(0x2D1738).drawRoundedRect(0,6,w,h-6,26).endFill()
                .lineStyle(5,0x2D1738).beginFill(0xF45D53).drawRoundedRect(3,3,w-6,h-12,24).endFill();
            c.select.addChildAt(background,0);
        }
        c.select.visible=c.select.interactive=(open||ready)&&!chosen;
        if(c.icon){c.icon.filters=open||ready?null:[c.filter];c.icon.alpha=open||ready?1:0.35;}
    }};
    scene.focus=id=>{const c=cards.find(c=>c.id===id);if(c){c.accent.visible=true;c.accent.tint=0xF45D53;}};
    scene.refresh();scene.fit=viewport=>{
        const portrait=viewport.width<viewport.height;
        scene.logicalSize=portrait?{width:1140,height:1680}:{width:1920,height:1080};
        cards.forEach((c,i)=>c.card.position.set(portrait?28+i%2*556:140+i%3*556,portrait?280+Math.floor(i/2)*455:145+Math.floor(i/3)*455));
        heading.position.set(portrait?570:1040,portrait?190:66);
        back.position.set(portrait?178:190,74);
        layoutHomeScreen(scene,viewport);puzzle?.fit(scene.logicalSize);
    };
    const destroy=scene.destroy.bind(scene);scene.destroy=()=>{puzzle?.destroy();buttons.forEach(b=>gsap.killTweensOf(b.scale));cards.forEach(c=>{if(c.icon)c.icon.filters=null;});filters.forEach(f=>f.destroy());destroy({children:true});};
    return scene;
}
