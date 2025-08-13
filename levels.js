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
    "lifeCount": 10,
    "params": {
      "maxObjects": 3,
      "spawnInterval": 480,
      "objectLifetime": 2200
    },
    "spawnWeights": {
      "bug": 1.0
    }
  },
  {
    "id": 2,
    "goalBugCount": 18,
    "lifeCount": 10,
    "params": {
      "maxObjects": 3,
      "spawnInterval": 470,
      "objectLifetime": 2300
    },
    "spawnWeights": {
      "bug": 0.8,
      "coloredBug_red": 0.2
    },
    "introPopup": {
      "type": "coloredBug_red",
      "descryption": "Удерживай КРАСНУЮ кнопку и нажми на КРАСНОГО жука!",
    }
  },
  {
    "id": 3,
    "goalBugCount": 18,
    "lifeCount": 10,
    "params": {
      "maxObjects": 3,
      "spawnInterval": 430,
      "objectLifetime": 2050
    },
    "spawnWeights": {
      "bug": 0.6,
      "coloredBug_red": 0.4
    }
  },
  {
    "id": 4,
    "goalBugCount": 20,
    "lifeCount": 10,
    "params": {
      "maxObjects": 4,
      "spawnInterval": 450,
      "objectLifetime": 2000
    },
    "spawnWeights": {
      "bug": 0.6,
      "coloredBug_red": 0.4
    }
  },
  {
    "id": 5,
    "goalBugCount": 20,
    "lifeCount": 10,
    "params": {
      "maxObjects": 4,
      "spawnInterval": 450,
      "objectLifetime": 2000
    },
    "spawnWeights": {
      "bug": 0.85,
      "fat": 0.15
    },
    "introPopup": {
      "type": "fat",
      "descryption": "Нажми на жука 3 РАЗА!",
    }
  },
  {
    "id": 6,
    "goalBugCount": 20,
    "lifeCount": 10,
    "params": {
      "maxObjects": 3,
      "spawnInterval": 460,
      "objectLifetime": 2100
    },
    "spawnWeights": {
      "bug": 0.75,
      "fat": 0.25
    }
  },
  {
      "id": 7,
      "goalBugCount": 20,
      "lifeCount": 10,
      "params": {
        "maxObjects": 4,
        "spawnInterval": 420,
        "objectLifetime": 2000
      },
      "spawnWeights": {
        "bug": 0.6,
        "fat": 0.4
      }
  },
  {
      "id": 8,
      "goalBugCount": 20,
      "lifeCount": 10,
      "params": {
        "maxObjects": 4,
        "spawnInterval": 450,
        "objectLifetime": 2000
      },
      "spawnWeights": {
        "bug": 0.6,
        "fat": 0.4
      }
  },
  {
      "id": 9,
      "goalBugCount": 20,
      "lifeCount": 10,
      "params": {
        "maxObjects": 4,
        "spawnInterval": 410,
        "objectLifetime": 2200
      },
      "spawnWeights": {
        "bug": 0.5,
        "fat": 0.35,
        "coloredBug_red": 0.15
      }
  },
  {
      "id": 10,
      "goalBugCount": 20,
      "lifeCount": 10,
      "params": {
        "maxObjects": 5,
        "spawnInterval": 450,
        "objectLifetime": 2000  
      },
      "spawnWeights": {
        "bug": 0.45,
        "fat": 0.35,
        "coloredBug_red": 0.2
      }
  },
  {
      "id": 11,
      "goalBugCount": 20,
      "lifeCount": 10,
      "params": {
        "maxObjects": 5,
        "spawnInterval": 450,
        "objectLifetime": 2000
      },
      "spawnWeights": {
        "bug": 0.45,
        "fat": 0.35,
        "coloredBug_red": 0.2
      }
  },
  {
      "id": 12,
      "goalBugCount": 20,
      "lifeCount": 10,
      "params": {
        "maxObjects": 4,
        "spawnInterval": 450,
        "objectLifetime": 2000
      },
      "spawnWeights": {
        "bug": 0.8,
        "coloredBug_blue": 0.2
      },
      "introPopup": {
        "type": "coloredBug_blue",
        "descryption": "Удерживай СИНЮЮ кнопку и нажми СИНЕГО жука!",
      }
  },
  {
      "id": 13,
      "goalBugCount": 20,
      "lifeCount": 10,
      "params": {
        "maxObjects": 3,
        "spawnInterval": 460,
        "objectLifetime": 2100
      },
      "spawnWeights": {
        "bug": 0.7,
        "coloredBug_blue": 0.3
      }
  },
  {
      "id": 14,
      "goalBugCount": 20,
      "lifeCount": 10,
      "params": {
        "maxObjects": 4,
        "spawnInterval": 420,
        "objectLifetime": 2000
      },
      "spawnWeights": {
        "bug": 0.6,
        "coloredBug_blue": 0.4
      }
  },
  {
      "id": 15,
      "goalBugCount": 20,
      "lifeCount": 10,
      "params": {
        "maxObjects": 4,
        "spawnInterval": 450,
        "objectLifetime": 2000
      },
      "spawnWeights": {
        "bug": 0.6,
        "coloredBug_blue": 0.4
      }
  },
  {
      "id": 16,
      "goalBugCount": 20,
      "lifeCount": 10,
      "params": {
        "maxObjects": 5,
        "spawnInterval": 450,
        "objectLifetime": 2000
      },
      "spawnWeights": {
        "bug": 0.45,
        "coloredBug_blue": 0.35,
        "fat": 0.2
      }
  },
  {
      "id": 17,
      "goalBugCount": 20,
      "lifeCount": 10,
      "params": {
        "maxObjects": 5,
        "spawnInterval": 450,
        "objectLifetime": 2000
      },
      "spawnWeights": {
        "bug": 0.45,
        "coloredBug_blue": 0.35,
        "coloredBug_red": 0.2
      }
  },
  {
      "id": 18,
      "goalBugCount": 20,
      "lifeCount": 10,
      "params": {
        "maxObjects": 5,
        "spawnInterval": 450,
        "objectLifetime": 2000
      },
      "spawnWeights": {
        "bug": 0.4,
        "coloredBug_blue": 0.35,
        "fat": 0.25
      }
  },
  {
      "id": 19,
      "goalBugCount": 20,
      "lifeCount": 10,
      "params": {
        "maxObjects": 5,
        "spawnInterval": 450,
        "objectLifetime": 2000
      },
      "spawnWeights": {
        "bug": 0.4,
        "coloredBug_blue": 0.35,
        "coloredBug_red": 0.25
      }
  },
  {
      "id": 20,
      "goalBugCount": 20,
      "lifeCount": 10,
      "params": {
        "maxObjects": 4,
        "spawnInterval": 450,
        "objectLifetime": 2000
      },
      "spawnWeights": {
        "bug": 0.8,
        "fatColoredBug_red": 0.2
      },
      "introPopup": {
        "type": "fatColoredBug_red",
        "descryption": "УДЕРЖИВАЙ КРАСНУЮ кнопку и жми на КРАСНОГО жука 3 РАЗА!",
      }
  },
  {
      "id": 21,
      "goalBugCount": 20,
      "lifeCount": 10,
      "params": {
        "maxObjects": 3,
        "spawnInterval": 460,
        "objectLifetime": 2100
      },
      "spawnWeights": {
        "bug": 0.7,
        "fatColoredBug_red": 0.3
      }
  },
  {
      "id": 22,
      "goalBugCount": 20,
      "lifeCount": 10,
      "params": {
        "maxObjects": 4,
        "spawnInterval": 420,
        "objectLifetime": 2000
      },
      "spawnWeights": {
        "bug": 0.6,
        "fatColoredBug_red": 0.4
      }
  },
  {
      "id": 23,
      "goalBugCount": 20,
      "lifeCount": 10,
      "params": {
        "maxObjects": 4,
        "spawnInterval": 450,
        "objectLifetime": 2000
      },
      "spawnWeights": {
        "bug": 0.6,
        "fatColoredBug_red": 0.4
      }
  },
  {
      "id": 24,
      "goalBugCount": 20,
      "lifeCount": 10,
      "params": {
        "maxObjects": 5,
        "spawnInterval": 450,
        "objectLifetime": 2000
      },
      "spawnWeights": {
        "bug": 0.45,
        "fatColoredBug_red": 0.3,
        "coloredBug_blue": 0.25
      }
  },
  {
      "id": 25,
      "goalBugCount": 20,
      "lifeCount": 10,
      "params": {
        "maxObjects": 5,
       "spawnInterval": 450,
        "objectLifetime": 2000
      },
      "spawnWeights": {
        "bug": 0.45,
        "fatColoredBug_red": 0.35,
        "coloredBug_red": 0.2
      }
  },
  {
      "id": 26,
      "goalBugCount": 20,
      "lifeCount": 10,
      "params": {
        "maxObjects": 5,
        "spawnInterval": 450,
        "objectLifetime": 2000
      },
      "spawnWeights": {
        "bug": 0.4,
        "fatColoredBug_red": 0.35,
        "coloredBug_blue": 0.25
      }
  },
  {
      "id": 27,
      "goalBugCount": 20,
      "lifeCount": 10,
      "params": {
        "maxObjects": 5,
        "spawnInterval": 450,
        "objectLifetime": 2000
      },
      "spawnWeights": {
        "bug": 0.4,
        "fatColoredBug_red": 0.4,
        "coloredBug_red": 0.2
      }
  },
  {
      "id": 28,
      "goalBugCount": 20,
      "lifeCount": 10,
      "params": {
        "maxObjects": 4,
        "spawnInterval": 450,
        "objectLifetime": 2000
      },
      "spawnWeights": {
        "bug": 0.8,
        "coloredBug_green": 0.2
      },
      "introPopup": {
        "type": "coloredBug_green",
        "descryption": "Удерживай ЗЕЛЁНУЮ кнопку и нажми на ЗЕЛЁНОГО жука!",
      }
  },
  {
      "id": 29,
      "goalBugCount": 20,
      "lifeCount": 10,
      "params": {
        "maxObjects": 4,
        "spawnInterval": 450,
        "objectLifetime": 2000
      },
      "spawnWeights": {
        "bug": 0.7,
        "coloredBug_green": 0.3
      }
  },
  {
      "id": 30,
      "goalBugCount": 20,
      "lifeCount": 10,
      "params": {
        "maxObjects": 5,
        "spawnInterval": 450,
        "objectLifetime": 2000
      },
      "spawnWeights": {
        "bug": 0.45,
        "coloredBug_green": 0.3,
        "coloredBug_blue": 0.25
      }
  }



];

export default levels;
