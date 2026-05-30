const GRID_COLS = 22;
const GRID_ROWS = 14;
const TILE_SIZE = 48;
const GOLD_UPGRADE_COST_MULTIPLIER = 2.6;
const CANNON_PURCHASE_COST_MULTIPLIER = 1.8;
const ASSET_SCALE = TILE_SIZE / 128;
const ASSET_BASE = 'assets/PNG/Retina/';
const TANK_SPRITE_FACING = Math.PI / 2;
const BULLET_FRONT_FLIP = Math.PI;

const PATHS = [
  [
    { col: 0, row: 8 },
    { col: 7, row: 8 },
    { col: 7, row: 4 },
    { col: 3, row: 4 },
    { col: 3, row: 10 },
    { col: 11, row: 10 },
    { col: 11, row: 13 },
  ],
  [
    { col: 11, row: 0 },
    { col: 11, row: 3 },
    { col: 9, row: 3 },
    { col: 9, row: 7 },
    { col: 13, row: 7 },
    { col: 13, row: 10 },
    { col: 11, row: 10 },
    { col: 11, row: 13 },
  ],
  [
    { col: 21, row: 8 },
    { col: 16, row: 8 },
    { col: 16, row: 5 },
    { col: 19, row: 5 },
    { col: 19, row: 10 },
    { col: 11, row: 10 },
    { col: 11, row: 13 },
  ],
];

const BASE_COL = 11;
const BASE_ROW = 13;
const MAIN_BASE_JUNCTION = { col: 11, row: 10, tile: 'tileSand_roadSplitS' };
const RIGHT_BASE_JUNCTION = { col: 13, row: 10, tile: 'tileSand_roadSplitN' };

function cellCenter(col, row) {
  return {
    x: col * TILE_SIZE + TILE_SIZE / 2,
    y: row * TILE_SIZE + TILE_SIZE / 2,
  };
}

function isBaseCell(col, row) {
  return col === BASE_COL && row === BASE_ROW;
}

function angleFromDirection(dx, dy) {
  return Math.atan2(dy, dx) - TANK_SPRITE_FACING;
}

function drawRotatedSprite(ctx, img, x, y, w, h, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load: ${src}`));
    img.src = src;
  });
}

const ENEMY_TYPES = {
  red: { sprite: 'tank_red', speed: 80, hp: 30, gold: 10 },
  blue: { sprite: 'tank_blue', speed: 145, hp: 14, gold: 6 },
  dark: { sprite: 'tank_dark', speed: 40, hp: 300, gold: 80 },
  sand: { sprite: 'tank_sand', speed: 65, hp: 40, gold: 18 },
  green: { sprite: 'tank_green', speed: 55, hp: 56, gold: 22 },
};

const TOWER_TYPES = {
  cannon: {
    label: 'Танк',
    cost: 50,
    description: 'Сильные снаряды',
    shopSprite: 'tankBody_sand_outline',
    shopIconOffsetY: 4,
    bodySprite: 'tankBody_sand_outline',
    barrels: { 1: 'tankSand_barrel2_outline', 2: 'tankSand_barrel3_outline', 3: 'tankSand_barrel1_outline' },
    range: 120,
    fireCooldown: 0.6,
    projectileSpeed: 280,
    projectiles: {
      1: 'bulletSand3_outline',
      2: 'bulletSand1_outline',
      3: 'bulletSand2_outline',
    },
    damage: { 1: 10, 2: 16, 3: 26 },
    upgradeCost: { 2: 60, 3: 120 },
    berserk: {
      cost: { 1: 500, 2: 1000, 3: 2000, 4: 4000 },
      cooldown: 15,
      duration: 5,
      damageMultiplier: { 1: 4, 2: 5, 3: 6, 4: 8 },
      fireCooldownMultiplier: 0.7,
      projectiles: {
        1: 'bulletDark3_outline',
        2: 'bulletDark1_outline',
        3: 'bulletDark2_outline',
        4: 'bulletDark2_outline',
      },
      bodySprite: 'tankBody_dark_outline',
      barrels: { 1: 'tankDark_barrel2_outline', 2: 'tankDark_barrel3_outline', 3: 'tankDark_barrel1_outline', 4: 'tankDark_barrel1_outline' },
    },
  },
  dart: {
    label: 'Дротики',
    cost: 150,
    description: 'Очень быстрая стрельба',
    shopSprite: 'tankBody_blue_outline',
    bodySprite: 'tankBody_blue_outline',
    barrels: { 1: 'tankBlue_barrel2_outline', 2: 'tankBlue_barrel3_outline', 3: 'tankBlue_barrel1_outline', 4: 'tankBlue_barrel1_outline', 5: 'tankBlue_barrel1_outline' },
    range: 110,
    fireCooldown: 0.12,
    projectileSpeed: 440,
    projectiles: {
      1: 'bulletBlue3_outline',
      2: 'bulletBlue1_outline',
      3: 'bulletBlue2_outline',
      4: 'bulletBlue2_outline',
      5: 'bulletBlue2_outline',
    },
    damage: { 1: 5, 2: 8, 3: 13, 4: 34, 5: 86 },
    splashRadius: { 4: 46, 5: 76 },
    upgradeCost: { 2: 100, 3: 200, 4: 1000, 5: 3000 },
  },
  barrel: {
    label: 'Бочкомёт',
    cost: 120,
    description: 'Взрывные бочки',
    shopSprite: 'tankBody_green_outline',
    shopIconOffsetY: -4,
    bodySprite: 'tankBody_green_outline',
    barrels: { 1: 'tankGreen_barrel2_outline', 2: 'tankGreen_barrel3_outline', 3: 'tankGreen_barrel1_outline' },
    range: 150,
    fireCooldown: { 1: 3, 2: 2.5, 3: 2 },
    projectileSpeed: 200,
    splashRadius: { 1: 50, 2: 65, 3: 85 },
    projectiles: {
      1: 'barrelRust_top',
      2: 'barrelGreen_top',
      3: 'barrelGreen_side',
    },
    damage: { 1: 18, 2: 30, 3: 48 },
    upgradeCost: { 2: 80, 3: 160 },
  },
};

const UI_ASSETS = {
  arrowUp: 'assets/kenney_game-icons/PNG/White/2x/arrowUp.png',
  medal: 'assets/kenney_game-icons/PNG/White/2x/medal1.png',
};
const RANK_ASSETS = {
  silver1: 'assets/kenney_ranks-pack/PNG/Retina/Silver/rank001.png',
  silver2: 'assets/kenney_ranks-pack/PNG/Retina/Silver/rank002.png',
  silver3: 'assets/kenney_ranks-pack/PNG/Retina/Silver/rank003.png',
  gold1: 'assets/kenney_ranks-pack/PNG/Retina/Gold/rank001.png',
  gold2: 'assets/kenney_ranks-pack/PNG/Retina/Gold/rank002.png',
  gold3: 'assets/kenney_ranks-pack/PNG/Retina/Gold/rank003.png',
  gold4: 'assets/kenney_ranks-pack/PNG/Retina/Gold/rank004.png',
};
const DECORATION_ASSETS = {
  treeGreen_twigs: `${ASSET_BASE}treeGreen_twigs.png`,
  treeBrown_small: `${ASSET_BASE}treeBrown_small.png`,
  wireCrooked: `${ASSET_BASE}wireCrooked.png`,
  oilSpill_large: `${ASSET_BASE}oilSpill_large.png`,
  crateWood: `${ASSET_BASE}crateWood.png`,
  barricadeWood: `${ASSET_BASE}barricadeWood.png`,
  crateMetal: `${ASSET_BASE}crateMetal.png`,
};
const DECORATION_SPAWN_CHANCE = 0.24;
const PROGRESSION_STORAGE_KEY = 'towerDefenceProgressV1';
const START_WAVE_OPTIONS = [1, 3, 5, 10, 15, 25];
const GAME_SPEED_OPTIONS = [1, 1.25, 1.5, 2, 2.5, 3];
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
const STAT_MAX_LEVELS = { damage: 5, range: 5, economy: 5, lives: 5 };
const STAT_COSTS = {
  damage: [40, 90, 170, 290, 450],
  range: [35, 80, 150, 260, 410],
  economy: [35, 75, 140, 240, 380],
  lives: [45, 100, 190, 320, 500],
};
const TOWER_UNLOCK_COSTS = { dart: 70, barrel: 130 };
const TOWER_LEVEL_COSTS = {
  cannon: { 2: 25, 3: 70 },
  dart: { 2: 55, 3: 100, 4: 260, 5: 520 },
  barrel: { 2: 130, 3: 260 },
};
const EFFECT_COSTS = {
  cannonImpact: 220,
  cannonPierce: 360,
  dartOvercharge: 220,
  dartPoison: 340,
  dartSlow: 520,
  barrelStockpile: 260,
  barrelNapalm: 360,
  barrelSnare: 520,
};
const META_BERSERK_COSTS = [180, 320, 520, 820, 1200];
const SPEED_LEVEL_COSTS = [120, 220, 360, 560, 840];
const START_WAVE_COSTS = [120, 220, 380, 650, 1100];
const LIFE_BOUNTY_COSTS = [160, 280, 420, 680, 980];
const KILL_BOUNTY_COSTS = [180, 300, 480, 760, 1120];
const TANK_TREE_COSTS = {
  cooldown: [120, 220, 340, 500, 720],
  damage: [130, 240, 370, 540, 780],
  range: [110, 210, 320, 480, 700],
  discount: [130, 240, 380, 560, 820],
  utility: [220, 340, 520, 780, 1120],
};
const DART_TREE_COSTS = {
  cooldown: [140, 250, 380, 560, 820],
  damage: [140, 260, 400, 600, 880],
  range: [120, 230, 350, 520, 760],
  discount: [140, 260, 410, 620, 900],
  burn: [220, 340, 520, 780, 1120],
  slowStack: [220, 340, 520, 780, 1120],
};
const BARREL_TREE_COSTS = {
  cooldown: [140, 240, 360, 520, 760],
  damage: [150, 260, 390, 560, 820],
  discount: [160, 280, 430, 620, 900],
  utility: [220, 340, 500, 760, 1080],
  berserkSniper: [260, 400, 600, 900, 1300],
  berserkDeployer: [260, 400, 600, 900, 1300],
  berserkBooster: [260, 400, 600, 900, 1300],
};

function cloneProgressDefaults() {
  return JSON.parse(JSON.stringify(PROGRESSION_DEFAULTS));
}

function mergeProgress(saved) {
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

function loadProgress() {
  try {
    return mergeProgress(JSON.parse(localStorage.getItem(PROGRESSION_STORAGE_KEY)));
  } catch (error) {
    return cloneProgressDefaults();
  }
}

function formatPercentChange(before, after) {
  const pct = ((after / before) - 1) * 100;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${Math.round(pct)}%`;
}

function saveProgress(progress) {
  localStorage.setItem(PROGRESSION_STORAGE_KEY, JSON.stringify(progress));
}

function getMaxStartWave(progress) {
  return START_WAVE_OPTIONS[Math.min(progress.startWaveLevel, START_WAVE_OPTIONS.length - 1)];
}

function getMaxGameSpeed(progress) {
  return GAME_SPEED_OPTIONS[Math.min(progress.speedLevel, GAME_SPEED_OPTIONS.length - 1)];
}

function getProgressPower(progress) {
  const towerPower = Object.entries(progress.towerMaxLevel)
    .reduce((sum, [, level]) => sum + Math.max(0, level - 1), 0);
  const unlockPower = Object.values(progress.unlockedTowers).filter(Boolean).length - 1;
  const statPower = Object.values(progress.stats).reduce((sum, level) => sum + level, 0);
  const effectPower = Object.values(progress.effects).filter(Boolean).length * 2;
  return Math.max(0, towerPower * 1.2 + unlockPower * 1.5 + statPower + effectPower);
}
const ASSET_KEYS = [
  'tileGrass1',
  'tileSand1',
  'tileSand2',
  'tileGrass_transitionE',
  'tileGrass_transitionN',
  'tileGrass_transitionS',
  'tileGrass_transitionW',
  'tileSand_roadEast',
  'tileSand_roadNorth',
  'tileSand_roadCrossing',
  'tileSand_roadSplitN',
  'tileSand_roadSplitS',
  'tileSand_roadCornerUL',
  'tileSand_roadCornerUR',
  'tileSand_roadCornerLL',
  'tileSand_roadCornerLR',
  'tank_red',
  'tank_blue',
  'tank_dark',
  'tank_sand',
  'tank_green',
  'tankBody_blue_outline',
  'tankBody_dark_outline',
  'tankBody_green_outline',
  'tankBody_sand_outline',
  'tankBlue_barrel1_outline',
  'tankBlue_barrel2_outline',
  'tankBlue_barrel3_outline',
  'tankDark_barrel1_outline',
  'tankDark_barrel2_outline',
  'tankDark_barrel3_outline',
  'tankGreen_barrel1_outline',
  'tankGreen_barrel2_outline',
  'tankGreen_barrel3_outline',
  'tankSand_barrel1_outline',
  'tankSand_barrel2_outline',
  'tankSand_barrel3_outline',
  'bulletBlue1_outline',
  'bulletBlue2_outline',
  'bulletBlue3_outline',
  'bulletBlue1',
  'bulletBlue2',
  'bulletBlue3',
  'bulletDark1_outline',
  'bulletDark2_outline',
  'bulletDark3_outline',
  'bulletDark1',
  'bulletDark2',
  'bulletDark3',
  'bulletGreen1_outline',
  'bulletGreen2_outline',
  'bulletGreen3_outline',
  'bulletGreen1',
  'bulletGreen2',
  'bulletGreen3',
  'bulletSand1_outline',
  'bulletSand2_outline',
  'bulletSand3_outline',
  'bulletSand1',
  'bulletSand2',
  'bulletSand3',
  'barrelRust_top',
  'barrelGreen_top',
  'barrelGreen_side',
  'treeGreen_large',
  'tracksSmall',
  'barricadeMetal',
  'oilSpill_small',
  'shotOrange',
  'shotRed',
  'explosionSmoke1',
  'explosionSmoke2',
  'explosionSmoke3',
  'explosionSmoke4',
  'explosionSmoke5',
  'explosion1',
  'explosion2',
  'explosion3',
  'explosion4',
  'explosion5',
];

function buildRoadCells() {
  const set = new Set();
  for (const path of PATHS) {
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      if (a.col === b.col) {
        const from = Math.min(a.row, b.row);
        const to = Math.max(a.row, b.row);
        for (let row = from; row <= to; row++) set.add(`${a.col},${row}`);
      } else {
        const from = Math.min(a.col, b.col);
        const to = Math.max(a.col, b.col);
        for (let col = from; col <= to; col++) set.add(`${col},${a.row}`);
      }
    }
  }
  set.add(`${BASE_COL},${BASE_ROW}`);
  return set;
}

function getRoadNeighbors(col, row, roadCells) {
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  return dirs.filter(([dx, dy]) => roadCells.has(`${col + dx},${row + dy}`));
}

const ROAD_CELLS = buildRoadCells();
const BUILD_SLOTS = [];
for (let row = 1; row < GRID_ROWS - 1; row++) {
  for (let col = 1; col < GRID_COLS - 1; col++) {
    const key = `${col},${row}`;
    if (ROAD_CELLS.has(key)) continue;
    if (col === BASE_COL && row >= BASE_ROW - 1) continue;
    if (getRoadNeighbors(col, row, ROAD_CELLS).length > 0) BUILD_SLOTS.push({ col, row });
  }
}
const BUILD_SLOT_SET = new Set(BUILD_SLOTS.map((s) => `${s.col},${s.row}`));

function isRoad(col, row) {
  return ROAD_CELLS.has(`${col},${row}`);
}

function isBuildSlot(col, row) {
  return BUILD_SLOT_SET.has(`${col},${row}`);
}

function getGrassTransitionKey(col, row) {
  if (isRoad(col, row) || isBuildSlot(col, row)) return null;
  if (isBuildSlot(col + 1, row)) return 'tileGrass_transitionE';
  if (isBuildSlot(col - 1, row)) return 'tileGrass_transitionW';
  if (isBuildSlot(col, row - 1)) return 'tileGrass_transitionN';
  if (isBuildSlot(col, row + 1)) return 'tileGrass_transitionS';
  return null;
}

class Explosion {
  static FRAME_DURATION = 0.08;

  constructor(x, y, images) {
    this.x = x;
    this.y = y;
    this.frames = [
      images.explosionSmoke1,
      images.explosionSmoke2,
      images.explosionSmoke3,
      images.explosionSmoke4,
      images.explosionSmoke5,
    ];
    this.frameIndex = 0;
    this.frameTime = 0;
    this.finished = false;
  }

