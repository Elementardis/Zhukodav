// ========================== levels.js (v2) ==========================
// Методология баланса (коротко):
//   Давление = simultaneity * clickTax * colorTax
//   simultaneity ≈ min(maxObjects, objectLifetime / spawnInterval)
//   clickTax: среднее по весам типов (bug=1; colored=1; fat=3; fatColored=3)
//   colorTax: 1 + 0.15 * (N_colors - 1)   // ограничиваем до 3 цветов одновременно
//   Bombs: учитываются скорее как когнитивный шум (штраф только за клик).
// Цели по потоку:
//   1–3 онбординг (легко), 4–8 растяжка, 9–14 мастерство, 15 мини-пик,
//   16–18 разгрузка, 19–25 плавный рост к финалу без ям и пиков.
// Примечания по когн. нагрузке:
//   • Одновременно держим 2–3 цвета (ранее спайки из 4+ цветов не допускаем).
//   • В лейте растёт доля «толстых» (многокликовых) вместо чистого спама объектов.
// ====================================================================

const levels = [
  {
    "id": 1,
    "goalBugCount": 18,
    "lifeCount": 6,
    "params": {
      "maxObjects": 3,
      "spawnInterval": 520,
      "objectLifetime": 2300
    },
    "spawnWeights": {
      "bug": 1.0
    }
  },
  {
    "id": 2,
    "goalBugCount": 18,
    "lifeCount": 6,
    "params": {
      "maxObjects": 3,
      "spawnInterval": 480,
      "objectLifetime": 2250
    },
    "spawnWeights": {
      "bug": 0.8,
      "bomb": 0.4
    }
  },
  {
    "id": 3,
    "goalBugCount": 20,
    "lifeCount": 6,
    "params": {
      "maxObjects": 4,
      "spawnInterval": 450,
      "objectLifetime": 2200
    },
    "spawnWeights": {
      "bug": 0.8,
      "bomb": 0.5
    }
  },
  {
    "id": 4,
    "goalBugCount": 20,
    "lifeCount": 6,
    "params": {
      "maxObjects": 4,
      "spawnInterval": 420,
      "objectLifetime": 2150
    },
    "spawnWeights": {
      "bug": 0.7,
      "coloredBug_red": 0.5
    }
  },
  {
    "id": 5,
    "goalBugCount": 20,
    "lifeCount": 6,
    "params": {
      "maxObjects": 4,
      "spawnInterval": 400,
      "objectLifetime": 2100
    },
    "spawnWeights": {
      "bug": 0.6,
      "coloredBug_red": 0.6,
      "fat": 0.3
    }
  },
  {
    "id": 6,
    "goalBugCount": 20,
    "lifeCount": 6,
    "params": {
      "maxObjects": 4,
      "spawnInterval": 420,
      "objectLifetime": 2100
    },
    "spawnWeights": {
      "bug": 0.8,
      "coloredBug_red": 0.4,
      "coloredBug_blue": 0.4
    }
  },
  {
    "id": 7,
    "goalBugCount": 22,
    "lifeCount": 6,
    "params": {
      "maxObjects": 4,
      "spawnInterval": 380,
      "objectLifetime": 2050
    },
    "spawnWeights": {
      "bug": 0.6,
      "coloredBug_red": 0.6,
      "coloredBug_blue": 0.6,
      "fat": 0.3
    }
  },
  {
    "id": 8,
    "goalBugCount": 22,
    "lifeCount": 4,
    "params": {
      "maxObjects": 5,
      "spawnInterval": 360,
      "objectLifetime": 2000
    },
    "spawnWeights": {
      "bug": 0.5,
      "coloredBug_red": 0.6,
      "fat": 0.4,
      "fatColoredBug_red": 0.2
    }
  },
  {
    "id": 9,
    "goalBugCount": 22,
    "lifeCount": 5,
    "params": {
      "maxObjects": 5,
      "spawnInterval": 360,
      "objectLifetime": 2000
    },
    "spawnWeights": {
      "bug": 0.6,
      "coloredBug_red": 0.6,
      "coloredBug_blue": 0.6,
      "fat": 0.3
    }
  },
  {
    "id": 10,
    "goalBugCount": 22,
    "lifeCount": 5,
    "params": {
      "maxObjects": 5,
      "spawnInterval": 350,
      "objectLifetime": 1950
    },
    "spawnWeights": {
      "bug": 0.5,
      "fat": 0.3,
      "bomb": 0.2
    }
  },
  {
    "id": 11,
    "goalBugCount": 22,
    "lifeCount": 5,
    "params": {
      "maxObjects": 5,
      "spawnInterval": 350,
      "objectLifetime": 1950
    },
    "spawnWeights": {
      "bug": 0.55,
      "coloredBug_red": 0.55,
      "coloredBug_blue": 0.55,
      "fat": 0.25
    }
  },
  {
    "id": 12,
    "goalBugCount": 24,
    "lifeCount": 5,
    "params": {
      "maxObjects": 6,
      "spawnInterval": 340,
      "objectLifetime": 1900
    },
    "spawnWeights": {
      "bug": 0.45,
      "coloredBug_red": 0.55,
      "coloredBug_blue": 0.55,
      "coloredBug_green": 0.4,
      "fat": 0.35,
      "bomb": 0.2
    }
  },
  {
    "id": 13,
    "goalBugCount": 24,
    "lifeCount": 5,
    "params": {
      "maxObjects": 6,
      "spawnInterval": 340,
      "objectLifetime": 1850
    },
    "spawnWeights": {
      "bug": 0.45,
      "coloredBug_red": 0.55,
      "coloredBug_blue": 0.55,
      "fat": 0.35,
      "fatColoredBug_red": 0.2
    }
  },
  {
    "id": 14,
    "goalBugCount": 24,
    "lifeCount": 5,
    "params": {
      "maxObjects": 6,
      "spawnInterval": 330,
      "objectLifetime": 1850
    },
    "spawnWeights": {
      "bug": 0.4,
      "coloredBug_red": 0.5,
      "coloredBug_blue": 0.5,
      "coloredBug_green": 0.35,
      "fat": 0.35
    }
  },
  {
    "id": 15,
    "goalBugCount": 24,
    "lifeCount": 5,
    "params": {
      "maxObjects": 5,
      "spawnInterval": 320,
      "objectLifetime": 1900
    },
    "spawnWeights": {
      "bug": 0.4,
      "coloredBug_red": 0.55,
      "coloredBug_blue": 0.55,
      "coloredBug_green": 0.4,
      "fat": 0.35,
      "fatColoredBug_red": 0.3,
      "bomb": 0.2
    }
  },
  {
    "id": 16,
    "goalBugCount": 24,
    "lifeCount": 5,
    "params": {
      "maxObjects": 5,
      "spawnInterval": 340,
      "objectLifetime": 1850
    },
    "spawnWeights": {
      "bug": 0.5,
      "coloredBug_red": 0.5,
      "coloredBug_blue": 0.5,
      "fat": 0.3,
      "fatColoredBug_blue": 0.2
    }
  },
  {
    "id": 17,
    "goalBugCount": 24,
    "lifeCount": 5,
    "params": {
      "maxObjects": 6,
      "spawnInterval": 330,
      "objectLifetime": 1850
    },
    "spawnWeights": {
      "bug": 0.45,
      "coloredBug_red": 0.5,
      "coloredBug_blue": 0.5,
      "coloredBug_green": 0.35,
      "fat": 0.3,
      "fatColoredBug_blue": 0.2
    }
  },
  {
    "id": 18,
    "goalBugCount": 24,
    "lifeCount": 5,
    "params": {
      "maxObjects": 6,
      "spawnInterval": 330,
      "objectLifetime": 1800
    },
    "spawnWeights": {
      "bug": 0.4,
      "coloredBug_red": 0.5,
      "coloredBug_blue": 0.5,
      "coloredBug_green": 0.35,
      "fat": 0.35,
      "fatColoredBug_green": 0.25
    }
  },
  {
    "id": 19,
    "goalBugCount": 24,
    "lifeCount": 5,
    "params": {
      "maxObjects": 5,
      "spawnInterval": 420,
      "objectLifetime": 1750
    },
    "spawnWeights": {
      "bug": 0.5,
      "coloredBug_red": 0.5,
      "coloredBug_blue": 0.5,
      "fat": 0.3
    }
  },
  {
    "id": 20,
    "goalBugCount": 26,
    "lifeCount": 5,
    "params": {
      "maxObjects": 6,
      "spawnInterval": 380,
      "objectLifetime": 1700
    },
    "spawnWeights": {
      "bug": 0.45,
      "coloredBug_red": 0.5,
      "coloredBug_blue": 0.5,
      "coloredBug_green": 0.35,
      "fat": 0.35,
      "bomb": 0.2
    }
  },
  {
    "id": 21,
    "goalBugCount": 26,
    "lifeCount": 5,
    "params": {
      "maxObjects": 6,
      "spawnInterval": 360,
      "objectLifetime": 1700
    },
    "spawnWeights": {
      "bug": 0.4,
      "coloredBug_red": 0.5,
      "coloredBug_blue": 0.5,
      "coloredBug_green": 0.35,
      "fat": 0.35,
      "fatColoredBug_red": 0.25,
      "bomb": 0.2
    }
  },
  {
    "id": 22,
    "goalBugCount": 26,
    "lifeCount": 5,
    "params": {
      "maxObjects": 6,
      "spawnInterval": 340,
      "objectLifetime": 1650
    },
    "spawnWeights": {
      "bug": 0.35,
      "coloredBug_red": 0.5,
      "coloredBug_blue": 0.5,
      "coloredBug_green": 0.35,
      "fat": 0.35,
      "fatColoredBug_blue": 0.25,
      "bomb": 0.2
    }
  },
  {
    "id": 23,
    "goalBugCount": 26,
    "lifeCount": 5,
    "params": {
      "maxObjects": 7,
      "spawnInterval": 330,
      "objectLifetime": 1650
    },
    "spawnWeights": {
      "bug": 0.35,
      "coloredBug_red": 0.5,
      "coloredBug_blue": 0.5,
      "coloredBug_green": 0.35,
      "fat": 0.4,
      "fatColoredBug_green": 0.3,
      "bomb": 0.2
    }
  },
  {
    "id": 24,
    "goalBugCount": 28,
    "lifeCount": 4,
    "params": {
      "maxObjects": 7,
      "spawnInterval": 320,
      "objectLifetime": 1620
    },
    "spawnWeights": {
      "bug": 0.3,
      "coloredBug_red": 0.5,
      "coloredBug_blue": 0.5,
      "coloredBug_green": 0.4,
      "fat": 0.4,
      "fatColoredBug_red": 0.3,
      "bomb": 0.25
    }
  },
  {
    "id": 25,
    "goalBugCount": 28,
    "lifeCount": 4,
    "params": {
      "maxObjects": 7,
      "spawnInterval": 320,
      "objectLifetime": 1600
    },
    "spawnWeights": {
      "bug": 0.3,
      "coloredBug_red": 0.5,
      "coloredBug_blue": 0.5,
      "coloredBug_green": 0.4,
      "fat": 0.45,
      "fatColoredBug_yellow": 0.3,
      "bomb": 0.25
    }
  }
];

export default levels;
