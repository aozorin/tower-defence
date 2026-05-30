import {
  ASSET_SCALE,
  TANK_SPRITE_FACING,
  BULLET_FRONT_FLIP,
  drawRotatedSprite,
} from '../core/world.js';

export class Projectile {
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
