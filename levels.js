// История: уровни 1–40. Уровни 41–80 сохранены как резерв, без сюжетного лута.
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
        bomb: 1,
      },
    },
    introPopup: {
      type: "bomb",
      descryption: "Берегись! Жуки-бомбардиры снимают жизни, если их тронуть",
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
        bug: 0.5,
        bomb: 1,
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
      descryption: "НАЖМИ и Удерживай КРАСНУЮ кнопку и нажми на КРАСНОГО жука!",
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
        coloredBug_red: 0.5,
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
        coloredBug_red: 0.3,
        bomb: 0.5,
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
      descryption: "Это твой помощник. ЗАМЕДЛЯЕТ других жуков!",
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
        coloredBug_red: 0.4,
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
        bug: 1,
        fat: 0.3,
      },
    },
    introPopup: {
      type: "fat",
      descryption: "Нужно нажать 3 раза, чтобы Толстяк убежал",
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
        bug: 1,
        fat: 0.4,
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
        bug: 1,
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
        bug: 1,
        fat: 0.5,
        bomb: 0.3,
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
        coloredBug_red: 0.3,
        fat: 0.5,
        frozen: 0.2,
      },
    },
  },
  {
    id: 16,
    lootRequired: true,
    loot: [{ id: 'story-16', type: 'foodPiece', foodId: 'bundt_cake', pieceId: 'bundt_cake_01' }],
    durationSeconds: 30,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1,
      spawnMultiplier: 0.8,
      spawnWeights: {
        coloredBug_purple: 1,
        frozen: 0.2,
      },
    },
    introPopup: {
      type: "coloredBug_purple",
      descryption: "НАЖМИ и Удерживай ФИОЛЕТВУЮ кнопку и нажми на ФИОЛЕТОВОГО жука!",
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
        coloredBug_purple: 0.5,
        bomb: 0.5,
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
        coloredBug_red: 0.5,
        coloredBug_purple: 0.5,
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
      descryption: "ХАМЕЛЕОН делает поле радужным. можешь нажимать на всех жуков",
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
        coloredBug_red: 0.2,
        coloredBug_purple: 0.2,
        bomb: 0.5,
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
        coloredBug_red: 0.2,
        coloredBug_purple: 0.2,
        chameleon: 0.1,
      },
    },
  },
  {
    id: 23,
    lootRequired: true,
    loot: [{ id: 'story-23', type: 'foodPiece', foodId: 'pie', pieceId: 'pie_09' }],
    durationSeconds: 30,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_red: 1,
        coloredBug_purple: 1,
        chameleon: 0.1,
      },
    },
  },
  {
    id: 24,
    lootRequired: true,
    loot: [{ id: 'story-24', type: 'foodPiece', foodId: 'pie', pieceId: 'pie_10' }],
    durationSeconds: 30,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
        coloredBug_red: 0.3,
        coloredBug_purple: 0.3,
        chameleon: 0.1,
      },
    },
  },
  {
    id: 25,
    lootRequired: true,
    loot: [{ id: 'story-25', type: 'foodPiece', foodId: 'bundt_cake', pieceId: 'bundt_cake_03' }],
    durationSeconds: 30,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_red: 1,
        coloredBug_purple: 1,
        bomb: 0.5,
        frozen: 0.1,
      },
    },
  },
  {
    id: 26,
    lootRequired: true,
    loot: [{ id: 'story-26', type: 'foodPiece', foodId: 'bundt_cake', pieceId: 'bundt_cake_04' }],
    durationSeconds: 30,
    params: {
      maxObjects: 3,
      lifetimeMultiplier: 1.2,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_red: 0.2,
        fat: 1,
        coloredBug_purple: 0.2,
        chameleon: 0.3,
      },
    },
  },
  {
    id: 27,
    lootRequired: true,
    loot: [{ id: 'story-27', type: 'foodPiece', foodId: 'cake', pieceId: 'cake_01' }],
    durationSeconds: 30,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1.3,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_red: 0.2,
        fat: 1,
        coloredBug_purple: 0.2,
        frozen: 0.5,
        chameleon: 0.2,
      },
    },
  },
  {
    id: 28,
    lootRequired: true,
    loot: [{ id: 'story-28', type: 'foodPiece', foodId: 'bundt_cake', pieceId: 'bundt_cake_05' }],
    durationSeconds: 30,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1.3,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_red: 0.2,
        fat: 1,
        coloredBug_purple: 0.3,
        bomb: 1,
        healer: 1,
      },
    },
    introPopup: {
      type: "healer",
      descryption: "НАЖМИ, он добавит жизней",
    },
  },
  {
    id: 29,
    lootRequired: true,
    loot: [{ id: 'story-29', type: 'foodPiece', foodId: 'bundt_cake', pieceId: 'bundt_cake_06' }],
    durationSeconds: 30,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_red: 0.2,
        fat: 1,
        coloredBug_purple: 0.2,
        bomb: 1,
        healer: 0.5,
      },
    },
  },
  {
    id: 30,
    lootRequired: true,
    loot: [{ id: 'story-30', type: 'foodPiece', foodId: 'bundt_cake', pieceId: 'bundt_cake_07' }],
    durationSeconds: 30,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
        fat: 1,
        bomb: 3,
        healer: 0.4,
      },
    },
  },
  {
    id: 31,
    lootRequired: true,
    loot: [{ id: 'story-31', type: 'foodPiece', foodId: 'bundt_cake', pieceId: 'bundt_cake_08' }],
    durationSeconds: 30,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
        coloredBug_red: 0.5,
        coloredBug_purple: 0.5,
      },
    },
  },
  {
    id: 32,
    lootRequired: true,
    loot: [{ id: 'story-32', type: 'foodPiece', foodId: 'cake', pieceId: 'cake_02' }],
    durationSeconds: 30,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
        coloredBug_red: 0.3,
        fat: 0.6,
        frozen: 0.2,
      },
    },
  },
  {
    id: 33,
    lootRequired: true,
    loot: [{ id: 'story-33', type: 'foodPiece', foodId: 'bundt_cake', pieceId: 'bundt_cake_09' }],
    durationSeconds: 60,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_red: 1,
        fatColoredBug_red: 1,
      },
    },
    introPopup: {
      type: "fatColoredBug_red",
      descryption: "НАЖМИ и Удерживай КРАСНУЮ кнопку и нажми 3 раза на КРАСНОГО жука!",
    },
  },
  {
    id: 34,
    lootRequired: true,
    loot: [{ id: 'story-34', type: 'foodPiece', foodId: 'bundt_cake', pieceId: 'bundt_cake_10' }],
    durationSeconds: 60,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_red: 0.5,
        fatColoredBug_red: 1,
      },
    },
  },
  {
    id: 35,
    lootRequired: true,
    loot: [{ id: 'story-35', type: 'foodPiece', foodId: 'bundt_cake', pieceId: 'bundt_cake_11' }],
    durationSeconds: 60,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 0.8,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
        coloredBug_red: 0.5,
        fatColoredBug_red: 1,
        chameleon: 0.4,
      },
    },
  },
  {
    id: 36,
    lootRequired: true,
    loot: [{ id: 'story-36', type: 'foodPiece', foodId: 'bundt_cake', pieceId: 'bundt_cake_12' }],
    durationSeconds: 60,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
        fat: 0.3,
        fatColoredBug_red: 0.3,
        chameleon: 0.1,
      },
    },
  },
  {
    id: 37,
    lootRequired: true,
    loot: [{ id: 'story-37', type: 'foodPiece', foodId: 'cake', pieceId: 'cake_03' }],
    durationSeconds: 60,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
        fat: 0.3,
        bomb: 0.4,
        fatColoredBug_red: 0.3,
        frozen: 0.2,
      },
    },
  },
  {
    id: 38,
    lootRequired: true,
    loot: [{ id: 'story-38', type: 'foodPiece', foodId: 'cake', pieceId: 'cake_04' }],
    durationSeconds: 60,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
        fat: 0.5,
        fatColoredBug_red: 0.5,
        frozen: 0.2,
      },
    },
  },
  {
    id: 39,
    lootRequired: true,
    loot: [{ id: 'story-39', type: 'foodPiece', foodId: 'cake', pieceId: 'cake_05' }],
    durationSeconds: 60,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
        fat: 1,
        neat: 1,
      },
    },
    introPopup: {
      type: "neat",
      descryption: "О,ЧИСТИльщик всех жуков на поле",
    },
  },
  {
    id: 40,
    lootRequired: true,
    loot: [{ id: 'story-40', type: 'foodPiece', foodId: 'cake', pieceId: 'cake_06' }],
    durationSeconds: 60,
    params: {
      maxObjects: 3,
      lifetimeMultiplier: 1.2,
      spawnMultiplier: 1,
      spawnWeights: {
        fat: 1,
        coloredBug_purple: 0.3,
        fatColoredBug_red: 0.3,
        neat: 0.5,
      },
    },
  },
  {
    id: 41,
    durationSeconds: 60,
    params: {
      maxObjects: 6,
      lifetimeMultiplier: 1,
      spawnMultiplier: 0.9,
      spawnWeights: {
        fat: 1,
        bomb: 1,
        fatColoredBug_red: 1,
        neat: 0.3,
      },
    },
  },
  {
    id: 42,
    durationSeconds: 60,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1.2,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_red: 1,
        bomb: 1,
        fatColoredBug_red: 1,
        neat: 0.3,
      },
    },
  },
  {
    id: 43,
    durationSeconds: 60,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
        coloredBug_green: 1,
      },
    },
    introPopup: {
      type: "coloredBug_green",
      descryption: "НАЖМИ и Удерживай ЗЕЛЁНУЮ кнопку и нажми на ЗЕЛЁНОГО жука!",
    },
  },
  {
    id: 44,
    durationSeconds: 45,
    params: {
      maxObjects: 6,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_red: 1,
        bomb: 0.6,
        coloredBug_green: 1,
      },
    },
  },
  {
    id: 45,
    durationSeconds: 60,
    params: {
      maxObjects: 6,
      lifetimeMultiplier: 1.5,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_red: 1,
        coloredBug_purple: 1,
        coloredBug_green: 2,
        chameleon: 1,
      },
    },
  },
  {
    id: 46,
    durationSeconds: 60,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1.4,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
        coloredBug_purple: 1,
        coloredBug_green: 1,
        chameleon: 0.3,
      },
    },
  },
  {
    id: 47,
    durationSeconds: 60,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
        coloredBug_red: 1,
        coloredBug_green: 1,
        chameleon: 0.3,
      },
    },
  },
  {
    id: 48,
    durationSeconds: 60,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1.2,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
        fat: 1,
        coloredBug_green: 1,
        frozen: 1,
      },
    },
  },
  {
    id: 49,
    durationSeconds: 60,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 0.7,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
        fat: 1,
        bomb: 1,
        fatColoredBug_red: 1,
        healer: 1,
      },
    },
  },
  {
    id: 50,
    durationSeconds: 60,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1.5,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
        coloredBug_red: 1,
        fat: 1,
        coloredBug_purple: 1,
        bomb: 1,
        coloredBug_green: 1,
        fatColoredBug_red: 1,
        frozen: 1,
        chameleon: 1,
        neat: 1,
        healer: 1,
      },
    },
  },
  {
    id: 51,
    durationSeconds: 30,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1.5,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_yellow: 1,
      },
    },
    introPopup: {
      type: "coloredBug_yellow",
      descryption: "НАЖМИ и Удерживай ЖЁЛТУЮ кнопку и нажми на ЖЁЛТОГО жука!",
    },
  },
  {
    id: 52,
    durationSeconds: 60,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1.4,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_purple: 1,
        coloredBug_yellow: 1,
      },
    },
  },
  {
    id: 53,
    durationSeconds: 60,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 0.5,
        coloredBug_green: 1,
        coloredBug_yellow: 1,
      },
    },
  },
  {
    id: 54,
    durationSeconds: 60,
    params: {
      maxObjects: 3,
      lifetimeMultiplier: 2,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_red: 1,
        coloredBug_purple: 1,
        coloredBug_green: 1,
        coloredBug_yellow: 1,
        chameleon: 0.5,
      },
    },
  },
  {
    id: 55,
    durationSeconds: 60,
    params: {
      maxObjects: 3,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_red: 1,
        coloredBug_purple: 1,
        coloredBug_green: 1,
        coloredBug_yellow: 1,
        neat: 2,
        healer: 3,
      },
    },
  },
  {
    id: 56,
    durationSeconds: 75,
    params: {
      maxObjects: 6,
      lifetimeMultiplier: 1.5,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
      },
    },
  },
  {
    id: 57,
    durationSeconds: 75,
    params: {
      maxObjects: 6,
      lifetimeMultiplier: 1.5,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
      },
    },
  },
  {
    id: 58,
    durationSeconds: 75,
    params: {
      maxObjects: 6,
      lifetimeMultiplier: 1.4,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
      },
    },
  },
  {
    id: 59,
    durationSeconds: 75,
    params: {
      maxObjects: 6,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
      },
    },
  },
  {
    id: 60,
    durationSeconds: 75,
    params: {
      maxObjects: 6,
      lifetimeMultiplier: 1.2,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
      },
    },
  },
  {
    id: 61,
    durationSeconds: 75,
    params: {
      maxObjects: 6,
      lifetimeMultiplier: 0.7,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
      },
    },
    introPopup: {
      type: "fatColoredBug_green",
      descryption: "НАЖМИ и Удерживай ЗЕЛЁНУЮ кнопку и нажми 3 раза на КРАСНОГО жука!",
    },
  },
  {
    id: 62,
    durationSeconds: 75,
    params: {
      maxObjects: 6,
      lifetimeMultiplier: 1.5,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
      },
    },
  },
  {
    id: 63,
    durationSeconds: 75,
    params: {
      maxObjects: 6,
      lifetimeMultiplier: 1.5,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
      },
    },
  },
  {
    id: 64,
    durationSeconds: 75,
    params: {
      maxObjects: 6,
      lifetimeMultiplier: 1.4,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
      },
    },
  },
  {
    id: 65,
    durationSeconds: 75,
    params: {
      maxObjects: 6,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
      },
    },
  },
  {
    id: 66,
    durationSeconds: 75,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1.2,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
      },
    },
  },
  {
    id: 67,
    durationSeconds: 75,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 0.7,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
      },
    },
  },
  {
    id: 68,
    durationSeconds: 75,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1.5,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
      },
    },
  },
  {
    id: 69,
    durationSeconds: 75,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1.5,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
      },
    },
  },
  {
    id: 70,
    durationSeconds: 75,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1.4,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
      },
    },
  },
  {
    id: 71,
    durationSeconds: 75,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
      },
    },
  },
  {
    id: 72,
    durationSeconds: 75,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1.2,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
      },
    },
  },
  {
    id: 73,
    durationSeconds: 75,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 0.7,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
      },
    },
  },
  {
    id: 74,
    durationSeconds: 75,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1.5,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
      },
    },
  },
  {
    id: 75,
    durationSeconds: 75,
    params: {
      maxObjects: 6,
      lifetimeMultiplier: 0.5,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
      },
    },
  },
  {
    id: 76,
    durationSeconds: 75,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
      },
    },
  },
  {
    id: 77,
    durationSeconds: 75,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1.2,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
      },
    },
  },
  {
    id: 78,
    durationSeconds: 75,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 0.7,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
      },
    },
  },
  {
    id: 79,
    durationSeconds: 75,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1.5,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
      },
    },
  },
  {
    id: 80,
    durationSeconds: 75,
    params: {
      maxObjects: 6,
      lifetimeMultiplier: 0.5,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
      },
    },
  }
];

export default levels;
