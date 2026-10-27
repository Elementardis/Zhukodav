import { popupSurface } from './intro-popup.js';
import { HEADING_FONT } from './typography.js';

export function createSettingsPopup(textures, theme, fontStack, { homeSettings, soundEnabled, musicEnabled, onSound, onMusic, onClose, onRetry, onMenu }) {
    const popup = new PIXI.Container();
    popup.name = 'pausePopup';
    popup._popupLayout = { width: 1140, height: 850, reference: { width: 1920, height: 1080 } };
    popup.interactive = true;
    popup.hitArea = new PIXI.Rectangle(0, 0, 1140, 850);
    popup.addChild(popupSurface(textures, 'panel', [0, 0, 1140, 850], theme));
    const ink = parseInt(theme.outline.slice(1), 16);
    const mint = parseInt(theme.primaryButton.slice(1), 16);
    const gray = parseInt(theme.secondaryButton.slice(1), 16);
    const text = (value, size, x, y, heading = false) => {
        const label = new PIXI.Text(value, { fontFamily: heading ? HEADING_FONT : fontStack, fontSize: size, fontWeight: 'bold', fill: theme.body, align: 'center' });
        label.resolution = 2;
        label.anchor.set(0.5); label.position.set(x, y);
        return label;
    };
    popup.addChild(text(homeSettings ? 'НАСТРОЙКИ' : 'ПАУЗА', 76, 570, 100, true));

    const toggle = (name, title, y, enabled, callback, music) => {
        const row = new PIXI.Container();
        row.name = name; row.position.set(120, y);
        row.interactive = row.buttonMode = true; row.interactiveChildren = false;
        row.hitArea = new PIXI.Rectangle(0, 0, 900, 112);
        const background = new PIXI.Graphics();
        background.beginFill(gray).drawRoundedRect(0, 0, 900, 112, 28).endFill();
        const icon = new PIXI.Graphics();
        icon.position.set(32, 25);
        if (music) {
            icon.lineStyle(7, ink).moveTo(23, 48).lineTo(23, 8).lineTo(55, 0).lineTo(55, 40);
            icon.lineStyle(0).beginFill(ink).drawEllipse(13, 49, 12, 9).drawEllipse(45, 41, 12, 9).endFill();
        } else {
            icon.lineStyle(5, ink).beginFill(ink).drawPolygon([0, 22, 15, 22, 33, 7, 33, 55, 15, 40, 0, 40]).endFill();
            icon.lineStyle(5, ink).arc(30, 31, 23, -0.8, 0.8).moveTo(57, 3).arc(30, 31, 39, -0.8, 0.8);
        }
        const label = text(title, 38, 130, 56); label.anchor.x = 0;
        const status = text('', 28, 650, 56); status.name = 'toggleStatus';
        const switchShape = new PIXI.Graphics();
        const redraw = () => {
            row.enabled = enabled;
            status.text = enabled ? 'ВКЛ.' : 'ВЫКЛ.';
            switchShape.clear().lineStyle(4, ink).beginFill(enabled ? mint : gray)
                .drawRoundedRect(735, 24, 130, 64, 32).endFill();
            switchShape.lineStyle(0).beginFill(ink).drawCircle(enabled ? 833 : 767, 56, 23).endFill();
        };
        row.addChild(background, icon, label, status, switchShape);
        row.on('pointertap', () => { enabled = !enabled; callback(enabled); redraw(); });
        row.on('pointerover', () => { background.alpha = 0.75; });
        row.on('pointerout', () => { background.alpha = 1; });
        redraw(); popup.addChild(row);
    };
    toggle('soundToggle', 'ЗВУКИ', 215, soundEnabled, onSound, false);
    toggle('musicToggle', 'МУЗЫКА', 350, musicEnabled, onMusic, true);

    let activated = false;
    const button = (name, label, x, y, primary, callback) => {
        const item = new PIXI.Container(); item.name = name; item.position.set(x, y);
        item.interactive = item.buttonMode = true; item.interactiveChildren = false;
        item.hitArea = new PIXI.Rectangle(0, 0, 486, 142);
        const background = popupSurface(textures, primary ? 'button_primary' : 'button_menu', [0, 0, 486, 142], theme);
        item.addChild(background, text(label, 38, 243, 71));
        item.on('pointerover', () => { background.tint = 0xF2F2F2; });
        item.on('pointerdown', () => { item.y = y + 3; });
        for (const event of ['pointerout', 'pointerup', 'pointerupoutside', 'pointercancel']) item.on(event, () => { item.y = y; background.tint = 0xFFFFFF; });
        item.on('pointertap', () => {
            if (activated || !popup.parent) return;
            activated = true; callback();
        });
        popup.addChild(item);
    };
    if (homeSettings) button('settingsClose', 'ЗАКРЫТЬ', 327, 655, true, onClose);
    else {
        button('pauseContinue', 'ПРОДОЛЖИТЬ', 327, 485, true, onClose);
        button('pauseRetry', 'ЗАНОВО', 64, 655, false, onRetry);
        button('pauseMenu', 'МЕНЮ', 590, 655, false, onMenu);
    }
    return popup;
}
