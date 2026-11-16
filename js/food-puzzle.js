import { FOOD_TYPES } from './food-config.js';
import { readFoodProgress, placeFoodPiece } from './food-progress.js';
import { fitDishIcon } from './dish-select.js';
import { HEADING_FONT } from './typography.js';

export function createFoodPuzzle(textures, foodId, { onClose, onSelect }) {
    const food = FOOD_TYPES[foodId], root = new PIXI.Container();
    root.name = 'foodPuzzle';
    const shade = new PIXI.Graphics(); root.addChild(shade); shade.interactive = true;
    const panel = new PIXI.Container(); root.addChild(panel);
    panel.addChild(new PIXI.Graphics().lineStyle(6, 0x2D1738).beginFill(0xF7F7F3).drawRoundedRect(0, 0, 1060, 900, 32).endFill());
    const label = (text, x, y, size = 30) => {
        const t = new PIXI.Text(text, { fontFamily: HEADING_FONT, fontSize: size, fill: 0x2D1738, align: 'center', wordWrap: true, wordWrapWidth: 980 });
        t.anchor.set(.5); t.position.set(x, y); panel.addChild(t); return t;
    };
    const title = label(`Собери: ${food.name}`, 530, 58, 42);
    const hint = label('Перетаскивай кусочки на тарелку\nИли нажми на кусочек, затем на его место', 530, 128, 25);
    const count = label('', 530, 735);
    function button(text, x, callback, coral = false) {
        const b = new PIXI.Container(); b.position.set(x, 800); b.interactive = b.buttonMode = true;
        b.addChild(new PIXI.Graphics().lineStyle(4, 0x2D1738).beginFill(coral ? 0xF45D53 : 0x30D5C1).drawRoundedRect(0, 0, 440, 65, 20).endFill());
        const t = new PIXI.Text(text, {fontFamily: HEADING_FONT, fontSize: 28, fill: 0x2D1738}); t.anchor.set(.5);t.position.set(220,32);b.addChild(t);
        b.on('pointertap', callback); panel.addChild(b);return b;
    }
    button('К блюдам', 60, onClose);
    const choose = button('Выбрать блюдо', 560, () => onSelect(foodId), true);
    const close = label('×', 1010, 48, 46); close.interactive = close.buttonMode = true; close.on('pointertap', onClose);
    const plate = new PIXI.Container(); plate.position.set(10, 180); plate.scale.set(.83); panel.addChild(plate);
    const plateImage = new PIXI.Sprite(textures.gameplay_plate); plateImage.width = plateImage.height = 640;plate.addChild(plateImage);
    const tray = new PIXI.Container(); tray.name='puzzleTray'; panel.addChild(tray);
    // Shuffle once per opening; selecting or placing a piece keeps the remaining order stable.
    const placed = readFoodProgress().foods[foodId].placed;
    const trayPieces = food.puzzlePieces.filter(piece => !placed.includes(piece.id));
    const originalOrder = [...trayPieces];
    for (let i = trayPieces.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [trayPieces[i], trayPieces[j]] = [trayPieces[j], trayPieces[i]];
    }
    if (trayPieces.length > 1 && trayPieces.every((piece, i) => piece === originalOrder[i])) {
        trayPieces.push(trayPieces.shift());
    }
    plate.name='puzzlePlate';panel.name='puzzlePanel';
    let selected = null, drag = null;
    const masks = new Map(), slices = new Map();
    for (const p of food.puzzlePieces) {
        const texture = textures[p.texture];
        const s = new PIXI.Sprite(texture);s.position.set(p.target.x,p.target.y);s.width=p.target.width;s.height=p.target.height;plate.addChild(s);slices.set(p.id,s);
        const canvas=document.createElement('canvas');canvas.width=texture.width;canvas.height=texture.height;
        const ctx=canvas.getContext('2d');ctx.drawImage(texture.baseTexture.resource.source,0,0);
        masks.set(p.id,{data:ctx.getImageData(0,0,canvas.width,canvas.height).data,w:canvas.width,h:canvas.height});
    }
    const ghost = new PIXI.Sprite();ghost.visible=false;ghost.alpha=.8;panel.addChild(ghost);
    function matches(id, global) {
        const local=plate.toLocal(global);
        // Layers snap into place anywhere on the plate; placement still enforces assemblyOrder.
        if(food.geometry==='layers')return Math.hypot(local.x-320,local.y-320)<=300;
        const p=food.puzzlePieces.find(p=>p.id===id), mask=masks.get(id);
        const x=Math.floor((local.x-p.target.x)/p.target.width*mask.w), y=Math.floor((local.y-p.target.y)/p.target.height*mask.h);
        // A small tolerance makes the real image silhouette easier to hit.
        for(let dy=-8;dy<=8;dy+=4)for(let dx=-8;dx<=8;dx+=4){const px=x+dx,py=y+dy;if(px>=0&&py>=0&&px<mask.w&&py<mask.h&&mask.data[(py*mask.w+px)*4+3]>24)return true;}
        return false;
    }
    function place(global) {
        if(selected && matches(selected,global) && placeFoodPiece(foodId,selected)){selected=null;refresh();}
    }
    plate.interactive=true;plate.hitArea=new PIXI.Rectangle(0,0,640,640);
    plate.on('pointertap',e=>place(e.data.global));
    root.interactive=true;
    root.on('pointermove',e=>{
        if(!drag || drag.pointer!==e.data.pointerId)return;
        const local=panel.toLocal(e.data.global);
        if(Math.hypot(local.x-drag.x,local.y-drag.y)>8)drag.moved=true;
        if(drag.moved){ghost.visible=true;ghost.position.set(local.x-90,local.y-90);}
    });
    const release=e=>{if(!drag || drag.pointer!==e.data.pointerId)return;if(drag.moved)place(e.data.global);drag=null;ghost.visible=false;};
    root.on('pointerup',release);root.on('pointerupoutside',release);root.on('pointercancel',()=>{drag=null;ghost.visible=false;});
    function refresh() {
        const progress=readFoodProgress().foods[foodId];
        count.text=`На тарелке: ${progress.placed.length}/${food.maxLives}`;
        choose.visible=progress.completed;
        for(const [id,s] of slices)s.alpha=progress.placed.includes(id)?1:.12;
        for(const child of tray.removeChildren())child.destroy({children:true});
        trayPieces.filter(p=>!progress.placed.includes(p.id)).forEach((p,i)=>{
            const b=new PIXI.Container();b.position.set(570+(i%3)*150,190+Math.floor(i/3)*125);b.interactive=b.buttonMode=true;b.hitArea=new PIXI.Rectangle(0,0,140,115);
            const active=selected===p.id;
            b.addChild(new PIXI.Graphics().lineStyle(active?5:2,active?0xF45D53:0x2D1738).beginFill(0xFFFFFF).drawRoundedRect(0,0,140,115,16).endFill());
            const s=new PIXI.Sprite(textures[p.texture]);fitDishIcon(s,[10,10,120,95]);b.addChild(s);
            b.name=p.id;
            b.on('pointerdown',e=>{selected=p.id;const local=panel.toLocal(e.data.global);drag={pointer:e.data.pointerId,x:local.x,y:local.y,moved:false};ghost.texture=textures[p.texture];ghost.width=ghost.height=180;for(const item of tray.children)item.alpha=item===b?1:.65;});
            tray.addChild(b);
        });
        if(progress.completed){title.text=`${food.name}: готово!`;hint.text='Теперь блюдо можно выбирать для уровней';if(typeof gsap!=='undefined')gsap.fromTo(plate.scale,{x:.79,y:.79},{x:.83,y:.83,duration:.35});}
        else if(food.geometry==='layers')hint.text='Перетаскивай слои по порядку в любую часть тарелки\nИли нажми на слой, затем на тарелку';
    }
    root.fit=({width,height})=>{shade.clear().beginFill(0x2D1738,.65).drawRect(0,0,width,height).endFill();const scale=Math.min(width/1100,height/940);panel.scale.set(scale);panel.position.set((width-1060*scale)/2,(height-900*scale)/2);};
    const destroy=root.destroy.bind(root);root.destroy=()=>{if(typeof gsap!=='undefined')gsap.killTweensOf(plate.scale);destroy({children:true});};
    refresh();return root;
}
