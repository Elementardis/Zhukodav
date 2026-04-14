export default class GameState {
    constructor() {
        this.state = {
            score: 0,
            life: 0,
            levelData: null,
            activeObjects: [],
            objectQueue: [],
            isPaused: false,
            levelEnded: false,
            introActive: false,
            activeColor: null,
            colorPressStart: 0,
            orientationPauseActive: false,
            activeKeyboardColor: null,
            activePointerColors: new Map(),
        };
    }

    resetRuntime() {
        this.setActiveObjects([]);
        this.setObjectQueue([]);
        this.setPaused(false);
        this.setLevelEnded(false);
        this.setIntroActive(false);
        this.setActiveColor(null);
        this.setColorPressStart(0);
        this.setOrientationPauseActive(false);
        this.state.activeKeyboardColor = null;
        this.state.activePointerColors = new Map();
    }

    getScore() { return this.state.score; }
    setScore(value) { this.state.score = value; }
    addScore(value) { this.state.score += value; return this.state.score; }

    getLife() { return this.state.life; }
    setLife(value) { this.state.life = value; }
    addLife(value) { this.state.life += value; return this.state.life; }

    getLevelData() { return this.state.levelData; }
    setLevelData(value) { this.state.levelData = value; }

    getActiveObjects() { return this.state.activeObjects; }
    setActiveObjects(value) { this.state.activeObjects = value; }
    addActiveObject(value) { this.state.activeObjects.push(value); return value; }
    removeActiveObject(target) {
        this.state.activeObjects = this.state.activeObjects.filter((item) => item !== target);
    }

    getObjectQueue() { return this.state.objectQueue; }
    setObjectQueue(value) { this.state.objectQueue = value; }
    shiftObjectQueue() { return this.state.objectQueue.shift(); }
    unshiftObjectQueue(value) { this.state.objectQueue.unshift(value); }

    isPaused() { return this.state.isPaused; }
    setPaused(value) { this.state.isPaused = value; }

    isLevelEnded() { return this.state.levelEnded; }
    setLevelEnded(value) { this.state.levelEnded = value; }

    isIntroActive() { return this.state.introActive; }
    setIntroActive(value) { this.state.introActive = value; }

    getActiveColor() { return this.state.activeColor; }
    setActiveColor(value) { this.state.activeColor = value; }

    getColorPressStart() { return this.state.colorPressStart; }
    setColorPressStart(value) { this.state.colorPressStart = value; }

    isOrientationPauseActive() { return this.state.orientationPauseActive; }
    setOrientationPauseActive(value) { this.state.orientationPauseActive = value; }

    getActiveKeyboardColor() { return this.state.activeKeyboardColor; }
    setActiveKeyboardColor(value) {
        this.state.activeKeyboardColor = value;
        this.state.activeColor = value;
    }

    getActivePointerColors() { return this.state.activePointerColors; }
    setActivePointerColors(value) { this.state.activePointerColors = value; }
}
