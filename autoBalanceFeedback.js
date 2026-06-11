import levels from './levels.js';

// =========================
// COST MODEL (your logic)
// =========================

const COSTS = {
  bug: 2,
  fat: 6,
  bomb: 2,
  coloredBug_red: 6,
  coloredBug_blue: 6,
  coloredBug_green: 6,
  coloredBug_yellow: 6,
  fatColoredBug_red: 12,
  fatColoredBug_blue: 12,
  fatColoredBug_green: 12,
  fatColoredBug_yellow: 12,
  frozen: 2,
  chameleon: 2,
  neat: 4,
  healer: 2
};

// =========================
// CORE CALCULATION
// =========================

function calculateLevel(level) {
  const goal = level.goalBugCount;

  const weights = level.spawnWeights ?? {};

  const totalWeight = Object.values(weights)
    .reduce((a, b) => a + b, 0);

  let base = 0;
  const breakdown = {};

  for (const [type, weight] of Object.entries(weights)) {
    const p = weight / totalWeight;
    const expected = p * goal;
    const cost = COSTS[type] ?? 1;

    const value = expected * cost;

    base += value;
    breakdown[type] = value;
  }

  return { base, breakdown };
}

// =========================
// COMPARISON ENGINE
// =========================

function analyzeLevels() {
  const results = levels.map(l => ({
    id: l.id,
    ...calculateLevel(l)
  }));

  console.log("\n=== AUTO BALANCE REPORT ===\n");

  for (let i = 0; i < results.length; i++) {
    const curr = results[i];
    const prev = results[i - 1];

    let diff = 0;
    let status = "OK";
    let issue = null;

    if (prev) {
      diff = curr.base - prev.base;

      if (diff > 0.4) {
        status = "⚠ SPIKE";
      } else if (diff < -0.3) {
        status = "⬇ DROP";
      }
    }

    // =========================
    // SIMPLE HEURISTICS ENGINE
    // =========================

    const colored = Object.keys(curr.breakdown)
      .filter(k => k.includes("colored"));

    const fat = Object.keys(curr.breakdown)
      .filter(k => k.includes("fat"));

    if (colored.length > 3 && curr.base > 20) {
      issue = "Too many color mechanics → cognitive overload";
    }

    if (fat.length > 2) {
      issue = "Too many fat variants → pacing too slow";
    }

    console.log(
      `Level ${curr.id}: ${curr.base.toFixed(2)} ${status}`
    );

    if (issue) {
      console.log("  → ISSUE:", issue);
    }

    if (status === "⚠ SPIKE") {
      console.log("  → SUGGESTION: reduce spawnWeights or split level");
    }

    if (status === "⬇ DROP") {
      console.log("  → SUGGESTION: increase density or add mechanics");
    }

    console.log("");
  }
}

analyzeLevels();