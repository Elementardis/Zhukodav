const levels = [
  {
    id: 1,
    goalBugCount: 10,
    lifeCount: 5,
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
    goalBugCount: 15,
    lifeCount: 5,
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
    goalBugCount: 20,
    lifeCount: 5,
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
    goalBugCount: 30,
    lifeCount: 5,
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
    goalBugCount: 20,
    lifeCount: 7,
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
    goalBugCount: 45,
    lifeCount: 7,
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
    goalBugCount: 30,
    lifeCount: 7,
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
    goalBugCount: 45,
    lifeCount: 7,
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
    goalBugCount: 45,
    lifeCount: 7,
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
    goalBugCount: 20,
    lifeCount: 7,
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
    goalBugCount: 15,
    lifeCount: 7,
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
    goalBugCount: 30,
    lifeCount: 7,
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
    goalBugCount: 35,
    lifeCount: 7,
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
    goalBugCount: 45,
    lifeCount: 7,
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
    goalBugCount: 50,
    lifeCount: 7,
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
    goalBugCount: 30,
    lifeCount: 8,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1,
      spawnMultiplier: 0.8,
      spawnWeights: {
        coloredBug_blue: 1,
        frozen: 0.2,
      },
    },
    introPopup: {
      type: "coloredBug_blue",
      descryption: "НАЖМИ и Удерживай ФИОЛЕТВУЮ кнопку и нажми на ФИОЛЕТОВОГО жука!",
    },
  },
  {
    id: 17,
    goalBugCount: 40,
    lifeCount: 8,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
        coloredBug_blue: 0.5,
        bomb: 0.5,
      },
    },
  },
  {
    id: 18,
    goalBugCount: 45,
    lifeCount: 8,
    params: {
      maxObjects: 3,
      lifetimeMultiplier: 1.2,
      spawnMultiplier: 1.3,
      spawnWeights: {
        coloredBug_red: 0.5,
        coloredBug_blue: 1,
      },
    },
  },
  {
    id: 19,
    goalBugCount: 50,
    lifeCount: 8,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1.2,
      spawnWeights: {
        bug: 1,
        coloredBug_red: 0.5,
        coloredBug_blue: 0.5,
        frozen: 0.3,
      },
    },
  },
  {
    id: 20,
    goalBugCount: 50,
    lifeCount: 8,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_red: 1,
        coloredBug_blue: 1,
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
    goalBugCount: 55,
    lifeCount: 8,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
        coloredBug_red: 0.2,
        coloredBug_blue: 0.2,
        bomb: 0.5,
        chameleon: 0.2,
      },
    },
  },
  {
    id: 22,
    goalBugCount: 55,
    lifeCount: 8,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
        coloredBug_red: 0.2,
        coloredBug_blue: 0.2,
        chameleon: 0.1,
      },
    },
  },
  {
    id: 23,
    goalBugCount: 55,
    lifeCount: 8,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_red: 1,
        coloredBug_blue: 1,
        chameleon: 0.1,
      },
    },
  },
  {
    id: 24,
    goalBugCount: 55,
    lifeCount: 8,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
        coloredBug_red: 0.3,
        coloredBug_blue: 0.3,
        chameleon: 0.1,
      },
    },
  },
  {
    id: 25,
    goalBugCount: 55,
    lifeCount: 8,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_red: 1,
        coloredBug_blue: 1,
        bomb: 0.5,
        frozen: 0.1,
      },
    },
  },
  {
    id: 26,
    goalBugCount: 50,
    lifeCount: 10,
    params: {
      maxObjects: 3,
      lifetimeMultiplier: 1.2,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_red: 0.2,
        fat: 1,
        coloredBug_blue: 0.2,
        chameleon: 0.3,
      },
    },
  },
  {
    id: 27,
    goalBugCount: 50,
    lifeCount: 10,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1.3,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_red: 0.2,
        fat: 1,
        coloredBug_blue: 0.2,
        frozen: 0.5,
        chameleon: 0.2,
      },
    },
  },
  {
    id: 28,
    goalBugCount: 50,
    lifeCount: 10,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1.3,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_red: 0.2,
        fat: 1,
        coloredBug_blue: 0.3,
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
    goalBugCount: 50,
    lifeCount: 10,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_red: 0.2,
        fat: 1,
        coloredBug_blue: 0.2,
        bomb: 1,
        healer: 0.5,
      },
    },
  },
  {
    id: 30,
    goalBugCount: 45,
    lifeCount: 10,
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
    goalBugCount: 60,
    lifeCount: 10,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
        coloredBug_red: 0.5,
        coloredBug_blue: 0.5,
      },
    },
  },
  {
    id: 32,
    goalBugCount: 60,
    lifeCount: 10,
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
    goalBugCount: 60,
    lifeCount: 10,
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
    goalBugCount: 60,
    lifeCount: 10,
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
    goalBugCount: 60,
    lifeCount: 10,
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
    goalBugCount: 60,
    lifeCount: 10,
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
    goalBugCount: 60,
    lifeCount: 10,
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
    goalBugCount: 60,
    lifeCount: 10,
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
    goalBugCount: 60,
    lifeCount: 10,
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
    goalBugCount: 60,
    lifeCount: 10,
    params: {
      maxObjects: 3,
      lifetimeMultiplier: 1.2,
      spawnMultiplier: 1,
      spawnWeights: {
        fat: 1,
        coloredBug_blue: 0.3,
        fatColoredBug_red: 0.3,
        neat: 0.5,
      },
    },
  },
  {
    id: 41,
    goalBugCount: 60,
    lifeCount: 10,
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
    goalBugCount: 60,
    lifeCount: 10,
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
    goalBugCount: 60,
    lifeCount: 10,
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
    goalBugCount: 45,
    lifeCount: 10,
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
    goalBugCount: 60,
    lifeCount: 10,
    params: {
      maxObjects: 6,
      lifetimeMultiplier: 1.5,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_red: 1,
        coloredBug_blue: 1,
        coloredBug_green: 2,
        chameleon: 1,
      },
    },
  },
  {
    id: 46,
    goalBugCount: 60,
    lifeCount: 10,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1.4,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
        coloredBug_blue: 1,
        coloredBug_green: 1,
        chameleon: 0.3,
      },
    },
  },
  {
    id: 47,
    goalBugCount: 60,
    lifeCount: 10,
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
    goalBugCount: 60,
    lifeCount: 10,
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
    goalBugCount: 60,
    lifeCount: 10,
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
    goalBugCount: 60,
    lifeCount: 10,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1.5,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
        coloredBug_red: 1,
        fat: 1,
        coloredBug_blue: 1,
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
    goalBugCount: 30,
    lifeCount: 10,
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
    goalBugCount: 60,
    lifeCount: 10,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1.4,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_blue: 1,
        coloredBug_yellow: 1,
      },
    },
  },
  {
    id: 53,
    goalBugCount: 60,
    lifeCount: 10,
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
    goalBugCount: 60,
    lifeCount: 10,
    params: {
      maxObjects: 3,
      lifetimeMultiplier: 2,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_red: 1,
        coloredBug_blue: 1,
        coloredBug_green: 1,
        coloredBug_yellow: 1,
        chameleon: 0.5,
      },
    },
  },
  {
    id: 55,
    goalBugCount: 60,
    lifeCount: 10,
    params: {
      maxObjects: 3,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_red: 1,
        coloredBug_blue: 1,
        coloredBug_green: 1,
        coloredBug_yellow: 1,
        neat: 2,
        healer: 3,
      },
    },
  },
  {
    id: 56,
    goalBugCount: 75,
    lifeCount: 10,
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
    goalBugCount: 75,
    lifeCount: 10,
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
    goalBugCount: 75,
    lifeCount: 10,
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
    goalBugCount: 75,
    lifeCount: 10,
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
    goalBugCount: 75,
    lifeCount: 10,
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
    goalBugCount: 75,
    lifeCount: 10,
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
    goalBugCount: 75,
    lifeCount: 10,
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
    goalBugCount: 75,
    lifeCount: 10,
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
    goalBugCount: 75,
    lifeCount: 10,
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
    goalBugCount: 75,
    lifeCount: 10,
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
    goalBugCount: 75,
    lifeCount: 10,
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
    goalBugCount: 75,
    lifeCount: 10,
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
    goalBugCount: 75,
    lifeCount: 10,
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
    goalBugCount: 75,
    lifeCount: 10,
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
    goalBugCount: 75,
    lifeCount: 10,
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
    goalBugCount: 75,
    lifeCount: 10,
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
    goalBugCount: 75,
    lifeCount: 10,
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
    goalBugCount: 75,
    lifeCount: 10,
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
    goalBugCount: 75,
    lifeCount: 10,
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
    goalBugCount: 75,
    lifeCount: 10,
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
    goalBugCount: 75,
    lifeCount: 10,
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
    goalBugCount: 75,
    lifeCount: 10,
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
    goalBugCount: 75,
    lifeCount: 10,
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
    goalBugCount: 75,
    lifeCount: 10,
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
    goalBugCount: 75,
    lifeCount: 10,
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