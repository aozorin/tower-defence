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
    },
    damage: { 1: 5, 2: 8, 3: 13 },
    upgradeCost: { 2: 100, 3: 200 },
  },
  barrel: {
    label: 'Бочкомёт',
    cost: 120,
    description: 'Взрывные бочки',
    shopSprite: 'tankBody_darkLarge_outline',
    shopIconOffsetY: -4,
    bodySprite: 'tankBody_darkLarge_outline',
    range: 300,
    fireCooldown: 3,
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
    this.baseSpeed = cfg.speed;
    this.speed = cfg.speed;
    this.goldReward = Math.round(cfg.gold * Enemy.GOLD_REWARD_MULTIPLIER);
    this.waypointIndex = 0;
    this.progress = pathOffset;
    let hp = getEnemyBaseHp(type, wave);
    if (type === 'sand') {
      hp = Math.round(getEnemyBaseHp('dark', wave) * 0.35);
    }
    this.hp = hp;
    this.maxHp = hp;
    this.alive = true;
    this.reachedEnd = false;
    this.healTimer = 0;
    this.healFlashTimer = 0;

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

    const advance = (this.speed * dt) / segmentLength;

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
            other.hp = Math.min(other.maxHp, other.hp + Enemy.HEAL_AMOUNT);
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

  constructor(x, y, target, damage, game, bulletKey, speed, splashRadius = 0) {
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
          }
        }
      } else {
        this.target.takeDamage(this.damage);
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
    return range;
  }

  getDamage() {
    let dmg = this.config.damage[this.level];
    if (this.isBerserkActive && this.config.berserk) {
      dmg *= this.config.berserk.damageMultiplier[this.berserkLevel];
    }
    return Math.round(dmg * Tower.DAMAGE_MULTIPLIER);
  }

  getSplashRadius() {
    if (this.config.splashRadius) {
      return this.config.splashRadius[this.level] || this.config.splashRadius;
    }
    return 0;
  }

  getProjectileKey() {
    if (this.isBerserkActive && this.config.berserk && this.berserkLevel > 0) {
      return this.config.berserk.projectiles[this.berserkLevel];
    }
    return this.config.projectiles[this.level];
  }

  getBodySpriteKey() {
    if (this.isBerserkActive && this.config.berserk) {
      return this.config.berserk.bodySprite;
    }
    if (this.config.bodySprite) return this.config.bodySprite;
    return this.config.bodyByLevel[this.level];
  }

  getUpgradeCost() {
    if (this.level >= 3) return null;
    return this.config.upgradeCost[this.level + 1];
  }

  canUpgrade() {
    return this.level < 3;
  }

  upgrade() {
    if (!this.canUpgrade()) return false;
    this.level++;
    return true;
  }

  hasBerserk() {
    return this.config.berserk && this.level >= 3;
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

    const cooldown = (this.isBerserkActive && this.config.berserk)
      ? this.config.fireCooldown * this.config.berserk.fireCooldownMultiplier
      : this.config.fireCooldown;

    this.cooldown -= dt;
    if (this.cooldown > 0) return;

    if (this.type === 'barrel') {
      const activeMinesByThisTower = this.game.mines.filter(
        (mine) => !mine.spent && mine.ownerTower === this
      );
      if (activeMinesByThisTower.length >= Tower.MAX_BARREL_MINES) {
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

    if (this.isBerserkActive && this.config.berserk) {
      const dir = this.angle + TANK_SPRITE_FACING;
      const perpX = Math.cos(dir + Math.PI / 2) * 8;
      const perpY = Math.sin(dir + Math.PI / 2) * 8;
      this.game.projectiles.push(
        new Projectile(this.x + perpX, this.y + perpY, target, dmg, this.game, projKey, speed, splash)
      );
      this.game.projectiles.push(
        new Projectile(this.x - perpX, this.y - perpY, target, dmg, this.game, projKey, speed, splash)
      );
    } else {
      this.game.projectiles.push(
        new Projectile(this.x, this.y, target, dmg, this.game, projKey, speed, splash)
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
      const cooldownBase = Math.max(0.001, this.config.fireCooldown);
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
    const rankKey = this.berserkLevel > 0
      ? `gold${Math.min(3, this.berserkLevel)}`
      : `silver${Math.min(3, this.level)}`;
    const rankImg = images[rankKey];
    if (rankImg) {
      const rw = TILE_SIZE * 0.5;
      const rh = rw * (rankImg.height / rankImg.width);
      ctx.drawImage(rankImg, this.x - rw / 2, this.y - h * 0.55 - rh, rw, rh);
    }
    this.drawHudBars(ctx);
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

    this.gold = 120;
    this.lives = 10;
    this.wave = 1;
    this.enemiesSpawned = 0;
    this.enemiesPerWave = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 2.5;
    this.bluePackChance = 0;
    this.sandChance = 0;
    this.waveActive = false;
    this.bossSpawned = false;
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

    this.canvas.addEventListener('click', (e) => this.onCanvasClick(e));
    this.pauseBtn.addEventListener('click', () => this.togglePause());
    document.getElementById('start-btn').addEventListener('click', () => this.startGame());
    document.getElementById('resume-btn').addEventListener('click', () => this.togglePause(false));
    document.getElementById('restart-btn').addEventListener('click', () => this.restart());
    document.getElementById('restart-from-pause-btn').addEventListener('click', () => this.restart());
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.started && !this.gameOver) this.togglePause();
    });

    this.loadAssets().then(() => {
      this.generateDecorations();
      this.updateHud();
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
    const enemiesPerWave = 6 + this.wave * 3;
    const spawnInterval = Math.max(0.65, 2.4 - this.wave * 0.18);
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
    if (remainingCount <= 4) return { label: 'МАЛО', color: '#2ecc71' };
    if (remainingCount <= 8) return { label: 'СРЕДНЕ', color: '#f39c12' };
    return { label: 'МНОГО', color: '#e74c3c' };
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
    this.bossSpawned = false;
    this.pathSpawnPlan = this.generatePathSpawnPlan(this.enemiesPerWave);
    this.pathSpawnRemaining = [...this.pathSpawnPlan];
    this.pathFirstSpawned = new Array(PATHS.length).fill(false);
    this.showWaveBanner(`В0ЛНА ${this.wave}`);
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

  spawnBoss() {
    const path = PATHS[Math.floor(Math.random() * PATHS.length)];
    this.enemies.push(new Enemy(this, 'dark', path, 0, this.wave));
    this.bossSpawned = true;
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
      let dx = dir * 84 * (idx + 1);
      let dy = -80 - idx * 56;
      if (layout === 'upgrade') {
        const compactOffsetsByCount = {
          1: [{ x: 0, y: 0 }],
          2: [{ x: -10, y: 8 }, { x: 10, y: 8 }],
          3: [{ x: 0, y: -10 }, { x: -10, y: 10 }, { x: 10, y: 10 }],
        };
        const compactOffsets = compactOffsetsByCount[options.length] || compactOffsetsByCount[3];
        const offset = compactOffsets[Math.min(idx, compactOffsets.length - 1)];
        dx = offset.x;
        dy = offset.y;
        btn.style.transform = `translate(${dx}px, ${dy}px) translate(-50%, -50%) scale(0.6)`;
      } else if (options.length === 3) {
        const spacing = 63.2;
        const triangleOffsets = dir === 1
          ? [{ x: 0, y: -30 }, { x: spacing, y: -30 }, { x: spacing * 2, y: -30 }]
          : dir === -1
            ? [{ x: 0, y: -30 }, { x: -spacing, y: -30 }, { x: -spacing * 2, y: -30 }]
            : [{ x: spacing, y: -30 }, { x: 0, y: -30 }, { x: -spacing, y: -30 }];
        dx = triangleOffsets[idx].x;
        dy = triangleOffsets[idx].y;
        btn.style.transform = `translate(${dx}px, ${dy}px) translate(-50%, -50%) scale(0.6)`;
      } else {
        btn.style.transform = `translate(${dx}px, ${dy}px) translate(-50%, -50%)`;
      }
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
    const options = Object.entries(TOWER_TYPES).map(([type, cfg]) => ({
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
        icon: 'assets/kenney_game-icons/PNG/White/2x/arrowUp.png',
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
    if (this.currentRadial) this.renderRadialMenu();

    if (this.lives <= 0 && !this.gameOver) {
      this.gameOver = true;
      this.closeRadialMenu();
      this.defeatMenu.classList.remove('hidden');
    }
  }

  startGame() {
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

    if (this.waveActive && this.enemiesSpawned >= this.enemiesPerWave && !this.bossSpawned && this.wave >= 5) {
      this.spawnBoss();
    }

    const allSpawned = this.enemiesSpawned >= this.enemiesPerWave;
    const noBossPending = this.wave < 5 || this.bossSpawned;
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
    ctx.fillStyle = '#fff';
    ctx.font = '20px "Pixelify Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('БАЗА', baseCenter.x, baseCenter.y + 7);

    for (let i = 0; i < PATHS.length; i++) {
      if (this.pathFirstSpawned[i]) continue;
      const threat = this.getPathThreatLevel(this.pathSpawnRemaining[i]);
      if (!threat) continue;
      const start = PATHS[i][0];
      const markerCol = start.row === 0 ? start.col - 1 : start.col;
      const markerRow = start.row === 0 ? start.row + 1 : start.row;
      const center = cellCenter(markerCol, markerRow);
      const markerY = center.y - TILE_SIZE * 0.8;

      ctx.beginPath();
      ctx.arc(center.x, markerY, 16, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(5, 8, 20, 0.8)';
      ctx.fill();
      ctx.strokeStyle = threat.color;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = threat.color;
      ctx.font = 'bold 11px "Pixelify Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(threat.label, center.x, markerY + 1);
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

    if (!this.started) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  loop(timestamp) {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    this.update(dt);
    this.draw();

    requestAnimationFrame((t) => this.loop(t));
  }
}
