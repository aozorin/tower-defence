const GRID_COLS = 16;
const GRID_ROWS = 10;
const TILE_SIZE = 64;
const ASSET_SCALE = TILE_SIZE / 128;
const ASSET_BASE = 'assets/PNG/Retina/';

const PATH_WAYPOINTS = [
  { col: 0, row: 4 },
  { col: 1, row: 4 },
  { col: 2, row: 4 },
  { col: 3, row: 4 },
  { col: 4, row: 4 },
  { col: 4, row: 5 },
  { col: 4, row: 6 },
  { col: 4, row: 7 },
  { col: 5, row: 7 },
  { col: 6, row: 7 },
  { col: 7, row: 7 },
  { col: 8, row: 7 },
  { col: 9, row: 7 },
  { col: 10, row: 7 },
  { col: 11, row: 7 },
  { col: 12, row: 7 },
  { col: 12, row: 6 },
  { col: 12, row: 5 },
  { col: 13, row: 5 },
  { col: 14, row: 5 },
  { col: 15, row: 5 },
];

const ROAD_CELLS = new Set(PATH_WAYPOINTS.map((p) => `${p.col},${p.row}`));

const BUILD_SLOTS = [
  { col: 2, row: 3 },
  { col: 3, row: 3 },
  { col: 3, row: 6 },
  { col: 5, row: 6 },
  { col: 7, row: 6 },
  { col: 9, row: 6 },
  { col: 11, row: 8 },
  { col: 11, row: 4 },
  { col: 13, row: 4 },
  { col: 14, row: 6 },
];

const BUILD_SLOT_SET = new Set(BUILD_SLOTS.map((s) => `${s.col},${s.row}`));
const PLUS_HIT_RADIUS = 22;

function buildLevelTiles() {
  const tiles = [];
  for (let row = 0; row < GRID_ROWS; row++) {
    tiles[row] = [];
    for (let col = 0; col < GRID_COLS; col++) {
      tiles[row][col] = 'tileGrass1';
    }
  }

  for (let col = 0; col <= 3; col++) tiles[4][col] = 'tileGrass_roadEast';
  tiles[4][4] = 'tileGrass_roadCornerLL';
  for (let row = 5; row <= 6; row++) tiles[row][4] = 'tileGrass_roadNorth';
  tiles[7][4] = 'tileGrass_roadCornerUR';
  for (let col = 5; col <= 11; col++) tiles[7][col] = 'tileGrass_roadEast';
  tiles[7][12] = 'tileGrass_roadCornerUL';
  tiles[6][12] = 'tileGrass_roadNorth';
  tiles[5][12] = 'tileGrass_roadCornerLR';
  for (let col = 13; col <= 15; col++) tiles[5][col] = 'tileGrass_roadEast';

  return tiles;
}

const LEVEL_TILES = buildLevelTiles();

function isRoad(col, row) {
  return ROAD_CELLS.has(`${col},${row}`);
}

function isBuildSlot(col, row) {
  return BUILD_SLOT_SET.has(`${col},${row}`);
}

function cellCenter(col, row) {
  return {
    x: col * TILE_SIZE + TILE_SIZE / 2,
    y: row * TILE_SIZE + TILE_SIZE / 2,
  };
}

const TANK_SPRITE_FACING = Math.PI / 2;

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
};

