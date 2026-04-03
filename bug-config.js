// Base balance config for each bug species.
// New bug types should be added here once, then levels can rebalance them via multipliers.
// Optional per-type field: spawnZone: 'left' | 'right' | 'full'
export const BUG_BALANCE = {
  "bug": {
    lifetime: 2200,
    spawnInterval: 300,
    clicks: 1,
    spawnZone: 'full',
  },
  "fat": {
    lifetime: 3000,
    spawnInterval: 500,
    clicks: 3,
    spawnZone: 'full',
  },
  "bomb": {
    lifetime: 2000,
    spawnInterval: 450,
    clicks: 1,
    spawnZone: 'full',
  },
  "coloredBug_red": {
    lifetime: 2500,
    spawnInterval: 500,
    clicks: 1,
    spawnZone: 'right',
  },
  "coloredBug_blue": {
    lifetime: 2500,
    spawnInterval: 500,
    clicks: 1,
    spawnZone: 'left',
  },
  "coloredBug_green": {
    lifetime: 2500,
    spawnInterval: 500,
    clicks: 1,
    spawnZone: 'right',
  },
  "coloredBug_yellow": {
    lifetime: 2500,
    spawnInterval: 500,
    clicks: 1,
    spawnZone: 'left',
  },
  "fatColoredBug_red": {
    lifetime: 3000,
    spawnInterval: 500,
    clicks: 3,
    spawnZone: 'right',
  },
  "fatColoredBug_blue": {
    lifetime: 3000,
    spawnInterval: 500,
    clicks: 3,
    spawnZone: 'left',
  },
  "fatColoredBug_green": {
    lifetime: 3000,
    spawnInterval: 500,
    clicks: 3,
    spawnZone: 'right',
  },
  "fatColoredBug_yellow": {
    lifetime: 3000,
    spawnInterval: 500,
    clicks: 3,
    spawnZone: 'left',
  },
  "frozen": {
    lifetime: 2000,
    spawnInterval: 450,
    clicks: 1,
    spawnZone: 'full',
  },
  "chameleon": {
    lifetime: 2000,
    spawnInterval: 450,
    clicks: 1,
    spawnZone: 'full',
  },
  "neat": {
    lifetime: 2000,
    spawnInterval: 450,
    clicks: 2,
    spawnZone: 'full',
  }
};

export function getBugBaseBalance(type) {
  return BUG_BALANCE[type] || BUG_BALANCE.bug;
}

export function getBugSpawnZone(type) {
  const spawnZone = getBugBaseBalance(type)?.spawnZone;
  if (spawnZone === 'left' || spawnZone === 'right' || spawnZone === 'full') {
    return spawnZone;
  }

  return 'full';
}
