let safeProbe;
export function safeViewport(viewport) {
    if (!safeProbe?.isConnected) {
        safeProbe = document.createElement('div');
        safeProbe.id = 'safe-area-probe';
        safeProbe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding:var(--safe-top,env(safe-area-inset-top,0px)) var(--safe-right,env(safe-area-inset-right,0px)) var(--safe-bottom,env(safe-area-inset-bottom,0px)) var(--safe-left,env(safe-area-inset-left,0px))';
        document.body.appendChild(safeProbe);
    }
    const css = getComputedStyle(safeProbe);
    const x = parseFloat(css.paddingLeft) || 0, y = parseFloat(css.paddingTop) || 0;
    return { x, y, width: Math.max(1, viewport.width - x - (parseFloat(css.paddingRight) || 0)), height: Math.max(1, viewport.height - y - (parseFloat(css.paddingBottom) || 0)) };
}
export function viewportSize() {
    return { width: document.documentElement.clientWidth,
        height: Math.min(document.body.clientHeight || innerHeight, window.visualViewport?.height || innerHeight) };
}
export function createAdaptiveBackground(app) {
    const layer = new PIXI.Container(); layer.name = 'backgroundLayer'; layer.zIndex = -100;
    layer.interactive = layer.interactiveChildren = false; layer.visible = false;
    app.stage.sortableChildren = true; app.stage.addChild(layer);
    let sprite;
    return {
        layer,
        setTexture(texture) {
            if (!sprite) { sprite = new PIXI.Sprite(texture); sprite.anchor.set(0.5); layer.addChild(sprite); }
            this.resize();
        },
        resize() {
            if (!sprite) return;
            const scale = Math.max(app.screen.width / sprite.texture.width, app.screen.height / sprite.texture.height);
            sprite.scale.set(scale); sprite.position.set(app.screen.width / 2, app.screen.height / 2);
        },
        dispose() { layer.destroy({ children: true }); safeProbe?.remove(); safeProbe = null; }
    };
}
