import { t } from './i18n.js';
// Пример: triggerProgress: 0.5 — подсказка включается на половине пути жука.
// enabled: false отключает обучение. Успешное использование запоминается отдельно
// для каждого цвета инструмента; для повторной проверки удали storageKey в localStorage.
// bugStorageKey хранит освоенные виды; для полного сброса обучения удали оба ключа.
import { BUG_TUTORIALS } from './bug-tutorial-config.js';
export const TOOL_TUTORIAL = Object.freeze({ enabled: true, triggerProgress: 0.5, storageKey: 'zhukodav.toolsLearned.v1', bugStorageKey: 'zhukodav.bugsLearned.v1' });
export function learnedBugs() {
    try {const saved=JSON.parse(localStorage.getItem(TOOL_TUTORIAL.bugStorageKey)||'[]');return Array.isArray(saved)?saved:[];}catch{return [];}
}
export function markBugLearned(type) {
    localStorage.setItem(TOOL_TUTORIAL.bugStorageKey,JSON.stringify([...new Set([...learnedBugs(),type])]));
}
export function learnedTools() {
    try { const saved=JSON.parse(localStorage.getItem(TOOL_TUTORIAL.storageKey)||'[]');return Array.isArray(saved)?saved:[]; } catch { return []; }
}
export function markToolLearned(color) {
    localStorage.setItem(TOOL_TUTORIAL.storageKey,JSON.stringify([...new Set([...learnedTools(),color])]));
}
export function tutorialColor(obj) {
    return /^(coloredBug|fatColoredBug)_/.test(obj.type) ? obj.type.split('_')[1] : null;
}
export function needsToolTutorial(obj, immediate = false) {
    const color=tutorialColor(obj);
    const legacyLearned=obj.type.startsWith('coloredBug_') && learnedTools().includes(color);
    if(!TOOL_TUTORIAL.enabled || !BUG_TUTORIALS[obj.type] || learnedBugs().includes(obj.type) || legacyLearned || obj.state==='resolved' || obj.bombTriggered || !obj.approachDistance)return false;
    return immediate || Math.hypot(obj.targetX-obj.x,obj.targetY-obj.y)<=obj.approachDistance*(1-TOOL_TUTORIAL.triggerProgress);
}
export function createToolTutorial(scene,textures,obj,tool,onBombContinue) {
    const root=new PIXI.Container();root.name='toolTutorial';root.interactive=root.interactiveChildren=false;
    const bugX=obj.x+290,bugY=obj.y+154;
    const y=bugY>540?165:730;
    if(tool)root.addChild(new PIXI.Graphics().lineStyle(8,0xF45D53).drawRoundedRect(tool.x+7,tool.y+7,264,514,32));
    const ring=new PIXI.Graphics().lineStyle(7,0xF45D53).drawCircle(bugX,bugY,obj.radius+18);root.addChild(ring);
    root.addChild(new PIXI.Graphics().beginFill(0x2D1738).drawRoundedRect(428,y+8,1060,250,28).endFill()
        .lineStyle(5,0x2D1738).beginFill(0xF7F7F3).drawRoundedRect(420,y,1060,250,28).endFill());
    if(textures.result_mascot?.valid){const mascot=new PIXI.Sprite(textures.result_mascot);mascot.scale.set(210/mascot.texture.width);mascot.position.set(435,y+12);
        const mask=new PIXI.Graphics().beginFill(0xFFFFFF).drawRect(435,y+12,210,226).endFill();root.addChild(mascot,mask);mascot.mask=mask;}
    const text=new PIXI.Text('',{fontFamily:'Balsamiq Sans',fontSize:42,fontWeight:'bold',fill:0x2D1738,wordWrap:true,wordWrapWidth:770,align:'center'});
    text.name='toolTutorialText';text.anchor.set(.5);text.position.set(1050,y+125);text.resolution=2;root.addChild(text);
    // The generated sprite points upward; anchor at the fingertip, not at the palm.
    const finger = new PIXI.Sprite(textures.tutorial_finger);
    finger.name = 'tutorialFinger'; finger.anchor.set(0.45, 0.02);
    finger.scale.set(150 / finger.texture.height);
    finger.interactive = false; root.addChild(finger);
    scene.addChild(root);
    let aftermath=false, heldTool=false;
    function pointFinger() {
        if (root.destroyed) return;
        const target = aftermath ? { x: 1050, y: y + 190, kind: 'continue' }
            : tool && !heldTool ? { x: tool.x + 139, y: tool.y + 264, kind: 'tool' }
            : { x: bugX, y: bugY, kind: 'bug' };
        // Put the palm toward the centre of the scene to keep it inside the viewport.
        const angle = Math.atan2(target.y - 540, target.x - 960);
        const gap = 12 + 7 * (1 + Math.sin(performance.now() * Math.PI * 2 / 1100));
        finger.position.set(target.x - Math.cos(angle) * gap, target.y - Math.sin(angle) * gap);
        finger.rotation = angle + Math.PI / 2;
        finger.targetKind = target.kind;
        finger.targetX = target.x; finger.targetY = target.y;
    }
    PIXI.Ticker.shared.add(pointFinger);
    pointFinger();
    return { root,
        update(held){heldTool=held;pointFinger();if(!aftermath)text.text=tool&&!held?t('tool_tutorial.001'):BUG_TUTORIALS[obj.type].text;},
        bombAfterClick(){
            aftermath=true;text.text=BUG_TUTORIALS.bomb.afterClick;text.y=y+82;text.style.fontSize=34;
            const button=new PIXI.Container();button.name='bombTutorialContinue';button.position.set(850,y+155);
            button.addChild(new PIXI.Graphics().lineStyle(4,0x2D1738).beginFill(0x30D5C1).drawRoundedRect(0,0,400,70,22).endFill());
            const caption=new PIXI.Text(t('tool_tutorial.002'),{fontFamily:'Balsamiq Sans',fontSize:32,fill:0x2D1738});caption.anchor.set(.5);caption.position.set(200,35);button.addChild(caption);
            root.interactiveChildren=true;button.interactive=button.buttonMode=true;button.interactiveChildren=false;
            button.hitArea=new PIXI.Rectangle(0,0,400,70);
            let readyAt=performance.now()+350,done=false;
            button.on('pointertap',event=>{event?.stopPropagation?.();if(done||performance.now()<readyAt)return;done=true;onBombContinue();});root.addChild(button);root.addChild(finger);pointFinger();
        },
        destroy(){PIXI.Ticker.shared.remove(pointFinger);root.destroy({children:true});} };
}