  update(dt) {
    if (this.finished) return;

    this.frameTime += dt;
    while (this.frameTime >= Explosion.FRAME_DURATION && !this.finished) {
      this.frameTime -= Explosion.FRAME_DURATION;
      this.frameIndex++;
      if (this.frameIndex >= this.frames.length) {
        this.finished = true;
      }
    }
  }

  draw(ctx) {
    if (this.finished) return;

    const img = this.frames[this.frameIndex];
    const w = img.width * ASSET_SCALE;
    const h = img.height * ASSET_SCALE;
    ctx.drawImage(img, this.x - w / 2, this.y - h / 2, w, h);
  }
}

class BarrelExplosion {
  static FRAME_DURATION = 0.1;

  constructor(x, y, images) {
    this.x = x;
    this.y = y;
    this.frames = [
      images.explosion1,
      images.explosion2,
      images.explosion3,
      images.explosion4,
      images.explosion5,
    ];
    this.frameIndex = 0;
    this.frameTime = 0;
    this.finished = false;
  }

  update(dt) {
    if (this.finished) return;

    this.frameTime += dt;
    while (this.frameTime >= BarrelExplosion.FRAME_DURATION && !this.finished) {
      this.frameTime -= BarrelExplosion.FRAME_DURATION;
      this.frameIndex++;
      if (this.frameIndex >= this.frames.length) {
        this.finished = true;
      }
    }
  }

  draw(ctx) {
    if (this.finished) return;

    const img = this.frames[this.frameIndex];
    const scale = 1.4;
    const w = img.width * ASSET_SCALE * scale;
    const h = img.height * ASSET_SCALE * scale;
    ctx.drawImage(img, this.x - w / 2, this.y - h / 2, w, h);
  }
}

class BarrelMine {
  static TRIGGER_RADIUS = 22;

  constructor(x, y, damage, splashRadius, ownerTower, spriteKey, col = null, row = null) {
    this.x = x;
    this.y = y;
    this.col = col;
    this.row = row;
    this.damage = damage;
    this.splashRadius = splashRadius;
    this.ownerTower = ownerTower;
    this.spriteKey = spriteKey;
    this.spent = false;
    this.rotation = Math.random() * Math.PI * 2;
  }

  update(dt, game) {
    if (this.spent) return;

    for (const enemy of game.enemies) {
      if (!enemy.alive) continue;
      const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (dist <= BarrelMine.TRIGGER_RADIUS) {
        this.explode(game);
        break;
      }
    }
  }

  explode(game) {
    if (this.spent) return;
    this.spent = true;
    game.spawnBarrelExplosion(this.x, this.y);
    for (const enemy of game.enemies) {
      if (!enemy.alive) continue;
      const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (dist <= this.splashRadius) {
        enemy.takeDamage(this.damage);
      }
    }
  }

  draw(ctx, images) {
    if (this.spent) return;
    const img = images[this.spriteKey] || images.barrelGreen_side;
    const w = img.width * ASSET_SCALE * 1.25;
    const h = img.height * ASSET_SCALE * 1.25;
    drawRotatedSprite(ctx, img, this.x, this.y, w, h, this.rotation);
  }
}

class BarrelMineFlight {
  static MIN_DURATION = 0.12;
  static ARC_HEIGHT = TILE_SIZE * 0.72;

  constructor(x, y, mine, speed) {
    this.startX = x;
    this.startY = y;
    this.x = x;
    this.y = y;
    this.mine = mine;
    this.duration = Math.max(
      BarrelMineFlight.MIN_DURATION,
      Math.hypot(mine.x - x, mine.y - y) / speed
    );
    this.elapsed = 0;
    this.rotation = mine.rotation;
    this.finished = false;
  }

  update(dt, game) {
    if (this.finished) return;

    this.elapsed += dt;
    const progress = Math.min(1, this.elapsed / this.duration);
    this.x = this.startX + (this.mine.x - this.startX) * progress;
    this.y = this.startY + (this.mine.y - this.startY) * progress
      - Math.sin(progress * Math.PI) * BarrelMineFlight.ARC_HEIGHT;
    this.rotation += dt * 10;

    if (progress >= 1) {
      this.finished = true;
      if (!this.mine.spent) game.mines.push(this.mine);
    }
  }

  draw(ctx, images) {
    if (this.finished || this.mine.spent) return;

    const img = images[this.mine.spriteKey] || images.barrelGreen_side;
    const progress = Math.min(1, this.elapsed / this.duration);
    const scale = 1.05 + Math.sin(progress * Math.PI) * 0.38;
    const w = img.width * ASSET_SCALE * scale;
    const h = img.height * ASSET_SCALE * scale;
    drawRotatedSprite(ctx, img, this.x, this.y, w, h, this.rotation);
  }
}

function getEnemyBaseHp(type, wave) {
  let hp = ENEMY_TYPES[type].hp;
  hp = Math.round(hp * (1 + (wave - 1) * 0.12));
  if (type === 'dark') {
    hp += Math.max(0, (wave - 5) * 150);
  }
  return hp;
}

function getSandBaseHp(wave) {
  return Math.round(getEnemyBaseHp('dark', wave) * 0.35);
}

class Enemy {
  static NEXT_ID = 1;
  static HEAL_RADIUS = 170;
  static HEAL_AMOUNT = 8;
  static HEAL_FLASH_DURATION = 1.1;
  static BOSS_SYNC_GAP = 0.45;
  static FAST_PACK_LOOKAHEAD = 1.8;
  static FAST_PACK_MIN_COUNT = 2;
  static HEALER_MIN_SPEED_MULT = 0.6;
  static HEALER_MAX_SPEED_MULT = 1.9;
  static GOLD_REWARD_MULTIPLIER = 1.3;
  static GREEN_AURA_RADIUS = 165;
  static GREEN_AURA_DURATION = 0.28;
  static GREEN_AURA_MIN_MULT = 1.12;
  static GREEN_AURA_MAX_MULT = 1.72;

  constructor(game, type = 'red', path = PATHS[0], pathOffset = 0, wave = 1) {
    this.id = Enemy.NEXT_ID++;
    const cfg = ENEMY_TYPES[type];
    this.game = game;
    this.type = type;
    this.wave = wave;
    const speedMultiplier = game.getEnemySpeedMultiplier?.() ?? 1;
    this.baseSpeed = cfg.speed * speedMultiplier;
    this.speed = this.baseSpeed;
    const waveGoldScale = Math.min(3.2, 1 + Math.max(0, wave - 1) * 0.06);
    this.goldReward = Math.round(cfg.gold * Enemy.GOLD_REWARD_MULTIPLIER * waveGoldScale);
    this.waypointIndex = 0;
    this.progress = pathOffset;
    let hp = getEnemyBaseHp(type, wave);
    if (type === 'sand') {
      hp = getSandBaseHp(wave);
    }
    hp = Math.round(hp * (game.getEnemyDifficultyMultiplier?.() ?? 1));
    this.hp = hp;
    this.maxHp = hp;
    this.alive = true;
    this.reachedEnd = false;
    this.healTimer = 0;
    this.healAmount = type === 'sand'
      ? Math.max(Enemy.HEAL_AMOUNT, Math.round(
        Enemy.HEAL_AMOUNT * (getSandBaseHp(wave) / getSandBaseHp(1))
      ))
      : 0;
    this.healFlashTimer = 0;
    this.poisonDps = 0;
    this.poisonTimer = 0;
    this.slowMultiplier = 1;
    this.slowTimer = 0;
    this.slowStackCount = 0;
    this.slowStackPer = 0;
    this.slowStackTimer = 0;
    this.boostMultiplier = 1;
    this.boostTimer = 0;
    this.sniperMarkTimer = 0;
    this.sniperMarkMax = 0;
    this.sniperMarkGrowDuration = 0;

    this.path = path;
    const start = cellCenter(this.path[0].col, this.path[0].row);
    const next = cellCenter(this.path[1].col, this.path[1].row);
    this.x = start.x;
    this.y = start.y;
    this.angle = angleFromDirection(next.x - start.x, next.y - start.y);
  }

  getPathProgress() {
    return this.waypointIndex + this.progress;
  }

  getAdaptiveHealerSpeed() {
    let speedMultiplier = 1;
    const myProgress = this.getPathProgress();

    const boss = this.game.enemies.find((enemy) => enemy.alive && enemy.type === 'dark');
    if (boss) {
      const progressGap = myProgress - boss.getPathProgress();
      if (progressGap > Enemy.BOSS_SYNC_GAP) {
        speedMultiplier *= 0.65;
      } else if (progressGap < -Enemy.BOSS_SYNC_GAP * 0.6) {
        speedMultiplier *= 1.15;
      }
    }

    let fastPackAhead = 0;
    for (const enemy of this.game.enemies) {
      if (!enemy.alive || enemy.type !== 'blue') continue;
      const progressDelta = enemy.getPathProgress() - myProgress;
      if (progressDelta >= 0.2 && progressDelta <= Enemy.FAST_PACK_LOOKAHEAD) {
        fastPackAhead++;
      }
    }

    if (fastPackAhead >= Enemy.FAST_PACK_MIN_COUNT) {
      speedMultiplier *= 1.45;
      if (fastPackAhead >= 4) {
        speedMultiplier *= 1.1;
      }
    }

    const clampedMultiplier = Math.max(
      Enemy.HEALER_MIN_SPEED_MULT,
      Math.min(Enemy.HEALER_MAX_SPEED_MULT, speedMultiplier)
    );
    return this.baseSpeed * clampedMultiplier;
  }

  getGreenAuraMultiplier() {
    if (this.type === 'dark') return Enemy.GREEN_AURA_MAX_MULT;
    const minSpeed = Math.min(...Object.values(ENEMY_TYPES).map((cfg) => cfg.speed));
    const maxSpeed = Math.max(...Object.values(ENEMY_TYPES).map((cfg) => cfg.speed));
    const t = (this.baseSpeed - minSpeed) / Math.max(1, maxSpeed - minSpeed);
    return Enemy.GREEN_AURA_MAX_MULT - t * (Enemy.GREEN_AURA_MAX_MULT - Enemy.GREEN_AURA_MIN_MULT);
  }

  applyGreenBoost(multiplier, duration) {
    this.boostMultiplier = Math.max(this.boostMultiplier, multiplier);
    this.boostTimer = Math.max(this.boostTimer, duration);
  }

