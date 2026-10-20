// Logical coordinates from images/gameplay/layout.json.
export const GAMEPLAY_STYLE = {
    width: 1920, height: 1080, outline: 0x2D1738, radius: 38, border: 6,
    shadowY: 6, pressedY: 4, iconWidth: 0.8, iconHeight: 0.76,
    playRect: { x: 290, y: 154, width: 1340, height: 926 },
    food: { x: 710, y: 320, size: 500, radius: 219 },
    hp: { x: 660, y: 38, width: 700, height: 96, segments: 7 },
    tools: [
        { id: 'swatter', color: 'red', key: 'q', icon: 'fly_swatter', fill: 0xF65C70, x: 4, y: 6 },
        { id: 'trap', color: 'yellow', key: 'e', icon: 'insect_trap', fill: 0xF4D447, x: 4, y: 546 },
        { id: 'spray', color: 'purple', key: 'w', icon: 'insecticide_spray', fill: 0xB956E8, x: 1638, y: 6 },
        { id: 'tape', color: 'green', key: 'r', icon: 'sticky_tape', fill: 0x9ED52A, x: 1638, y: 546 }
    ],
    buttonWidth: 278, buttonHeight: 528
};

export const GAMEPLAY_ASSETS = [
    ['tabletop', 'background/tabletop_1920x1080.png'],
    ['settings', 'ui/settings_button.png'], ['plate', 'food/plate_empty.png'],
    ['hp_frame', 'hp/hp_frame.png'], ['hp_fresh', 'hp/hp_segment_fresh.png'], ['hp_dirty', 'hp/hp_segment_dirty.png'],
    ...GAMEPLAY_STYLE.tools.map(t => [t.icon, `icons/${t.icon}.png`]),
    ...Array.from({ length: 8 }, (_, i) => [`slice_${i + 1}`, `food/slices/pizza_slice_${String(i + 1).padStart(2, '0')}.png`])
].map(([name, path]) => ({ name: `gameplay_${name}`, path: `images/gameplay/${path}` }));

export function elapsedSegments(remainingMs, durationMs) {
    return Math.floor(7 * (1 - Math.max(0, Math.min(1, remainingMs / Math.max(1, durationMs)))));
}

export function remainingSliceIndices(life, food) {
    return food.removalOrder.slice(food.pieces - Math.max(0, Math.min(food.pieces, Math.floor(life))));
}

export function fitGameplayScene(scene, viewport) {
    const scale = Math.min(viewport.width / 1920, viewport.height / 1080);
    scene.scale.set(scale);
    scene.position.set((viewport.width - 1920 * scale) / 2, (viewport.height - 1080 * scale) / 2);
}

function brighten(color) {
    return [16, 8, 0].reduce((result, shift) => result | Math.round(((color >> shift) & 255) * 0.93 + 255 * 0.07) << shift, 0);
}

