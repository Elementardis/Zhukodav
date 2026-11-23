import { t } from './i18n.js';
import { HEADING_FONT } from './typography.js';
export const BUG_NAMES = {
    bug: t('intro_popup.001'), bomb: t('intro_popup.002'), fat: t('intro_popup.003'),
    healer: t('intro_popup.004'), frozen: t('intro_popup.005'),
    chameleon: t('intro_popup.006'), neat: t('intro_popup.007')
};
const COLORS = { red: t('intro_popup.008'), purple: t('intro_popup.009'), green: t('intro_popup.010'), yellow: t('intro_popup.011') };
export function bugTitle(cfg) {
    if (cfg?.title?.trim()) return cfg.title;
    const [type, color] = (cfg?.type || 'bug').split('_');
    if (COLORS[color] && ['coloredBug', 'fatColoredBug'].includes(type)) {
        return t('intro_popup.012', { p0: COLORS[color], p1: t(type === 'fatColoredBug' ? 'bug.big' : 'bug.normal') });
    }
    return BUG_NAMES[type] || t('intro_popup.013');
}

// Shared SVGs have Graphics fallbacks; textures belong to the loader, not the dialog.
export function popupSurface(textures, name, rect, theme) {
    theme = Object.fromEntries(Object.entries(theme).map(([key, value]) => [key, typeof value === 'string' && value.startsWith('#') ? parseInt(value.slice(1), 16) : value]));
    const [x, y, w, h] = rect;
    let item;
    if (textures[`result_${name}`]?.valid) {
        item = new PIXI.Sprite(textures[`result_${name}`]);
        item.width = w; item.height = h;
    } else {
        const color = name === 'panel' ? theme.panel : name === 'button_menu' ? theme.secondaryButton : theme.primaryButton;
        item = new PIXI.Graphics();
        item.beginFill(theme.outline).drawRoundedRect(0, 8, w, h - 8, 35).endFill();
        item.lineStyle(6, theme.outline).beginFill(color).drawRoundedRect(3, 3, w - 6, h - 14, 35).endFill();
    }
    item.position.set(x, y);
    return item;
}

export function createIntroPopup(textures, layout, fontStack, cfg, iconTexture, onConfirm, view) {
    const theme = layout.popupTheme;
    const popup = new PIXI.Container();
    popup.name = 'introPopup';
    popup._popupLayout = { width: 1140, height: 850, reference: { width: 1920, height: 1080 } };
    popup.interactive = true;
    popup.hitArea = new PIXI.Rectangle(0, 0, 1140, 850);
    popup.addChild(popupSurface(textures, 'panel', [0, 0, 1140, 850], theme));
    const label = (value, rect, size, name) => {
        const [x, y, width, height] = rect;
        const text = new PIXI.Text(value, { fontFamily: ['introEyebrow', 'introTitle'].includes(name) ? HEADING_FONT : fontStack, fontWeight: 'bold', fontSize: size,
            fill: theme.body, align: 'center', wordWrap: true, wordWrapWidth: width, breakWords: true, lineHeight: size * 1.15 });
        text.resolution = 2;
        text.name = name;
        text.anchor.set(0.5);
        text.position.set(x + width / 2, y + height / 2);
        popup.addChild(text);
        return text;
    };
    label(t('intro_popup.014'), layout.eyebrowRect, layout.fontSizes.eyebrow, 'introEyebrow');
    const title = label(bugTitle(cfg), layout.titleRect, layout.fontSizes.title, 'introTitle');
    while ((title.height > layout.titleRect[3] || title.height > title.style.lineHeight * 2 + 2) && title.style.fontSize > 12) {
        title.style.fontSize -= 1; title.style.lineHeight = title.style.fontSize * 1.15;
    }
    if (iconTexture?.valid) {
        const icon = new PIXI.Sprite(iconTexture);
        const [x, y, w, h] = layout.iconRect;
        icon.name = 'introIcon'; icon.anchor.set(0.5); icon.position.set(x + w / 2, y + h / 2);
        icon.scale.set(Math.min(w / iconTexture.width, h / iconTexture.height));
        popup.addChild(icon);
    }
    const [dx, dy, dw, dh] = layout.descriptionRect;
    const desc = label(String(cfg?.descryption || t('intro_popup.015')), layout.descriptionRect, layout.fontSizes.description, 'introDescription');
    desc.anchor.set(0.5, 0); desc.y = dy;
    while (desc.height > dh && desc.style.fontSize > layout.fontSizes.descriptionMin) {
        desc.style.fontSize -= 1; desc.style.lineHeight = desc.style.fontSize * 1.2;
    }
    let cleanup = () => {};
    if (desc.height > dh) {
        const mask = new PIXI.Graphics().beginFill(0xFFFFFF).drawRect(dx, dy, dw, dh).endFill();
        popup.addChild(mask); desc.mask = mask;
        const area = new PIXI.Container();
        area.name = 'introDescriptionScroll'; area.position.set(dx, dy);
        area.interactive = true; area.hitArea = new PIXI.Rectangle(0, 0, dw, dh);
        popup.addChild(area);
        const track = new PIXI.Graphics(); popup.addChild(track);
        const scroll = delta => {
            desc.y = Math.max(dy - (desc.height - dh), Math.min(dy, desc.y - delta));
            const thumb = Math.max(12, dh * dh / desc.height);
            track.clear().beginFill(parseInt(theme.outline.slice(1), 16), 0.5).drawRoundedRect(dx + dw - 4,
                dy + (dy - desc.y) / (desc.height - dh) * (dh - thumb), 4, thumb, 2).endFill();
        };
        scroll(0);
        let previous = null;
        area.on('pointerdown', e => { previous = e.data.getLocalPosition(popup).y; });
        area.on('pointermove', e => { if (previous === null) return; const y = e.data.getLocalPosition(popup).y; scroll(previous - y); previous = y; });
        for (const event of ['pointerup', 'pointerupoutside', 'pointercancel']) area.on(event, () => { previous = null; });
        const wheel = event => {
            if (!popup.parent || popup.destroyed) return;
            const bounds = view.getBoundingClientRect();
            const point = popup.toLocal(new PIXI.Point((event.clientX - bounds.left) * view.clientWidth / bounds.width, (event.clientY - bounds.top) * view.clientHeight / bounds.height));
            if (point.x < dx || point.x > dx + dw || point.y < dy || point.y > dy + dh) return;
            event.preventDefault(); scroll(event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? dh : 1) / popup.scale.y);
        };
        view.addEventListener('wheel', wheel, { passive: false });
        cleanup = () => view.removeEventListener('wheel', wheel);
    }
    const button = new PIXI.Container(); button.name = 'introConfirm';
    const [bx, by, bw, bh] = layout.buttonRect;
    button.position.set(bx, by); button.interactive = button.buttonMode = true;
    button.interactiveChildren = false; button.hitArea = new PIXI.Rectangle(0, 0, bw, bh);
    button.addChild(popupSurface(textures, 'button_primary', [0, 0, bw, bh], theme));
    popup.addChild(button);
    const caption = label(t('intro_popup.016'), layout.buttonRect, layout.fontSizes.button, 'introConfirmText');
    popup.removeChild(caption); caption.position.set(bw / 2, bh / 2); button.addChild(caption);
    let confirmed = false;
    button.on('pointertap', () => {
        if (confirmed || popup.destroyed || !popup.parent) return;
        confirmed = true; onConfirm();
    });
    const destroy = popup.destroy.bind(popup);
    popup.destroy = options => { confirmed = true; cleanup(); if (popup._appearFrame) cancelAnimationFrame(popup._appearFrame); destroy(options); };
    return popup;
}
