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
      descryption: "Берегись! Жуки-бомбардиры снимают жизни",
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
    goalBugCount: 30,
    lifeCount: 5,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
        bomb: 0.5,
      },
    },
  },
  {
    id: 6,
    goalBugCount: 30,
    lifeCount: 5,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1.2,
      spawnMultiplier: 0.9,
      spawnWeights: {
        bug: 1,
        bomb: 0.3,
      },
    },
  },
  {
    id: 7,
    goalBugCount: 45,
    lifeCount: 5,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
        bomb: 1,
      },
    },
  },
  {
    id: 8,
    goalBugCount: 30,
    lifeCount: 5,
    params: {
      maxObjects: 6,
      lifetimeMultiplier: 1.3,
      spawnMultiplier: 1.2,
      spawnWeights: {
        bug: 2,
        bomb: 0.5,
      },
    },
  },
  {
    id: 9,
    goalBugCount: 30,
    lifeCount: 5,
    params: {
      maxObjects: 6,
      lifetimeMultiplier: 1.1,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 2,
        bomb: 1,
      },
    },
  },
  {
    id: 10,
    goalBugCount: 20,
    lifeCount: 7,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1,
      spawnMultiplier: 0.7,
      spawnWeights: {
        bug: 1,
        bomb: 0.3,
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
        bug: 0.5,
        fat: 1,
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
        bug: 0.7,
        fat: 1,
      },
    },
  },
  {
    id: 13,
    goalBugCount: 45,
    lifeCount: 7,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 0.9,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 0.8,
        fat: 1,
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
      },
    },
  },
  {
    id: 15,
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
    id: 16,
    goalBugCount: 45,
    lifeCount: 7,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1.2,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
        coloredBug_red: 1,
      },
    },
  },
  {
    id: 17,
    goalBugCount: 30,
    lifeCount: 7,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1.1,
      spawnMultiplier: 1.2,
      spawnWeights: {
        coloredBug_red: 1,
        bomb: 0.5,
      },
    },
  },
  {
    id: 18,
    goalBugCount: 60,
    lifeCount: 7,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1,
      spawnMultiplier: 0.7,
      spawnWeights: {
        bug: 0.5,
        coloredBug_red: 1,
        fat: 0.5,
      },
    },
  },
  {
    id: 19,
    goalBugCount: 60,
    lifeCount: 7,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1,
      spawnMultiplier: 0.7,
      spawnWeights: {
        bug: 0.5,
        coloredBug_red: 0.4,
        fat: 1,
      },
    },
  },
  {
    id: 20,
    goalBugCount: 60,
    lifeCount: 7,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
        coloredBug_red: 0.3,
        fat: 0.5,
      },
    },
  },
  {
    id: 21,
    goalBugCount: 60,
    lifeCount: 8,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1,
      spawnMultiplier: 0.8,
      spawnWeights: {
        bug: 1,
        coloredBug_red: 0.5,
        bomb: 0.5,
      },
    },
  },
  {
    id: 22,
    goalBugCount: 60,
    lifeCount: 8,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_blue: 1,
      },
    },
    introPopup: {
      type: "coloredBug_blue",
      descryption: "НАЖМИ и Удерживай СИНЮЮ кнопку и нажми на СИНЕГО жука!",
    },
  },
  {
    id: 23,
    goalBugCount: 60,
    lifeCount: 8,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1.2,
      spawnMultiplier: 1.3,
      spawnWeights: {
        coloredBug_red: 0.5,
        coloredBug_blue: 1,
      },
    },
  },
  {
    id: 24,
    goalBugCount: 60,
    lifeCount: 8,
    params: {
      maxObjects: 3,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1.2,
      spawnWeights: {
        coloredBug_red: 1,
        coloredBug_blue: 1,
      },
    },
  },
  {
    id: 25,
    goalBugCount: 60,
    lifeCount: 8,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_red: 1,
        coloredBug_blue: 1,
        bomb: 0.3,
      },
    },
  },
  {
    id: 26,
    goalBugCount: 60,
    lifeCount: 8,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_red: 1,
        coloredBug_blue: 0.5,
        bomb: 0.5,
      },
    },
  },
  {
    id: 27,
    goalBugCount: 60,
    lifeCount: 8,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
        coloredBug_red: 1,
        coloredBug_blue: 1,
      },
    },
  },
  {
    id: 28,
    goalBugCount: 60,
    lifeCount: 8,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_red: 1,
        fat: 0.3,
        coloredBug_blue: 1,
      },
    },
  },
  {
    id: 29,
    goalBugCount: 60,
    lifeCount: 8,
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
    id: 30,
    goalBugCount: 60,
    lifeCount: 8,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_red: 0.5,
        fat: 1,
        coloredBug_blue: 0.5,
      },
    },
  },
  {
    id: 31,
    goalBugCount: 60,
    lifeCount: 10,
    params: {
      maxObjects: 3,
      lifetimeMultiplier: 1.2,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
        coloredBug_red: 1,
        fat: 0.5,
        coloredBug_blue: 1,
      },
    },
  },
  {
    id: 32,
    goalBugCount: 60,
    lifeCount: 10,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1.3,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
        coloredBug_red: 1,
        fat: 0.5,
        coloredBug_blue: 1,
      },
    },
  },
  {
    id: 33,
    goalBugCount: 60,
    lifeCount: 10,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1.3,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_red: 1,
        fat: 0.5,
        coloredBug_blue: 1,
        bomb: 1,
      },
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
        coloredBug_red: 1,
        fat: 0.5,
        coloredBug_blue: 1,
        bomb: 1,
      },
    },
  },
  {
    id: 35,
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
    id: 36,
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
    id: 37,
    goalBugCount: 60,
    lifeCount: 10,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_red: 0.5,
        coloredBug_blue: 0.5,
        fatColoredBug_red: 1,
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
        fat: 1,
        fatColoredBug_red: 1,
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
        fat: 0.5,
        bomb: 1,
        fatColoredBug_red: 0.5,
      },
    },
  },
  {
    id: 40,
    goalBugCount: 60,
    lifeCount: 10,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 0.8,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
        fat: 1,
        fatColoredBug_red: 1,
        frozen: 0.3,
      },
    },
    introPopup: {
      type: "frozen",
      descryption: "Это твой помощник. ЗАМЕДЛЯЕТ других жуков!",
    },
  },
  {
    id: 41,
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
  },
  {
    id: 42,
    goalBugCount: 60,
    lifeCount: 10,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        fat: 1,
        coloredBug_blue: 1,
        fatColoredBug_red: 1,
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
        fat: 1,
        bomb: 1,
        fatColoredBug_red: 1,
      },
    },
  },
  {
    id: 44,
    goalBugCount: 60,
    lifeCount: 10,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_red: 1,
        bomb: 1,
        fatColoredBug_red: 1,
      },
    },
  },
  {
    id: 45,
    goalBugCount: 60,
    lifeCount: 10,
    params: {
      maxObjects: 3,
      lifetimeMultiplier: 1.2,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
        coloredBug_red: 1,
        fat: 1,
        coloredBug_blue: 1,
        bomb: 1,
        fatColoredBug_red: 1,
        frozen: 0.4,
      },
    },
  },
  {
    id: 46,
    goalBugCount: 60,
    lifeCount: 10,
    params: {
      maxObjects: 6,
      lifetimeMultiplier: 1,
      spawnMultiplier: 0.9,
      spawnWeights: {
        bug: 1,
        bomb: 0.6,
      },
    },
  },
  {
    id: 47,
    goalBugCount: 60,
    lifeCount: 10,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1.2,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 0.4,
        coloredBug_red: 1,
        coloredBug_blue: 1,
      },
    },
  },
  {
    id: 48,
    goalBugCount: 30,
    lifeCount: 10,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_green: 1,
      },
    },
    introPopup: {
      type: "coloredBug_green",
      descryption: "НАЖМИ и Удерживай ЗЕЛЁНУЮ кнопку и нажми на ЗЕЛЁНОГО жука!",
    },
  },
  {
    id: 49,
    goalBugCount: 45,
    lifeCount: 10,
    params: {
      maxObjects: 6,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_red: 1,
        coloredBug_green: 1,
        frozen: 0.1,
      },
    },
  },
  {
    id: 50,
    goalBugCount: 75,
    lifeCount: 10,
    params: {
      maxObjects: 6,
      lifetimeMultiplier: 1.5,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_red: 1,
        coloredBug_blue: 1,
        coloredBug_green: 1,
        frozen: 0.2,
      },
    },
  },
  {
    id: 51,
    goalBugCount: 75,
    lifeCount: 10,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1.4,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
        coloredBug_green: 1,
        fatColoredBug_red: 1,
        frozen: 0.1,
      },
    },
  },
  {
    id: 52,
    goalBugCount: 75,
    lifeCount: 10,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_red: 1,
        coloredBug_blue: 1,
        coloredBug_green: 1,
        fatColoredBug_red: 1,
        frozen: 0.1,
      },
    },
  },
  {
    id: 53,
    goalBugCount: 75,
    lifeCount: 10,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1.2,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_blue: 1,
        bomb: 1,
        coloredBug_green: 1,
        frozen: 0.1,
      },
    },
  },
  {
    id: 54,
    goalBugCount: 75,
    lifeCount: 10,
    params: {
      maxObjects: 4,
      lifetimeMultiplier: 0.7,
      spawnMultiplier: 1,
      spawnWeights: {
        bug: 1,
        coloredBug_red: 1,
        coloredBug_blue: 1,
        bomb: 1,
        coloredBug_green: 1,
        frozen: 0.2,
      },
    },
  },
  {
    id: 55,
    goalBugCount: 75,
    lifeCount: 10,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1.5,
      spawnMultiplier: 1,
      spawnWeights: {
        coloredBug_red: 1,
        fat: 1,
        coloredBug_blue: 1,
        coloredBug_green: 1,
      },
    },
  },
  {
    id: 56,
    goalBugCount: 75,
    lifeCount: 10,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1.5,
      spawnMultiplier: 1,
      spawnWeights: {
        fatColoredBug_blue: 1,
      },
    },
  },
  {
    id: 57,
    goalBugCount: 75,
    lifeCount: 10,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1.4,
      spawnMultiplier: 1,
      spawnWeights: {

      },
    },
  },
  {
    id: 58,
    goalBugCount: 75,
    lifeCount: 10,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {

      },
    },
  },
  {
    id: 59,
    goalBugCount: 75,
    lifeCount: 10,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1.2,
      spawnMultiplier: 1,
      spawnWeights: {

      },
    },
  },
  {
    id: 60,
    goalBugCount: 75,
    lifeCount: 10,
    params: {
      maxObjects: 6,
      lifetimeMultiplier: 0.7,
      spawnMultiplier: 1,
      spawnWeights: {

      },
    },
  },
  {
    id: 61,
    goalBugCount: 75,
    lifeCount: 10,
    params: {
      maxObjects: 6,
      lifetimeMultiplier: 1.5,
      spawnMultiplier: 1,
      spawnWeights: {

      },
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

      },
    },
  },
  {
    id: 63,
    goalBugCount: 75,
    lifeCount: 10,
    params: {
      maxObjects: 6,
      lifetimeMultiplier: 1.4,
      spawnMultiplier: 1,
      spawnWeights: {

      },
    },
  },
  {
    id: 64,
    goalBugCount: 75,
    lifeCount: 10,
    params: {
      maxObjects: 6,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {

      },
    },
  },
  {
    id: 65,
    goalBugCount: 75,
    lifeCount: 10,
    params: {
      maxObjects: 6,
      lifetimeMultiplier: 1.2,
      spawnMultiplier: 1,
      spawnWeights: {

      },
    },
  },
  {
    id: 66,
    goalBugCount: 75,
    lifeCount: 10,
    params: {
      maxObjects: 6,
      lifetimeMultiplier: 0.7,
      spawnMultiplier: 1,
      spawnWeights: {

      },
    },
  },
  {
    id: 67,
    goalBugCount: 75,
    lifeCount: 10,
    params: {
      maxObjects: 6,
      lifetimeMultiplier: 1.5,
      spawnMultiplier: 1,
      spawnWeights: {

      },
    },
  },
  {
    id: 68,
    goalBugCount: 75,
    lifeCount: 10,
    params: {
      maxObjects: 6,
      lifetimeMultiplier: 1.5,
      spawnMultiplier: 1,
      spawnWeights: {

      },
    },
  },
  {
    id: 69,
    goalBugCount: 75,
    lifeCount: 10,
    params: {
      maxObjects: 6,
      lifetimeMultiplier: 1.4,
      spawnMultiplier: 1,
      spawnWeights: {

      },
    },
  },
  {
    id: 70,
    goalBugCount: 75,
    lifeCount: 10,
    params: {
      maxObjects: 6,
      lifetimeMultiplier: 1,
      spawnMultiplier: 1,
      spawnWeights: {

      },
    },
  },
  {
    id: 71,
    goalBugCount: 75,
    lifeCount: 10,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1.2,
      spawnMultiplier: 1,
      spawnWeights: {

      },
    },
  },
  {
    id: 72,
    goalBugCount: 75,
    lifeCount: 10,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 0.7,
      spawnMultiplier: 1,
      spawnWeights: {

      },
    },
  },
  {
    id: 73,
    goalBugCount: 75,
    lifeCount: 10,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1.5,
      spawnMultiplier: 1,
      spawnWeights: {

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

      },
    },
  },
  {
    id: 75,
    goalBugCount: 75,
    lifeCount: 10,
    params: {
      maxObjects: 5,
      lifetimeMultiplier: 1.4,
      spawnMultiplier: 1,
      spawnWeights: {

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
