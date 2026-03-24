// Base balance config for each bug species.
// New bug types should be added here once, then levels can rebalance them via multipliers.
export const BUG_BALANCE = {
  "bug": {
    lifetime: 2200,
    spawnInterval: 300,
    clicks: 1,
  },
  "fat": {
    lifetime: 3000,
    spawnInterval: 500,
    clicks: 3,
  },
  "bomb": {
    lifetime: 2000,
    spawnInterval: 450,
    clicks: 1,
  },
  "coloredBug_red": {
    lifetime: 2500,
    spawnInterval: 500,
    clicks: 1,
  },
  "coloredBug_blue": {
    lifetime: 2500,
    spawnInterval: 500,
    clicks: 1,
  },
  "coloredBug_green": {
    lifetime: 2500,
    spawnInterval: 500,
    clicks: 1,
  },
  "coloredBug_yellow": {
    lifetime: 2500,
    spawnInterval: 500,
    clicks: 1,
  },
  "fatColoredBug_red": {
    lifetime: 3000,
    spawnInterval: 500,
    clicks: 3,
  },
  "fatColoredBug_blue": {
    lifetime: 3000,
    spawnInterval: 500,
    clicks: 3,
  },
  "fatColoredBug_green": {
    lifetime: 3000,
    spawnInterval: 500,
    clicks: 3,
  },
  "fatColoredBug_yellow": {
    lifetime: 3000,
    spawnInterval: 500,
    clicks: 3,
  },
  "frozen": {
    lifetime: 2000,
    spawnInterval: 450,
    clicks: 1,
  }
};

export function getBugBaseBalance(type) {
  return BUG_BALANCE[type] || BUG_BALANCE.bug;
}
