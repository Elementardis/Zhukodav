import { t } from './js/i18n.js';
// 1-22: red/purple; 23-30: green; 31-36: yellow; 37-40: all four tools.
// Campaign: 40 levels, each with a unique story reward.
// Полные комплекты: салат — 6, селёдка — 14, пирог — 24, кекс — 36, торт — 40.
// Пицца доступна сразу. Остальные блюда выбираются после ручной сборки пазла.
// Пример награды уровня 1: foodId: 'greek_salad', pieceId: 'greek_salad_01'.
// Каждый сюжетный уровень выдаёт один уникальный кусочек при первой победе.
const levels = [
  {
    id: 1,
    lootRequired: true,
    loot: [{ id: 'story-1', type: 'foodPiece', foodId: 'greek_salad', pieceId: 'greek_salad_01' }],
    // Пример награды за победу: раскомментируй и назначь нужный кусочек.
    // lootRequired: true, // Проверка контента потребует непустой loot у этого уровня.
    // loot: [
    //   { id: 'cake-first', type: 'foodPiece', foodId: 'cake', pieceId: 'cake_01' },
    // ],
    // foodId — ключ блюда из js/food-config.js; pieceId — foodId + номер с двумя цифрами.
    // Например, у торта 6 частей: cake_01 … cake_06. Назначай каждую только одному уровню.
    // id записи оставляй стабильным. Повторная победа не выдаёт награду снова,
    // даже если изменить loot уже награждённого уровня. Без loot уровень не даёт кусочков.

    durationSeconds: 13,
    params: {
      maxObjects: 3,
      lifetimeMultiplier: 1.1,
      spawnMultiplier: 0.9,
      spawnWeights: {
        bug: 1,
      },
    },
  },
  {
    id: 2,
    lootRequired: true,
    loot: [{ id: 'story-2', type: 'foodPiece', foodId: 'greek_salad', pieceId: 'greek_salad_02' }],
    durationSeconds: 15,
    params: {
      maxObjects: 3,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
      },
    },
  },
  {
    id: 3,
    lootRequired: true,
    loot: [{ id: 'story-3', type: 'foodPiece', foodId: 'dressed_herring', pieceId: 'dressed_herring_01' }],
    durationSeconds: 20,
    params: {
      maxObjects: 3,
      lifetimeMultiplier: 1.2,
      spawnMultiplier: 0.8,
      spawnWeights: {
        bug: 1,
        bomb: 0.1,
      },
    },
    introPopup: {
      type: "bomb",
      descryption: t('levels.001'),
    },
  },
  {
    id: 4,
    lootRequired: true,
    loot: [{ id: 'story-4', type: 'foodPiece', foodId: 'greek_salad', pieceId: 'greek_salad_03' }],
    durationSeconds: 30,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1.2,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
        bomb: 0.1,
      },
    },
  },
  {
    id: 5,
    lootRequired: true,
    loot: [{ id: 'story-5', type: 'foodPiece', foodId: 'greek_salad', pieceId: 'greek_salad_04' }],
    durationSeconds: 20,
    params: {
      maxObjects: 3,
      lifetimeMultiplier: 2,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_red: 1,
      },
    },
    introPopup: {
      type: "coloredBug_red",
      descryption: t('levels.002'),
    },
  },
  {
    id: 6,
    lootRequired: true,
    loot: [{ id: 'story-6', type: 'foodPiece', foodId: 'greek_salad', pieceId: 'greek_salad_05' }],
    durationSeconds: 30,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1.2,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
        coloredBug_red: 1.5,
      },
    },
  },
  {
    id: 7,
    lootRequired: true,
    loot: [{ id: 'story-7', type: 'foodPiece', foodId: 'dressed_herring', pieceId: 'dressed_herring_02' }],
    durationSeconds: 30,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1.1,
      spawnMultiplier: 1.2,
      spawnWeights: {
        bug: 1,
        coloredBug_red: 1.695,
        bomb: 0.13,
      },
    },
  },
  {
    id: 8,
    lootRequired: true,
    loot: [{ id: 'story-8', type: 'foodPiece', foodId: 'pie', pieceId: 'pie_01' }],
    durationSeconds: 30,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1,
      spawnMultiplier: 0.7,
      spawnWeights: {
        bug: 0.3,
        coloredBug_red: 1,
        frozen: 0.3,
      },
    },
    introPopup: {
      type: "frozen",
      descryption: t('levels.003'),
    },
  },
  {
    id: 9,
    lootRequired: true,
    loot: [{ id: 'story-9', type: 'foodPiece', foodId: 'dressed_herring', pieceId: 'dressed_herring_03' }],
    durationSeconds: 30,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1,
      spawnMultiplier: 0.7,
      spawnWeights: {
        bug: 1,
        coloredBug_red: 1.95,
        frozen: 0.3,
      },
    },
  },
  {
    id: 10,
    lootRequired: true,
    loot: [{ id: 'story-10', type: 'foodPiece', foodId: 'dressed_herring', pieceId: 'dressed_herring_04' }],
    durationSeconds: 30,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 2,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
        coloredBug_red: 2,
      },
    },
  },
  {
    id: 11,
    lootRequired: true,
    loot: [{ id: 'story-11', type: 'foodPiece', foodId: 'pie', pieceId: 'pie_02' }],
    durationSeconds: 30,
    params: {
      maxObjects: 3,
      lifetimeMultiplier: 1.2,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 0.35,
        coloredBug_red: 1,
        fat: 0.3,
      },
    },
    introPopup: {
      type: "fat",
      descryption: t('levels.004'),
    },
  },
  {
    id: 12,
    lootRequired: true,
    loot: [{ id: 'story-12', type: 'foodPiece', foodId: 'dressed_herring', pieceId: 'dressed_herring_05' }],
    durationSeconds: 30,
    params: {
      maxObjects: 3,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1.5,
      spawnWeights: {
        bug: 0.35,
        coloredBug_red: 1.275,
        fat: 0.4,
        neat: 0.1,
      },
    },
  },
  {
    id: 13,
    lootRequired: true,
    loot: [{ id: 'story-13', type: 'foodPiece', foodId: 'dressed_herring', pieceId: 'dressed_herring_06' }],
    durationSeconds: 35,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 0.35,
        coloredBug_red: 1.875,
        fat: 0.5,
        frozen: 0.4,
      },
    },
  },
  {
    id: 14,
    lootRequired: true,
    loot: [{ id: 'story-14', type: 'foodPiece', foodId: 'dressed_herring', pieceId: 'dressed_herring_07' }],
    durationSeconds: 30,
    params: {
      maxObjects: 3,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 0.35,
        coloredBug_red: 2.1,
        fat: 0.5,
        bomb: 0.15,
        frozen: 0.4,
      },
    },
  },
  {
    id: 15,
    lootRequired: true,
    loot: [{ id: 'story-15', type: 'foodPiece', foodId: 'pie', pieceId: 'pie_03' }],
    durationSeconds: 30,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
        coloredBug_red: 2.55,
        fat: 0.5,
        frozen: 0.2,
      },
    },
  },
  {
    id: 16,
    lootRequired: true,
    loot: [{ id: 'story-16', type: 'foodPiece', foodId: 'bundt_cake', pieceId: 'bundt_cake_01' }],
    durationSeconds: 22,
    params: {
      maxObjects: 3,
      lifetimeMultiplier: 1.65,
      spawnMultiplier: 1.3,
      spawnWeights: {
        coloredBug_purple: 1,
      },
    },
  },
  {
    id: 17,
    lootRequired: true,
    loot: [{ id: 'story-17', type: 'foodPiece', foodId: 'pie', pieceId: 'pie_04' }],
    durationSeconds: 30,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
        coloredBug_purple: 1.725,
        bomb: 0.15,
      },
    },
  },
  {
    id: 18,
    lootRequired: true,
    loot: [{ id: 'story-18', type: 'foodPiece', foodId: 'pie', pieceId: 'pie_05' }],
    durationSeconds: 30,
    params: {
      maxObjects: 3,
      lifetimeMultiplier: 1.2,
      spawnMultiplier: 1.3,
      spawnWeights: {
        coloredBug_red: 0.5,
        coloredBug_purple: 1,
      },
    },
  },
  {
    id: 19,
    lootRequired: true,
    loot: [{ id: 'story-19', type: 'foodPiece', foodId: 'bundt_cake', pieceId: 'bundt_cake_02' }],
    durationSeconds: 30,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1.2,
      spawnWeights: {
        bug: 1,
        coloredBug_red: 0.975,
        coloredBug_purple: 0.975,
        frozen: 0.3,
      },
    },
  },
  {
    id: 20,
    lootRequired: true,
    loot: [{ id: 'story-20', type: 'foodPiece', foodId: 'pie', pieceId: 'pie_06' }],
    durationSeconds: 30,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_red: 1,
        coloredBug_purple: 1,
        chameleon: 0.3,
      },
    },
    introPopup: {
      type: "chameleon",
      descryption: t('levels.005'),
    },
  },
  {
    id: 21,
    lootRequired: true,
    loot: [{ id: 'story-21', type: 'foodPiece', foodId: 'pie', pieceId: 'pie_07' }],
    durationSeconds: 30,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
        coloredBug_red: 1.005,
        coloredBug_purple: 1.005,
        bomb: 0.14,
        chameleon: 0.2,
      },
    },
  },
  {
    id: 22,
    lootRequired: true,
    loot: [{ id: 'story-22', type: 'foodPiece', foodId: 'pie', pieceId: 'pie_08' }],
    durationSeconds: 30,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
        coloredBug_red: 0.825,
        coloredBug_purple: 0.825,
        chameleon: 0.1,
      },
    },
  },
  {
    id: 23,
    lootRequired: true,
    loot: [{ id: 'story-23', type: 'foodPiece', foodId: 'pie', pieceId: 'pie_09' }],
    durationSeconds: 22,
    params: {
      maxObjects: 3,
      lifetimeMultiplier: 1.8,
      spawnMultiplier: 1.4,
      spawnWeights: {
        coloredBug_green: 1,
      },
    },
  },
  {
    id: 24,
    lootRequired: true,
    loot: [{ id: 'story-24', type: 'foodPiece', foodId: 'pie', pieceId: 'pie_10' }],
    durationSeconds: 28,
    params: {
      maxObjects: 3,
      lifetimeMultiplier: 1.5,
      spawnMultiplier: 1.2,
      spawnWeights: {
        coloredBug_green: 3,
        bug: 1,
      },
    },
  },
  {
    id: 25,
    lootRequired: true,
    loot: [{ id: 'story-25', type: 'foodPiece', foodId: 'bundt_cake', pieceId: 'bundt_cake_03' }],
    durationSeconds: 30,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1.45,
      spawnMultiplier: 1.15,
      spawnWeights: {
        coloredBug_green: 2,
        coloredBug_red: 2,
      },
    },
  },
  {
    id: 26,
    lootRequired: true,
    loot: [{ id: 'story-26', type: 'foodPiece', foodId: 'bundt_cake', pieceId: 'bundt_cake_04' }],
    durationSeconds: 30,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1.4,
      spawnMultiplier: 1.15,
      spawnWeights: {
        coloredBug_green: 2,
        coloredBug_purple: 2,
        bug: 1,
      },
    },
  },
  {
    id: 27,
    lootRequired: true,
    loot: [{ id: 'story-27', type: 'foodPiece', foodId: 'cake', pieceId: 'cake_01' }],
    durationSeconds: 32,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1.35,
      spawnMultiplier: 1.1,
      spawnWeights: {
        coloredBug_red: 1,
        coloredBug_purple: 1,
        coloredBug_green: 2,
        bomb: 0.35,
      },
    },
  },
  {
    id: 28,
    lootRequired: true,
    loot: [{ id: 'story-28', type: 'foodPiece', foodId: 'bundt_cake', pieceId: 'bundt_cake_05' }],
    durationSeconds: 32,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1.35,
      spawnMultiplier: 1.15,
      spawnWeights: {
        coloredBug_green: 2,
        fatColoredBug_green: 0.7,
        frozen: 0.3,
      },
    },
  },
  {
    id: 29,
    lootRequired: true,
    loot: [{ id: 'story-29', type: 'foodPiece', foodId: 'bundt_cake', pieceId: 'bundt_cake_06' }],
    durationSeconds: 35,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1.3,
      spawnMultiplier: 1.1,
      spawnWeights: {
        coloredBug_red: 1,
        coloredBug_purple: 1,
        coloredBug_green: 1,
        fat: 0.5,
        healer: 0.3,
      },
    },
  },
  {
    id: 30,
    lootRequired: true,
    loot: [{ id: 'story-30', type: 'foodPiece', foodId: 'bundt_cake', pieceId: 'bundt_cake_07' }],
    durationSeconds: 38,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1.3,
      spawnMultiplier: 1.1,
      spawnWeights: {
        coloredBug_red: 1,
        coloredBug_purple: 1,
        coloredBug_green: 1,
        bomb: 0.3,
        frozen: 0.3,
      },
    },
  },
  {
    id: 31,
    lootRequired: true,
    loot: [{ id: 'story-31', type: 'foodPiece', foodId: 'bundt_cake', pieceId: 'bundt_cake_08' }],
    durationSeconds: 22,
    params: {
      maxObjects: 3,
      lifetimeMultiplier: 1.8,
      spawnMultiplier: 1.4,
      spawnWeights: {
        coloredBug_yellow: 1,
      },
    },
  },
  {
    id: 32,
    lootRequired: true,
    loot: [{ id: 'story-32', type: 'foodPiece', foodId: 'cake', pieceId: 'cake_02' }],
    durationSeconds: 28,
    params: {
      maxObjects: 3,
      lifetimeMultiplier: 1.5,
      spawnMultiplier: 1.2,
      spawnWeights: {
        coloredBug_yellow: 3,
        bug: 1,
      },
    },
  },
  {
    id: 33,
    lootRequired: true,
    loot: [{ id: 'story-33', type: 'foodPiece', foodId: 'bundt_cake', pieceId: 'bundt_cake_09' }],
    durationSeconds: 30,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1.45,
      spawnMultiplier: 1.2,
      spawnWeights: {
        coloredBug_yellow: 2,
        coloredBug_purple: 2,
      },
    },
  },
  {
    id: 34,
    lootRequired: true,
    loot: [{ id: 'story-34', type: 'foodPiece', foodId: 'bundt_cake', pieceId: 'bundt_cake_10' }],
    durationSeconds: 30,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1.4,
      spawnMultiplier: 1.15,
      spawnWeights: {
        coloredBug_yellow: 2,
        coloredBug_green: 2,
      },
    },
  },
  {
    id: 35,
    lootRequired: true,
    loot: [{ id: 'story-35', type: 'foodPiece', foodId: 'bundt_cake', pieceId: 'bundt_cake_11' }],
    durationSeconds: 32,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1.4,
      spawnMultiplier: 1.15,
      spawnWeights: {
        coloredBug_yellow: 2,
        coloredBug_red: 2,
        bomb: 0.3,
      },
    },
  },
  {
    id: 36,
    lootRequired: true,
    loot: [{ id: 'story-36', type: 'foodPiece', foodId: 'bundt_cake', pieceId: 'bundt_cake_12' }],
    durationSeconds: 32,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1.4,
      spawnMultiplier: 1.2,
      spawnWeights: {
        coloredBug_yellow: 2,
        fatColoredBug_yellow: 0.7,
        frozen: 0.3,
      },
    },
  },
  {
    id: 37,
    lootRequired: true,
    loot: [{ id: 'story-37', type: 'foodPiece', foodId: 'cake', pieceId: 'cake_03' }],
    durationSeconds: 45,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1.4,
      spawnMultiplier: 1.2,
      spawnWeights: {
        neat: 0.3,
        coloredBug_red: 1,
        coloredBug_purple: 1,
        coloredBug_green: 1,
        coloredBug_yellow: 1,
      },
    },
  },
  {
    id: 38,
    lootRequired: true,
    loot: [{ id: 'story-38', type: 'foodPiece', foodId: 'cake', pieceId: 'cake_04' }],
    durationSeconds: 38,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1.35,
      spawnMultiplier: 1.15,
      spawnWeights: {
        coloredBug_red: 1,
        coloredBug_purple: 1,
        coloredBug_green: 1,
        coloredBug_yellow: 1,
        bomb: 0.4,
        healer: 0.3,
      },
    },
  },
  {
    id: 39,
    lootRequired: true,
    loot: [{ id: 'story-39', type: 'foodPiece', foodId: 'cake', pieceId: 'cake_05' }],
    durationSeconds: 40,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1.35,
      spawnMultiplier: 1.15,
      spawnWeights: {
        coloredBug_red: 1,
        coloredBug_purple: 1,
        coloredBug_green: 1,
        coloredBug_yellow: 1,
        fatColoredBug_red: 0.3,
        fatColoredBug_purple: 0.3,
        frozen: 0.3,
      },
    },
  },
  {
    id: 40,
    lootRequired: true,
    loot: [{ id: 'story-40', type: 'foodPiece', foodId: 'cake', pieceId: 'cake_06' }],
    durationSeconds: 90,
    ensureAllTypes: true,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1.3,
      spawnMultiplier: 1.1,
      helperLimit: 4,
      spawnWeights: {
        bug: 1,
        neat: 0.3,
        chameleon: 0.3,
        fatColoredBug_red: 0.3,
        fatColoredBug_purple: 0.3,
        fatColoredBug_green: 0.3,
        fatColoredBug_yellow: 0.3,
        coloredBug_red: 1,
        coloredBug_purple: 1,
        coloredBug_green: 1,
        coloredBug_yellow: 1,
        fat: 0.4,
        bomb: 0.4,
        frozen: 0.3,
        healer: 0.25,
      },
    },
  },
];

export default levels;
