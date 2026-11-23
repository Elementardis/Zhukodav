import { t } from './i18n.js';
import { HEADING_FONT } from './typography.js';
import { localizedImagePath } from './localized-assets.js';

export function setEndlessGreeting(home, visible) {
    let bubble = home.getChildByName('endlessGreeting');
    if (!bubble && visible) {
        bubble = new PIXI.Container(); bubble.name = 'endlessGreeting'; bubble.zIndex = 100;
        bubble.addChild(new PIXI.Graphics().lineStyle(4, 0x2D1738).beginFill(0xFFF9EE)
            .drawRoundedRect(0, 0, 560, 150, 28).endFill());
        const text = new PIXI.Text(t('home_ui.001'), {
            fontFamily: HEADING_FONT, fontWeight: 'bold', fontSize: 38, fill: 0x2D1738,
            align: 'center', wordWrap: true, wordWrapWidth: 510
        });
        text.anchor.set(0.5); text.position.set(280, 75); bubble.addChild(text); home.addChild(bubble);
    }
    if (bubble) bubble.visible = visible;
}

// Coordinates from the supplied UI kit; keep PNG transparent margins intact.
export const HOME_LAYOUT = {
  "canvas": {
    "width": 1920,
    "height": 1080
  },
  "anchor": "top-left",
  "coordinate_system": "pixels; origin top-left",
  "layers": [
    {
      "name": "01_background",
      "zIndex": 0,
      "full_canvas": "layers/01_background.png",
      "asset": "assets/01_background.png",
      "x": 0,
      "y": 0,
      "width": 1920,
      "height": 1080,
      "anchor": [
        0,
        0
      ]
    },
    {
      "name": "02_decor",
      "zIndex": 1,
      "full_canvas": "layers/02_decor.png",
      "asset": "assets/02_decor.png",
      "x": 65,
      "y": 0,
      "width": 1635,
      "height": 430,
      "anchor": [
        0,
        0
      ]
    },
    {
      "name": "03_banner",
      "zIndex": 2,
      "full_canvas": "layers/03_banner.png",
      "asset": "assets/03_banner.png",
      "x": 510,
      "y": 0,
      "width": 1000,
      "height": 340,
      "anchor": [
        0,
        0
      ]
    },
    {
      "name": "04_mascot",
      "zIndex": 3,
      "full_canvas": "layers/04_mascot.png",
      "asset": "assets/04_mascot.png",
      "x": 125,
      "y": 145,
      "width": 530,
      "height": 865,
      "anchor": [
        0,
        0
      ]
    },
    {
      "name": "05_table",
      "zIndex": 4,
      "full_canvas": "layers/05_table.png",
      "asset": "assets/05_table.png",
      "x": 248,
      "y": 176,
      "width": 1672,
      "height": 904,
      "anchor": [
        0,
        0
      ]
    },
    {
      "name": "06_dish_cake",
      "zIndex": 5,
      "full_canvas": "layers/06_dish_cake.png",
      "asset": "assets/06_dish_cake.png",
      "x": 760,
      "y": 388,
      "width": 530,
      "height": 433,
      "anchor": [
        0,
        0
      ]
    },
    {
      "name": "07_button_settings",
      "zIndex": 6,
      "full_canvas": "layers/07_button_settings.png",
      "asset": "assets/07_button_settings.png",
      "x": 1700,
      "y": 68,
      "width": 160,
      "height": 150,
      "anchor": [
        0,
        0
      ]
    },
    {
      "name": "08_button_dishes",
      "zIndex": 7,
      "full_canvas": "layers/08_button_dishes.png",
      "asset": "assets/08_button_dishes.png",
      "x": 1550,
      "y": 320,
      "width": 330,
      "height": 260,
      "anchor": [
        0,
        0
      ]
    },
    {
      "name": "09_button_play",
      "zIndex": 8,
      "full_canvas": "layers/09_button_play.png",
      "asset": "assets/09_button_play.png",
      "x": 1510,
      "y": 610,
      "width": 385,
      "height": 385,
      "anchor": [
        0,
        0
      ]
    }
  ]
};

export const HOME_ASSETS = HOME_LAYOUT.layers.map(layer => ({
    name: `home_${layer.name}`, path: localizedImagePath(`images/home/${layer.name}.png`)
}));