const TOWER_TYPES = {
  cannon: {
    label: 'Танк',
    cost: 50,
    description: 'Сильные снаряды',
    shopSprite: 'tank_green',
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
  },
  dart: {
    label: 'Дротики',
    cost: 150,
    description: 'Очень быстрая стрельба',
    shopSprite: 'specialBarrel6',
    bodyByLevel: {
      1: 'specialBarrel6',
      2: 'specialBarrel7',
      3: 'specialBarrel7_outline',
    },
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
};

const ASSET_KEYS = [
  'tileGrass1',
  'tileGrass_roadEast',
  'tileGrass_roadNorth',
  'tileGrass_roadCornerUL',
  'tileGrass_roadCornerUR',
  'tileGrass_roadCornerLL',
  'tileGrass_roadCornerLR',
  'tank_red',
  'tank_blue',
  'tank_green',
  'bulletGreen1',
  'bulletGreen1_outline',
  'bulletGreen3_outline',
  'specialBarrel6',
  'specialBarrel7',
  'specialBarrel7_outline',
  'explosionSmoke1',
  'explosionSmoke2',
  'explosionSmoke3',
  'explosionSmoke4',
  'explosionSmoke5',
];

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

class Enemy {
  constructor(game, type = 'red', pathOffset = 0) {
    const cfg = ENEMY_TYPES[type];
    this.game = game;
    this.type = type;
    this.speed = cfg.speed;
    this.goldReward = cfg.gold;
    this.waypointIndex = 0;
    this.progress = pathOffset;
    this.hp = cfg.hp;
    this.maxHp = cfg.hp;
    this.alive = true;
    this.reachedEnd = false;

    const start = cellCenter(PATH_WAYPOINTS[0].col, PATH_WAYPOINTS[0].row);
    const next = cellCenter(PATH_WAYPOINTS[1].col, PATH_WAYPOINTS[1].row);
    this.x = start.x;
    this.y = start.y;
    this.angle = angleFromDirection(next.x - start.x, next.y - start.y);
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

    if (this.waypointIndex >= PATH_WAYPOINTS.length - 1) {
      this.reachedEnd = true;
      this.alive = false;
      this.game.lives--;
      this.game.updateHud();
      return;
    }

    const from = cellCenter(
      PATH_WAYPOINTS[this.waypointIndex].col,
      PATH_WAYPOINTS[this.waypointIndex].row
    );
    const to = cellCenter(
      PATH_WAYPOINTS[this.waypointIndex + 1].col,
      PATH_WAYPOINTS[this.waypointIndex + 1].row
    );

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const segmentLength = Math.hypot(dx, dy);

    if (segmentLength > 0) {
      this.angle = angleFromDirection(dx, dy);
    }

    const advance = (this.speed * dt) / segmentLength;

    this.progress += advance;

    while (this.progress >= 1 && this.waypointIndex < PATH_WAYPOINTS.length - 1) {
      this.progress -= 1;
      this.waypointIndex++;
      if (this.waypointIndex >= PATH_WAYPOINTS.length - 1) {
        const end = cellCenter(
          PATH_WAYPOINTS[this.waypointIndex].col,
          PATH_WAYPOINTS[this.waypointIndex].row
        );
        this.x = end.x;
        this.y = end.y;
        return;
      }
    }

    const currentFrom = cellCenter(
      PATH_WAYPOINTS[this.waypointIndex].col,
      PATH_WAYPOINTS[this.waypointIndex].row
    );
    const currentTo = cellCenter(
      PATH_WAYPOINTS[this.waypointIndex + 1].col,
      PATH_WAYPOINTS[this.waypointIndex + 1].row
    );

    this.x = currentFrom.x + (currentTo.x - currentFrom.x) * this.progress;
    this.y = currentFrom.y + (currentTo.y - currentFrom.y) * this.progress;
  }

  draw(ctx, images) {
    if (!this.alive && !this.reachedEnd) return;

    const img = images[ENEMY_TYPES[this.type].sprite];
    const w = img.width * ASSET_SCALE;
    const h = img.height * ASSET_SCALE;
    drawRotatedSprite(ctx, img, this.x, this.y, w, h, this.angle);

    if (this.alive && this.hp < this.maxHp) {
      const barW = TILE_SIZE * 0.6;
      const barH = 4;
      const barX = this.x - barW / 2;
      const barY = this.y - h / 2 - 8;
      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = this.type === 'blue' ? '#3498db' : '#e74c3c';
      ctx.fillRect(barX, barY, barW * (this.hp / this.maxHp), barH);
    }
  }
}

class Projectile {
  static HIT_RADIUS = 12;

  constructor(x, y, target, damage, game, bulletKey, speed) {
    this.x = x;
    this.y = y;
    this.target = target;
    this.damage = damage;
    this.game = game;
    this.bulletKey = bulletKey;
    this.speed = speed;
    this.hit = false;
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
      this.target.takeDamage(this.damage);
      this.hit = true;
      return;
    }

    const move = this.speed * dt;
    this.flightAngle = Math.atan2(dy, dx) - TANK_SPRITE_FACING;
    this.x += (dx / dist) * move;
    this.y += (dy / dist) * move;
  }

  draw(ctx, images) {
    if (this.hit) return;

    const img = images[this.bulletKey];
    const isDart = this.bulletKey.startsWith('specialBarrel');
    const scale = isDart ? 1.6 : this.bulletKey === 'bulletGreen3_outline' ? 2.2 : 2;
    const w = img.width * ASSET_SCALE * scale;
    const h = img.height * ASSET_SCALE * scale;

    if (isDart) {
      drawRotatedSprite(ctx, img, this.x, this.y, w, h, this.flightAngle || 0);
    } else {
      ctx.drawImage(img, this.x - w / 2, this.y - h / 2, w, h);
    }
  }
}

