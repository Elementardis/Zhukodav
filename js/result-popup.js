import { popupSurface } from './intro-popup.js';
import { HEADING_FONT } from './typography.js';
export const RESULT_ASSETS = [
    ...['illustration_win.png', 'illustration_lose.png', 'panel.svg', 'button_menu.svg', 'button_primary.svg', 'home.svg', 'next.svg', 'retry.svg']
        .map(file => ({ name: `result_${file.split('.')[0]}`, path: `images/ui/results/assets/${file}`, optional: true })),
    { name: 'intro_layout', path: 'images/ui/results/intro-layout.json', dataResource: true },
    { name: 'result_layout', path: 'images/ui/results/layout.json', dataResource: true }
];

export function createResultPopup(textures, layout, { won, hasNext, onMenu, onPrimary, theme }) {
    const popup = new PIXI.Container();
    popup.name = won ? 'winPopup' : 'losePopup';
    popup._popupLayout = { width: layout.panelSize[0], height: layout.panelSize[1], reference: { width: layout.baseViewport[0], height: layout.baseViewport[1] } };
    popup.interactive = true;
    popup.hitArea = new PIXI.Rectangle(0, 0, ...layout.panelSize);
    const sprite = (name, rect) => {
        if (['panel', 'button_primary', 'button_menu'].includes(name)) return popupSurface(textures, name, rect, theme);
        if (!textures[`result_${name}`]?.valid) return new PIXI.Container();
        const item = new PIXI.Sprite(textures[`result_${name}`]);
        item.position.set(rect[0], rect[1]);
        item.width = rect[2]; item.height = rect[3];
        return item;
    };
    const text = (value, style, center, width, height = Infinity) => {
        const item = new PIXI.Text(value, {
            fontFamily: layout.fontStack, fontWeight: 'bold', align: 'center', lineJoin: 'round', ...style
        });
        item.anchor.set(0.5);
        item.resolution = 2;
        item.position.set(...center);
        item.scale.set(Math.min(1, width / item.width, height / item.height));
        return item;
    };
    const state = layout.states[won ? 'win' : 'lose'];
    popup.addChild(sprite('panel', [0, 0, ...layout.panelSize]));
    const art = new PIXI.Sprite(textures[`result_${state.art.split('/').pop().split('.')[0]}`] || PIXI.Texture.EMPTY);
    const [x, y, width, height] = layout.artworkRect;
    art.anchor.set(0.5);
    art.position.set(x + width / 2, y + height / 2);
    art.scale.set(Math.min(width / art.texture.width, height / art.texture.height));
    popup.addChild(art);
    popup.addChild(text(state.title, { ...layout.title, fontFamily: HEADING_FONT, fill: theme.title, strokeThickness: 0 }, layout.title.center, layout.title.maxWidth));
    popup.addChild(text(state.caption, layout.caption, layout.caption.center, layout.caption.maxWidth));
    let activated = false;
    const button = (name, geometry, icon, label, callback) => {
        const container = new PIXI.Container();
        container.name = name;
        const [bx, by, bw, bh] = geometry.rect;
        container.position.set(bx + bw / 2, by + bh / 2);
        container.pivot.set(bw / 2, bh / 2);
        container.interactive = container.buttonMode = true;
        container.interactiveChildren = false;
        container.hitArea = new PIXI.Rectangle(0, 0, bw, bh);
        const background = sprite(name === 'resultMenu' ? 'button_menu' : 'button_primary', [0, 0, bw, bh]);
        const [ix, iy, iw, ih] = geometry.iconRect;
        container.addChild(background, sprite(icon, [ix - bx, iy - by, iw, ih]));
        const [tx, ty, tw, th] = geometry.textRect;
        container.addChild(text(label, { fontSize: geometry.fontSize, fill: layout.caption.fill }, [tx - bx + tw / 2, ty - by + th / 2], tw, th));
        container.on('pointerover', () => { background.tint = 0xF2F2F2; });
        container.on('pointerdown', () => container.scale.set(0.97));
        for (const event of ['pointerup', 'pointerupoutside', 'pointercancel', 'pointerout']) {
            container.on(event, () => { container.scale.set(1); background.tint = 0xFFFFFF; });
        }
        container.on('pointertap', () => {
            if (activated || popup.destroyed) return;
            activated = true;
            callback();
        });
        popup.addChild(container);
    };
    button('resultMenu', layout.menuButton, 'home', layout.menuText, onMenu);
    button('resultPrimary', layout.primaryButton, won ? 'next' : 'retry', won && !hasNext ? 'ВЫБОР\nУРОВНЯ' : state.primary, onPrimary);
    return popup;
}
