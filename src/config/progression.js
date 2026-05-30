export const PROGRESSION_STORAGE_KEY = 'towerDefenceProgressV1';
export const START_WAVE_OPTIONS = [1, 3, 5, 10, 15, 25];
export const GAME_SPEED_OPTIONS = [1, 1.25, 1.5, 2, 2.5, 3];

const PROGRESSION_DEFAULTS = {
  tokens: 0,
  bestWave: 1,
  runs: 0,
  selectedStartWave: 1,
  unlockedTowers: { cannon: true, dart: false, barrel: false },
  towerMaxLevel: { cannon: 1, dart: 1, barrel: 1 },
  stats: { damage: 0, range: 0, economy: 0, lives: 0 },
  effects: {
    cannonImpact: false,
    dartOvercharge: false,
    barrelStockpile: false,
    dartPoison: false,
    dartSlow: false,
    cannonPierce: false,
    barrelNapalm: false,
    barrelSnare: false,
  },
  berserkUnlocked: false,
  metaBerserkLevel: 0,
  speedLevel: 0,
  startWaveLevel: 0,
  speedPinned: false,
  speedPinnedValue: 1,
  lifeBountyLevel: 0,
  killBountyLevel: 0,
  cannonTree: {
    cooldownLevel: 0,
    damageLevel: 0,
    rangeLevel: 0,
    discountLevel: 0,
    utilityLevel: 0,
  },
  dartTree: {
    cooldownLevel: 0,
    damageLevel: 0,
    rangeLevel: 0,
    discountLevel: 0,
    burnLevel: 0,
    slowStackLevel: 0,
  },
  barrelTree: {
    cooldownLevel: 0,
    damageLevel: 0,
    discountLevel: 0,
    utilityLevel: 0,
    berserkUnlock: { sniper: 0, deployer: 0, booster: 0 },
  },
};

export const STAT_MAX_LEVELS = { damage: 5, range: 5, economy: 5, lives: 5 };
export const STAT_COSTS = {
  damage: [40, 90, 170, 290, 450],
  range: [35, 80, 150, 260, 410],
  economy: [35, 75, 140, 240, 380],
  lives: [45, 100, 190, 320, 500],
};
export const TOWER_UNLOCK_COSTS = { dart: 70, barrel: 130 };
export const TOWER_LEVEL_COSTS = {
  cannon: { 2: 25, 3: 70 },
  dart: { 2: 55, 3: 100, 4: 260, 5: 520 },
  barrel: { 2: 130, 3: 260 },
};
export const EFFECT_COSTS = {
  cannonImpact: 220,
  cannonPierce: 360,
  dartOvercharge: 220,
  dartPoison: 340,
  dartSlow: 520,
  barrelStockpile: 260,
  barrelNapalm: 360,
  barrelSnare: 520,
};
export const META_BERSERK_COSTS = [180, 320, 520, 820, 1200];
export const SPEED_LEVEL_COSTS = [120, 220, 360, 560, 840];
export const START_WAVE_COSTS = [120, 220, 380, 650, 1100];
export const LIFE_BOUNTY_COSTS = [160, 280, 420, 680, 980];
export const KILL_BOUNTY_COSTS = [180, 300, 480, 760, 1120];
export const TANK_TREE_COSTS = {
  cooldown: [120, 220, 340, 500, 720],
  damage: [130, 240, 370, 540, 780],
  range: [110, 210, 320, 480, 700],
  discount: [130, 240, 380, 560, 820],
  utility: [220, 340, 520, 780, 1120],
};
export const DART_TREE_COSTS = {
  cooldown: [140, 250, 380, 560, 820],
  damage: [140, 260, 400, 600, 880],
  range: [120, 230, 350, 520, 760],
  discount: [140, 260, 410, 620, 900],
  burn: [220, 340, 520, 780, 1120],
  slowStack: [220, 340, 520, 780, 1120],
};
export const BARREL_TREE_COSTS = {
  cooldown: [140, 240, 360, 520, 760],
  damage: [150, 260, 390, 560, 820],
  discount: [160, 280, 430, 620, 900],
  utility: [220, 340, 500, 760, 1080],
  berserkSniper: [260, 400, 600, 900, 1300],
  berserkDeployer: [260, 400, 600, 900, 1300],
  berserkBooster: [260, 400, 600, 900, 1300],
};

export function cloneProgressDefaults() {
  return JSON.parse(JSON.stringify(PROGRESSION_DEFAULTS));
}

export function mergeProgress(saved) {
  const progress = cloneProgressDefaults();
  if (!saved || typeof saved !== 'object') return progress;
  for (const [key, value] of Object.entries(saved)) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      progress[key] &&
      typeof progress[key] === 'object'
    ) {
      progress[key] = { ...progress[key], ...value };
    } else if (key in progress) {
      progress[key] = value;
    }
  }
  return progress;
}

export function loadProgress() {
  try {
    return mergeProgress(JSON.parse(localStorage.getItem(PROGRESSION_STORAGE_KEY)));
  } catch (error) {
    return cloneProgressDefaults();
  }
}

export function saveProgress(progress) {
  localStorage.setItem(PROGRESSION_STORAGE_KEY, JSON.stringify(progress));
}

export function formatPercentChange(before, after) {
  const pct = ((after / before) - 1) * 100;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${Math.round(pct)}%`;
}

export function getMaxStartWave(progress) {
  return START_WAVE_OPTIONS[Math.min(progress.startWaveLevel, START_WAVE_OPTIONS.length - 1)];
}

export function getMaxGameSpeed(progress) {
  return GAME_SPEED_OPTIONS[Math.min(progress.speedLevel, GAME_SPEED_OPTIONS.length - 1)];
}

export function getProgressPower(progress) {
  const towerPower = Object.entries(progress.towerMaxLevel)
    .reduce((sum, [, level]) => sum + Math.max(0, level - 1), 0);
  const unlockPower = Object.values(progress.unlockedTowers).filter(Boolean).length - 1;
  const statPower = Object.values(progress.stats).reduce((sum, level) => sum + level, 0);
  const effectPower = Object.values(progress.effects).filter(Boolean).length * 2;
  return Math.max(0, towerPower * 1.2 + unlockPower * 1.5 + statPower + effectPower);
}
