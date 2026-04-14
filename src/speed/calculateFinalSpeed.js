const NATURE_MULTIPLIERS = {
  positive: 1.1,
  neutral: 1.0,
  negative: 0.9,
};

// This table follows the project formula document exactly.
const STAGE_MULTIPLIERS = {
  "-6": 2 / 8,
  "-5": 2 / 7,
  "-4": 2 / 6,
  "-3": 2 / 5,
  "-2": 2 / 4,
  "-1": 2 / 3,
  "0": 2 / 2,
  "1": 3 / 2,
  "2": 4 / 2,
  "3": 5 / 2,
  "4": 6 / 2,
  "5": 7 / 2,
  "6": 8 / 2,
};

function clampInteger(value, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return min;
  }
  return Math.min(max, Math.max(min, parsed));
}

export function getNatureMultiplier(nature) {
  return NATURE_MULTIPLIERS[nature] ?? NATURE_MULTIPLIERS.neutral;
}

export function getStageMultiplier(stage) {
  const safeStage = clampInteger(stage, -6, 6);
  return STAGE_MULTIPLIERS[String(safeStage)];
}

export function calculateFinalSpeed({
  baseSpeed,
  nature = "neutral",
  speedPoints = 0,
  stage = 0,
  level = 50,
  iv = 31,
}) {
  if (baseSpeed === undefined || baseSpeed === null) {
    throw new Error("baseSpeed is required to calculate final speed.");
  }

  const base = Number(baseSpeed);
  if (!Number.isFinite(base)) {
    throw new Error("baseSpeed must be a finite number.");
  }

  const safeSpeedPoints = clampInteger(speedPoints, 0, 32);
  const natureMultiplier = getNatureMultiplier(nature);
  const stageMultiplier = getStageMultiplier(stage);

  const preNature = Math.floor(((2 * base + iv) * level) / 100) + 5 + safeSpeedPoints;
  const natureApplied = Math.floor(preNature * natureMultiplier);

  return Math.floor(natureApplied * stageMultiplier);
}
