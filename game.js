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

const ASSET_KEYS = [
  'tileGrass1',
  'tileGrass_roadEast',
  'tileGrass_roadNorth',
  'tileGrass_roadCornerUL',
  'tileGrass_roadCornerUR',
  'tileGrass_roadCornerLL',
  'tileGrass_roadCornerLR',
  'tank_red',
  'tank_green',
  'bulletGreen1',
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
  static SPEED = 80;
  static MAX_HP = 30;
  static GOLD_REWARD = 10;

  constructor(game) {
    this.game = game;
    this.waypointIndex = 0;
    this.progress = 0;
    this.hp = Enemy.MAX_HP;
    this.maxHp = Enemy.MAX_HP;
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
    this.game.gold += Enemy.GOLD_REWARD;
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

    const advance = (Enemy.SPEED * dt) / segmentLength;

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

    const img = images.tank_red;
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
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(barX, barY, barW * (this.hp / this.maxHp), barH);
    }
  }
}

class Projectile {
  static SPEED = 280;
  static HIT_RADIUS = 12;

  constructor(x, y, target, damage, game) {
    this.x = x;
    this.y = y;
    this.target = target;
    this.damage = damage;
    this.game = game;
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

    const move = Projectile.SPEED * dt;
    this.x += (dx / dist) * move;
    this.y += (dy / dist) * move;
  }

  draw(ctx, images) {
    if (this.hit) return;

    const img = images.bulletGreen1;
    const w = img.width * ASSET_SCALE * 2;
    const h = img.height * ASSET_SCALE * 2;
    ctx.drawImage(img, this.x - w / 2, this.y - h / 2, w, h);
  }
}

class Tower {
  static COST = 50;
  static RANGE = 120;
  static DAMAGE = 10;
  static FIRE_COOLDOWN = 0.6;

  constructor(col, row, game) {
    this.col = col;
    this.row = row;
    this.game = game;
    const center = cellCenter(col, row);
    this.x = center.x;
    this.y = center.y;
    this.cooldown = 0;
    this.angle = 0;
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
      new Projectile(this.x, this.y, target, Tower.DAMAGE, this.game)
    );
    this.cooldown = Tower.FIRE_COOLDOWN;
  }

  findTarget() {
    let nearest = null;
    let nearestDist = Tower.RANGE;

    for (const enemy of this.game.enemies) {
      if (!enemy.alive) continue;
      const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (dist <= Tower.RANGE && dist < nearestDist) {
        nearest = enemy;
        nearestDist = dist;
      }
    }

    return nearest;
  }

  draw(ctx, images) {
    const img = images.tank_green;
    const w = img.width * ASSET_SCALE;
    const h = img.height * ASSET_SCALE;
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
    this.enemiesPerWave = 8;
    this.spawnTimer = 0;
    this.spawnInterval = 2.5;
    this.waveActive = false;
    this.gameOver = false;

    this.lastTime = 0;
    this.hintMessage = '';
    this.hintTimer = 0;
    this.pendingPurchase = null;

    this.modal = document.getElementById('purchase-modal');
    this.modalGoldEl = document.getElementById('modal-gold');
    this.modalErrorEl = document.getElementById('modal-error');
    this.purchaseConfirmBtn = document.getElementById('purchase-confirm');
    this.purchaseCancelBtn = document.getElementById('purchase-cancel');

    this.canvas.addEventListener('click', (e) => this.onCanvasClick(e));
    this.purchaseConfirmBtn.addEventListener('click', () => this.confirmPurchase());
    this.purchaseCancelBtn.addEventListener('click', () => this.closePurchaseModal());
    this.modal.querySelector('.modal-backdrop').addEventListener('click', () =>
      this.closePurchaseModal()
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

  startWave() {
    this.waveActive = true;
    this.enemiesSpawned = 0;
    this.spawnTimer = 0;
  }

  spawnEnemy() {
    this.enemies.push(new Enemy(this));
    this.enemiesSpawned++;
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

  openPurchaseModal(slot) {
    this.pendingPurchase = { col: slot.col, row: slot.row };
    this.modalGoldEl.textContent = this.gold;
    this.modalErrorEl.classList.add('hidden');
    this.modalErrorEl.textContent = '';

    const canAfford = this.gold >= Tower.COST;
    this.purchaseConfirmBtn.disabled = !canAfford;
    if (!canAfford) {
      this.modalErrorEl.textContent = 'Недостаточно золота';
      this.modalErrorEl.classList.remove('hidden');
    }

    this.modal.classList.remove('hidden');
    this.modal.setAttribute('aria-hidden', 'false');
  }

  closePurchaseModal() {
    this.pendingPurchase = null;
    this.modal.classList.add('hidden');
    this.modal.setAttribute('aria-hidden', 'true');
  }

  confirmPurchase() {
    if (!this.pendingPurchase || this.gameOver) return;

    const { col, row } = this.pendingPurchase;

    if (!isBuildSlot(col, row) || this.hasTowerAt(col, row)) {
      this.closePurchaseModal();
      return;
    }

    if (this.gold < Tower.COST) {
      this.modalErrorEl.textContent = 'Недостаточно золота';
      this.modalErrorEl.classList.remove('hidden');
      this.purchaseConfirmBtn.disabled = true;
      return;
    }

    this.gold -= Tower.COST;
    this.towers.push(new Tower(col, row, this));
    this.updateHud();
    this.closePurchaseModal();
  }

  onCanvasClick(e) {
    if (this.gameOver) return;

    const { x, y } = this.canvasToGameCoords(e.clientX, e.clientY);
    const slot = this.getPlusAt(x, y);

    if (!slot) return;

    this.openPurchaseModal(slot);
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
