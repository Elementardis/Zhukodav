export default class InputController {
    constructor(state, options = {}) {
        this.state = state;
        this.keyLayoutMap = options.keyLayoutMap || {};
        this.dynamicColorKeyMap = {};
        this.listeners = options.listeners || {};
        this.pointerFallbackKey = '__pointer_fallback__';
        this.boundHandlers = null;
    }

    setDynamicColorKeyMap(map) {
        this.dynamicColorKeyMap = { ...map };
    }

    getPointerId(event) {
        return event?.data?.pointerId ?? event?.data?.originalEvent?.pointerId ?? null;
    }

    getPointerColorKey(pointerId) {
        return pointerId ?? this.pointerFallbackKey;
    }

    getActiveColor() {
        const keyboardColor = this.state.getActiveKeyboardColor();
        if (keyboardColor) return keyboardColor;

        for (const color of this.state.getActivePointerColors().values()) {
            return color;
        }

        return null;
    }

    isColorHeld(color) {
        if (!color) return false;
        if (this.state.getActiveKeyboardColor() === color) return true;

        for (const heldColor of this.state.getActivePointerColors().values()) {
            if (heldColor === color) return true;
        }

        return false;
    }

    hasAnyActiveColor() {
        return !!this.state.getActiveKeyboardColor() || this.state.getActivePointerColors().size > 0;
    }

    pressPointerColor(color, event) {
        const pointerKey = this.getPointerColorKey(this.getPointerId(event));
        this.state.getActivePointerColors().set(pointerKey, color);
        this.state.setColorPressStart(Date.now());
        this.state.setActiveColor(this.getActiveColor());
        this.listeners.onColorStateChange?.();
    }

    releasePointerColor(color, event) {
        const pointerKey = this.getPointerColorKey(this.getPointerId(event));
        if (this.state.getActivePointerColors().get(pointerKey) === color) {
            this.state.getActivePointerColors().delete(pointerKey);
        }
        this.state.setActiveColor(this.getActiveColor());
        this.listeners.onColorStateChange?.();
    }

    clearActiveColor() {
        this.state.setActiveKeyboardColor(null);
        this.state.getActivePointerColors().clear();
        this.state.setActiveColor(null);
        this.listeners.onColorStateChange?.();
    }

    attachGlobalListeners() {
        if (this.boundHandlers) return;

        this.boundHandlers = {
            keydown: (event) => {
                if (this.state.isPaused()) return;
                const key = event.key.toLowerCase();
                const englishKey = this.keyLayoutMap[key] || key;
                const color = this.dynamicColorKeyMap[englishKey];

                if (color && this.state.getActiveKeyboardColor() !== color) {
                    this.state.setActiveKeyboardColor(color);
                    this.state.setColorPressStart(Date.now());
                    this.listeners.onColorStateChange?.();
                }
            },
            keyup: (event) => {
                const key = event.key.toLowerCase();
                const englishKey = this.keyLayoutMap[key] || key;
                const color = this.dynamicColorKeyMap[englishKey];

                if (color && this.state.getActiveKeyboardColor() === color) {
                    this.state.setActiveKeyboardColor(null);
                    this.state.setActiveColor(this.getActiveColor());
                    this.listeners.onColorStateChange?.();
                }
            },
            touchcancel: () => this.clearActiveColor(),
            blur: () => this.clearActiveColor(),
            visibilitychange: () => {
                if (document.hidden) this.clearActiveColor();
            }
        };

        window.addEventListener('keydown', this.boundHandlers.keydown);
        window.addEventListener('keyup', this.boundHandlers.keyup);
        window.addEventListener('touchcancel', this.boundHandlers.touchcancel);
        window.addEventListener('blur', this.boundHandlers.blur);
        document.addEventListener('visibilitychange', this.boundHandlers.visibilitychange);
    }
}
