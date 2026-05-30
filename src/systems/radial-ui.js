import { ASSET_BASE, TOWER_TYPES } from '../config/game-content.js';
import { TILE_SIZE, cellCenter, isBuildSlot } from '../core/world.js';

export function renderRadialMenu(game) {
  if (!game.currentRadial) return;
  game.radialMenu.innerHTML = '';
  const { x, y, options, layout } = game.currentRadial;
  const gameX = x / game.canvas.width;
  let dir = 0;
  if (gameX < 0.24) dir = 1;
  if (gameX > 0.76) dir = -1;
  game.radialMenu.style.left = `${(x / game.canvas.width) * 100}%`;
  game.radialMenu.style.top = `${(y / game.canvas.height) * 100}%`;

  options.forEach((option, idx) => {
    const cost = typeof option.getCost === 'function' ? option.getCost() : option.cost;
    if (cost == null) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'radial-option';
    if (option.iconOffsetY) {
      btn.style.setProperty('--icon-offset-y', `${option.iconOffsetY}px`);
    }
    const affordable = option.skipAffordabilityCheck ? true : game.gold >= cost;
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
        game.showHint('Максимальная прокачка');
        game.closeRadialMenu();
        return;
      }
      if (!option.skipAffordabilityCheck && game.gold < currentCost) {
        game.showHint('Нужно больше золота');
        return;
      }
      option.action();
    });
    game.radialMenu.appendChild(btn);
  });
  game.radialMenu.classList.remove('hidden');
}

export function confirmPurchase(game, slot, towerType) {
  if (game.gameOver) return;
  const { col, row } = slot;
  const cfg = TOWER_TYPES[towerType];

  if (!cfg || !isBuildSlot(col, row) || game.hasTowerAt(col, row)) {
    game.closeRadialMenu();
    return;
  }

  const buyCost = Math.round(cfg.cost * game.getTowerDiscountMultiplier(towerType));
  const finalBuyCost = game.scaleTowerPurchaseCost(towerType, buyCost);
  if (game.gold < finalBuyCost) {
    game.showHint('Недостаточно золота');
    return;
  }

  game.gold -= finalBuyCost;
  const tower = game.createTower(col, row, towerType);
  tower.spentGold = finalBuyCost;
  game.towers.push(tower);
  game.updateHud();
  game.closeRadialMenu();
}

export function upgradeTower(game, tower) {
  if (!tower.canUpgrade()) return;
  const baseCost = tower.getUpgradeCost();
  const cost = game.scaleGoldCost(Math.round(baseCost * game.getTowerDiscountMultiplier(tower.type)));
  if (game.gold < cost) return;
  game.gold -= cost;
  tower.upgrade();
  tower.spentGold += cost;
  game.updateHud();
  game.renderRadialMenu();
}

export function upgradeTowerRange(game, tower) {
  if (!tower.canUpgradeRange()) return;
  const baseCost = tower.getRangeUpgradeCost();
  const cost = game.scaleGoldCost(Math.round(baseCost * game.getTowerDiscountMultiplier(tower.type)));
  if (game.gold < cost) return;
  game.gold -= cost;
  tower.upgradeRange();
  tower.spentGold += cost;
  game.updateHud();
  game.renderRadialMenu();
}

export function upgradeBerserk(game, tower) {
  if (!tower.canUpgradeBerserk()) return;
  const cost = game.scaleGoldCost(tower.getBerserkUpgradeCost());
  if (game.gold < cost) return;
  game.gold -= cost;
  tower.upgradeBerserk();
  tower.spentGold += cost;
  game.updateHud();
  game.renderRadialMenu();
}

export function upgradeBarrelBerserk(game, tower, mode) {
  const cost = game.scaleGoldCost(tower.getBarrelBerserkCost(mode));
  if (cost == null || game.gold < cost) return;
  game.gold -= cost;
  tower.upgradeBarrelBerserk(mode);
  tower.spentGold += cost;
  game.updateHud();
  game.renderRadialMenu();
}

export function showPurchaseRadial(game, slot) {
  const center = cellCenter(slot.col, slot.row);
  const options = Object.entries(TOWER_TYPES)
    .filter(([type]) => game.isTowerUnlocked(type))
    .map(([type, cfg]) => ({
      cost: type === 'barrel'
        ? game.scaleTowerPurchaseCost(type, Math.round(cfg.cost * game.getBarrelDiscountMultiplier()))
        : game.scaleTowerPurchaseCost(type, Math.round(cfg.cost * game.getTowerDiscountMultiplier(type))),
      icon: `${ASSET_BASE}${cfg.shopSprite}.png`,
      iconOffsetY: cfg.shopIconOffsetY || 0,
      action: () => game.confirmPurchase(slot, type),
    }));
  game.openRadialMenu(center.x, center.y, options, 'purchase');
}

export function showUpgradeRadial(game, tower) {
  const options = [];
  if (tower.canUpgrade()) {
    options.push({
      getCost: () => {
        const base = tower.getUpgradeCost();
        if (base == null) return null;
        return game.scaleGoldCost(Math.round(base * game.getTowerDiscountMultiplier(tower.type)));
      },
      icon: game.getTowerUpgradeIcon(tower),
      action: () => game.upgradeTower(tower),
    });
  }
  if (tower.canUpgradeRange()) {
    options.push({
      getCost: () => {
        const base = tower.getRangeUpgradeCost();
        if (base == null) return null;
        return game.scaleGoldCost(Math.round(base * game.getTowerDiscountMultiplier(tower.type)));
      },
      icon: game.getTowerRangeUpgradeIcon(),
      action: () => game.upgradeTowerRange(tower),
    });
  }
  if (tower.canUpgradeBerserk()) {
    options.push({
      getCost: () => game.scaleGoldCost(tower.getBerserkUpgradeCost()),
      icon: 'assets/kenney_ranks-pack/PNG/Retina/Gold/rank001.png',
      action: () => game.upgradeBerserk(tower),
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
        getCost: () => game.scaleGoldCost(tower.getBarrelBerserkCost(entry.mode)),
        icon: entry.icon,
        action: () => game.upgradeBarrelBerserk(tower, entry.mode),
      });
    }
  }
  options.push({
    getCost: () => game.getTowerSellRefund(tower),
    costPrefix: '+',
    getIcon: () => (
      game.pendingSellTowerId === tower.id
        ? 'assets/kenney_game-icons/PNG/White/2x/checkmark.png'
        : 'assets/kenney_game-icons/PNG/White/2x/trashcan.png'
    ),
    skipAffordabilityCheck: true,
    position: 'below',
    action: () => {
      if (game.pendingSellTowerId !== tower.id) {
        game.pendingSellTowerId = tower.id;
        game.renderRadialMenu();
        return;
      }
      game.sellTower(tower);
    },
  });
  if (options.length === 0) {
    game.showHint('Максимальная прокачка');
    game.closeRadialMenu();
    return;
  }
  game.openRadialMenu(tower.x, tower.y, options, 'upgrade');
}

export function onCanvasClick(game, e) {
  if (game.gameOver || game.isPaused || !game.started) return;

  const { x, y } = game.canvasToGameCoords(e.clientX, e.clientY);
  const tower = game.getTowerAt(x, y);

  if (tower) {
    game.selectTower(tower);
    game.showUpgradeRadial(tower);
    return;
  }

  game.deselectTower();
  game.closeRadialMenu();

  const slot = game.getPlusAt(x, y);
  if (slot) {
    game.showPurchaseRadial(slot);
  }
}
