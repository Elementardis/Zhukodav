// Dialog content uses one coordinate system; viewport changes only transform it.
export const POPUP_REFERENCE = { width: 1280, height: 720, margin: 12 };

export function popupTransform(viewport, width, height, appearance = 1) {
    const { margin } = POPUP_REFERENCE;
    const fit = Math.max(0.001, Math.min(
        viewport.width / POPUP_REFERENCE.width,
        viewport.height / POPUP_REFERENCE.height,
        Math.max(1, viewport.width - margin * 2) / (width + 16),
        Math.max(1, viewport.height - margin * 2) / (height + 16)
    ));
    const scale = fit * Math.max(0, Math.min(1, appearance));
    return {
        scale,
        x: (viewport.width - width * scale) / 2,
        y: (viewport.height - height * scale) / 2
    };
}

export function fitPopup(popup, viewport, width, height) {
    if (width !== undefined) popup._popupLayout = { width, height };
    const size = popup._popupLayout;
    if (!size) return;
    const transform = popupTransform(viewport, size.width, size.height, popup._appearance ?? 1);
    popup.scale.set(transform.scale);
    popup.position.set(transform.x, transform.y);
}
