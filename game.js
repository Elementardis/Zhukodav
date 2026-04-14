import { initBackend, trackEvent } from './firebase.js';
import GameState from './GameState.js';
import GameEngine from './GameEngine.js';
import RenderLayer, { THEME } from './RenderLayer.js';
import InputController from './InputController.js';

const SPRITE_PATHS = [
    { name: 'bug', path: 'images/bug.png' },
    { name: 'healer', path: 'images/healer.png' },
    { name: 'bomb', path: 'images/bomb.png' },
    { name: 'coloredBug_red', path: 'images/coloredBug_red.png' },
    { name: 'coloredBug_blue', path: 'images/coloredBug_blue.png' },
    { name: 'coloredBug_green', path: 'images/coloredBug_green.png' },
    { name: 'coloredBug_yellow', path: 'images/coloredBug_yellow.png' },
    { name: 'bomb_explosion', path: 'images/bomb.gif' },
    { name: 'button_green', path: 'images/ui/button_green.png' },
    { name: 'button_blue', path: 'images/ui/button_blue.png' },
    { name: 'button_purple', path: 'images/ui/button_purple.png' },
    { name: 'button_red', path: 'images/ui/button_red.png' },
    { name: 'button_yellow', path: 'images/ui/button_yellow.png' },
    { name: 'frozen', path: 'images/ui/frozen.png' },
    { name: 'chameleon', path: 'images/chameleon.png' },
    { name: 'neat', path: 'images/neat.png' },
    { name: 'heart', path: 'images/ui/heart.png' },
    { name: 'life', path: 'images/life.png' },
    { name: 'gear', path: 'images/ui/gear.png' }
];

const KEY_LAYOUT_MAP = {
    q: 'q',
    w: 'w',
    e: 'e',
    r: 'r',
    '\u0439': 'q',
    '\u0446': 'w',
    '\u0443': 'e',
    '\u043a': 'r',
};

function showPreloader() {
    const preloader = document.createElement('div');
    preloader.id = 'preloader';
    preloader.style.position = 'fixed';
    preloader.style.left = '0';
    preloader.style.top = '0';
    preloader.style.width = '100vw';
    preloader.style.height = '100vh';
    preloader.style.background = THEME.preloaderBg;
    preloader.style.display = 'flex';
    preloader.style.flexDirection = 'column';
    preloader.style.alignItems = 'center';
    preloader.style.justifyContent = 'center';
    preloader.style.fontSize = '2em';
    preloader.style.zIndex = '9999';
    preloader.style.fontFamily = 'Arial';

    const loadingText = document.createElement('div');
    loadingText.innerText = 'Загрузка...';
    loadingText.style.marginBottom = '20px';

    const progressBar = document.createElement('div');
    progressBar.style.width = '300px';
    progressBar.style.height = '20px';
    progressBar.style.background = THEME.preloaderTrack;
    progressBar.style.borderRadius = '10px';
    progressBar.style.overflow = 'hidden';

    const progressFill = document.createElement('div');
    progressFill.style.width = '0%';
    progressFill.style.height = '100%';
    progressFill.style.background = THEME.preloaderFill;
    progressFill.style.transition = 'width 0.3s';

    progressBar.appendChild(progressFill);
    preloader.appendChild(loadingText);
    preloader.appendChild(progressBar);
    document.body.appendChild(preloader);

    return { progressFill };
}

function hidePreloader() {
    const preloader = document.getElementById('preloader');
    if (preloader) {
        preloader.style.opacity = '0';
        preloader.style.transition = 'opacity 0.5s';
        setTimeout(() => preloader.remove(), 500);
    }
}

function initYandexSDK() {
    if (typeof YaGames === 'undefined') return;

    YaGames.init().then((ysdk) => {
        window.ysdk = ysdk;
    }).catch((err) => {
        console.log('Yandex SDK init error', err);
    });
}

const { progressFill } = showPreloader();
const app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: THEME.appBg,
    resolution: window.devicePixelRatio,
    autoDensity: true,
    resizeTo: window,
    roundPixels: true
});

document.body.appendChild(app.view);
document.body.style.backgroundColor = THEME.appBgCss;
document.body.style.overscrollBehavior = 'none';
document.body.style.touchAction = 'none';
app.view.style.touchAction = 'none';
app.view.style.webkitTouchCallout = 'none';

initYandexSDK();

initBackend()
    .then(() => trackEvent('app_open', { ua: navigator.userAgent }))
    .catch((e) => console.warn('Backend init failed', e));

const textures = {};
const loader = PIXI.Loader.shared;
SPRITE_PATHS.forEach(({ name, path }) => loader.add(name, path));
loader.onProgress.add((resourceLoader) => {
    progressFill.style.width = `${Math.round(resourceLoader.progress)}%`;
});
loader.onError.add((error, resourceLoader, resource) => {
    console.error('Error loading sprite:', { error, resourceLoader, resource });
    alert('Ошибка загрузки ресурсов. Пожалуйста, обновите страницу.');
});

loader.load(() => {
    SPRITE_PATHS.forEach(({ name }) => {
        textures[name] = loader.resources[name].texture;
    });

    hidePreloader();

    const state = new GameState();
    const input = new InputController(state, { keyLayoutMap: KEY_LAYOUT_MAP });
    let renderLayer = null;
    const engine = new GameEngine(state, {
        getFrozenActive: () => renderLayer.isFrozenEffectActive()
    });
    renderLayer = new RenderLayer({ app, state, engine, input, textures });

    input.attachGlobalListeners();
    renderLayer.mountStartScreen();
});