export function buildGameplayScene(textures, { enabledColors, foodDefinition, onHold, onRelease, onSettings }) {
    const style = GAMEPLAY_STYLE;
    const scene = new PIXI.Container();
    scene.name = 'gameplayScene';
    const sprite = (name, x, y, width, height) => {
        const texture = textures[`gameplay_${name}`];
        texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
        const result = new PIXI.Sprite(texture);
        result.position.set(x, y);
        result.width = width;
        result.height = height;
        return result;
    };
    scene.addChild(sprite('tabletop', 0, 0, 1920, 1080));
    const food = new PIXI.Container();
    food.position.set(style.food.x, style.food.y);
    food.scale.set(style.food.size / 640);
    food.addChild(sprite('plate', 0, 0, 640, 640));
    const slices = Array.from({ length: foodDefinition.pieces }, (_, i) => sprite(`slice_${i + 1}`, 40, 40, 560, 560));
    slices.forEach(s => food.addChild(s));
    scene.addChild(food);

    const field = new PIXI.Container();
    field.name = 'playArea';
    field.position.set(style.playRect.x, style.playRect.y);
    field._fieldWidth = style.playRect.width;
    field._fieldHeight = style.playRect.height;
    const mask = new PIXI.Graphics();
    mask.beginFill(0xFFFFFF).drawRect(style.playRect.x, style.playRect.y, style.playRect.width, style.playRect.height).endFill();
    scene.addChild(mask, field);
    field.mask = mask;
    const effects = new PIXI.Container();
    effects.name = 'gameplayEffects';
    effects.position.copyFrom(field.position);
    effects.interactiveChildren = false;
    scene.addChild(effects);

    const hp = new PIXI.Container();
    hp.name = 'levelTimeBar';
    hp.position.set(style.hp.x, style.hp.y);
    hp.addChild(sprite('hp_frame', 0, 0, 700, 96));
    const segments = Array.from({ length: 7 }, (_, i) => sprite('hp_fresh', 34 + 91 * i, 18, 85, 60));
    segments.forEach(s => hp.addChild(s));
    scene.addChild(hp);
    const foodAccent = new PIXI.Graphics();
    foodAccent.name = 'foodEffectRing';
    foodAccent.position.set(style.food.x + 250, style.food.y + 250);
    foodAccent.interactive = false;
    scene.addChild(foodAccent);

    const buttons = {};
    for (const tool of style.tools) {
        const button = new PIXI.Container();
        button.name = `colorButton_${tool.color}`;
        button.position.set(tool.x, tool.y);
        const enabled = enabledColors.includes(tool.color);
        button.interactive = enabled;
        button.interactiveChildren = false;
        button.buttonMode = enabled;
        button.hitArea = new PIXI.Rectangle(0, 0, style.buttonWidth, style.buttonHeight);
        const shadow = new PIXI.Graphics();
        shadow.beginFill(style.outline).drawRoundedRect(0, style.shadowY, 278, 528, style.radius).endFill();
        button.addChild(shadow);
        const face = new PIXI.Container();
        const panel = new PIXI.Graphics();
        face.addChild(panel);
        const icon = sprite(tool.icon, 139, 264, 1, 1);
        icon.anchor.set(0.5);
        icon.scale.set(Math.min(278 * style.iconWidth / icon.texture.width, 528 * style.iconHeight / icon.texture.height));
        icon.alpha = enabled ? 1 : 0.45;
        face.addChild(icon);
        const selected = new PIXI.Graphics();
        selected.name = 'activeIndicator';
        selected.lineStyle(3, 0xFFFFFF).drawRoundedRect(12, 12, 254, 504, 28);
        selected.lineStyle(6, 0xFFFFFF).moveTo(228, 34).lineTo(239, 45).lineTo(257, 23);
        face.addChild(selected);
        button.addChild(face);
        let hovered = false;
        let held = false;
        const redraw = () => {
            panel.clear().lineStyle(style.border, style.outline, 1, 0);
            panel.beginFill(enabled ? (hovered ? brighten(tool.fill) : tool.fill) : 0x9E9DA4);
            panel.drawRoundedRect(0, 0, 278, 528, style.radius).endFill();
            face.y = held && enabled ? style.pressedY : 0;
            shadow.visible = !held;
            selected.visible = enabled && held;
        };
        button.setHeld = value => { held = value; redraw(); };
        button.on('pointerdown', event => onHold(tool.color, event));
        for (const event of ['pointerup', 'pointerupoutside', 'pointercancel']) button.on(event, e => onRelease(tool.color, e));
        button.on('pointerover', () => { hovered = true; redraw(); });
        button.on('pointerout', () => { hovered = false; redraw(); });
        redraw();
        buttons[tool.color] = button;
        scene.addChild(button);
    }
    const settings = sprite('settings', 1500, 30, 120, 112);
    settings.interactive = settings.buttonMode = true;
    settings.on('pointertap', onSettings);
    settings.on('pointerdown', () => { settings.tint = 0xDDDDDD; });
    for (const event of ['pointerup', 'pointerupoutside', 'pointerout', 'pointercancel']) settings.on(event, () => { settings.tint = 0xFFFFFF; });
    scene.addChild(settings);
    const sceneMask = new PIXI.Graphics();
    sceneMask.beginFill(0xFFFFFF).drawRect(0, 0, 1920, 1080).endFill();
    scene.addChild(sceneMask);
    scene.mask = sceneMask;

    let lastLife = null;
    let feedbackMs = 0;
    let feedbackColor = 0xFFFFFF;
    const feedback = (kind = 'damage') => {
        feedbackMs = 220;
        feedbackColor = kind === 'damage' ? 0xF65C70 : kind === 'heal' ? 0x9ED52A : 0xFFFFFF;
    };
    return {
        scene, field, effects, hp, buttons, feedback, slices, segments, foodAccent,
        update({ life, remainingMs, durationMs, activeColor, specialEffects = [], clockMs = 0, dt = 0 }) {
            if (lastLife !== null && life !== lastLife) feedback(life < lastLife ? 'damage' : 'heal');
            lastLife = life;
            const dirty = elapsedSegments(remainingMs, durationMs);
            segments.forEach((segment, i) => { segment.texture = textures[i >= 7 - dirty ? 'gameplay_hp_dirty' : 'gameplay_hp_fresh']; });
            const visible = remainingSliceIndices(life, foodDefinition);
            slices.forEach((slice, i) => { slice.visible = visible.includes(i + 1); });
            feedbackMs = Math.max(0, feedbackMs - dt);
            food.x = style.food.x + (feedbackMs > 0 ? Math.sin(feedbackMs * 0.08) * 3 : 0);
            foodAccent.clear();
            const toolColor = style.tools.find(t => t.color === activeColor)?.fill;
            if (feedbackMs > 0 || toolColor !== undefined) {
                foodAccent.lineStyle(3, feedbackMs > 0 ? feedbackColor : toolColor).drawCircle(0, 0, 254);
            }
            specialEffects.forEach((effect, index) => {
                const fraction = Math.max(0, Math.min(1, effect.remainingMs / effect.durationMs));
                if (!fraction) return;
                const radius = 260 + index * 7;
                // A shrinking coloured arc has the same duration meaning as the old field border.
                const colors = effect.type === 'frozen' ? [0x8FE8FF, 0x4FC3F7, 0xE9FBFF] : [0xFFB7C5, 0xFFD7A8, 0xFFF0A6, 0xBAF2BB, 0xB8E7FF, 0xD8C4FF];
                const segments = 72;
                for (let i = 0; i < segments * fraction; i++) {
                    const from = -Math.PI / 2 + i / segments * Math.PI * 2;
                    const to = -Math.PI / 2 + Math.min(i + 1, segments * fraction) / segments * Math.PI * 2;
                    const color = colors[(Math.floor(i / 6) + Math.floor(clockMs / 120)) % colors.length];
                    foodAccent.lineStyle(4, color).moveTo(Math.cos(from) * radius, Math.sin(from) * radius).arc(0, 0, radius, from, to);
                }
            });
        }
    };
}
