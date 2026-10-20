const levels = [
  {
    id: 1,
    durationSeconds: 10,
    food: 'pizza',
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
    durationSeconds: 15,
    food: 'pizza',
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
    durationSeconds: 20,
    food: 'pizza',
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
    durationSeconds: 30,
    food: 'pizza',
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
    durationSeconds: 20,
    food: 'pizza',
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
    durationSeconds: 30,
    food: 'pizza',
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
    durationSeconds: 30,
    food: 'pizza',
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
    durationSeconds: 30,
    food: 'pizza',
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
    durationSeconds: 30,
    food: 'pizza',
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
    durationSeconds: 30,
    food: 'pizza',
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
    durationSeconds: 30,
    food: 'pizza',
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
    durationSeconds: 30,
    food: 'pizza',
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
    durationSeconds: 35,
    food: 'pizza',
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
    durationSeconds: 30,
    food: 'pizza',
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
    durationSeconds: 30,
    food: 'pizza',
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
    durationSeconds: 30,
    food: 'pizza',
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
    durationSeconds: 30,
    food: 'pizza',
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
    durationSeconds: 30,
    food: 'pizza',
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
    durationSeconds: 30,
    food: 'pizza',
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
    durationSeconds: 30,
    food: 'pizza',
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
    durationSeconds: 30,
    food: 'pizza',
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
    durationSeconds: 30,
    food: 'pizza',
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
    durationSeconds: 30,
    food: 'pizza',
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
    durationSeconds: 30,
    food: 'pizza',
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
    durationSeconds: 30,
    food: 'pizza',
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
    durationSeconds: 30,
    food: 'pizza',
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
    durationSeconds: 30,
    food: 'pizza',
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
    durationSeconds: 30,
    food: 'pizza',
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
    durationSeconds: 30,
    food: 'pizza',
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
    durationSeconds: 30,
    food: 'pizza',
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
    durationSeconds: 30,
    food: 'pizza',
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
    durationSeconds: 30,
    food: 'pizza',
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
    durationSeconds: 60,
    food: 'pizza',
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
    durationSeconds: 60,
    food: 'pizza',
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
    durationSeconds: 60,
    food: 'pizza',
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
    durationSeconds: 60,
    food: 'pizza',
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
    durationSeconds: 60,
    food: 'pizza',
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
    durationSeconds: 60,
    food: 'pizza',
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
    durationSeconds: 60,
    food: 'pizza',
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
    durationSeconds: 60,
    food: 'pizza',
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
    food: 'pizza',
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
    food: 'pizza',
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
    food: 'pizza',
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
    food: 'pizza',
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
    food: 'pizza',
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
    food: 'pizza',
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
    food: 'pizza',
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
    food: 'pizza',
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
    food: 'pizza',
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
    food: 'pizza',
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
    food: 'pizza',
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
    food: 'pizza',
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
    food: 'pizza',
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
    food: 'pizza',
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
    food: 'pizza',
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
    food: 'pizza',
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
    food: 'pizza',
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
    food: 'pizza',
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
    food: 'pizza',
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
    food: 'pizza',
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
    food: 'pizza',
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
    food: 'pizza',
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
    food: 'pizza',
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
    food: 'pizza',
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
    food: 'pizza',
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
    food: 'pizza',
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
    food: 'pizza',
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
    food: 'pizza',
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
    food: 'pizza',
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
    food: 'pizza',
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
    food: 'pizza',
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
    food: 'pizza',
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
    food: 'pizza',
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
    food: 'pizza',
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
    food: 'pizza',
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
    food: 'pizza',
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
    food: 'pizza',
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
    food: 'pizza',
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
    food: 'pizza',
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
    food: 'pizza',
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