export function createHomeScreen(textures, { onPlay, onSettings, onDishes }) {
    const homeContainer = new PIXI.Container();
    homeContainer.name = 'homeContainer';
    homeContainer.sortableChildren = true;
    for (const layer of HOME_LAYOUT.layers) {
        const texture = textures[`home_${layer.name}`];
        texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
        const sprite = new PIXI.Sprite(texture);
        sprite.name = layer.name;
        sprite.anchor.set(0, 0);
        sprite.position.set(layer.x, layer.y);
        sprite.width = layer.width;
        sprite.height = layer.height;
        sprite.zIndex = layer.zIndex;
        sprite.interactive = false;
        if (layer.name === '06_dish_cake') {
            const dish = new PIXI.Container();
            dish.name = 'dishContainer';
            dish.position.copyFrom(sprite.position);
            dish.zIndex = layer.zIndex;
            dish.interactiveChildren = false;
            sprite.position.set(0, 0);
            dish.addChild(sprite);
            homeContainer.addChild(dish);
        } else {
            homeContainer.addChild(sprite);
        }
        const action = layer.name === '09_button_play' ? onPlay
            : layer.name === '07_button_settings' ? onSettings : layer.name === '08_button_dishes' ? onDishes : null;
        if (action) {
            sprite.interactive = true;
            sprite.buttonMode = true;
            sprite.hitArea = new PIXI.Rectangle(0, 0, texture.orig.width, texture.orig.height);
            const reset = () => { sprite.tint = 0xFFFFFF; };
            sprite.on('pointerdown', () => { sprite.tint = 0xDDDDDD; });
            for (const event of ['pointerup', 'pointerupoutside', 'pointerout', 'pointercancel']) {
                sprite.on(event, reset);
            }
            sprite.on('pointertap', action);
        }
    }
    return homeContainer;
}

export function layoutHomeScreen(homeContainer, { width, height, x = 0, y = 0, fullWidth = width, fullHeight = height }) {
    const portrait = width < height;
    const home = homeContainer.name === 'homeContainer';
    const logical = home ? (portrait ? {width:1080,height:1920} : HOME_LAYOUT.canvas) : (homeContainer.logicalSize || HOME_LAYOUT.canvas);
    if (home) {
        const positions = {
            '02_decor':[0,0,1080,284], '03_banner':[40,100,900,306],
            '04_mascot':[30,430,490,800], '05_table':[-300,550,1672,904],
            '07_button_settings':[880,20,150,141], '08_button_dishes':[130,1550,330,260],
            '09_button_play':[580,1490,360,360]
        };
        for (const layer of HOME_LAYOUT.layers) {
            const item=homeContainer.children.find(c=>c.name===layer.name);
            if(!item) continue;
            const [lx,ly,lw,lh]=portrait&&positions[layer.name]?positions[layer.name]:[layer.x,layer.y,layer.width,layer.height];
            item.position.set(lx,ly);item.width=lw;item.height=lh;
        }
        const dish=homeContainer.children.find(c=>c.name==='dishContainer');
        if(dish)dish.position.set(portrait?350:760,portrait?770:388);
        homeContainer.getChildByName('endlessGreeting')?.position.set(portrait?480:680,portrait?400:390);
    }
    const scale = Math.min(width / logical.width, height / logical.height);
    homeContainer.scale.set(scale);
    homeContainer.position.set(x+(width-logical.width*scale)/2,y+(height-logical.height*scale)/2);
    if (home) {
        const table=homeContainer.children.find(c=>c.name==='05_table');
        // Extend only the decorative tabletop; keep its height and the dish position.
        if(table)table.width=Math.max(table.width,(fullWidth-homeContainer.position.x)/scale-table.position.x);
    }
    // Cover the viewport with the room, independently of safe-area content fitting.
    const background=homeContainer.children.find(c=>c.name==='01_background');
    if(background){
        const cover=Math.max(fullWidth/1920,fullHeight/1080);
        background.width=1920*cover/scale;background.height=1080*cover/scale;
        background.position.set(((fullWidth-1920*cover)/2-homeContainer.position.x)/scale,((fullHeight-1080*cover)/2-homeContainer.position.y)/scale);
    }
}