class Tower {
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
  }

  getRange() {
    return this.config.range;
  }

  getDamage() {
    return this.config.damage[this.level];
  }

  getProjectileKey() {
    return this.config.projectiles[this.level];
  }

  getBodySpriteKey() {
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
    const target = this.findTarget();
    if (target) {
      this.angle = angleFromDirection(target.x - this.x, target.y - this.y);
    }

    this.cooldown -= dt;
    if (this.cooldown > 0) return;

    if (!target) return;

    this.game.projectiles.push(
      new Projectile(
        this.x,
        this.y,
        target,
        this.getDamage(),
        this.game,
        this.getProjectileKey(),
        this.config.projectileSpeed
      )
    );
    this.cooldown = this.config.fireCooldown;
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

  draw(ctx, images) {
    const spriteKey = this.getBodySpriteKey();
    const img = images[spriteKey];
    const w = img.width * ASSET_SCALE * (this.type === 'dart' ? 1.15 : 1);
    const h = img.height * ASSET_SCALE * (this.type === 'dart' ? 1.15 : 1);
    drawRotatedSprite(ctx, img, this.x, this.y, w, h, this.angle);
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
    this.explosions = [];

    this.gold = 100;
    this.lives = 10;
    this.wave = 1;
    this.enemiesSpawned = 0;
    this.enemiesPerWave = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 2.5;
    this.waveActive = false;
    this.gameOver = false;
    this.selectedTower = null;

    this.lastTime = 0;
    this.hintMessage = '';
    this.hintTimer = 0;
    this.pendingPurchase = null;

    this.upgradeModal = document.getElementById('upgrade-modal');
    this.upgradeLevelEl = document.getElementById('upgrade-level');
    this.upgradeGoldEl = document.getElementById('upgrade-modal-gold');
    this.upgradeErrorEl = document.getElementById('upgrade-error');
    this.upgradeBulletsEl = document.getElementById('upgrade-bullets-preview');
    this.upgradeConfirmBtn = document.getElementById('upgrade-confirm');
    this.upgradeCloseBtn = document.getElementById('upgrade-close');

    this.modal = document.getElementById('purchase-modal');
    this.modalGoldEl = document.getElementById('modal-gold');
    this.modalErrorEl = document.getElementById('modal-error');
    this.towerShopEl = document.getElementById('tower-shop');
    this.purchaseCancelBtn = document.getElementById('purchase-cancel');

    this.canvas.addEventListener('click', (e) => this.onCanvasClick(e));
    this.purchaseCancelBtn.addEventListener('click', () => this.closePurchaseModal());
    this.modal.querySelector('.modal-backdrop').addEventListener('click', () =>
      this.closePurchaseModal()
    );
    this.upgradeConfirmBtn.addEventListener('click', () => this.confirmUpgrade());
    this.upgradeCloseBtn.addEventListener('click', () => this.closeUpgradeModal());
    this.upgradeModal.querySelector('.modal-backdrop').addEventListener('click', () =>
      this.closeUpgradeModal()
    );

    this.loadAssets().then(() => {
      this.updateHud();
      this.startWave();
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
    this.images = Object.fromEntries(entries);
  }

  getWaveConfig() {
    const enemiesPerWave = 6 + this.wave * 3;
    const spawnInterval = Math.max(0.65, 2.4 - this.wave * 0.18);
    const bluePackChance = Math.min(0.55, 0.12 + this.wave * 0.05);
    return { enemiesPerWave, spawnInterval, bluePackChance };
  }

  startWave() {
    const config = this.getWaveConfig();
    this.enemiesPerWave = config.enemiesPerWave;
    this.spawnInterval = config.spawnInterval;
    this.bluePackChance = config.bluePackChance;
    this.waveActive = true;
    this.enemiesSpawned = 0;
    this.spawnTimer = 0;
  }

  spawnRedEnemy() {
    this.enemies.push(new Enemy(this, 'red'));
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

    for (let i = 0; i < count; i++) {
      this.enemies.push(new Enemy(this, 'blue', -i * 0.07));
    }
    this.enemiesSpawned += count;
  }

  spawnEnemy() {
    if (Math.random() < this.bluePackChance) {
      this.spawnBluePack();
    } else {
      this.spawnRedEnemy();
    }
  }

  spawnExplosion(x, y) {
    this.explosions.push(new Explosion(x, y, this.images));
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
    this.closePurchaseModal();
  }

  deselectTower() {
    this.selectedTower = null;
  }

  openUpgradeModal(tower) {
    this.selectTower(tower);
    document.getElementById('upgrade-title').textContent =
      `Прокачка: ${tower.config.label}`;
    this.upgradeLevelEl.textContent = tower.level;
    this.upgradeGoldEl.textContent = this.gold;
    this.upgradeErrorEl.classList.add('hidden');
    this.upgradeErrorEl.textContent = '';
    this.renderUpgradePreview(tower);

    const cost = tower.getUpgradeCost();
    if (!tower.canUpgrade()) {
      this.upgradeConfirmBtn.textContent = 'Макс. уровень';
      this.upgradeConfirmBtn.disabled = true;
    } else {
      this.upgradeConfirmBtn.textContent = `Улучшить (${cost} gold)`;
      this.upgradeConfirmBtn.disabled = this.gold < cost;
      if (this.gold < cost) {
        this.upgradeErrorEl.textContent = 'Недостаточно золота';
        this.upgradeErrorEl.classList.remove('hidden');
      }
    }

    this.upgradeModal.classList.remove('hidden');
    this.upgradeModal.setAttribute('aria-hidden', 'false');
  }

  renderUpgradePreview(tower) {
    const labels = { 1: 'Ур. 1', 2: 'Ур. 2', 3: 'Ур. 3' };
    this.upgradeBulletsEl.innerHTML = '';

    for (let lvl = 1; lvl <= 3; lvl++) {
      const key = tower.config.projectiles[lvl];
      const slot = document.createElement('div');
      slot.className = 'bullet-slot';
      if (lvl < tower.level) slot.classList.add('unlocked');
      if (lvl === tower.level) slot.classList.add('active');

      const img = document.createElement('img');
      img.src = ASSET_BASE + `${key}.png`;
      img.alt = labels[lvl];

      const label = document.createElement('span');
      label.textContent = labels[lvl];

      slot.appendChild(img);
      slot.appendChild(label);
      this.upgradeBulletsEl.appendChild(slot);
    }
  }

  closeUpgradeModal() {
    this.upgradeModal.classList.add('hidden');
    this.upgradeModal.setAttribute('aria-hidden', 'true');
  }

  confirmUpgrade() {
    const tower = this.selectedTower;
    if (!tower || !tower.canUpgrade() || this.gameOver) return;

    const cost = tower.getUpgradeCost();
    if (this.gold < cost) {
      this.upgradeErrorEl.textContent = 'Недостаточно золота';
      this.upgradeErrorEl.classList.remove('hidden');
      this.upgradeConfirmBtn.disabled = true;
      return;
    }

    this.gold -= cost;
    tower.upgrade();
    this.updateHud();
    this.openUpgradeModal(tower);
  }

  getPlusAt(x, y) {
    for (const slot of BUILD_SLOTS) {
      if (this.hasTowerAt(slot.col, slot.row)) continue;

      const center = cellCenter(slot.col, slot.row);
      const dist = Math.hypot(x - center.x, y - center.y);
      if (dist <= PLUS_HIT_RADIUS) {
        return slot;
      }
    }
    return null;
  }

  renderTowerShop() {
    this.towerShopEl.innerHTML = '';

    for (const typeId of Object.keys(TOWER_TYPES)) {
      const cfg = TOWER_TYPES[typeId];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tower-choice';
      btn.disabled = this.gold < cfg.cost;

      const img = document.createElement('img');
      img.src = ASSET_BASE + `${cfg.shopSprite}.png`;
      img.alt = cfg.label;

      const name = document.createElement('span');
      name.className = 'tower-name';
      name.textContent = cfg.label;

      const cost = document.createElement('span');
      cost.className = 'tower-cost';
      cost.textContent = `${cfg.cost} gold`;

      const desc = document.createElement('span');
      desc.className = 'tower-desc';
      desc.textContent = cfg.description;

      btn.appendChild(img);
      btn.appendChild(name);
      btn.appendChild(cost);
      btn.appendChild(desc);
      btn.addEventListener('click', () => this.confirmPurchase(typeId));

      this.towerShopEl.appendChild(btn);
    }
  }

  openPurchaseModal(slot) {
    this.deselectTower();
    this.closeUpgradeModal();
    this.pendingPurchase = { col: slot.col, row: slot.row };
    this.modalGoldEl.textContent = this.gold;
    this.modalErrorEl.classList.add('hidden');
    this.modalErrorEl.textContent = '';
    this.renderTowerShop();

    this.modal.classList.remove('hidden');
    this.modal.setAttribute('aria-hidden', 'false');
  }

  closePurchaseModal() {
    this.pendingPurchase = null;
    this.modal.classList.add('hidden');
    this.modal.setAttribute('aria-hidden', 'true');
  }

  confirmPurchase(towerType) {
    if (!this.pendingPurchase || this.gameOver) return;

    const { col, row } = this.pendingPurchase;
    const cfg = TOWER_TYPES[towerType];

    if (!cfg || !isBuildSlot(col, row) || this.hasTowerAt(col, row)) {
      this.closePurchaseModal();
      return;
    }

    if (this.gold < cfg.cost) {
      this.modalErrorEl.textContent = 'Недостаточно золота';
      this.modalErrorEl.classList.remove('hidden');
      this.renderTowerShop();
      return;
    }

    this.gold -= cfg.cost;
    this.towers.push(new Tower(col, row, this, towerType));
    this.updateHud();
    this.closePurchaseModal();
  }

  onCanvasClick(e) {
    if (this.gameOver) return;

    const { x, y } = this.canvasToGameCoords(e.clientX, e.clientY);
    const tower = this.getTowerAt(x, y);

    if (tower) {
      this.openUpgradeModal(tower);
      return;
    }

    this.deselectTower();
    this.closeUpgradeModal();

    const slot = this.getPlusAt(x, y);
    if (slot) {
      this.openPurchaseModal(slot);
    }
  }

  drawBuildSlots() {
    const { ctx } = this;
    const radius = TILE_SIZE / 2;

    for (const slot of BUILD_SLOTS) {
      if (this.hasTowerAt(slot.col, slot.row)) continue;

      const center = cellCenter(slot.col, slot.row);

      ctx.beginPath();
      ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(244, 208, 63, 0.35)';
      ctx.fill();
      ctx.strokeStyle = '#f4d03f';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#f4d03f';
      ctx.font = 'bold 36px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', center.x, center.y);
    }
  }

  showHint(message) {
    this.hintMessage = message;
    this.hintTimer = 2;
  }

  updateHud() {
    document.getElementById('gold').textContent = this.gold;
    document.getElementById('lives').textContent = this.lives;
    document.getElementById('wave').textContent = this.wave;

    if (this.lives <= 0 && !this.gameOver) {
      this.gameOver = true;
      this.showHint('Игра окончена');
    }
  }

  update(dt) {
    if (this.gameOver) return;

    if (this.hintTimer > 0) {
      this.hintTimer -= dt;
      if (this.hintTimer <= 0) this.hintMessage = '';
    }

    if (this.waveActive && this.enemiesSpawned < this.enemiesPerWave) {
      this.spawnTimer += dt;
      if (this.spawnTimer >= this.spawnInterval) {
        this.spawnTimer = 0;
        this.spawnEnemy();
      }
    }

    const allSpawned = this.enemiesSpawned >= this.enemiesPerWave;
    const waveCleared = allSpawned && this.enemies.length === 0;

    if (waveCleared && this.waveActive) {
      this.waveActive = false;
      if (this.lives > 0) {
        this.wave++;
        this.updateHud();
        setTimeout(() => {
          if (!this.gameOver) this.startWave();
        }, 3000);
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

    for (const explosion of this.explosions) {
      explosion.update(dt);
    }

    this.enemies = this.enemies.filter((e) => e.alive);
    this.projectiles = this.projectiles.filter((p) => !p.hit);
    this.explosions = this.explosions.filter((e) => !e.finished);
  }

  drawMap() {
    const { ctx, images } = this;

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const key = LEVEL_TILES[row][col];
        const img = images[key];
        ctx.drawImage(img, col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
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

    for (const projectile of this.projectiles) {
      projectile.draw(ctx, images);
    }

    for (const explosion of this.explosions) {
      explosion.draw(ctx);
    }

    if (this.hintMessage) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, this.canvas.height - 36, this.canvas.width, 36);
      ctx.fillStyle = '#fff';
      ctx.font = '16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.hintMessage, this.canvas.width / 2, this.canvas.height - 12);
    }

    if (this.gameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 48px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Game Over', this.canvas.width / 2, this.canvas.height / 2);
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
