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
    name: `home_${layer.name}`, path: `images/home/${layer.name}.png`
}));

export function createHomeScreen(textures, { onPlay, onSettings }) {
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
            : layer.name === '07_button_settings' ? onSettings : null;
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

export function layoutHomeScreen(homeContainer, { width, height }) {
    const scale = Math.min(width / HOME_LAYOUT.canvas.width, height / HOME_LAYOUT.canvas.height);
    homeContainer.scale.set(scale);
    homeContainer.position.set((width - 1920 * scale) / 2, (height - 1080 * scale) / 2);
}
