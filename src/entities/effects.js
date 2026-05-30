import { ASSET_SCALE, TILE_SIZE, drawRotatedSprite } from '../core/world.js';

export class Explosion {
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

export class BarrelExplosion {
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

export class BarrelMine {
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

export class BarrelMineFlight {
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
