const GRID_COLS = 22;
const GRID_ROWS = 14;
const TILE_SIZE = 48;
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
const MAIN_BASE_JUNCTION = { col: 11, row: 10, tile: 'tileGrass_roadSplitS' };
const RIGHT_BASE_JUNCTION = { col: 13, row: 10, tile: 'tileGrass_roadSplitN' };

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
};

const TOWER_TYPES = {
  cannon: {
    label: 'Танк',
    cost: 50,
    description: 'Сильные снаряды',
    shopSprite: 'tank_green',
    shopIconOffsetY: 4,
    bodySprite: 'tank_green',
    range: 120,
    fireCooldown: 0.6,
    projectileSpeed: 280,
    projectiles: {
      1: 'bulletGreen1',
      2: 'bulletGreen1_outline',
      3: 'bulletGreen3_outline',
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
        1: 'shotThin',
        2: 'shotLarge',
        3: 'shotOrange',
        4: 'shotRed',
      },
      bodySprite: 'tank_bigRed',
    },
  },
  dart: {
    label: 'Дротики',
    cost: 150,
    description: 'Очень быстрая стрельба',
    shopSprite: 'tankBody_bigRed',
    bodySprite: 'tankBody_bigRed',
    range: 110,
    fireCooldown: 0.12,
    projectileSpeed: 440,
    projectiles: {
      1: 'specialBarrel6',
      2: 'specialBarrel7',
      3: 'specialBarrel7_outline',
      4: 'shotLarge',
      5: 'shotRed',
    },
    damage: { 1: 5, 2: 8, 3: 13, 4: 34, 5: 86 },
    splashRadius: { 4: 46, 5: 76 },
    upgradeCost: { 2: 100, 3: 200, 4: 1000, 5: 3000 },
  },
  barrel: {
    label: 'Бочкомёт',
    cost: 120,
    description: 'Взрывные бочки',
    shopSprite: 'tankBody_darkLarge_outline',
    shopIconOffsetY: -4,
    bodySprite: 'tankBody_darkLarge_outline',
    range: 300,
    fireCooldown: { 1: 3, 2: 2.5, 3: 2 },
    projectileSpeed: 200,
    splashRadius: { 1: 50, 2: 65, 3: 85 },
    projectiles: {
      1: 'barrelBlack_side',
      2: 'barrelBlack_side',
      3: 'barrelBlack_side',
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
const GAME_SPEED_OPTIONS = [1, 2, 3];
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
  speedLevel: 0,
  startWaveLevel: 0,
};
const STAT_MAX_LEVELS = { damage: 10, range: 10, economy: 10, lives: 10 };
const STAT_COSTS = {
  damage: [40, 85, 130, 180, 240, 300, 390, 500, 640, 820],
  range: [35, 75, 115, 165, 220, 285, 360, 460, 590, 750],
  economy: [35, 70, 105, 150, 205, 270, 350, 450, 580, 740],
  lives: [45, 90, 135, 185, 250, 330, 430, 560, 730, 940],
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
const BERSERK_UNLOCK_COST = 420;
const SPEED_LEVEL_COSTS = [120, 300];
const START_WAVE_COSTS = [120, 220, 380, 650, 1100];

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
  'tileGrass_roadEast',
  'tileGrass_roadNorth',
  'tileGrass_roadCrossing',
  'tileGrass_roadSplitN',
  'tileGrass_roadSplitS',
  'tileGrass_roadCornerUL',
  'tileGrass_roadCornerUR',
  'tileGrass_roadCornerLL',
  'tileGrass_roadCornerLR',
  'tank_red',
  'tank_blue',
  'tank_dark',
  'tank_sand',
  'tank_green',
  'tank_bigRed',
  'tankBody_bigRed',
  'tankBody_darkLarge_outline',
  'bulletGreen1',
  'bulletGreen1_outline',
  'bulletGreen3_outline',
  'specialBarrel6',
  'specialBarrel7',
  'specialBarrel7_outline',
  'barrelBlack_side',
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
  'shotThin',
  'shotLarge',
  'shotOrange',
  'shotRed',
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

  constructor(x, y, damage, splashRadius, ownerTower, col = null, row = null) {
    this.x = x;
    this.y = y;
    this.col = col;
    this.row = row;
    this.damage = damage;
    this.splashRadius = splashRadius;
    this.ownerTower = ownerTower;
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
    const img = images.barrelBlack_side;
    const w = img.width * ASSET_SCALE * 1.25;
    const h = img.height * ASSET_SCALE * 1.25;
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
  static HEAL_RADIUS = 170;
  static HEAL_AMOUNT = 8;
  static HEAL_FLASH_DURATION = 0.2;
  static BOSS_SYNC_GAP = 0.45;
  static FAST_PACK_LOOKAHEAD = 1.8;
  static FAST_PACK_MIN_COUNT = 2;
  static HEALER_MIN_SPEED_MULT = 0.6;
  static HEALER_MAX_SPEED_MULT = 1.9;
  static GOLD_REWARD_MULTIPLIER = 1.3;

  constructor(game, type = 'red', path = PATHS[0], pathOffset = 0, wave = 1) {
    const cfg = ENEMY_TYPES[type];
    this.game = game;
    this.type = type;
    this.wave = wave;
    const speedMultiplier = game.getEnemySpeedMultiplier?.() ?? 1;
    this.baseSpeed = cfg.speed * speedMultiplier;
    this.speed = this.baseSpeed;
    this.goldReward = Math.round(cfg.gold * Enemy.GOLD_REWARD_MULTIPLIER);
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

  takeDamage(amount) {
    if (!this.alive) return;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.die();
    }
  }

  die() {
    if (!this.alive) return;
    this.alive = false;
    this.game.spawnExplosion(this.x, this.y);
    this.game.gold += this.goldReward;
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

    if (this.healFlashTimer > 0) {
      this.healFlashTimer = Math.max(0, this.healFlashTimer - dt);
    }

    if (this.waypointIndex >= this.path.length - 1) {
      this.reachedEnd = true;
      this.alive = false;
      this.game.lives--;
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

    const advance = (this.speed * this.slowMultiplier * dt) / segmentLength;

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
            other.healFlashTimer = Enemy.HEAL_FLASH_DURATION;
          }
        }
      }
    }
  }

  draw(ctx, images) {
    if (!this.alive && !this.reachedEnd) return;

    const img = images[ENEMY_TYPES[this.type].sprite];
    const w = img.width * ASSET_SCALE;
    const h = img.height * ASSET_SCALE;

    if (this.alive && this.type === 'sand') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, Enemy.HEAL_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(46, 204, 113, 0.08)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(46, 204, 113, 0.65)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (this.alive && this.healFlashTimer > 0) {
      const alpha = this.healFlashTimer / Enemy.HEAL_FLASH_DURATION;
      ctx.beginPath();
      ctx.arc(this.x, this.y, Math.max(w, h) * 0.38, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(46, 204, 113, ${0.25 * alpha})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(46, 204, 113, ${0.95 * alpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    drawRotatedSprite(ctx, img, this.x, this.y, w, h, this.angle);

    if (this.alive && this.hp < this.maxHp) {
      const barW = TILE_SIZE * 0.6;
      const barH = 4;
      const barX = this.x - barW / 2;
      const barY = this.y - h / 2 - 8;
      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barW, barH);
      const barColors = { blue: '#3498db', dark: '#8e44ad', sand: '#f39c12' };
      ctx.fillStyle = barColors[this.type] || '#e74c3c';
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
  }

  update(dt) {
    if (this.hit) return;

    if (!this.target.alive) {
      this.hit = true;
      return;
    }

    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist < Projectile.HIT_RADIUS) {
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
    const isDart = this.bulletKey.startsWith('specialBarrel');
    const isBarrel = this.bulletKey === 'barrelBlack_side';
    const scale = isDart ? 1.6 : isBarrel ? 1.2 : this.bulletKey === 'bulletGreen3_outline' ? 2.2 : 2;
    const w = img.width * ASSET_SCALE * scale;
    const h = img.height * ASSET_SCALE * scale;

    drawRotatedSprite(ctx, img, this.x, this.y, w, h, this.flightAngle || 0);
  }
}

class Tower {
  static DAMAGE_MULTIPLIER = 1.1;
  static MAX_BARREL_MINES = 30;
  static BARREL_MINE_CELL_OFFSET = TILE_SIZE * 0.28;
  static RANGE_UPGRADE_MULTIPLIER = 1.2;
  static CANNON_BERSERK_CYCLE_COOLDOWN = 7;
  static CANNON_BERSERK_BASE_DURATION = 7;

  constructor(col, row, game, type = 'cannon') {
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
    this.berserkLevel = 0;
    this.berserkTimer = 0;
    this.berserkDurationCurrent = Tower.CANNON_BERSERK_BASE_DURATION;
    this.berserkCooldownTimer = 0;
    this.berserkWaitTimer = 0;
    this.isWaitingForBerserkEnemy = false;
    this.isBerserkActive = false;
  }

  getRange() {
    let range = this.config.range;
    if (this.type !== 'barrel') {
      range *= Math.pow(Tower.RANGE_UPGRADE_MULTIPLIER, this.level - 1);
    }
    if (this.type === 'cannon' && this.isBerserkActive) {
      range *= 2;
    }
    range *= this.game.getTowerRangeMultiplier?.(this.type) ?? 1;
    return range;
  }

  getDamage() {
    let dmg = this.config.damage[this.level];
    if (this.isBerserkActive && this.config.berserk) {
      dmg *= this.config.berserk.damageMultiplier[this.berserkLevel];
    }
    const progressMultiplier = this.game.getTowerDamageMultiplier?.(this.type) ?? 1;
    return Math.round(dmg * Tower.DAMAGE_MULTIPLIER * progressMultiplier);
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
    if (this.type === 'barrel' && this.game.hasProgressEffect?.('barrelStockpile')) {
      value *= 0.9;
    }
    return value;
  }

  getSplashRadius() {
    if (this.type === 'cannon' && this.level >= 3 && this.game.hasProgressEffect?.('cannonImpact')) {
      return this.game.hasProgressEffect?.('cannonPierce') ? 48 : 34;
    }
    if (this.config.splashRadius) {
      let radius = this.config.splashRadius;
      if (typeof radius === 'object') {
        radius = radius[this.level] ?? 0;
      }
      if (radius && this.type === 'barrel' && this.game.hasProgressEffect?.('barrelStockpile')) {
        radius += 8;
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

  getShotEffects() {
    const effects = {};
    if (this.type === 'dart' && this.game.hasProgressEffect?.('dartPoison')) {
      effects.poisonDps = Math.round(this.getDamage() * 0.25);
      effects.poisonDuration = 2.5;
    }
    if (this.type === 'dart' && this.game.hasProgressEffect?.('dartSlow')) {
      effects.slowMultiplier = 0.68;
      effects.slowDuration = 1.6;
    }
    if (this.type === 'barrel' && this.game.hasProgressEffect?.('barrelNapalm')) {
      effects.poisonDps = Math.round(this.getDamage() * 0.4);
      effects.poisonDuration = 3;
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

  upgradeBerserk() {
    if (!this.canUpgradeBerserk()) return false;
    this.berserkLevel++;
    if (this.berserkLevel === 1) {
      this.berserkCooldownTimer = Tower.CANNON_BERSERK_CYCLE_COOLDOWN;
    }
    return true;
  }

  isEnemyInBaseRange() {
    let baseRange = this.config.range;
    if (this.type !== 'barrel') {
      baseRange *= Math.pow(Tower.RANGE_UPGRADE_MULTIPLIER, this.level - 1);
    }

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

    const target = this.findTarget();
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
      const activeMinesByThisTower = this.game.mines.filter(
        (mine) => !mine.spent && mine.ownerTower === this
      );
      const mineLimit = this.game.getBarrelMineLimit?.() ?? Tower.MAX_BARREL_MINES;
      if (activeMinesByThisTower.length >= mineLimit) {
        const mineToReplace = activeMinesByThisTower[
          Math.floor(Math.random() * activeMinesByThisTower.length)
        ];
        mineToReplace.spent = true;
      }

      const occupiedCells = new Set(
        this.game.mines
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
        this.game.mines.push(
          new BarrelMine(
            spot.x,
            spot.y,
            this.getDamage(),
            this.getSplashRadius(),
            this,
            point.col,
            point.row
          )
        );
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
    const img = images[spriteKey];
    const isDartType = this.type === 'dart';
    const w = img.width * ASSET_SCALE * (isDartType ? 1.15 : 1);
    const h = img.height * ASSET_SCALE * (isDartType ? 1.15 : 1);
    drawRotatedSprite(ctx, img, this.x, this.y, w, h, this.angle);
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
    this.explosions = [];

    this.progress = loadProgress();
    this.gameSpeed = 1;
    this.runRewarded = false;
    this.runStartWave = this.progress.selectedStartWave;
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
    this.pauseMenu = document.getElementById('pause-menu');
    this.defeatMenu = document.getElementById('defeat-menu');
    this.radialMenu = document.getElementById('radial-menu');
    this.pauseBtn = document.getElementById('pause-btn');
    this.speedBtn = document.getElementById('speed-btn');
    this.progressSummaryEl = document.getElementById('progress-summary');
    this.shopTabsEl = document.getElementById('shop-tabs');
    this.shopGridEl = document.getElementById('shop-grid');
    this.startWaveLabelEl = document.getElementById('start-wave-label');
    this.runRewardEl = document.getElementById('run-reward');
    this.activeShopTab = 'core';

    this.canvas.addEventListener('click', (e) => this.onCanvasClick(e));
    this.pauseBtn.addEventListener('click', () => this.togglePause());
    this.speedBtn.addEventListener('click', () => this.cycleGameSpeed());
    document.getElementById('start-btn').addEventListener('click', () => this.startGame());
    document.getElementById('start-wave-minus').addEventListener('click', () => this.changeStartWave(-1));
    document.getElementById('start-wave-plus').addEventListener('click', () => this.changeStartWave(1));
    document.getElementById('resume-btn').addEventListener('click', () => this.togglePause(false));
    document.getElementById('restart-btn').addEventListener('click', () => this.restart());
    document.getElementById('restart-from-pause-btn').addEventListener('click', () => this.restart());
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

  getStartingGold() {
    return 90 + this.progress.stats.economy * 45 + (this.progress.selectedStartWave - 1) * 16;
  }

  getStartingLives() {
    return 10 + this.progress.stats.lives * 5;
  }

  getTowerDamageMultiplier(type) {
    let multiplier = 0.72 + this.progress.stats.damage * 0.09;
    if (type === 'cannon' && this.progress.effects.cannonImpact) multiplier += 0.08;
    if (type === 'cannon' && this.progress.effects.cannonPierce) multiplier += 0.1;
    if (type === 'dart' && this.progress.effects.dartOvercharge) multiplier += 0.08;
    if (type === 'barrel' && this.progress.effects.barrelStockpile) multiplier += 0.05;
    return multiplier;
  }

  getTowerRangeMultiplier(type) {
    let multiplier = 0.9 + this.progress.stats.range * 0.06;
    if (type === 'barrel' && this.progress.effects.barrelStockpile) multiplier += 0.05;
    return multiplier;
  }

  getEnemyDifficultyMultiplier() {
    return 1 + this.getProgressPower() * 0.035;
  }

  getEnemySpeedMultiplier() {
    return 1 + this.getProgressPower() * 0.006;
  }

  isTowerUnlocked(type) {
    return !!this.progress.unlockedTowers[type];
  }

  getTowerMaxLevel(type) {
    return this.progress.towerMaxLevel[type] || 1;
  }

  isBerserkUnlocked() {
    return this.progress.berserkUnlocked;
  }

  hasProgressEffect(effect) {
    return !!this.progress.effects[effect];
  }

  getBarrelMineLimit() {
    return Tower.MAX_BARREL_MINES + (this.hasProgressEffect('barrelStockpile') ? 10 : 0);
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
    const maxStartWave = getMaxStartWave(this.progress);
    if (this.progress.selectedStartWave > maxStartWave) {
      this.progress.selectedStartWave = maxStartWave;
      this.saveProgress();
    }
    this.progressSummaryEl.textContent =
      `Жетоны: ${this.progress.tokens} | Рекорд: ${this.progress.bestWave}`;
    this.startWaveLabelEl.textContent = `Волна ${this.progress.selectedStartWave}`;
    this.speedBtn.textContent = `x${this.gameSpeed}`;
    this.speedBtn.disabled = getMaxGameSpeed(this.progress) <= 1;
    this.renderShopTabs();
    this.renderProgressShop();
    this.syncStartPreviewStats();
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
      const statTitles = {
        damage: 'Урон',
        range: 'Дальность',
        economy: 'Стартовое золото',
        lives: 'Прочность базы',
      };
      for (const [stat, title] of Object.entries(statTitles)) {
        const level = this.progress.stats[stat];
        add(
          `stat-${stat}`,
          `${title} ${level}/${STAT_MAX_LEVELS[stat]}`,
          'Базовый узел',
          STAT_COSTS[stat][level],
          level >= STAT_MAX_LEVELS[stat],
          () => { this.progress.stats[stat]++; },
          false,
          'Базовые параметры'
        );
      }
      return items;
    }

    if (tab === 'meta') {
      add(
        'berserk',
        'Берсерк',
        'Ветка ярости для танка',
        BERSERK_UNLOCK_COST,
        this.progress.berserkUnlocked,
        () => { this.progress.berserkUnlocked = true; },
        this.progress.towerMaxLevel.cannon < 3,
        'Режимы'
      );
      const nextSpeedLevel = this.progress.speedLevel + 1;
      add(
        'speed',
        `Ускорение x${GAME_SPEED_OPTIONS[nextSpeedLevel] || GAME_SPEED_OPTIONS.at(-1)}`,
        'Ускорить игру',
        SPEED_LEVEL_COSTS[this.progress.speedLevel],
        this.progress.speedLevel >= SPEED_LEVEL_COSTS.length,
        () => { this.progress.speedLevel++; },
        false,
        'Режимы'
      );
      const nextStartWaveLevel = this.progress.startWaveLevel + 1;
      add(
        'start-wave',
        `Старт с ${START_WAVE_OPTIONS[nextStartWaveLevel] || START_WAVE_OPTIONS.at(-1)}`,
        'Начало с высокой волны',
        START_WAVE_COSTS[this.progress.startWaveLevel],
        this.progress.startWaveLevel >= START_WAVE_COSTS.length,
        () => {
          this.progress.startWaveLevel++;
          this.progress.selectedStartWave = getMaxStartWave(this.progress);
        },
        false,
        'Режимы'
      );
      return items;
    }

    if (tab === 'cannon') {
      add('effect-cannon', 'Удар ядра', 'Сплэш-урон', EFFECT_COSTS.cannonImpact,
        this.progress.effects.cannonImpact, () => { this.progress.effects.cannonImpact = true; },
        this.progress.towerMaxLevel.cannon < 3, 'Танк');
      add('effect-cannon-pierce', 'Тяжелое ядро', 'Больше урона и радиус', EFFECT_COSTS.cannonPierce,
        this.progress.effects.cannonPierce, () => { this.progress.effects.cannonPierce = true; },
        !this.progress.effects.cannonImpact, 'Танк');
      return items;
    }

    if (tab === 'dart') {
      add('effect-dart', 'Перегрев', 'Скорость и урон', EFFECT_COSTS.dartOvercharge,
        this.progress.effects.dartOvercharge, () => { this.progress.effects.dartOvercharge = true; },
        !this.progress.unlockedTowers.dart, 'Дротики');
      add('effect-dart-poison', 'Ядовитые дротики', 'Урон со временем', EFFECT_COSTS.dartPoison,
        this.progress.effects.dartPoison, () => { this.progress.effects.dartPoison = true; },
        !this.progress.effects.dartOvercharge, 'Дротики');
      add('effect-dart-slow', 'Ледяные дротики', 'Замедление врагов', EFFECT_COSTS.dartSlow,
        this.progress.effects.dartSlow, () => { this.progress.effects.dartSlow = true; },
        !this.progress.effects.dartPoison, 'Дротики');
      return items;
    }

    if (tab === 'barrel') {
      add('effect-barrel', 'Склад бомб', '+10 мин и радиус', EFFECT_COSTS.barrelStockpile,
        this.progress.effects.barrelStockpile, () => { this.progress.effects.barrelStockpile = true; },
        !this.progress.unlockedTowers.barrel, 'Бочкомет');
      add('effect-barrel-napalm', 'Напалм', 'Поджог после взрыва', EFFECT_COSTS.barrelNapalm,
        this.progress.effects.barrelNapalm, () => { this.progress.effects.barrelNapalm = true; },
        !this.progress.effects.barrelStockpile, 'Бочкомет');
      add('effect-barrel-snare', 'Осколочная сеть', 'Сильное замедление', EFFECT_COSTS.barrelSnare,
        this.progress.effects.barrelSnare, () => { this.progress.effects.barrelSnare = true; },
        !this.progress.effects.barrelNapalm, 'Бочкомет');
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
    let lastBranch = '';
    for (const item of this.getShopItems(this.activeShopTab)) {
      if (item.branch && item.branch !== lastBranch) {
        const title = document.createElement('div');
        title.className = 'shop-tree-title';
        title.textContent = `Ветка: ${item.branch}`;
        this.shopGridEl.appendChild(title);
        lastBranch = item.branch;
      }
      const el = document.createElement('div');
      el.className = 'shop-item';
      const state = item.bought ? 'Куплено' : item.blocked ? 'Закрыто' : `${item.cost} жет.`;
      el.innerHTML = `<strong>${item.title}</strong><span>${item.detail}</span>`;
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = state;
      button.disabled = item.bought || item.blocked || this.progress.tokens < item.cost;
      button.addEventListener('click', () => this.spendTokens(item.cost, item.buy));
      el.appendChild(button);
      this.shopGridEl.appendChild(el);
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
    const bluePackChance = Math.min(0.55, 0.12 + this.wave * 0.05);
    const sandChance = this.wave >= 3 ? Math.min(0.2, 0.04 + this.wave * 0.02) : 0;
    return { enemiesPerWave, spawnInterval, bluePackChance, sandChance };
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
    if (this.wave >= 3 && roll < this.sandChance) {
      this.spawnSandEnemy();
    } else if (roll < this.sandChance + this.bluePackChance) {
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
      const affordable = this.gold >= cost;
      if (!affordable) btn.classList.add('disabled');
      let dx = 0;
      let dy = -30;
      if (layout === 'upgrade') {
        const upgradeOffsets = {
          1: [{ x: 0, y: 2 }],
          2: [{ x: -34, y: 2 }, { x: 34, y: 2 }],
          3: [{ x: -34, y: -28 }, { x: 34, y: -28 }, { x: 0, y: 30 }],
        };
        const offset = (upgradeOffsets[options.length] || upgradeOffsets[3])[idx];
        dx = offset.x;
        dy = offset.y;
      } else {
        const gap = 74;
        const total = options.length;
        const start = -((total - 1) * gap) / 2;
        dx = start + idx * gap;
      }
      btn.style.transform = `translate(${dx}px, ${dy}px) translate(-50%, -50%)`;
      btn.innerHTML = `<img src="${option.icon}" alt=""><span class="cost">${cost}</span>`;
      btn.addEventListener('click', () => {
        const currentCost = typeof option.getCost === 'function' ? option.getCost() : option.cost;
        if (currentCost == null) {
          this.showHint('Максимальная прокачка');
          this.closeRadialMenu();
          return;
        }
        if (this.gold < currentCost) {
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

    if (this.gold < cfg.cost) {
      this.showHint('Недостаточно золота');
      return;
    }

    this.gold -= cfg.cost;
    this.towers.push(new Tower(col, row, this, towerType));
    this.updateHud();
    this.closeRadialMenu();
  }

  upgradeTower(tower) {
    if (!tower.canUpgrade()) return;
    const cost = tower.getUpgradeCost();
    if (this.gold < cost) return;
    this.gold -= cost;
    tower.upgrade();
    this.updateHud();
    this.renderRadialMenu();
  }

  getTowerUpgradeIcon(tower) {
    const nextLevel = tower.level + 1;
    if (tower.type === 'dart' && nextLevel > 3) {
      const rank = String(Math.min(3, nextLevel - 3)).padStart(3, '0');
      return `assets/kenney_ranks-pack/PNG/Retina/Gold/rank${rank}.png`;
    }
    return 'assets/kenney_game-icons/PNG/White/2x/arrowUp.png';
  }

  upgradeBerserk(tower) {
    if (!tower.canUpgradeBerserk()) return;
    const cost = tower.getBerserkUpgradeCost();
    if (this.gold < cost) return;
    this.gold -= cost;
    tower.upgradeBerserk();
    this.updateHud();
    this.renderRadialMenu();
  }

  showPurchaseRadial(slot) {
    const center = cellCenter(slot.col, slot.row);
    const options = Object.entries(TOWER_TYPES)
      .filter(([type]) => this.isTowerUnlocked(type))
      .map(([type, cfg]) => ({
        cost: cfg.cost,
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
        getCost: () => tower.getUpgradeCost(),
        icon: this.getTowerUpgradeIcon(tower),
        action: () => this.upgradeTower(tower),
      });
    }
    if (tower.canUpgradeBerserk()) {
      options.push({
        getCost: () => tower.getBerserkUpgradeCost(),
        icon: 'assets/kenney_ranks-pack/PNG/Retina/Gold/rank001.png',
        action: () => this.upgradeBerserk(tower),
      });
    }
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
    const wavesPlayed = Math.max(1, this.highestWaveThisRun - this.runStartWave + 1);
    const bestBonus = Math.max(0, this.highestWaveThisRun - this.progress.bestWave) * 18;
    const reward = Math.round(12 + wavesPlayed * 10 + Math.min(80, this.highestWaveThisRun * 2) + bestBonus);
    this.progress.tokens += reward;
    this.progress.runs++;
    this.progress.bestWave = Math.max(this.progress.bestWave, this.highestWaveThisRun);
    this.saveProgress();
    this.runRewardEl.textContent = `Жетоны: +${reward}`;
    this.updateProgressUi();
  }

  startGame() {
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
    this.updateHud();
    this.started = true;
    this.mainMenu.classList.add('hidden');
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

    for (const mine of this.mines) {
      mine.update(dt, this);
    }

    for (const explosion of this.explosions) {
      explosion.update(dt);
    }

    this.enemies = this.enemies.filter((e) => e.alive);
    this.projectiles = this.projectiles.filter((p) => !p.hit);
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
            if ((n || s) && !(e || w)) key = 'tileGrass_roadNorth';
            else if ((e || w) && !(n || s)) key = 'tileGrass_roadEast';
            else if (roadNeighborCount >= 3) key = 'tileGrass_roadCrossing';
            else if (n && e) key = 'tileGrass_roadCornerUR';
            else if (n && w) key = 'tileGrass_roadCornerUL';
            else if (s && e) key = 'tileGrass_roadCornerLR';
            else if (s && w) key = 'tileGrass_roadCornerLL';
            else key = 'tileGrass_roadEast';
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
