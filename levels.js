const levels = [
  {
    "id": 1,
    "goalBugCount": 10,
    "lifeCount": 10,
    "params": {
      "maxObjects": 3,
      "spawnInterval": 1000,
      "objectLifetime": 2100
    },

    "spawnWeights": {
      "bug": 0.4,
    }
  },
  {
    "id": 2,
    "goalBugCount": 20,
    "lifeCount": 10,
    "params": {
      "maxObjects": 4,
      "spawnInterval": 800,
      "objectLifetime": 1900
    },
    "spawnWeights": {
      "bug": 1.0
    }
  },
  {
    "id": 3,
    "goalBugCount": 10,
    "lifeCount": 10,
    "params": {
      "maxObjects": 5,
      "spawnInterval": 1000,
      "objectLifetime": 1800
    },
    "spawnWeights": {
      "bug": 1.0,
      "bomb": 0.3
    }
  },
  {
    "id": 4,
    "goalBugCount": 10,
    "lifeCount": 10,
    "params": {
      "maxObjects": 4,
      "spawnInterval": 800,
      "objectLifetime": 1500
    },
    "spawnWeights": {
      "bug": 1.0,
      "bomb": 0.5
    }
  },
  {
    "id": 5,
    "goalBugCount": 12,
    "lifeCount": 10,
    "params": {
      "maxObjects": 4,
      "spawnInterval": 750,
      "objectLifetime": 2000
    },
    "spawnWeights": {
      "bug": 0.9,
      "fat": 0.3
    }
  },


  
  {
    "id": 6,
    "goalBugCount": 12,
    "lifeCount": 7,
    "params": {
      "maxObjects": 4,
      "spawnInterval": 400,
      "objectLifetime": 750
    },
    "spawnWeights": {
      "bug": 0.8,
      "fat": 0.3,
      "bomb": 0.4
    }
  },
  {
    "id": 7,
    "goalBugCount": 13,
    "lifeCount": 7,
    "params": {
      "maxObjects": 5,
      "spawnInterval": 400,
      "objectLifetime": 750
    },
    "spawnWeights": {
      "bug": 0.9,
      "fat": 0.5
    }
  },
  {
    "id": 8,
    "goalBugCount": 14,
    "lifeCount": 7,
    "params": {
      "maxObjects": 6,
      "spawnInterval": 400,
      "objectLifetime": 750
    },
    "spawnWeights": {
      "bug": 0.7,
      "fat": 0.4,
      "bomb": 0.5
    }
  },
  {
    "id": 9,
    "goalBugCount": 15,
    "lifeCount": 7,
    "params": {
      "maxObjects": 4,
      "spawnInterval": 400,
      "objectLifetime": 750
    },
    "spawnWeights": {
      "bug": 0.7,
      "fat": 0.3,
      "coloredBug_red": 0.4
    }
  },
  {
    "id": 10,
    "goalBugCount": 16,
    "lifeCount": 6,
    "params": {
      "maxObjects": 5,
      "spawnInterval": 400,
      "objectLifetime": 850
    },
    colorButtonOrder: ['blue', 'red', 'green', 'yellow'],
    "spawnWeights": {
      "bug": 0.6,
      "bomb": 0.4,
      "coloredBug_red": 0.5,
      "coloredBug_blue": 0.3
    }
  },
  {
    "id": 11,
    "goalBugCount": 16,
    "lifeCount": 6,
    "params": {
      "maxObjects": 5,
      "spawnInterval": 400,
      "objectLifetime": 750
    },
    "spawnWeights": {
      "bug": 0.6,
      "bomb": 0.4,
      "coloredBug_green": 0.4,
      "fat": 0.3,
      "coloredBug_red": 0.3
    }
  },
  {
    "id": 12,
    "goalBugCount": 18,
    "lifeCount": 6,
    "params": {
      "maxObjects": 6,
      "spawnInterval": 400,
      "objectLifetime": 750
    },
    "spawnWeights": {
      "bug": 0.6,
      "coloredBug_red": 0.4,
      "coloredBug_blue": 0.3,
      "coloredBug_green": 0.3
    }
  },
  {
    "id": 13,
    "goalBugCount": 20,
    "lifeCount": 6,
    "params": {
      "maxObjects": 7,
      "spawnInterval": 400,
      "objectLifetime": 850
    },
    "spawnWeights": {
      "bug": 0.5,
      "bomb": 0.5,
      "coloredBug_red": 0.3,
      "coloredBug_blue": 0.3,
      "coloredBug_yellow": 0.3
    }
  },
  {
    "id": 14,
    "goalBugCount": 22,
    "lifeCount": 6,
    "params": {
      "maxObjects": 8,
      "spawnInterval": 400,
      "objectLifetime": 750
    },
    "spawnWeights": {
      "bug": 0.5,
      "bomb": 0.4,
      "fat": 0.4,
      "coloredBug_red": 0.3,
      "fatColoredBug_red": 0.3,
      "fatColoredBug_blue": 0.3
    }
  },
  {
    "id": 15,
    "goalBugCount": 24,
    "lifeCount": 5,
    "params": {
      "maxObjects": 9,
      "spawnInterval": 400,
      "objectLifetime": 750
    },
    "spawnWeights": {
      "bug": 0.4,
      "bomb": 0.4,
      "fat": 0.3,
      "coloredBug_red": 0.3,
      "coloredBug_blue": 0.3,
      "coloredBug_green": 0.3,
      "fatColoredBug_red": 0.3,
      "fatColoredBug_yellow": 0.3
    }
  },
  {
    "id": 16,
    "goalBugCount": 16,
    "lifeCount": 5,
    "params": {
      "maxObjects": 5,
      "spawnInterval": 400,
      "objectLifetime": 850
    },
    "spawnWeights": {
      "bug": 0.6,
      "coloredBug_red": 0.4
    }
  },
  {
    "id": 17,
    "goalBugCount": 18,
    "lifeCount": 6,
    "params": {
      "maxObjects": 5,
      "spawnInterval": 400,
      "objectLifetime": 750
    },
    "spawnWeights": {
      "bug": 0.5,
      "coloredBug_red": 0.3,
      "coloredBug_blue": 0.3,
      "bomb": 0.3
    }
  },
  {
    "id": 18,
    "goalBugCount": 18,
    "lifeCount": 5,
    "params": {
      "maxObjects": 6,
      "spawnInterval": 400,
      "objectLifetime": 750
    },
    "spawnWeights": {
      "bug": 0.5,
      "coloredBug_red": 0.3,
      "coloredBug_green": 0.3,
      "fat": 0.2,
      "bomb": 0.2
    }
  },
  {
    "id": 19,
    "goalBugCount": 20,
    "lifeCount": 7,
    "params": {
      "maxObjects": 6,
      "spawnInterval": 800,
      "objectLifetime": 1500
    },
    "spawnWeights": {
      "bug": 0.4,
      "coloredBug_red": 0.3,
      "coloredBug_blue": 0.3,
      "coloredBug_green": 0.3,
      "bomb": 0.4
    }
  },
  {
    "id": 20,
    "goalBugCount": 20,
    "lifeCount": 5,
    "params": {
      "maxObjects": 7,
      "spawnInterval": 400,
      "objectLifetime": 750
    },
    "spawnWeights": {
      "bug": 0.3,
      "coloredBug_red": 0.3,
      "coloredBug_blue": 0.3,
      "coloredBug_yellow": 0.3,
      "bomb": 0.4,
      "fatColoredBug_red": 0.2
    }
  },
  {
    "id": 21,
    "goalBugCount": 22,
    "lifeCount": 5,
    "params": {
      "maxObjects": 8,
      "spawnInterval": 400,
      "objectLifetime": 750
    },
    "spawnWeights": {
      "bug": 0.3,
      "coloredBug_red": 0.3,
      "coloredBug_blue": 0.3,
      "coloredBug_green": 0.3,
      "coloredBug_yellow": 0.3,
      "bomb": 0.4
    }
  },
  {
    "id": 22,
    "goalBugCount": 24,
    "lifeCount": 7,
    "params": {
      "maxObjects": 8,
      "spawnInterval": 800,
      "objectLifetime": 1500
    },
    "spawnWeights": {
      "bug": 0.3,
      "coloredBug_red": 0.3,
      "fat": 0.3,
      "fatColoredBug_red": 0.3,
      "bomb": 0.4
    }
  },
  {
    "id": 23,
    "goalBugCount": 26,
    "lifeCount": 7,
    "params": {
      "maxObjects": 9,
      "spawnInterval": 800,
      "objectLifetime": 1500
    },
    "spawnWeights": {
      "bug": 0.2,
      "coloredBug_red": 0.3,
      "coloredBug_blue": 0.3,
      "coloredBug_green": 0.3,
      "fat": 0.3,
      "fatColoredBug_blue": 0.3,
      "bomb": 0.4
    }
  },
  {
    "id": 24,
    "goalBugCount": 28,
    "lifeCount": 7,
    "params": {
      "maxObjects": 10,
      "spawnInterval": 800,
      "objectLifetime": 1500
    },
    "spawnWeights": {
      "bug": 0.2,
      "coloredBug_red": 0.3,
      "coloredBug_blue": 0.3,
      "coloredBug_green": 0.3,
      "coloredBug_yellow": 0.3,
      "fatColoredBug_red": 0.3,
      "fatColoredBug_green": 0.3,
      "bomb": 0.4
    }
  },
  {
    "id": 25,
    "goalBugCount": 30,
    "lifeCount": 7,
    "params": {
      "maxObjects": 10,
      "spawnInterval": 800,
      "objectLifetime": 1500
    },
    "spawnWeights": {
      "bug": 0.2,
      "coloredBug_red": 0.3,
      "coloredBug_blue": 0.3,
      "coloredBug_green": 0.3,
      "coloredBug_yellow": 0.3,
      "fat": 0.3,
      "fatColoredBug_red": 0.3,
      "fatColoredBug_yellow": 0.3,
      "bomb": 0.5
    }
  }
];

export default levels;