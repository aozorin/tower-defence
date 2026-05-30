import { TOWER_TYPES } from '../config/game-content.js';
import {
  TILE_SIZE,
  ASSET_SCALE,
  TANK_SPRITE_FACING,
  cellCenter,
  angleFromDirection,
  drawRotatedSprite,
  ROAD_CELLS,
  isBaseCell,
} from '../core/world.js';
import { Projectile } from './projectile.js';
import { BarrelMine, BarrelMineFlight } from './effects.js';

export class Tower {
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

