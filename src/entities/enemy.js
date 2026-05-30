import { ENEMY_TYPES } from '../config/game-content.js';
import {
  PATHS,
  TILE_SIZE,
  ASSET_SCALE,
  TANK_SPRITE_FACING,
  cellCenter,
  angleFromDirection,
  drawRotatedSprite,
} from '../core/world.js';

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

export class Enemy {
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