  takeDamage(amount) {
    if (!this.alive) return;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.die();
    }
  }

  applySlowStack(perStack, duration, maxStacks = 5) {
    if (!this.alive) return;
    this.slowStackPer = Math.max(this.slowStackPer, perStack);
    this.slowStackCount = Math.min(maxStacks, this.slowStackCount + 1);
    this.slowStackTimer = Math.max(this.slowStackTimer, duration);
  }

  die() {
    if (!this.alive) return;
    this.alive = false;
    this.game.spawnExplosion(this.x, this.y);
    const killBountyBonus = this.game.getKillBountyBonus?.() ?? 0;
    const totalReward = this.goldReward + killBountyBonus;
    this.game.gold += totalReward;
    this.game.addRunGoldEarned(totalReward);
    this.game.registerKill(this);
    this.game.updateHud();
  }

  update(dt) {
    if (!this.alive) return;
    if (this.poisonTimer > 0 && this.poisonDps > 0) {
      this.poisonTimer = Math.max(0, this.poisonTimer - dt);
      this.takeDamage(this.poisonDps * dt);
      if (this.poisonTimer <= 0) {
        this.poisonDps = 0;
      }
    }
    if (this.slowTimer > 0) {
      this.slowTimer = Math.max(0, this.slowTimer - dt);
      if (this.slowTimer <= 0) {
        this.slowMultiplier = 1;
      }
    }
    if (this.slowStackTimer > 0) {
      this.slowStackTimer = Math.max(0, this.slowStackTimer - dt);
      if (this.slowStackTimer <= 0) {
        this.slowStackCount = 0;
        this.slowStackPer = 0;
      }
    }
    if (this.boostTimer > 0) {
      this.boostTimer = Math.max(0, this.boostTimer - dt);
      if (this.boostTimer <= 0) {
        this.boostMultiplier = 1;
      }
    }

    if (this.healFlashTimer > 0) {
      this.healFlashTimer = Math.max(0, this.healFlashTimer - dt);
    }
    if (this.sniperMarkTimer > 0) {
      this.sniperMarkTimer = Math.max(0, this.sniperMarkTimer - dt);
    }

    if (this.waypointIndex >= this.path.length - 1) {
      this.reachedEnd = true;
      this.alive = false;
      this.game.lives--;
      const bounty = this.game.getLifeLossBounty?.() ?? 0;
      if (bounty > 0) {
        this.game.gold += bounty;
        this.game.addRunGoldEarned(bounty);
      }
      this.game.updateHud();
      return;
    }

    const from = cellCenter(
      this.path[this.waypointIndex].col,
      this.path[this.waypointIndex].row
    );
    const to = cellCenter(
      this.path[this.waypointIndex + 1].col,
      this.path[this.waypointIndex + 1].row
    );

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const segmentLength = Math.hypot(dx, dy);

    if (segmentLength > 0) {
      this.angle = angleFromDirection(dx, dy);
    }

    if (this.type === 'sand') {
      this.speed = this.getAdaptiveHealerSpeed();
    } else {
      this.speed = this.baseSpeed;
    }

    const stackSlowMultiplier = Math.max(0.3, 1 - this.slowStackCount * this.slowStackPer);
    const effectiveSlowMultiplier = Math.min(this.slowMultiplier, stackSlowMultiplier);
    const advance = (this.speed * effectiveSlowMultiplier * this.boostMultiplier * dt) / segmentLength;

    this.progress += advance;

    while (this.progress >= 1 && this.waypointIndex < this.path.length - 1) {
      this.progress -= 1;
      this.waypointIndex++;
      if (this.waypointIndex >= this.path.length - 1) {
        const end = cellCenter(
          this.path[this.waypointIndex].col,
          this.path[this.waypointIndex].row
        );
        this.x = end.x;
        this.y = end.y;
        return;
      }
    }

    const currentFrom = cellCenter(
      this.path[this.waypointIndex].col,
      this.path[this.waypointIndex].row
    );
    const currentTo = cellCenter(
      this.path[this.waypointIndex + 1].col,
      this.path[this.waypointIndex + 1].row
    );

    this.x = currentFrom.x + (currentTo.x - currentFrom.x) * this.progress;
    this.y = currentFrom.y + (currentTo.y - currentFrom.y) * this.progress;

    if (this.type === 'sand' && this.alive) {
      this.healTimer += dt;
      if (this.healTimer >= 1) {
        this.healTimer -= 1;
        for (const other of this.game.enemies) {
          if (!other.alive) continue;
          if (other.hp >= other.maxHp) continue;
          const dist = Math.hypot(other.x - this.x, other.y - this.y);
          if (dist <= Enemy.HEAL_RADIUS) {
            other.hp = Math.min(other.maxHp, other.hp + this.healAmount);
            other.healFlashTimer = Math.max(other.healFlashTimer, Enemy.HEAL_FLASH_DURATION);
          }
        }
      }
    }
    if (this.type === 'green' && this.alive) {
      for (const other of this.game.enemies) {
        if (!other.alive) continue;
        const dist = Math.hypot(other.x - this.x, other.y - this.y);
        if (dist <= Enemy.GREEN_AURA_RADIUS) {
          other.applyGreenBoost(other.getGreenAuraMultiplier(), Enemy.GREEN_AURA_DURATION);
        }
      }
    }
  }

  draw(ctx, images) {
    if (!this.alive && !this.reachedEnd) return;

    const img = images[ENEMY_TYPES[this.type].sprite];
    const w = img.width * ASSET_SCALE;
    const h = img.height * ASSET_SCALE;
    const facingAngle = this.angle + TANK_SPRITE_FACING;

    if (this.alive && this.boostTimer > 0 && images.tracksSmall) {
      const t = performance.now() * 0.02;
      const alpha = 0.34 + 0.28 * Math.abs(Math.sin(t));
      const trackImg = images.tracksSmall;
      const tw = trackImg.width * ASSET_SCALE * 1.22;
      const th = trackImg.height * ASSET_SCALE * 1.22;
      const backOffset = h * 0.56;
      const tx = this.x - Math.cos(facingAngle) * backOffset;
      const ty = this.y - Math.sin(facingAngle) * backOffset;
      ctx.save();
      ctx.globalAlpha = alpha;
      drawRotatedSprite(ctx, trackImg, tx, ty, tw, th, this.angle);
      ctx.restore();

      // Speed particles: small dust bits behind tracks while accelerated.
      const pxBase = tx - Math.cos(facingAngle) * (tw * 0.38);
      const pyBase = ty - Math.sin(facingAngle) * (th * 0.38);
      for (let i = 0; i < 4; i++) {
        const p = performance.now() * 0.004 + i * 1.7;
        const side = i % 2 === 0 ? 1 : -1;
        const offsetBack = 8 + (p * 9) % 18;
        const lateral = side * (4 + Math.sin(p * 1.9) * 3);
        const px = pxBase - Math.cos(facingAngle) * offsetBack + Math.cos(facingAngle + Math.PI / 2) * lateral;
        const py = pyBase - Math.sin(facingAngle) * offsetBack + Math.sin(facingAngle + Math.PI / 2) * lateral;
        const r = 1.3 + (i % 3) * 0.55;
        const pa = 0.16 + 0.12 * Math.abs(Math.sin(p * 2.1));
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(195, 174, 124, ${pa})`;
        ctx.fill();
      }
    }

    if (this.alive && (this.type === 'sand' || this.type === 'green')) {
      const isGreenAura = this.type === 'green';
      ctx.beginPath();
      ctx.arc(this.x, this.y, isGreenAura ? Enemy.GREEN_AURA_RADIUS : Enemy.HEAL_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = isGreenAura ? 'rgba(248, 210, 40, 0.10)' : 'rgba(46, 204, 113, 0.08)';
      ctx.fill();
      ctx.strokeStyle = isGreenAura ? 'rgba(248, 210, 40, 0.85)' : 'rgba(46, 204, 113, 0.65)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    drawRotatedSprite(ctx, img, this.x, this.y, w, h, this.angle);

    if (this.alive && this.healFlashTimer > 0) {
      const alpha = this.healFlashTimer / Enemy.HEAL_FLASH_DURATION;
      ctx.beginPath();
      ctx.arc(this.x, this.y, Math.max(w, h) * 0.38, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(46, 204, 113, ${0.25 * alpha})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(46, 204, 113, ${0.95 * alpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      if (images.treeGreen_large) {
        const pulse = 0.72 + 0.38 * Math.abs(Math.sin(performance.now() * 0.02));
        const tw = images.treeGreen_large.width * ASSET_SCALE * 0.54 * pulse;
        const th = images.treeGreen_large.height * ASSET_SCALE * 0.54 * pulse;
        ctx.save();
        ctx.globalAlpha = 0.2 + 0.32 * alpha * pulse;
        ctx.drawImage(images.treeGreen_large, this.x - tw / 2, this.y - th / 2, tw, th);
        ctx.restore();
      }
    }

    if (this.alive && (this.slowTimer > 0 || this.slowStackCount > 0) && (images.oilSpill_small || images.oilSpill_large)) {
      const baseAlpha = this.slowTimer > 0 ? 0.28 : 0.18;
      const pulse = 0.85 + 0.15 * Math.abs(Math.sin(performance.now() * 0.014));
      const useLarge = this.slowStackCount >= 3 && images.oilSpill_large;
      const oilImg = useLarge ? images.oilSpill_large : images.oilSpill_small;
      const scale = useLarge ? 0.5 : 0.72;
      const sw = oilImg.width * ASSET_SCALE * scale;
      const sh = oilImg.height * ASSET_SCALE * scale;
      ctx.save();
      ctx.globalAlpha = (useLarge ? 0.24 : baseAlpha) * pulse;
      ctx.drawImage(oilImg, this.x - sw / 2, this.y - sh / 2, sw, sh);
      ctx.restore();
    }

    if (this.alive && this.sniperMarkTimer > 0 && images.barricadeMetal) {
      const elapsed = this.sniperMarkMax > 0
        ? this.sniperMarkMax - this.sniperMarkTimer
        : 0;
      const growDuration = Math.max(0.01, this.sniperMarkGrowDuration || this.sniperMarkMax || 0.2);
      const growProgress = Math.max(0, Math.min(1, elapsed / growDuration));
      const scale = 0.3 + growProgress * 0.7;
      const mw = images.barricadeMetal.width * ASSET_SCALE * scale;
      const mh = images.barricadeMetal.height * ASSET_SCALE * scale;
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.drawImage(images.barricadeMetal, this.x - mw / 2, this.y - mh / 2, mw, mh);
      ctx.restore();
    }

    if (this.alive && this.hp < this.maxHp) {
      const barW = TILE_SIZE * 0.6;
      const barH = 4;
      const barX = this.x - barW / 2;
      const barY = this.y - h / 2 - 8;
      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barW, barH);
      const barColors = { blue: '#3498db', dark: '#8e44ad', sand: '#f39c12', green: '#f1c40f' };
      ctx.fillStyle = this.healFlashTimer > 0 ? '#2ecc71' : (barColors[this.type] || '#e74c3c');
      ctx.fillRect(barX, barY, barW * (this.hp / this.maxHp), barH);
    }
  }
}

class Projectile {
  static HIT_RADIUS = 12;

  constructor(x, y, target, damage, game, bulletKey, speed, splashRadius = 0, effects = null) {
    this.x = x;
    this.y = y;
    this.target = target;
    this.damage = damage;
    this.game = game;
    this.bulletKey = bulletKey;
    this.speed = speed;
    this.hit = false;
    this.splashRadius = splashRadius;
    this.flightAngle = 0;
    this.effects = effects || {};
    this.ricochetLeft = this.effects.ricochetCount || 0;
    this.ricochetDamageMult = this.effects.ricochetDamageMult || 1;
    this.ricochetRange = this.effects.ricochetRange || 220;
    this.hitEnemyIds = new Set();
  }

  getRicochetBulletKey() {
    if (!this.bulletKey.endsWith('_outline')) return this.bulletKey;
    const candidate = this.bulletKey.replace('_outline', '');
    return this.game.images[candidate] ? candidate : this.bulletKey;
  }

  applyEffects(enemy) {
    if (!enemy?.alive) return;
    if (this.effects.poisonDps > 0 && this.effects.poisonDuration > 0) {
      enemy.poisonDps = Math.max(enemy.poisonDps, this.effects.poisonDps);
      enemy.poisonTimer = Math.max(enemy.poisonTimer, this.effects.poisonDuration);
    }
    if (this.effects.slowMultiplier > 0 && this.effects.slowMultiplier < 1 && this.effects.slowDuration > 0) {
      enemy.slowMultiplier = Math.min(enemy.slowMultiplier, this.effects.slowMultiplier);
      enemy.slowTimer = Math.max(enemy.slowTimer, this.effects.slowDuration);
    }
    if (this.effects.slowStackPer > 0 && this.effects.slowStackDuration > 0) {
      enemy.applySlowStack(
        this.effects.slowStackPer,
        this.effects.slowStackDuration,
        this.effects.slowStackMax || 5
      );
    }
  }

  update(dt) {
    if (this.hit) return;

    if (!this.target.alive) {
      if (this.target?.sniperMarkTimer > 0) {
        this.target.sniperMarkTimer = 0;
        this.target.sniperMarkMax = 0;
        this.target.sniperMarkGrowDuration = 0;
      }
      this.hit = true;
      return;
    }

    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist < Projectile.HIT_RADIUS) {
      if (this.target?.sniperMarkTimer > 0) {
        this.target.sniperMarkTimer = 0;
        this.target.sniperMarkMax = 0;
        this.target.sniperMarkGrowDuration = 0;
      }
      if (this.target?.id != null) this.hitEnemyIds.add(this.target.id);
      if (this.splashRadius > 0) {
        this.game.spawnBarrelExplosion(this.x, this.y);
        for (const enemy of this.game.enemies) {
          if (!enemy.alive) continue;
          const eDist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
          if (eDist <= this.splashRadius) {
            enemy.takeDamage(this.damage);
            this.applyEffects(enemy);
          }
        }
      } else {
        this.target.takeDamage(this.damage);
        this.applyEffects(this.target);
        if (this.ricochetLeft > 0) {
          const nextTarget = this.findRicochetTarget(this.target);
          if (nextTarget) {
            this.target = nextTarget;
            this.damage = Math.max(1, Math.round(this.damage * this.ricochetDamageMult));
            this.bulletKey = this.getRicochetBulletKey();
            this.ricochetLeft--;
            return;
          }
        }
      }
      this.hit = true;
      return;
    }

    const move = this.speed * dt;
    this.flightAngle = Math.atan2(dy, dx) - TANK_SPRITE_FACING + BULLET_FRONT_FLIP;
    this.x += (dx / dist) * move;
    this.y += (dy / dist) * move;
  }

  draw(ctx, images) {
    if (this.hit) return;

    const img = images[this.bulletKey];
    const isBarrel = this.bulletKey.startsWith('barrel');
    const scale = isBarrel ? 1.2 : (this.bulletKey.includes('3_outline') ? 2.2 : 2);
    const w = img.width * ASSET_SCALE * scale;
    const h = img.height * ASSET_SCALE * scale;

    drawRotatedSprite(ctx, img, this.x, this.y, w, h, this.flightAngle || 0);
  }

  findRicochetTarget(fromTarget) {
    let best = null;
    let bestDist = this.ricochetRange;
    for (const enemy of this.game.enemies) {
      if (!enemy.alive) continue;
      if (enemy === fromTarget) continue;
      if (enemy.id != null && this.hitEnemyIds.has(enemy.id)) continue;
      const d = Math.hypot(enemy.x - fromTarget.x, enemy.y - fromTarget.y);
      if (d <= bestDist) {
        bestDist = d;
        best = enemy;
      }
    }
    return best;
  }
}

class Tower {
  static NEXT_ID = 1;
  static DAMAGE_MULTIPLIER = 1.1;
  static RANGE_UPGRADE_COSTS = [80, 160, 320];
  static MAX_BARREL_MINES = 30;
  static BARREL_MINE_CELL_OFFSET = TILE_SIZE * 0.28;
  static BARREL_MINE_FLIGHT_SPEED = 520;
  static CANNON_BERSERK_CYCLE_COOLDOWN = 7;
  static CANNON_BERSERK_BASE_DURATION = 7;
  static BARREL_SNIPER_FIXED_BONUS = { 1: 1300, 2: 2200, 3: 3400, 4: 5000, 5: 7200 };
  static BARREL_SNIPER_BOSS_HP_PERCENT = { 1: 0.07, 2: 0.1, 3: 0.13, 4: 0.165, 5: 0.2 };
  static BARREL_SNIPER_BOSS_HP_PERCENT_CAP = 0.2;

  constructor(col, row, game, type = 'cannon') {
    this.id = Tower.NEXT_ID++;
    this.col = col;
    this.row = row;
    this.game = game;
    this.type = type;
    this.config = TOWER_TYPES[type];
    const center = cellCenter(col, row);
    this.x = center.x;
    this.y = center.y;
    this.cooldown = 0;
    this.angle = 0;
    this.level = 1;
    this.rangeUpgradeLevel = 0;
    this.berserkLevel = 0;
    this.berserkTimer = 0;
    this.berserkDurationCurrent = Tower.CANNON_BERSERK_BASE_DURATION;
    this.berserkCooldownTimer = 0;
    this.berserkWaitTimer = 0;
    this.isWaitingForBerserkEnemy = false;
    this.isBerserkActive = false;
    this.barrelBerserkMode = null;
    this.barrelBerserkLevels = { sniper: 0, deployer: 0, booster: 0 };
    this.spentGold = 0;
    this.sniperChargeTimer = 0;
    this.sniperChargeTarget = null;
  }

  getRange() {
    let range = this.config.range;
    if (this.type === 'cannon' && this.isBerserkActive) {
      range *= 2;
    }
    range *= 1 + this.rangeUpgradeLevel * 0.18;
    range *= this.game.getTowerRangeMultiplier?.(this.type) ?? 1;
    const aura = this.game.getBoosterAuraForTower?.(this) ?? 0;
    if (aura > 0) range *= 1 + aura * 0.5;
    return range;
  }

  getDamage() {
    let dmg = this.config.damage[this.level];
    if (this.isBerserkActive && this.config.berserk) {
      dmg *= this.config.berserk.damageMultiplier[this.berserkLevel];
      if (this.type === 'cannon') {
        dmg *= 1 + (this.game.progress.metaBerserkLevel || 0) * 0.1;
      }
    }
    const progressMultiplier = this.game.getTowerDamageMultiplier?.(this.type) ?? 1;
    let result = Math.round(dmg * Tower.DAMAGE_MULTIPLIER * progressMultiplier);
    if (this.type === 'barrel' && this.barrelBerserkMode === 'sniper') {
      result = Math.round(result * (4 + this.barrelBerserkLevels.sniper * 0.8));
    }
    if (this.type === 'barrel' && this.barrelBerserkMode === 'deployer') {
      result = Math.round(result * (1.7 + this.barrelBerserkLevels.deployer * 0.25));
    }
    const aura = this.game.getBoosterAuraForTower?.(this) ?? 0;
    if (aura > 0) result = Math.round(result * (1 + aura));
    return result;
  }

  getFireCooldown() {
    const cooldown = this.config.fireCooldown;
    let value = cooldown;
    if (typeof value === 'object') {
      value = value[this.level] ?? value[1];
    }
    if (this.type === 'dart' && this.game.hasProgressEffect?.('dartOvercharge')) {
      value *= 0.85;
    }
    if (this.type === 'cannon') {
      const cdLevel = this.game.progress.cannonTree.cooldownLevel || 0;
      value *= Math.max(0.55, 1 - cdLevel * 0.08);
    }
    if (this.type === 'dart') {
      const cdLevel = this.game.progress.dartTree.cooldownLevel || 0;
      value *= Math.max(0.5, 1 - cdLevel * 0.07);
    }
    if (this.type === 'barrel' && this.game.hasProgressEffect?.('barrelStockpile')) {
      value *= 0.9;
    }
    if (this.type === 'barrel') {
      const cdLevel = this.game.progress.barrelTree.cooldownLevel || 0;
      value *= Math.max(0.5, 1 - cdLevel * 0.1);
      if (this.barrelBerserkMode === 'sniper') value *= 1.25;
      if (this.barrelBerserkMode === 'deployer') value *= Math.max(0.32, 0.7 - this.barrelBerserkLevels.deployer * 0.06);
    }
    if (this.type === 'cannon' && this.isBerserkActive) {
      value *= Math.max(0.65, 1 - (this.game.progress.metaBerserkLevel || 0) * 0.05);
    }
    const aura = this.game.getBoosterAuraForTower?.(this) ?? 0;
    if (aura > 0) value *= Math.max(0.55, 1 - aura * 0.45);
    return value;
  }

  getSplashRadius() {
    if (this.type === 'cannon') return 0;
    if (this.config.splashRadius) {
      let radius = this.config.splashRadius;
      if (typeof radius === 'object') {
        radius = radius[this.level] ?? 0;
      }
      if (radius && this.type === 'barrel' && this.game.hasProgressEffect?.('barrelStockpile')) {
        radius += 8;
      }
      if (radius && this.type === 'barrel' && this.game.hasProgressEffect?.('barrelCluster')) {
        radius += 10;
      }
      return radius;
    }
    return 0;
  }

  getProjectileKey() {
    if (this.isBerserkActive && this.config.berserk && this.berserkLevel > 0) {
      return this.config.berserk.projectiles[this.berserkLevel];
    }
    return this.config.projectiles[this.level];
  }

  getBarrelSpriteKey() {
    if (this.isBerserkActive && this.config.berserk?.barrels && this.berserkLevel > 0) {
      return this.config.berserk.barrels[this.berserkLevel] || this.config.berserk.barrels[1];
    }
    if (this.config.barrels) {
      return this.config.barrels[this.level] || this.config.barrels[1];
    }
    return null;
  }

  getShotEffects() {
    const effects = {};
    if (this.type === 'cannon') {
      const utilityLevel = this.game.progress.cannonTree.utilityLevel || 0;
      if (utilityLevel > 0) {
        effects.ricochetCount = Math.min(5, utilityLevel);
        effects.ricochetDamageMult = Math.min(0.95, 0.6 + utilityLevel * 0.08);
        effects.ricochetRange = 170 + utilityLevel * 20;
      }
    }
    if (this.type === 'dart' && (this.game.progress.dartTree.burnLevel || 0) > 0) {
      const burnLevel = this.game.progress.dartTree.burnLevel || 0;
      effects.poisonDps = Math.round(this.getDamage() * (0.14 + burnLevel * 0.06));
      effects.poisonDuration = 2 + burnLevel * 0.35;
    }
    if (this.type === 'dart' && (this.game.progress.dartTree.slowStackLevel || 0) > 0) {
      const slowLevel = this.game.progress.dartTree.slowStackLevel || 0;
      effects.slowStackPer = Math.min(0.1, 0.03 + slowLevel * 0.014);
      effects.slowStackDuration = 1.2 + slowLevel * 0.24;
      effects.slowStackMax = 5;
    }
    if (this.type === 'barrel' && this.game.hasProgressEffect?.('barrelNapalm')) {
      effects.poisonDps = Math.round(this.getDamage() * 0.4);
      effects.poisonDuration = 3;
    }
    if (this.type === 'barrel' && this.game.hasProgressEffect?.('barrelDeepBurn')) {
      effects.poisonDps = Math.round(this.getDamage() * 0.55);
      effects.poisonDuration = 4.5;
    }
    if (this.type === 'barrel' && this.game.hasProgressEffect?.('barrelSnare')) {
      effects.slowMultiplier = 0.58;
      effects.slowDuration = 1.8;
    }
    return effects;
  }

  getBodySpriteKey() {
    if (this.isBerserkActive && this.config.berserk) {
      return this.config.berserk.bodySprite;
    }
    if (this.config.bodySprite) return this.config.bodySprite;
    return this.config.bodyByLevel[this.level];
  }

  getUpgradeCost() {
    const maxLevel = this.game.getTowerMaxLevel?.(this.type) ?? 99;
    if (this.level + 1 > maxLevel) return null;
    return this.config.upgradeCost?.[this.level + 1] ?? null;
  }

  getRangeUpgradeCost() {
    return Tower.RANGE_UPGRADE_COSTS[this.rangeUpgradeLevel] ?? null;
  }

  canUpgradeRange() {
    return this.getRangeUpgradeCost() != null;
  }

  upgradeRange() {
    if (!this.canUpgradeRange()) return false;
    this.rangeUpgradeLevel++;
    return true;
  }

  canUpgrade() {
    return this.getUpgradeCost() != null;
  }

  upgrade() {
    if (!this.canUpgrade()) return false;
    this.level++;
    return true;
  }

  hasBerserk() {
    return this.config.berserk && this.level >= 3 && this.game.isBerserkUnlocked?.();
  }

  getBerserkUpgradeCost() {
    if (!this.hasBerserk() || this.berserkLevel >= 4) return null;
    return this.config.berserk.cost[this.berserkLevel + 1];
  }

  canUpgradeBerserk() {
    return this.hasBerserk() && this.berserkLevel < 4;
  }

  canUpgradeBarrelBerserk(mode) {
    if (this.type !== 'barrel' || this.level < 3) return false;
    if (this.barrelBerserkMode && this.barrelBerserkMode !== mode) return false;
    const unlocked = this.game.progress.barrelTree.berserkUnlock[mode] || 0;
    return unlocked > 0 && this.barrelBerserkLevels[mode] < unlocked && this.barrelBerserkLevels[mode] < 5;
  }

  getBarrelBerserkCost(mode) {
    if (!this.canUpgradeBarrelBerserk(mode)) return null;
    const next = this.barrelBerserkLevels[mode] + 1;
    const base = [600, 1200, 2200, 3600, 5200][next - 1];
    return Math.round(base * this.game.getBarrelDiscountMultiplier());
  }

  upgradeBarrelBerserk(mode) {
    if (!this.canUpgradeBarrelBerserk(mode)) return false;
    this.barrelBerserkMode = mode;
    this.barrelBerserkLevels[mode]++;
    return true;
  }

  upgradeBerserk() {
    if (!this.canUpgradeBerserk()) return false;
    this.berserkLevel++;
    if (this.berserkLevel === 1) {
      this.berserkCooldownTimer = Tower.CANNON_BERSERK_CYCLE_COOLDOWN;
    }
    return true;
  }

  isEnemyInBaseRange() {
    const baseRange = this.config.range;

    for (const enemy of this.game.enemies) {
      if (!enemy.alive) continue;
      const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (dist <= baseRange) {
        return true;
      }
    }
    return false;
  }

  containsPoint(x, y) {
    return Math.hypot(x - this.x, y - this.y) <= TILE_SIZE / 2;
  }

  drawRange(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.getRange(), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(231, 76, 60, 0.14)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(231, 76, 60, 0.85)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  update(dt) {
    if (this.type === 'barrel' && this.barrelBerserkMode === 'sniper' && this.sniperChargeTimer > 0) {
      this.sniperChargeTimer = Math.max(0, this.sniperChargeTimer - dt);
      if (this.sniperChargeTimer <= 0) {
        const target = this.sniperChargeTarget?.alive ? this.sniperChargeTarget : this.findStrongestTarget();
        this.sniperChargeTarget = null;
        if (target) {
          this.fireSniperShot(target);
        }
      }
      return;
    }
    if (this.type === 'barrel' && this.barrelBerserkMode === 'booster' && this.barrelBerserkLevels.booster > 0) {
      this.cooldown = 0;
      return;
    }
    if (this.config.berserk && this.berserkLevel > 0) {
      if (this.isBerserkActive) {
        this.berserkTimer -= dt;
        if (this.berserkTimer <= 0) {
          this.isBerserkActive = false;
          this.isWaitingForBerserkEnemy = false;
          this.berserkWaitTimer = 0;
          this.berserkCooldownTimer = Tower.CANNON_BERSERK_CYCLE_COOLDOWN;
        }
      } else {
        if (this.isWaitingForBerserkEnemy) {
          this.berserkWaitTimer += dt;
          if (this.isEnemyInBaseRange()) {
            this.isWaitingForBerserkEnemy = false;
            this.isBerserkActive = true;
            this.berserkDurationCurrent =
              Tower.CANNON_BERSERK_BASE_DURATION + this.berserkWaitTimer / 3;
            this.berserkTimer = this.berserkDurationCurrent;
            this.berserkWaitTimer = 0;
          }
        } else {
          this.berserkCooldownTimer -= dt;
          if (this.berserkCooldownTimer <= 0) {
            if (this.isEnemyInBaseRange()) {
              this.isBerserkActive = true;
              this.berserkDurationCurrent = Tower.CANNON_BERSERK_BASE_DURATION;
              this.berserkTimer = this.berserkDurationCurrent;
            } else {
              this.isWaitingForBerserkEnemy = true;
              this.berserkWaitTimer = 0;
            }
          }
        }
      }
    }

    const target = this.type === 'barrel' && this.barrelBerserkMode === 'sniper'
      ? this.findStrongestTarget()
      : this.findTarget();
    if (target && this.type !== 'barrel') {
      this.angle = angleFromDirection(target.x - this.x, target.y - this.y);
    }

    const baseCooldown = this.getFireCooldown();
    const cooldown = (this.isBerserkActive && this.config.berserk)
      ? baseCooldown * this.config.berserk.fireCooldownMultiplier
      : baseCooldown;

    this.cooldown -= dt;
    if (this.cooldown > 0) return;

    if (this.type === 'barrel') {
      if (this.barrelBerserkMode === 'sniper') {
        if (!target) return;
        this.angle = angleFromDirection(target.x - this.x, target.y - this.y);
        if (this.sniperChargeTarget && this.sniperChargeTarget !== target) {
          this.sniperChargeTarget.sniperMarkTimer = 0;
          this.sniperChargeTarget.sniperMarkMax = 0;
          this.sniperChargeTarget.sniperMarkGrowDuration = 0;
        }
        this.sniperChargeTarget = target;
        // Keep mark visible for at least one rendered frame even on high game speed.
        this.sniperChargeTimer = Math.max(0.26, dt + 0.02);
        target.sniperMarkMax = this.sniperChargeTimer;
        target.sniperMarkTimer = this.sniperChargeTimer;
        target.sniperMarkGrowDuration = this.sniperChargeTimer;
        return;
      }

      const activeMinesByThisTower = this.getActiveBarrelMines();
      const mineLimit = this.game.getBarrelMineLimit?.() ?? Tower.MAX_BARREL_MINES;
      if (activeMinesByThisTower.length >= mineLimit) {
        const mineToReplace = activeMinesByThisTower[
          Math.floor(Math.random() * activeMinesByThisTower.length)
        ];
        mineToReplace.spent = true;
      }

      const occupiedCells = new Set(
        activeMinesByThisTower
          .filter((mine) => (
            !mine.spent &&
            mine.ownerTower === this &&
            mine.col != null &&
            mine.row != null
          ))
          .map((mine) => `${mine.col},${mine.row}`)
      );
      const point = this.getRandomRoadCellInRange(occupiedCells);
      if (point) {
        const spot = this.getRandomMineSpot(point);
        this.launchBarrelMine(spot, point);
        if (this.barrelBerserkMode === 'deployer' && this.barrelBerserkLevels.deployer >= 2) {
          const extra = this.getRandomMineSpot(point);
          this.launchBarrelMine(extra, point, 0.8);
        }
      }
      this.cooldown = cooldown;
      return;
    }

    if (!target) return;

    const dmg = this.getDamage();
    const splash = this.getSplashRadius();
    const projKey = this.getProjectileKey();
    const speed = this.config.projectileSpeed;
    const shotEffects = this.getShotEffects();

    if (this.isBerserkActive && this.config.berserk) {
      const dir = this.angle + TANK_SPRITE_FACING;
      const perpX = Math.cos(dir + Math.PI / 2) * 8;
      const perpY = Math.sin(dir + Math.PI / 2) * 8;
      this.game.projectiles.push(
        new Projectile(this.x + perpX, this.y + perpY, target, dmg, this.game, projKey, speed, splash, shotEffects)
      );
      this.game.projectiles.push(
        new Projectile(this.x - perpX, this.y - perpY, target, dmg, this.game, projKey, speed, splash, shotEffects)
      );
    } else {
      this.game.projectiles.push(
        new Projectile(this.x, this.y, target, dmg, this.game, projKey, speed, splash, shotEffects)
      );
    }

    this.cooldown = cooldown;
  }

  findTarget() {
    let nearest = null;
    let nearestDist = this.getRange();

    for (const enemy of this.game.enemies) {
      if (!enemy.alive) continue;
      const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (dist <= this.getRange() && dist < nearestDist) {
        nearest = enemy;
        nearestDist = dist;
      }
    }

    return nearest;
  }

  findStrongestTarget() {
    let best = null;
    let bestHp = -1;
    const range = this.getRange() * 1.35;
    for (const enemy of this.game.enemies) {
      if (!enemy.alive) continue;
      const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (dist > range) continue;
      if (enemy.hp > bestHp) {
        bestHp = enemy.hp;
        best = enemy;
      }
    }
    return best;
  }

  getRandomRoadCellInRange(excludedCells = new Set()) {
    const candidates = [];
    const fallbackCandidates = [];
    for (const key of ROAD_CELLS) {
      const [col, row] = key.split(',').map(Number);
      if (isBaseCell(col, row)) continue;
      const center = cellCenter(col, row);
      const dist = Math.hypot(center.x - this.x, center.y - this.y);
      if (dist <= this.getRange()) {
        const cell = { col, row };
        fallbackCandidates.push(cell);
        if (!excludedCells.has(key)) candidates.push(cell);
      }
    }
    const pool = candidates.length > 0 ? candidates : fallbackCandidates;
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  getRandomMineSpot(cell) {
    const center = cellCenter(cell.col, cell.row);
    const offset = Tower.BARREL_MINE_CELL_OFFSET;
    return {
      x: center.x + (Math.random() * 2 - 1) * offset,
      y: center.y + (Math.random() * 2 - 1) * offset,
    };
  }

  getActiveBarrelMines() {
    const flyingMines = this.game.mineFlights.map((flight) => flight.mine);
    return [...this.game.mines, ...flyingMines].filter(
      (mine) => !mine.spent && mine.ownerTower === this
    );
  }

  launchBarrelMine(spot, point, damageMultiplier = 1) {
    const mine = new BarrelMine(
      spot.x,
      spot.y,
      Math.round(this.getDamage() * damageMultiplier),
      this.getSplashRadius(),
      this,
      this.getProjectileKey(),
      point.col,
      point.row
    );
    this.game.mineFlights.push(
      new BarrelMineFlight(this.x, this.y, mine, Tower.BARREL_MINE_FLIGHT_SPEED)
    );
  }

  fireSniperShot(target) {
    this.angle = angleFromDirection(target.x - this.x, target.y - this.y);
    const lvl = this.barrelBerserkLevels.sniper || 1;
    const splash = lvl >= 4 ? 34 : 0;
    const fixedBonus = Tower.BARREL_SNIPER_FIXED_BONUS[lvl] ?? Tower.BARREL_SNIPER_FIXED_BONUS[1];
    const bossHpPercent = Math.min(
      Tower.BARREL_SNIPER_BOSS_HP_PERCENT_CAP,
      Tower.BARREL_SNIPER_BOSS_HP_PERCENT[lvl] ?? Tower.BARREL_SNIPER_BOSS_HP_PERCENT[1]
    );
    const bossHp = this.game.getBossReferenceMaxHp?.() ?? target.maxHp;
    const hpScaleDamage = Math.round(bossHp * bossHpPercent);
    const totalDamage = this.getDamage() + fixedBonus + hpScaleDamage;
    const projectileSpeed = 620 + lvl * 40;
    const distanceToTarget = Math.hypot(target.x - this.x, target.y - this.y);
    const flightTime = Math.max(0.08, distanceToTarget / Math.max(1, projectileSpeed));
    target.sniperMarkMax = flightTime + 0.08;
    target.sniperMarkTimer = target.sniperMarkMax;
    target.sniperMarkGrowDuration = Math.max(0.05, flightTime * 0.2);
    this.game.projectiles.push(
      new Projectile(
        this.x,
        this.y,
        target,
        totalDamage,
        this.game,
        lvl >= 3 ? 'shotRed' : 'shotOrange',
        projectileSpeed,
        splash,
        this.getShotEffects()
      )
    );
    this.cooldown = this.getFireCooldown();
  }

  drawStatusBar(ctx, x, y, width, height, progress, fillColor, bgColor = 'rgba(0, 0, 0, 0.55)') {
    const clampedProgress = Math.max(0, Math.min(1, progress));
    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y, width * clampedProgress, height);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
  }

  drawHudBars(ctx) {
    const barWidth = TILE_SIZE * 0.75;
    const barHeight = 6;
    const barX = this.x - barWidth / 2;
    let barY = this.y - TILE_SIZE * 0.58;

    if (this.type === 'cannon' && this.berserkLevel > 0) {
      let progress = 0;
      let color = '#3498db';

      if (this.isBerserkActive) {
        const totalDuration = Math.max(0.001, this.berserkDurationCurrent);
        progress = this.berserkTimer / totalDuration;
        color = '#e74c3c';
      } else if (this.isWaitingForBerserkEnemy) {
        progress = 1;
        color = '#f39c12';
      } else {
        progress = 1 - this.berserkCooldownTimer / Tower.CANNON_BERSERK_CYCLE_COOLDOWN;
        color = '#3498db';
      }

      this.drawStatusBar(ctx, barX, barY, barWidth, barHeight, progress, color);
      barY -= barHeight + 3;
    }

    if (this.type === 'barrel') {
      const cooldownBase = Math.max(0.001, this.getFireCooldown());
      const progress = 1 - this.cooldown / cooldownBase;
      this.drawStatusBar(ctx, barX, barY, barWidth, barHeight, progress, '#9b59b6');
    }
  }

  draw(ctx, images) {
    const spriteKey = this.getBodySpriteKey();
    const baseImg = images[spriteKey];
    const usesMineLauncher = this.type === 'barrel'
      && this.barrelBerserkMode !== 'sniper'
      && this.barrelBerserkMode !== 'booster';
    const barrelKey = usesMineLauncher ? null : this.getBarrelSpriteKey();
    const barrelImg = barrelKey ? images[barrelKey] : null;
    const isDartType = this.type === 'dart';
    const w = baseImg.width * ASSET_SCALE * (isDartType ? 1.15 : 1);
    const h = baseImg.height * ASSET_SCALE * (isDartType ? 1.15 : 1);
    drawRotatedSprite(ctx, baseImg, this.x, this.y, w, h, this.angle);
    if (barrelImg) {
      const bw = barrelImg.width * ASSET_SCALE * (isDartType ? 1.15 : 1);
      const bh = barrelImg.height * ASSET_SCALE * (isDartType ? 1.15 : 1);
      const forwardAngle = this.angle + TANK_SPRITE_FACING;
      const barrelForwardOffset = bh * 0.5;
      const barrelX = this.x + Math.cos(forwardAngle) * barrelForwardOffset;
      const barrelY = this.y + Math.sin(forwardAngle) * barrelForwardOffset;
      drawRotatedSprite(ctx, barrelImg, barrelX, barrelY, bw, bh, this.angle);
    }
    if (usesMineLauncher) {
      const mineImg = images[this.getProjectileKey()];
      const cooldownBase = Math.max(0.001, this.getFireCooldown());
      const chargeProgress = Math.max(0.01, Math.min(1, 1 - this.cooldown / cooldownBase));
      const mineScale = 1.25 * chargeProgress;
      const mw = mineImg.width * ASSET_SCALE * mineScale;
      const mh = mineImg.height * ASSET_SCALE * mineScale;
      drawRotatedSprite(ctx, mineImg, this.x, this.y, mw, mh, this.angle);
    }
    this.drawHudBars(ctx);
  }

  drawRank(ctx, images) {
    const spriteKey = this.getBodySpriteKey();
    const img = images[spriteKey];
    const isDartType = this.type === 'dart';
    const h = img.height * ASSET_SCALE * (isDartType ? 1.15 : 1);
    const rankKey = this.berserkLevel > 0
      ? `gold${Math.min(4, this.berserkLevel)}`
      : this.level > 3
        ? `gold${Math.min(3, this.level - 3)}`
        : `silver${Math.min(3, this.level)}`;
    const rankImg = images[rankKey];
    if (rankImg) {
      const rw = TILE_SIZE * 0.5;
      const rh = rw * (rankImg.height / rankImg.width);
      ctx.drawImage(rankImg, this.x - rw / 2, this.y - h * 0.55 - rh, rw, rh);
    }
  }
}

class Game {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.images = {};

    this.enemies = [];
    this.towers = [];
    this.projectiles = [];
    this.mines = [];
    this.mineFlights = [];
    this.explosions = [];

    this.progress = loadProgress();
    this.gameSpeed = 1;
    this.runRewarded = false;
    this.runStartWave = this.progress.selectedStartWave;
    this.runKills = 0;
    this.runKillTokenScore = 0;
    this.runWaveClears = 0;
    this.runTokenReward = 0;
    this.runGoldEarned = 0;
    this.gold = this.getStartingGold();
    this.lives = this.getStartingLives();
    this.wave = 1;
    this.highestWaveThisRun = 1;
    this.enemiesSpawned = 0;
    this.enemiesPerWave = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 2.5;
    this.bluePackChance = 0;
    this.sandChance = 0;
    this.greenChance = 0;
    this.waveActive = false;
    this.bossSpawnSchedule = [];
    this.gameOver = false;
    this.isPaused = false;
    this.started = false;
    this.waveBannerTimer = 0;
    this.currentRadial = null;
    this.selectedTower = null;
    this.decorations = [];
    this.availableDecorationKeys = [];
    this.pathSpawnPlan = new Array(PATHS.length).fill(0);
    this.pathSpawnRemaining = new Array(PATHS.length).fill(0);
    this.pathFirstSpawned = new Array(PATHS.length).fill(false);
    this.pathIndicatorMinTimer = new Array(PATHS.length).fill(0);

    this.lastTime = 0;
    this.hintMessage = '';
    this.hintTimer = 0;
    this.hintEl = document.getElementById('hint-strip');
    this.waveBannerEl = document.getElementById('wave-banner');
    this.mainMenu = document.getElementById('main-menu');
    this.shopMenu = document.getElementById('shop-menu');
    this.pauseMenu = document.getElementById('pause-menu');
    this.defeatMenu = document.getElementById('defeat-menu');
    this.radialMenu = document.getElementById('radial-menu');
    this.pauseBtn = document.getElementById('pause-btn');
    this.speedBtn = document.getElementById('speed-btn');
    this.speedLockBtn = document.getElementById('speed-lock-btn');
    this.progressSummaryEl = document.getElementById('progress-summary');
    this.shopProgressSummaryEl = document.getElementById('shop-progress-summary');
    this.shopTabsEl = document.getElementById('shop-tabs');
    this.shopGridEl = document.getElementById('shop-grid');
    this.startWaveLabelEl = document.getElementById('start-wave-label');
    this.runRewardEl = document.getElementById('run-reward');
    this.activeShopTab = 'core';
    this.pendingSellTowerId = null;
    this.pendingResetProgress = false;

    this.canvas.addEventListener('click', (e) => this.onCanvasClick(e));
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (this.started && !this.gameOver) this.togglePause();
    });
    this.pauseBtn.addEventListener('click', () => this.togglePause());
    this.speedBtn.addEventListener('click', () => this.cycleGameSpeed());
    this.speedLockBtn.addEventListener('click', () => this.toggleSpeedLock());
    document.getElementById('start-btn').addEventListener('click', () => this.startGame());
    document.getElementById('open-shop-btn').addEventListener('click', () => this.openShopMenu());
    document.getElementById('shop-back-btn').addEventListener('click', () => this.openMainMenu());
    document.getElementById('shop-play-btn').addEventListener('click', () => this.startGame());
    document.getElementById('start-wave-minus').addEventListener('click', () => this.changeStartWave(-1));
    document.getElementById('start-wave-plus').addEventListener('click', () => this.changeStartWave(1));
    document.getElementById('resume-btn').addEventListener('click', () => this.togglePause(false));
    document.getElementById('restart-btn').addEventListener('click', () => this.restart());
    document.getElementById('restart-from-pause-btn').addEventListener('click', () => this.restart());
    this.resetProgressBtn = document.getElementById('reset-progress-btn');
    this.resetProgressBtn.addEventListener('click', () => this.handleResetProgressClick());
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.started && !this.gameOver) this.togglePause();
    });

    this.loadAssets().then(() => {
      this.generateDecorations();
      this.updateHud();
      this.updateProgressUi();
      this.lastTime = performance.now();
      requestAnimationFrame((t) => this.loop(t));
    });
  }

  async loadAssets() {
    const entries = await Promise.all(
      ASSET_KEYS.map(async (key) => {
        const img = await loadImage(ASSET_BASE + `${key}.png`);
        return [key, img];
      })
    );
    const uiEntries = await Promise.all(
      Object.entries(UI_ASSETS).map(async ([k, src]) => [k, await loadImage(src)])
    );
    const rankEntries = await Promise.all(
      Object.entries(RANK_ASSETS).map(async ([k, src]) => [k, await loadImage(src)])
    );
    const optionalDecorationResults = await Promise.allSettled(
      Object.entries(DECORATION_ASSETS).map(async ([key, src]) => [key, await loadImage(src)])
    );
    const decorationEntries = optionalDecorationResults
      .filter((result) => result.status === 'fulfilled')
      .map((result) => result.value);
    this.availableDecorationKeys = decorationEntries.map(([key]) => key);
    this.images = Object.fromEntries([...entries, ...uiEntries, ...rankEntries, ...decorationEntries]);
  }

  saveProgress() {
    saveProgress(this.progress);
  }

  getProgressPower() {
    return getProgressPower(this.progress);
  }

  addRunGoldEarned(amount) {
    this.runGoldEarned += Math.max(0, amount || 0);
  }

  getLifeLossBounty() {
    const lvl = this.progress.lifeBountyLevel || 0;
    if (lvl <= 0) return 0;
    return Math.round((24 + this.wave * 8) * (1 + lvl * 0.75));
  }

  getLifeLossBountyFor(level, waveRef = null) {
    const lvl = Math.max(0, level || 0);
    if (lvl <= 0) return 0;
    const wave = waveRef ?? this.progress.selectedStartWave ?? 1;
    return Math.round((24 + wave * 8) * (1 + lvl * 0.75));
  }

  getKillBountyBonus() {
    const lvl = this.progress.killBountyLevel || 0;
    if (lvl <= 0) return 0;
    return Math.round(2 + lvl * 2 + this.wave * (0.4 + lvl * 0.12));
  }

  getKillBountyBonusFor(level, waveRef = null) {
    const lvl = Math.max(0, level || 0);
    if (lvl <= 0) return 0;
    const wave = waveRef ?? this.progress.selectedStartWave ?? 1;
    return Math.round(2 + lvl * 2 + wave * (0.4 + lvl * 0.12));
  }

  getStartingGold() {
    const waveOffset = Math.max(0, this.progress.selectedStartWave - 1);
    const waveBonusGold = Math.round(waveOffset * 28 + waveOffset * waveOffset * 0.6);
    return 90 + this.progress.stats.economy * 45 + waveBonusGold;
  }

  getStartingLives() {
    return 10 + this.progress.stats.lives * 5;
  }

  getTowerDamageMultiplier(type) {
    let multiplier = 0.72 + this.progress.stats.damage * 0.08;
    if (type === 'dart' && this.hasProgressEffect('dartOvercharge')) multiplier += 0.08;
    if (type === 'barrel' && this.hasProgressEffect('barrelStockpile')) multiplier += 0.05;
    if (type === 'cannon') multiplier += (this.progress.cannonTree.damageLevel || 0) * 0.08;
    if (type === 'dart') multiplier += (this.progress.dartTree.damageLevel || 0) * 0.08;
    if (type === 'barrel') multiplier += (this.progress.barrelTree.damageLevel || 0) * 0.08;
    return multiplier;
  }

  getTowerRangeMultiplier(type) {
    let multiplier = 0.9 + this.progress.stats.range * 0.06;
    if (type === 'cannon') multiplier += (this.progress.cannonTree.rangeLevel || 0) * 0.06;
    if (type === 'dart') multiplier += (this.progress.dartTree.rangeLevel || 0) * 0.06;
    if (type === 'barrel' && this.hasProgressEffect('barrelStockpile')) multiplier += 0.05;
    return multiplier;
  }

  getEnemyDifficultyMultiplier() {
    return 1 + this.getProgressPower() * 0.035;
  }

  getBossReferenceMaxHp() {
    const aliveBosses = this.enemies.filter((enemy) => enemy.alive && enemy.type === 'dark');
    if (aliveBosses.length > 0) {
      return Math.max(...aliveBosses.map((enemy) => enemy.maxHp));
    }
    const baseBossHp = getEnemyBaseHp('dark', this.wave);
    return Math.round(baseBossHp * this.getEnemyDifficultyMultiplier());
  }

  getEnemySpeedMultiplier() {
    return 1 + this.getProgressPower() * 0.006;
  }

  getBoosterAuraForTower(targetTower) {
    let bonus = 0;
    for (const tower of this.towers) {
      if (tower === targetTower) continue;
      if (tower.type !== 'barrel') continue;
      if (tower.barrelBerserkMode !== 'booster') continue;
      const lvl = tower.barrelBerserkLevels.booster || 0;
      if (lvl <= 0) continue;
      const dist = Math.hypot(targetTower.x - tower.x, targetTower.y - tower.y);
      const auraRange = tower.getRange() * 0.75;
      if (dist <= auraRange) {
        bonus = Math.max(bonus, 0.1 + lvl * 0.05);
      }
    }
    return bonus;
  }

  isTowerUnlocked(type) {
    return !!this.progress.unlockedTowers[type];
  }

  getTowerMaxLevel(type) {
    return this.progress.towerMaxLevel[type] || 1;
  }

  isBerserkUnlocked() {
    return (this.progress.metaBerserkLevel || 0) >= 1 || this.progress.berserkUnlocked;
  }

  hasProgressEffect(effect) {
    if (effect === 'cannonImpact') return this.progress.cannonTree.utilityLevel >= 1 || !!this.progress.effects.cannonImpact;
    if (effect === 'cannonPierce') return this.progress.cannonTree.utilityLevel >= 2 || !!this.progress.effects.cannonPierce;
    if (effect === 'cannonBurn') return this.progress.cannonTree.utilityLevel >= 3;
    if (effect === 'cannonSiege') return this.progress.cannonTree.utilityLevel >= 4;
    if (effect === 'cannonOverload') return this.progress.cannonTree.utilityLevel >= 5;
    if (effect === 'dartOvercharge') return this.progress.dartTree.cooldownLevel >= 1 || !!this.progress.effects.dartOvercharge;
    if (effect === 'dartPoison') return this.progress.dartTree.burnLevel >= 1 || !!this.progress.effects.dartPoison;
    if (effect === 'dartSlow') return this.progress.dartTree.slowStackLevel >= 1 || !!this.progress.effects.dartSlow;
    if (effect === 'dartRupture') return this.progress.dartTree.burnLevel >= 3;
    if (effect === 'dartPin') return this.progress.dartTree.slowStackLevel >= 3;
    if (effect === 'barrelStockpile') return this.progress.barrelTree.utilityLevel >= 1;
    if (effect === 'barrelNapalm') return this.progress.barrelTree.utilityLevel >= 2;
    if (effect === 'barrelSnare') return this.progress.barrelTree.utilityLevel >= 3;
    if (effect === 'barrelCluster') return this.progress.barrelTree.utilityLevel >= 4;
    if (effect === 'barrelDeepBurn') return this.progress.barrelTree.utilityLevel >= 5;
    return !!this.progress.effects[effect];
  }

  getBarrelMineLimit() {
    return Tower.MAX_BARREL_MINES + (this.hasProgressEffect('barrelStockpile') ? 10 : 0);
  }

  getBarrelDiscountMultiplier() {
    const lvl = this.progress.barrelTree.discountLevel || 0;
    return Math.max(0.45, 1 - lvl * 0.08);
  }

  getTowerDiscountMultiplier(type) {
    if (type === 'cannon') return Math.max(0.55, 1 - (this.progress.cannonTree.discountLevel || 0) * 0.08);
    if (type === 'dart') return Math.max(0.55, 1 - (this.progress.dartTree.discountLevel || 0) * 0.08);
    if (type === 'barrel') return this.getBarrelDiscountMultiplier();
    return 1;
  }

  scaleGoldCost(baseCost) {
    return Math.max(1, Math.round(baseCost * GOLD_UPGRADE_COST_MULTIPLIER));
  }

  scaleTowerPurchaseCost(type, baseCost) {
    const mult = type === 'cannon'
      ? CANNON_PURCHASE_COST_MULTIPLIER
      : GOLD_UPGRADE_COST_MULTIPLIER;
    return Math.max(1, Math.round(baseCost * mult));
  }

  syncStartPreviewStats() {
    if (this.started) return;
    this.wave = this.progress.selectedStartWave;
    this.highestWaveThisRun = this.wave;
    this.gold = this.getStartingGold();
    this.lives = this.getStartingLives();
    this.updateHud();
  }

  updateProgressUi() {
    for (const stat of Object.keys(STAT_MAX_LEVELS)) {
      this.progress.stats[stat] = Math.max(0, Math.min(STAT_MAX_LEVELS[stat], this.progress.stats[stat] || 0));
    }
    const maxStartWave = getMaxStartWave(this.progress);
    if (this.progress.selectedStartWave > maxStartWave) {
      this.progress.selectedStartWave = maxStartWave;
      this.saveProgress();
    }
    this.progressSummaryEl.textContent =
      `Жетоны: ${this.progress.tokens} | Рекорд: ${this.progress.bestWave}`;
    this.shopProgressSummaryEl.textContent =
      `Жетоны: ${this.progress.tokens} | Рекорд: ${this.progress.bestWave}`;
    this.startWaveLabelEl.textContent = `Волна ${this.progress.selectedStartWave}`;
    this.speedBtn.textContent = `x${this.gameSpeed}`;
    this.speedBtn.disabled = getMaxGameSpeed(this.progress) <= 1;
    this.speedLockBtn.textContent = this.progress.speedPinned ? 'PIN' : 'AUTO';
    this.renderShopTabs();
    this.renderProgressShop();
    this.syncStartPreviewStats();
  }

  openMainMenu() {
    this.mainMenu.classList.remove('hidden');
    this.shopMenu.classList.add('hidden');
  }

  openShopMenu() {
    this.mainMenu.classList.add('hidden');
    this.shopMenu.classList.remove('hidden');
    if (this.pendingResetProgress) {
      this.pendingResetProgress = false;
      this.resetProgressBtn.textContent = 'Сбросить прогресс';
      this.resetProgressBtn.classList.remove('confirm-pending');
    }
  }

  changeStartWave(delta) {
    const maxStartWave = getMaxStartWave(this.progress);
    const currentIndex = START_WAVE_OPTIONS.indexOf(this.progress.selectedStartWave);
    const nextIndex = Math.max(
      0,
      Math.min(
        START_WAVE_OPTIONS.indexOf(maxStartWave),
        currentIndex + delta
      )
    );
    this.progress.selectedStartWave = START_WAVE_OPTIONS[nextIndex];
    this.saveProgress();
    this.updateProgressUi();
  }

  cycleGameSpeed() {
    const maxSpeed = getMaxGameSpeed(this.progress);
    const available = GAME_SPEED_OPTIONS.filter((speed) => speed <= maxSpeed);
    const currentIndex = available.indexOf(this.gameSpeed);
    this.gameSpeed = available[(currentIndex + 1) % available.length] || 1;
    if (this.progress.speedPinned) {
      this.progress.speedPinnedValue = this.gameSpeed;
      this.saveProgress();
    }
    this.updateProgressUi();
  }

  toggleSpeedLock() {
    this.progress.speedPinned = !this.progress.speedPinned;
    if (this.progress.speedPinned) {
      this.progress.speedPinnedValue = this.gameSpeed;
    }
    this.saveProgress();
    this.updateProgressUi();
  }

  spendTokens(cost, applyPurchase) {
    if (this.progress.tokens < cost) return;
    this.progress.tokens -= cost;
    applyPurchase();
    this.saveProgress();
    this.updateProgressUi();
  }

  getShopTabs() {
    return [
      { id: 'core', label: 'База' },
      { id: 'towers', label: 'Башни' },
      { id: 'cannon', label: 'Танк' },
      { id: 'dart', label: 'Дротики' },
      { id: 'barrel', label: 'Бочкомет' },
      { id: 'meta', label: 'Режим' },
    ];
  }

  getShopItems(tab = 'core') {
    const items = [];
    const add = (id, title, detail, cost, bought, buy, blocked = false, branch = '') => {
      items.push({ id, title, detail, cost, bought, buy, blocked, branch });
    };

    if (tab === 'towers') {
      add(
        'unlock-dart',
        'Открыть: Дротики',
        'Быстрая пушка',
        TOWER_UNLOCK_COSTS.dart,
        this.progress.unlockedTowers.dart,
        () => { this.progress.unlockedTowers.dart = true; },
        false,
        'Открытие'
      );
      add(
        'unlock-barrel',
        'Открыть: Бочкомет',
        'Мины на карте',
        TOWER_UNLOCK_COSTS.barrel,
        this.progress.unlockedTowers.barrel,
        () => { this.progress.unlockedTowers.barrel = true; },
        false,
        'Открытие'
      );
      for (const [type, levels] of Object.entries(TOWER_LEVEL_COSTS)) {
        for (const [levelText, cost] of Object.entries(levels)) {
          const level = Number(levelText);
          const towerUnlocked = this.progress.unlockedTowers[type];
          const currentMax = this.progress.towerMaxLevel[type] || 1;
          const titleByType = { cannon: 'Танк', dart: 'Дротики', barrel: 'Бочкомет' };
          add(
            `${type}-level-${level}`,
            `${titleByType[type]} ур. ${level}`,
            'Следующий узел ветки',
            cost,
            currentMax >= level,
            () => { this.progress.towerMaxLevel[type] = level; },
            !towerUnlocked || currentMax < level - 1,
            titleByType[type]
          );
        }
      }
      return items;
    }

    if (tab === 'core') {
      const branchInfo = {
        damage: { title: 'Урон', detail: (from, to) => `бонус: +${from * 8}% -> +${to * 8}%` },
        range: { title: 'Дальность', detail: (from, to) => `бонус: +${from * 6}% -> +${to * 6}%` },
        economy: { title: 'Стартовое золото', detail: (from, to) => `${90 + from * 45} -> ${90 + to * 45}` },
        lives: { title: 'Прочность базы', detail: (from, to) => `${10 + from * 5} -> ${10 + to * 5}` },
      };
      for (const [stat, cfg] of Object.entries(branchInfo)) {
        const level = this.progress.stats[stat];
        for (let target = 1; target <= STAT_MAX_LEVELS[stat]; target++) {
          add(
            `stat-${stat}-${target}`,
            `${cfg.title} ${target}/${STAT_MAX_LEVELS[stat]}`,
            cfg.detail(target - 1, target),
            STAT_COSTS[stat][target - 1],
            level >= target,
            () => { this.progress.stats[stat] = target; },
            level < target - 1,
            cfg.title
          );
        }
      }
      return items;
    }

    if (tab === 'meta') {
      for (let lvl = 1; lvl <= 5; lvl++) {
        const prev = lvl - 1;
        add(
          `meta-berserk-${lvl}`,
          `Берсерк ${lvl}/5`,
          `сила режима: +${prev * 10}% -> +${lvl * 10}%`,
          META_BERSERK_COSTS[lvl - 1],
          (this.progress.metaBerserkLevel || 0) >= lvl,
          () => {
            this.progress.metaBerserkLevel = lvl;
            if (lvl >= 1) this.progress.berserkUnlocked = true;
          },
          this.progress.towerMaxLevel.cannon < 3 || (this.progress.metaBerserkLevel || 0) < lvl - 1,
          'Берсерк'
        );
      }
      for (let lvl = 1; lvl <= SPEED_LEVEL_COSTS.length; lvl++) {
        add(
          `meta-speed-${lvl}`,
          `Скорость ${lvl}/${SPEED_LEVEL_COSTS.length}`,
          `${GAME_SPEED_OPTIONS[lvl - 1]}x -> ${GAME_SPEED_OPTIONS[lvl]}x`,
          SPEED_LEVEL_COSTS[lvl - 1],
          this.progress.speedLevel >= lvl,
          () => { this.progress.speedLevel = lvl; },
          this.progress.speedLevel < lvl - 1,
          'Ускорение'
        );
      }
      for (let lvl = 1; lvl <= START_WAVE_COSTS.length; lvl++) {
        add(
          `meta-wave-${lvl}`,
          `Старт волны ${lvl}/${START_WAVE_COSTS.length}`,
          `${START_WAVE_OPTIONS[lvl - 1]} -> ${START_WAVE_OPTIONS[lvl]}`,
          START_WAVE_COSTS[lvl - 1],
          this.progress.startWaveLevel >= lvl,
          () => {
            this.progress.startWaveLevel = lvl;
            this.progress.selectedStartWave = getMaxStartWave(this.progress);
          },
          this.progress.startWaveLevel < lvl - 1,
          'Старт с волны'
        );
      }
      for (let lvl = 1; lvl <= LIFE_BOUNTY_COSTS.length; lvl++) {
        const lifeBounty = this.getLifeLossBountyFor(lvl);
        add(
          `meta-life-bounty-${lvl}`,
          `Кэшбэк жизни ${lvl}/${LIFE_BOUNTY_COSTS.length}`,
          `+${lifeBounty} золота за потерю жизни`,
          LIFE_BOUNTY_COSTS[lvl - 1],
          (this.progress.lifeBountyLevel || 0) >= lvl,
          () => { this.progress.lifeBountyLevel = lvl; },
          (this.progress.lifeBountyLevel || 0) < lvl - 1,
          'Кэшбэк'
        );
      }
      for (let lvl = 1; lvl <= KILL_BOUNTY_COSTS.length; lvl++) {
        const killBounty = this.getKillBountyBonusFor(lvl);
        add(
          `meta-kill-bounty-${lvl}`,
          `Bounty убийств ${lvl}/${KILL_BOUNTY_COSTS.length}`,
          `+${killBounty} золота за убийство`,
          KILL_BOUNTY_COSTS[lvl - 1],
          (this.progress.killBountyLevel || 0) >= lvl,
          () => { this.progress.killBountyLevel = lvl; },
          (this.progress.killBountyLevel || 0) < lvl - 1,
          'Bounty'
        );
      }
      return items;
    }

    if (tab === 'cannon') {
      const t = this.progress.cannonTree;
      const unlocked = this.progress.unlockedTowers.cannon;
      for (let lvl = 1; lvl <= 5; lvl++) {
        add(
          `cannon-cd-${lvl}`,
          `КД ${lvl}/5`,
          `кд: -${(lvl - 1) * 8}% -> -${lvl * 8}%`,
          TANK_TREE_COSTS.cooldown[lvl - 1],
          t.cooldownLevel >= lvl,
          () => { t.cooldownLevel = lvl; },
          !unlocked || t.cooldownLevel < lvl - 1,
          'КД'
        );
      }
      for (let lvl = 1; lvl <= 5; lvl++) {
        add(
          `cannon-dmg-${lvl}`,
          `Урон ${lvl}/5`,
          `урон: +${(lvl - 1) * 8}% -> +${lvl * 8}%`,
          TANK_TREE_COSTS.damage[lvl - 1],
          t.damageLevel >= lvl,
          () => { t.damageLevel = lvl; },
          !unlocked || t.damageLevel < lvl - 1,
          'Урон'
        );
      }
      for (let lvl = 1; lvl <= 5; lvl++) {
        add(
          `cannon-range-${lvl}`,
          `Дальность ${lvl}/5`,
          `дальность: +${(lvl - 1) * 6}% -> +${lvl * 6}%`,
          TANK_TREE_COSTS.range[lvl - 1],
          t.rangeLevel >= lvl,
          () => { t.rangeLevel = lvl; },
          !unlocked || t.rangeLevel < lvl - 1,
          'Дальность'
        );
      }
      for (let lvl = 1; lvl <= 5; lvl++) {
        add(
          `cannon-discount-${lvl}`,
          `Скидка ${lvl}/5`,
          `скидка: -${(lvl - 1) * 8}% -> -${lvl * 8}%`,
          TANK_TREE_COSTS.discount[lvl - 1],
          t.discountLevel >= lvl,
          () => { t.discountLevel = lvl; },
          !unlocked || t.discountLevel < lvl - 1,
          'Скидка'
        );
      }
      const utilityDetails = [
        'Рикошет I: +1 цель, 68% урона',
        'Рикошет II: +2 цели, 76% урона',
        'Рикошет III: +3 цели, 84% урона',
        'Рикошет IV: +4 цели, 92% урона',
        'Рикошет V: +5 целей, 95% урона',
      ];
      for (let lvl = 1; lvl <= 5; lvl++) {
        add(
          `cannon-utility-${lvl}`,
          `Утилита ${lvl}/5`,
          utilityDetails[lvl - 1],
          TANK_TREE_COSTS.utility[lvl - 1],
          t.utilityLevel >= lvl,
          () => { t.utilityLevel = lvl; },
          !unlocked || t.utilityLevel < lvl - 1 || (lvl === 1 && this.progress.towerMaxLevel.cannon < 3),
          'Уникальная линия'
        );
      }
      return items;
    }

    if (tab === 'dart') {
      const d = this.progress.dartTree;
      const unlocked = this.progress.unlockedTowers.dart;
      for (let lvl = 1; lvl <= 5; lvl++) {
        add(
          `dart-cd-${lvl}`,
          `КД ${lvl}/5`,
          `кд: -${(lvl - 1) * 7}% -> -${lvl * 7}%`,
          DART_TREE_COSTS.cooldown[lvl - 1],
          d.cooldownLevel >= lvl,
          () => { d.cooldownLevel = lvl; },
          !unlocked || d.cooldownLevel < lvl - 1,
          'КД'
        );
      }
      for (let lvl = 1; lvl <= 5; lvl++) {
        add(
          `dart-dmg-${lvl}`,
          `Урон ${lvl}/5`,
          `урон: +${(lvl - 1) * 8}% -> +${lvl * 8}%`,
          DART_TREE_COSTS.damage[lvl - 1],
          d.damageLevel >= lvl,
          () => { d.damageLevel = lvl; },
          !unlocked || d.damageLevel < lvl - 1,
          'Урон'
        );
      }
      for (let lvl = 1; lvl <= 5; lvl++) {
        add(
          `dart-range-${lvl}`,
          `Дальность ${lvl}/5`,
          `дальность: +${(lvl - 1) * 6}% -> +${lvl * 6}%`,
          DART_TREE_COSTS.range[lvl - 1],
          d.rangeLevel >= lvl,
          () => { d.rangeLevel = lvl; },
          !unlocked || d.rangeLevel < lvl - 1,
          'Дальность'
        );
      }
      for (let lvl = 1; lvl <= 5; lvl++) {
        add(
          `dart-discount-${lvl}`,
          `Скидка ${lvl}/5`,
          `скидка: -${(lvl - 1) * 8}% -> -${lvl * 8}%`,
          DART_TREE_COSTS.discount[lvl - 1],
          d.discountLevel >= lvl,
          () => { d.discountLevel = lvl; },
          !unlocked || d.discountLevel < lvl - 1,
          'Скидка'
        );
      }
      const burnDetails = [
        'Горение: 2.35 сек, 20% урона/сек',
        'Горение: 2.70 сек, 26% урона/сек',
        'Горение: 3.05 сек, 32% урона/сек',
        'Горение: 3.40 сек, 38% урона/сек',
        'Горение: 3.75 сек, 44% урона/сек',
      ];
      for (let lvl = 1; lvl <= 5; lvl++) {
        add(
          `dart-burn-${lvl}`,
          `Горение ${lvl}/5`,
          burnDetails[lvl - 1],
          DART_TREE_COSTS.burn[lvl - 1],
          d.burnLevel >= lvl,
          () => { d.burnLevel = lvl; },
          !unlocked || d.burnLevel < lvl - 1,
          'Горение'
        );
      }
      const slowStackDetails = [
        'Стак-слоу: 4% за стак, до 5, 1.44 сек',
        'Стак-слоу: 5.8% за стак, до 5, 1.68 сек',
        'Стак-слоу: 7.2% за стак, до 5, 1.92 сек',
        'Стак-слоу: 8.6% за стак, до 5, 2.16 сек',
        'Стак-слоу: 10% за стак, до 5, 2.40 сек',
      ];
      for (let lvl = 1; lvl <= 5; lvl++) {
        add(
          `dart-slowstack-${lvl}`,
          `Стаки слоу ${lvl}/5`,
          slowStackDetails[lvl - 1],
          DART_TREE_COSTS.slowStack[lvl - 1],
          d.slowStackLevel >= lvl,
          () => { d.slowStackLevel = lvl; },
          !unlocked || d.slowStackLevel < lvl - 1,
          'Стаки замедления'
        );
      }
      return items;
    }

    if (tab === 'barrel') {
      const b = this.progress.barrelTree;
      const unlocked = this.progress.unlockedTowers.barrel;
      for (let lvl = 1; lvl <= 5; lvl++) {
        const prev = lvl - 1;
        add(
          `barrel-cd-${lvl}`,
          `КД ${lvl}/5`,
          `кд: -${prev * 10}% -> -${lvl * 10}%`,
          BARREL_TREE_COSTS.cooldown[lvl - 1],
          b.cooldownLevel >= lvl,
          () => { b.cooldownLevel = lvl; },
          !unlocked || b.cooldownLevel < lvl - 1,
          'КД'
        );
      }
      for (let lvl = 1; lvl <= 5; lvl++) {
        const prev = lvl - 1;
        add(
          `barrel-dmg-${lvl}`,
          `Урон ${lvl}/5`,
          `урон: +${prev * 8}% -> +${lvl * 8}%`,
          BARREL_TREE_COSTS.damage[lvl - 1],
          b.damageLevel >= lvl,
          () => { b.damageLevel = lvl; },
          !unlocked || b.damageLevel < lvl - 1,
          'Урон'
        );
      }
      for (let lvl = 1; lvl <= 5; lvl++) {
        const prev = lvl - 1;
        add(
          `barrel-discount-${lvl}`,
          `Скидка ${lvl}/5`,
          `скидка: -${prev * 8}% -> -${lvl * 8}%`,
          BARREL_TREE_COSTS.discount[lvl - 1],
          b.discountLevel >= lvl,
          () => { b.discountLevel = lvl; },
          !unlocked || b.discountLevel < lvl - 1,
          'Скидка'
        );
      }
      const utilityDetails = [
        'Склад: +10 мин, радиус +8',
        'Горение: 3 сек, 40% урона/сек',
        'Замедление: 58% на 1.8 сек',
        'Кассетный заряд: +1 взрыв',
        'Термит: горение 4.5 сек, 55% урона/сек',
      ];
      for (let lvl = 1; lvl <= 5; lvl++) {
        add(
          `barrel-utility-${lvl}`,
          `Утилита ${lvl}/5`,
          utilityDetails[lvl - 1],
          BARREL_TREE_COSTS.utility[lvl - 1],
          b.utilityLevel >= lvl,
          () => { b.utilityLevel = lvl; },
          !unlocked || b.utilityLevel < lvl - 1,
          'Уникальная линия'
        );
      }
      const berserkBranches = [
        { key: 'sniper', title: 'Берсерк: Снайпер', costs: BARREL_TREE_COSTS.berserkSniper },
        { key: 'deployer', title: 'Берсерк: Супердеплой', costs: BARREL_TREE_COSTS.berserkDeployer },
        { key: 'booster', title: 'Берсерк: Мехабустер', costs: BARREL_TREE_COSTS.berserkBooster },
      ];
      for (const branch of berserkBranches) {
        for (let lvl = 1; lvl <= 5; lvl++) {
          add(
            `barrel-berserk-${branch.key}-${lvl}`,
            `${branch.title} ${lvl}/5`,
            'Открывает уровень ветки для боевого апгрейда',
            branch.costs[lvl - 1],
            b.berserkUnlock[branch.key] >= lvl,
            () => { b.berserkUnlock[branch.key] = lvl; },
            !unlocked || b.berserkUnlock[branch.key] < lvl - 1,
            branch.title
          );
        }
      }
    }

    return items;
  }

  renderShopTabs() {
    this.shopTabsEl.innerHTML = '';
    for (const tab of this.getShopTabs()) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `shop-tab-btn${this.activeShopTab === tab.id ? ' active' : ''}`;
      btn.textContent = tab.label;
      btn.addEventListener('click', () => {
        this.activeShopTab = tab.id;
        this.renderShopTabs();
        this.renderProgressShop();
      });
      this.shopTabsEl.appendChild(btn);
    }
  }

  renderProgressShop() {
    this.shopGridEl.innerHTML = '';
    const items = this.getShopItems(this.activeShopTab);
    const branchOrder = [];
    const grouped = new Map();
    for (const item of items) {
      const key = item.branch || 'Общее';
      if (!grouped.has(key)) {
        grouped.set(key, []);
        branchOrder.push(key);
      }
      grouped.get(key).push(item);
    }

    for (const branchName of branchOrder) {
      const branchWrap = document.createElement('div');
      branchWrap.className = 'shop-tree-branch';

      const title = document.createElement('div');
      title.className = 'shop-tree-title';
      title.textContent = `Ветка: ${branchName}`;
      branchWrap.appendChild(title);

      const row = document.createElement('div');
      row.className = 'shop-tree-row';
      const branchItems = grouped.get(branchName);
      branchItems.forEach((item, idx) => {
        const el = document.createElement('div');
        el.className = 'shop-item shop-node';
        const state = item.bought ? 'Куплено' : item.blocked ? 'Закрыто' : `${item.cost} жет.`;
        el.innerHTML = `<strong>${item.title}</strong><span>${item.detail}</span>`;
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = state;
        if (item.bought) button.classList.add('bought');
        button.disabled = item.bought || item.blocked || this.progress.tokens < item.cost;
        button.addEventListener('click', () => this.spendTokens(item.cost, item.buy));
        el.appendChild(button);
        row.appendChild(el);
        if (idx < branchItems.length - 1) {
          const link = document.createElement('div');
          link.className = 'shop-tree-link';
          row.appendChild(link);
        }
      });
      branchWrap.appendChild(row);
      this.shopGridEl.appendChild(branchWrap);
    }
  }

  generateDecorations() {
    this.decorations = [];
    if (this.availableDecorationKeys.length === 0) return;

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const key = `${col},${row}`;
        if (isRoad(col, row)) continue;
        if (BUILD_SLOT_SET.has(key)) continue;
        if (isBaseCell(col, row)) continue;
        if (Math.random() > DECORATION_SPAWN_CHANCE) continue;

        const decorationKey = this.availableDecorationKeys[
          Math.floor(Math.random() * this.availableDecorationKeys.length)
        ];
        const rotation = (Math.random() - 0.5) * 0.3;
        const scale = 0.72 + Math.random() * 0.36;
        this.decorations.push({ col, row, decorationKey, rotation, scale });
      }
    }
  }

  getWaveConfig() {
    const difficultyPower = this.getProgressPower();
    const enemiesPerWave = Math.round((6 + this.wave * 3) * (1 + difficultyPower * 0.01));
    const spawnInterval = Math.max(0.55, (2.4 - this.wave * 0.18) / (1 + difficultyPower * 0.012));
    const bluePackChance = Math.min(0.48, 0.1 + this.wave * 0.045);
    const sandChance = this.wave >= 3 ? Math.min(0.16, 0.03 + this.wave * 0.016) : 0;
    const greenChance = this.wave >= 5 ? Math.min(0.13, 0.01 + this.wave * 0.012) : 0;
    return { enemiesPerWave, spawnInterval, bluePackChance, sandChance, greenChance };
  }

  generatePathSpawnPlan(totalEnemies) {
    const plan = new Array(PATHS.length).fill(0);
    for (let i = 0; i < totalEnemies; i++) {
      const idx = Math.floor(Math.random() * PATHS.length);
      plan[idx]++;
    }
    return plan;
  }

  shufflePathIndexes() {
    const indexes = PATHS.map((_, idx) => idx);
    for (let i = indexes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
    }
    return indexes;
  }

  getBossLaneCount() {
    if (this.wave < 5) return 0;
    if (this.wave < 10) return 1;
    if (this.wave < 15) return 2;
    return 3;
  }

  generateBossSpawnSchedule() {
    const laneCount = this.getBossLaneCount();
    if (laneCount === 0) return [];

    const pathIndexes = this.shufflePathIndexes().slice(0, laneCount);
    if (this.wave < 25) {
      return pathIndexes.map((pathIndex) => ({
        pathIndex,
        spawnAtCount: this.enemiesPerWave,
        spawned: false,
      }));
    }

    const schedule = [];
    const usedSpawnCounts = new Set();
    const secondBossChance = this.wave >= 50 ? 0.65 : 0.35;
    const firstBossMinProgress = this.wave >= 50 ? 0 : 0.28;

    const reserveSpawnCount = (preferred) => {
      let spawnAtCount = Math.max(0, Math.min(this.enemiesPerWave, Math.round(preferred)));
      while (usedSpawnCounts.has(spawnAtCount) && spawnAtCount < this.enemiesPerWave) {
        spawnAtCount++;
      }
      while (usedSpawnCounts.has(spawnAtCount) && spawnAtCount > 0) {
        spawnAtCount--;
      }
      usedSpawnCounts.add(spawnAtCount);
      return spawnAtCount;
    };

    pathIndexes.forEach((pathIndex, idx) => {
      const earlyProgress = firstBossMinProgress + Math.random() * 0.35;
      const firstPreferred = idx === 0 && this.wave >= 50
        ? 0
        : this.enemiesPerWave * earlyProgress;
      schedule.push({
        pathIndex,
        spawnAtCount: reserveSpawnCount(firstPreferred),
        spawned: false,
      });

      if (Math.random() < secondBossChance) {
        const lateProgress = 0.62 + Math.random() * 0.28;
        schedule.push({
          pathIndex,
          spawnAtCount: reserveSpawnCount(this.enemiesPerWave * lateProgress),
          spawned: false,
        });
      }
    });

    return schedule.sort((a, b) => a.spawnAtCount - b.spawnAtCount);
  }

  takePathForSpawn(groupSize = 1) {
    const available = this.pathSpawnRemaining
      .map((count, idx) => ({ count, idx }))
      .filter((entry) => entry.count > 0);
    if (available.length === 0) {
      return Math.floor(Math.random() * PATHS.length);
    }

    const totalWeight = available.reduce((sum, entry) => sum + entry.count, 0);
    let roll = Math.random() * totalWeight;
    let selectedIdx = available[0].idx;
    for (const entry of available) {
      roll -= entry.count;
      if (roll <= 0) {
        selectedIdx = entry.idx;
        break;
      }
    }

    this.pathSpawnRemaining[selectedIdx] = Math.max(
      0,
      this.pathSpawnRemaining[selectedIdx] - Math.max(1, groupSize)
    );
    return selectedIdx;
  }

  getPathThreatLevel(remainingCount) {
    if (remainingCount <= 0) return null;
    if (remainingCount <= 4) return { color: '#2ecc71' };
    if (remainingCount <= 8) return { color: '#f39c12' };
    return { color: '#e74c3c' };
  }

  startWave() {
    const config = this.getWaveConfig();
    this.enemiesPerWave = config.enemiesPerWave;
    this.spawnInterval = config.spawnInterval;
    this.bluePackChance = config.bluePackChance;
    this.sandChance = config.sandChance;
    this.greenChance = config.greenChance;
    this.waveActive = true;
    this.enemiesSpawned = 0;
    this.spawnTimer = 0;
    this.pathSpawnPlan = this.generatePathSpawnPlan(this.enemiesPerWave);
    this.pathSpawnRemaining = [...this.pathSpawnPlan];
    this.pathFirstSpawned = new Array(PATHS.length).fill(false);
    this.pathIndicatorMinTimer = new Array(PATHS.length).fill(5);
    this.bossSpawnSchedule = this.generateBossSpawnSchedule();
    this.showWaveBanner(`В0ЛНА ${this.wave}`);
    this.spawnDueBosses();
  }

  spawnRedEnemy() {
    const pathIndex = this.takePathForSpawn(1);
    const path = PATHS[pathIndex];
    this.enemies.push(new Enemy(this, 'red', path, 0, this.wave));
    this.pathFirstSpawned[pathIndex] = true;
    this.enemiesSpawned++;
  }

  spawnSandEnemy() {
    const pathIndex = this.takePathForSpawn(1);
    const path = PATHS[pathIndex];
    this.enemies.push(new Enemy(this, 'sand', path, 0, this.wave));
    this.pathFirstSpawned[pathIndex] = true;
    this.enemiesSpawned++;
  }

  spawnBluePack() {
    const remaining = this.enemiesPerWave - this.enemiesSpawned;
    let count = 2 + Math.floor(Math.random() * 9);
    count = Math.min(count, remaining);
    if (count < 2) {
      this.spawnRedEnemy();
      return;
    }

    const pathIndex = this.takePathForSpawn(count);
    const path = PATHS[pathIndex];
    for (let i = 0; i < count; i++) {
      this.enemies.push(new Enemy(this, 'blue', path, -i * 0.07, this.wave));
    }
    this.pathFirstSpawned[pathIndex] = true;
    this.enemiesSpawned += count;
  }

  spawnGreenEnemy() {
    const pathIndex = this.takePathForSpawn(1);
    const path = PATHS[pathIndex];
    this.enemies.push(new Enemy(this, 'green', path, 0, this.wave));
    this.pathFirstSpawned[pathIndex] = true;
    this.enemiesSpawned++;
  }

  spawnBoss(pathIndex = Math.floor(Math.random() * PATHS.length)) {
    const path = PATHS[pathIndex];
    this.enemies.push(new Enemy(this, 'dark', path, 0, this.wave));
    this.pathFirstSpawned[pathIndex] = true;
  }

  spawnDueBosses() {
    if (this.wave < 5) return;
    const due = this.bossSpawnSchedule.filter((entry) => (
      !entry.spawned && this.enemiesSpawned >= entry.spawnAtCount
    ));
    if (due.length === 0) return;

    const entriesToSpawn = this.wave < 25 ? due : [due[0]];
    for (const entry of entriesToSpawn) {
      this.spawnBoss(entry.pathIndex);
      entry.spawned = true;
    }
  }

  areBossesDone() {
    return this.wave < 5 || this.bossSpawnSchedule.every((entry) => entry.spawned);
  }

  spawnEnemy() {
    const roll = Math.random();
    if (this.wave >= 4 && roll < this.greenChance) {
      this.spawnGreenEnemy();
    } else if (this.wave >= 3 && roll < this.greenChance + this.sandChance) {
      this.spawnSandEnemy();
    } else if (roll < this.greenChance + this.sandChance + this.bluePackChance) {
      this.spawnBluePack();
    } else {
      this.spawnRedEnemy();
    }
  }

  spawnExplosion(x, y) {
    this.explosions.push(new Explosion(x, y, this.images));
  }

  spawnBarrelExplosion(x, y) {
    this.explosions.push(new BarrelExplosion(x, y, this.images));
  }

  canvasToGameCoords(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  hasTowerAt(col, row) {
    return this.towers.some((t) => t.col === col && t.row === row);
  }

  getTowerAt(x, y) {
    for (const tower of this.towers) {
      if (tower.containsPoint(x, y)) return tower;
    }
    return null;
  }

  selectTower(tower) {
    this.selectedTower = tower;
  }

  deselectTower() {
    this.selectedTower = null;
  }

  getPlusAt(x, y) {
    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);
    if (!isBuildSlot(col, row)) return null;
    if (this.hasTowerAt(col, row)) return null;
    return { col, row };
  }

  openRadialMenu(x, y, options, layout = 'default') {
    this.currentRadial = { x, y, options, layout };
    this.renderRadialMenu();
  }

  closeRadialMenu() {
    this.currentRadial = null;
    this.radialMenu.classList.add('hidden');
    this.pendingSellTowerId = null;
  }

  registerKill(enemy) {
    if (!enemy) return;
    this.runKills++;
    const tokenByType = {
      blue: 0.03,
      red: 0.12,
      sand: 0.16,
      green: 0.18,
      dark: 1.4,
    };
    this.runKillTokenScore += tokenByType[enemy.type] ?? 0.1;
  }

  calculateTokenReward() {
    const wavesPlayed = Math.max(0, this.highestWaveThisRun - this.runStartWave + 1);
    const waveReward = this.runWaveClears * 7 + Math.round(wavesPlayed ** 1.22 * 6);
    const killReward = Math.ceil(this.runKillTokenScore);
    const milestoneBonus = Math.round(Math.max(0, this.highestWaveThisRun - this.progress.bestWave) * 12);
    const activityFloor = this.runKills > 0 || this.runWaveClears > 0 ? 3 : 0;
    return Math.max(0, activityFloor + waveReward + killReward + milestoneBonus);
  }

  getTowerSellRefund(tower) {
    return Math.max(1, Math.round(tower.spentGold * 0.5));
  }

  sellTower(tower) {
    const idx = this.towers.indexOf(tower);
    if (idx < 0) return;
    const refund = this.getTowerSellRefund(tower);
    this.towers.splice(idx, 1);
    this.gold += refund;
    this.pendingSellTowerId = null;
    this.deselectTower();
    this.closeRadialMenu();
    this.updateHud();
  }

  handleResetProgressClick() {
    if (!this.pendingResetProgress) {
      this.pendingResetProgress = true;
      this.resetProgressBtn.textContent = 'Сбросить прогресс ✓';
      this.resetProgressBtn.classList.add('confirm-pending');
      return;
    }
    localStorage.removeItem(PROGRESSION_STORAGE_KEY);
    this.pendingResetProgress = false;
    window.location.reload();
  }

  renderRadialMenu() {
    if (!this.currentRadial) return;
    this.radialMenu.innerHTML = '';
    const { x, y, options, layout } = this.currentRadial;
    const gameX = x / this.canvas.width;
    let dir = 0;
    if (gameX < 0.24) dir = 1;
    if (gameX > 0.76) dir = -1;
    this.radialMenu.style.left = `${(x / this.canvas.width) * 100}%`;
    this.radialMenu.style.top = `${(y / this.canvas.height) * 100}%`;

    options.forEach((option, idx) => {
      const cost = typeof option.getCost === 'function' ? option.getCost() : option.cost;
      if (cost == null) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'radial-option';
      if (option.iconOffsetY) {
        btn.style.setProperty('--icon-offset-y', `${option.iconOffsetY}px`);
      }
      const affordable = option.skipAffordabilityCheck ? true : this.gold >= cost;
      if (!affordable) btn.classList.add('disabled');
      let dx = 0;
      let dy = -30;
      if (layout === 'upgrade') {
        if (option.position === 'below') {
          dx = 0;
          dy = 54;
        } else {
          const topOptions = options.filter((entry) => entry.position !== 'below');
          const topIndex = topOptions.indexOf(option);
          const cols = Math.min(3, Math.max(1, topOptions.length));
          const row = Math.floor(topIndex / cols);
          const col = topIndex % cols;
          const xStart = -((cols - 1) * 68) / 2;
          dx = xStart + col * 68;
          dy = -26 + row * 60;
        }
      } else {
        const gap = 74;
        const total = options.length;
        const start = -((total - 1) * gap) / 2;
        dx = start + idx * gap;
      }
      btn.style.transform = `translate(${dx}px, ${dy}px) translate(-50%, -50%)`;
      const iconSrc = typeof option.getIcon === 'function' ? option.getIcon() : option.icon;
      btn.innerHTML = `<img src="${iconSrc}" alt=""><span class="cost">${option.costPrefix || ''}${cost}${option.costSuffix || ''}</span>`;
      btn.addEventListener('click', () => {
        const currentCost = typeof option.getCost === 'function' ? option.getCost() : option.cost;
        if (currentCost == null && !option.allowNullCost) {
          this.showHint('Максимальная прокачка');
          this.closeRadialMenu();
          return;
        }
        if (!option.skipAffordabilityCheck && this.gold < currentCost) {
          this.showHint('Нужно больше золота');
          return;
        }
        option.action();
      });
      this.radialMenu.appendChild(btn);
    });
    this.radialMenu.classList.remove('hidden');
  }

  confirmPurchase(slot, towerType) {
    if (this.gameOver) return;
    const { col, row } = slot;
    const cfg = TOWER_TYPES[towerType];

    if (!cfg || !isBuildSlot(col, row) || this.hasTowerAt(col, row)) {
      this.closeRadialMenu();
      return;
    }

    const buyCost = Math.round(cfg.cost * this.getTowerDiscountMultiplier(towerType));
    const finalBuyCost = this.scaleTowerPurchaseCost(towerType, buyCost);
    if (this.gold < finalBuyCost) {
      this.showHint('Недостаточно золота');
      return;
    }

    this.gold -= finalBuyCost;
    const tower = new Tower(col, row, this, towerType);
    tower.spentGold = finalBuyCost;
    this.towers.push(tower);
    this.updateHud();
    this.closeRadialMenu();
  }

  upgradeTower(tower) {
    if (!tower.canUpgrade()) return;
    const baseCost = tower.getUpgradeCost();
    const cost = this.scaleGoldCost(Math.round(baseCost * this.getTowerDiscountMultiplier(tower.type)));
    if (this.gold < cost) return;
    this.gold -= cost;
    tower.upgrade();
    tower.spentGold += cost;
    this.updateHud();
    this.renderRadialMenu();
  }

  upgradeTowerRange(tower) {
    if (!tower.canUpgradeRange()) return;
    const baseCost = tower.getRangeUpgradeCost();
    const cost = this.scaleGoldCost(Math.round(baseCost * this.getTowerDiscountMultiplier(tower.type)));
    if (this.gold < cost) return;
    this.gold -= cost;
    tower.upgradeRange();
    tower.spentGold += cost;
    this.updateHud();
    this.renderRadialMenu();
  }

  getTowerUpgradeIcon(tower) {
    return 'assets/kenney_game-icons/PNG/White/2x/arrowUp.png';
  }

  getTowerRangeUpgradeIcon() {
    return 'assets/kenney_game-icons/PNG/White/2x/zoomIn.png';
  }

  upgradeBerserk(tower) {
    if (!tower.canUpgradeBerserk()) return;
    const cost = this.scaleGoldCost(tower.getBerserkUpgradeCost());
    if (this.gold < cost) return;
    this.gold -= cost;
    tower.upgradeBerserk();
    tower.spentGold += cost;
    this.updateHud();
    this.renderRadialMenu();
  }

  upgradeBarrelBerserk(tower, mode) {
    const cost = this.scaleGoldCost(tower.getBarrelBerserkCost(mode));
    if (cost == null || this.gold < cost) return;
    this.gold -= cost;
    tower.upgradeBarrelBerserk(mode);
    tower.spentGold += cost;
    this.updateHud();
    this.renderRadialMenu();
  }

  showPurchaseRadial(slot) {
    const center = cellCenter(slot.col, slot.row);
    const options = Object.entries(TOWER_TYPES)
      .filter(([type]) => this.isTowerUnlocked(type))
      .map(([type, cfg]) => ({
        cost: type === 'barrel'
          ? this.scaleTowerPurchaseCost(type, Math.round(cfg.cost * this.getBarrelDiscountMultiplier()))
          : this.scaleTowerPurchaseCost(type, Math.round(cfg.cost * this.getTowerDiscountMultiplier(type))),
        icon: `${ASSET_BASE}${cfg.shopSprite}.png`,
        iconOffsetY: cfg.shopIconOffsetY || 0,
        action: () => this.confirmPurchase(slot, type),
      }));
    this.openRadialMenu(center.x, center.y, options, 'purchase');
  }

  showUpgradeRadial(tower) {
    const options = [];
    if (tower.canUpgrade()) {
      options.push({
        getCost: () => {
          const base = tower.getUpgradeCost();
          if (base == null) return null;
          return this.scaleGoldCost(Math.round(base * this.getTowerDiscountMultiplier(tower.type)));
        },
        icon: this.getTowerUpgradeIcon(tower),
        action: () => this.upgradeTower(tower),
      });
    }
    if (tower.canUpgradeRange()) {
      options.push({
        getCost: () => {
          const base = tower.getRangeUpgradeCost();
          if (base == null) return null;
          return this.scaleGoldCost(Math.round(base * this.getTowerDiscountMultiplier(tower.type)));
        },
        icon: this.getTowerRangeUpgradeIcon(),
        action: () => this.upgradeTowerRange(tower),
      });
    }
    if (tower.canUpgradeBerserk()) {
      options.push({
        getCost: () => this.scaleGoldCost(tower.getBerserkUpgradeCost()),
        icon: 'assets/kenney_ranks-pack/PNG/Retina/Gold/rank001.png',
        action: () => this.upgradeBerserk(tower),
      });
    }
    if (tower.type === 'barrel' && tower.level >= 3) {
      const barrelModes = [
        { mode: 'sniper', icon: 'assets/kenney_game-icons/PNG/White/2x/target.png' },
        { mode: 'deployer', icon: 'assets/kenney_game-icons/PNG/White/2x/warning.png' },
        { mode: 'booster', icon: 'assets/kenney_game-icons/PNG/White/2x/power.png' },
      ];
      for (const entry of barrelModes) {
        if (!tower.canUpgradeBarrelBerserk(entry.mode)) continue;
        options.push({
          getCost: () => this.scaleGoldCost(tower.getBarrelBerserkCost(entry.mode)),
          icon: entry.icon,
          action: () => this.upgradeBarrelBerserk(tower, entry.mode),
        });
      }
    }
    options.push({
      getCost: () => this.getTowerSellRefund(tower),
      costPrefix: '+',
      getIcon: () => (
        this.pendingSellTowerId === tower.id
          ? 'assets/kenney_game-icons/PNG/White/2x/checkmark.png'
          : 'assets/kenney_game-icons/PNG/White/2x/trashcan.png'
      ),
      skipAffordabilityCheck: true,
      position: 'below',
      action: () => {
        if (this.pendingSellTowerId !== tower.id) {
          this.pendingSellTowerId = tower.id;
          this.renderRadialMenu();
          return;
        }
        this.sellTower(tower);
      },
    });
    if (options.length === 0) {
      this.showHint('Максимальная прокачка');
      this.closeRadialMenu();
      return;
    }
    this.openRadialMenu(tower.x, tower.y, options, 'upgrade');
  }

  onCanvasClick(e) {
    if (this.gameOver || this.isPaused || !this.started) return;

    const { x, y } = this.canvasToGameCoords(e.clientX, e.clientY);
    const tower = this.getTowerAt(x, y);

    if (tower) {
      this.selectTower(tower);
      this.showUpgradeRadial(tower);
      return;
    }

    this.deselectTower();
    this.closeRadialMenu();

    const slot = this.getPlusAt(x, y);
    if (slot) {
      this.showPurchaseRadial(slot);
    }
  }

  drawBuildSlots() {
    // Build slots are rendered as map sand tiles in drawMap().
  }

  showHint(message) {
    this.hintMessage = message;
    this.hintTimer = 1.2;
    this.hintEl.textContent = message;
    this.hintEl.classList.remove('hidden');
  }

  showWaveBanner(text) {
    this.waveBannerEl.textContent = text;
    this.waveBannerEl.classList.remove('hidden');
    this.waveBannerTimer = 1.3;
  }

  updateHud() {
    document.getElementById('gold').textContent = this.gold;
    document.getElementById('lives').textContent = this.lives;
    document.getElementById('wave').textContent = this.wave;
    this.highestWaveThisRun = Math.max(this.highestWaveThisRun, this.wave);
    if (this.currentRadial) this.renderRadialMenu();

    if (this.lives <= 0 && !this.gameOver) {
      this.gameOver = true;
      this.finishRun();
      this.closeRadialMenu();
      this.defeatMenu.classList.remove('hidden');
    }
  }

  finishRun() {
    if (this.runRewarded) return;
    this.runRewarded = true;
    const reward = this.calculateTokenReward();
    this.runTokenReward = reward;
    this.progress.tokens += reward;
    this.progress.runs++;
    this.progress.bestWave = Math.max(this.progress.bestWave, this.highestWaveThisRun);
    this.saveProgress();
    this.runRewardEl.textContent = `Жетоны: +${reward} (убийства: ${this.runKills}, волны: ${this.runWaveClears}, bounty: ${Math.ceil(this.runKillTokenScore)})`;
    this.updateProgressUi();
  }

  startGame() {
    if (this.pendingResetProgress) {
      this.pendingResetProgress = false;
      this.resetProgressBtn.textContent = 'Сбросить прогресс';
      this.resetProgressBtn.classList.remove('confirm-pending');
    }
    this.progress.selectedStartWave = Math.min(
      this.progress.selectedStartWave,
      getMaxStartWave(this.progress)
    );
    this.wave = this.progress.selectedStartWave;
    this.runStartWave = this.wave;
    this.highestWaveThisRun = this.wave;
    this.gold = this.getStartingGold();
    this.lives = this.getStartingLives();
    this.runRewarded = false;
    this.runKills = 0;
    this.runKillTokenScore = 0;
    this.runWaveClears = 0;
    this.runTokenReward = 0;
    this.runGoldEarned = 0;
    const maxSpeed = getMaxGameSpeed(this.progress);
    if (this.progress.speedPinned) {
      const pinned = this.progress.speedPinnedValue || 1;
      this.gameSpeed = GAME_SPEED_OPTIONS.includes(pinned) ? Math.min(pinned, maxSpeed) : 1;
    }
    this.updateHud();
    this.started = true;
    this.mainMenu.classList.add('hidden');
    this.shopMenu.classList.add('hidden');
    if (this.decorations.length === 0) {
      this.generateDecorations();
    }
    this.startWave();
  }

  togglePause(force) {
    if (!this.started || this.gameOver) return;
    this.isPaused = typeof force === 'boolean' ? force : !this.isPaused;
    this.pauseMenu.classList.toggle('hidden', !this.isPaused);
    if (this.isPaused) this.closeRadialMenu();
  }

  restart() {
    window.location.reload();
  }

  update(dt) {
    if (!this.started || this.gameOver || this.isPaused) return;

    const realDt = dt / Math.max(1, this.gameSpeed);
    for (let i = 0; i < this.pathIndicatorMinTimer.length; i++) {
      if (this.pathIndicatorMinTimer[i] > 0) {
        this.pathIndicatorMinTimer[i] = Math.max(0, this.pathIndicatorMinTimer[i] - realDt);
      }
    }

    if (this.hintTimer > 0) {
      this.hintTimer -= dt;
      if (this.hintTimer <= 0) {
        this.hintMessage = '';
        this.hintEl.classList.add('hidden');
      }
    }

    if (this.waveBannerTimer > 0) {
      this.waveBannerTimer -= dt;
      if (this.waveBannerTimer <= 0) this.waveBannerEl.classList.add('hidden');
    }

    if (this.waveActive && this.enemiesSpawned < this.enemiesPerWave) {
      this.spawnTimer += dt;
      if (this.spawnTimer >= this.spawnInterval) {
        this.spawnTimer = 0;
        this.spawnEnemy();
      }
    }

    if (this.waveActive) this.spawnDueBosses();

    const allSpawned = this.enemiesSpawned >= this.enemiesPerWave;
    const noBossPending = this.areBossesDone();
    const waveCleared = allSpawned && noBossPending && this.enemies.length === 0;

    if (waveCleared && this.waveActive) {
      this.waveActive = false;
      this.runWaveClears++;
      if (this.lives > 0) {
        this.wave++;
        this.updateHud();
        setTimeout(() => {
          if (!this.gameOver) this.startWave();
        }, 1200);
      }
    }

    for (const tower of this.towers) {
      tower.update(dt);
    }

    for (const enemy of this.enemies) {
      enemy.update(dt);
    }

    for (const projectile of this.projectiles) {
      projectile.update(dt);
    }

    for (const mineFlight of this.mineFlights) {
      mineFlight.update(dt, this);
    }

    for (const mine of this.mines) {
      mine.update(dt, this);
    }

    for (const explosion of this.explosions) {
      explosion.update(dt);
    }

    this.enemies = this.enemies.filter((e) => e.alive);
    this.projectiles = this.projectiles.filter((p) => !p.hit);
    this.mineFlights = this.mineFlights.filter((f) => !f.finished);
    this.mines = this.mines.filter((m) => !m.spent);
    this.explosions = this.explosions.filter((e) => !e.finished);
  }

  drawMap() {
    const { ctx, images } = this;
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        let key = 'tileGrass1';
        if (isRoad(col, row)) {
          if (col === MAIN_BASE_JUNCTION.col && row === MAIN_BASE_JUNCTION.row) {
            key = MAIN_BASE_JUNCTION.tile;
          } else if (col === RIGHT_BASE_JUNCTION.col && row === RIGHT_BASE_JUNCTION.row) {
            key = RIGHT_BASE_JUNCTION.tile;
          } else {
            const n = isRoad(col, row - 1);
            const s = isRoad(col, row + 1);
            const w = isRoad(col - 1, row);
            const e = isRoad(col + 1, row);
            const roadNeighborCount = (n ? 1 : 0) + (s ? 1 : 0) + (w ? 1 : 0) + (e ? 1 : 0);
            if ((n || s) && !(e || w)) key = 'tileSand_roadNorth';
            else if ((e || w) && !(n || s)) key = 'tileSand_roadEast';
            else if (roadNeighborCount >= 3) key = 'tileSand_roadCrossing';
            else if (n && e) key = 'tileSand_roadCornerUR';
            else if (n && w) key = 'tileSand_roadCornerUL';
            else if (s && e) key = 'tileSand_roadCornerLR';
            else if (s && w) key = 'tileSand_roadCornerLL';
            else key = 'tileSand_roadEast';
          }
        } else if (isBuildSlot(col, row)) {
          key = (col + row) % 2 === 0 ? 'tileSand1' : 'tileSand2';
        } else {
          const transition = getGrassTransitionKey(col, row);
          if (transition) key = transition;
        }
        const img = images[key];
        ctx.drawImage(img, col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
    for (const decoration of this.decorations) {
      const img = images[decoration.decorationKey];
      if (!img) continue;
      const center = cellCenter(decoration.col, decoration.row);
      const w = img.width * ASSET_SCALE * decoration.scale;
      const h = img.height * ASSET_SCALE * decoration.scale;
      drawRotatedSprite(ctx, img, center.x, center.y, w, h, decoration.rotation);
    }
    const baseCenter = cellCenter(BASE_COL, BASE_ROW);
    const baseW = TILE_SIZE * 1.8;
    const baseH = TILE_SIZE * 1.1;
    ctx.fillStyle = 'rgba(30, 70, 170, 0.65)';
    ctx.fillRect(baseCenter.x - baseW / 2, baseCenter.y - baseH / 2, baseW, baseH);
    ctx.strokeStyle = '#b8e8ff';
    ctx.lineWidth = 3;
    ctx.strokeRect(baseCenter.x - baseW / 2, baseCenter.y - baseH / 2, baseW, baseH);
    ctx.fillStyle = '#000';
    ctx.font = '20px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('БАЗА', baseCenter.x, baseCenter.y + 7);

    for (let i = 0; i < PATHS.length; i++) {
      if (this.pathFirstSpawned[i] && this.pathIndicatorMinTimer[i] <= 0) continue;
      const threat = this.getPathThreatLevel(this.pathSpawnRemaining[i]);
      if (!threat) continue;
      const start = PATHS[i][0];
      const markerCol = start.row === 0 ? start.col - 1 : start.col;
      const markerRow = start.row === 0 ? start.row + 1 : start.row;
      const center = cellCenter(markerCol, markerRow);
      const markerY = center.y - TILE_SIZE * 0.8;

      ctx.beginPath();
      ctx.arc(center.x, markerY, 16, 0, Math.PI * 2);
      ctx.fillStyle = threat.color;
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  draw() {
    const { ctx, images } = this;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawMap();
    this.drawBuildSlots();

    if (this.selectedTower) {
      this.selectedTower.drawRange(ctx);
    }

    for (const tower of this.towers) {
      tower.draw(ctx, images);
    }

    for (const enemy of this.enemies) {
      enemy.draw(ctx, images);
    }

    for (const mine of this.mines) {
      mine.draw(ctx, images);
    }

    for (const mineFlight of this.mineFlights) {
      mineFlight.draw(ctx, images);
    }

    for (const projectile of this.projectiles) {
      projectile.draw(ctx, images);
    }

    for (const explosion of this.explosions) {
      explosion.draw(ctx);
    }

    for (const tower of this.towers) {
      tower.drawRank(ctx, images);
    }

    if (!this.started) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  loop(timestamp) {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1) * this.gameSpeed;
    this.lastTime = timestamp;

    this.update(dt);
    this.draw();

    requestAnimationFrame((t) => this.loop(t));
  }
}
