export const ASSET_BASE = 'assets/PNG/Retina/';

export const ENEMY_TYPES = {
  red: { sprite: 'tank_red', speed: 80, hp: 30, gold: 10 },
  blue: { sprite: 'tank_blue', speed: 145, hp: 14, gold: 6 },
  dark: { sprite: 'tank_dark', speed: 40, hp: 300, gold: 80 },
  sand: { sprite: 'tank_sand', speed: 65, hp: 40, gold: 18 },
  green: { sprite: 'tank_green', speed: 55, hp: 56, gold: 22 },
};

export const TOWER_TYPES = {
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

export const UI_ASSETS = {
  arrowUp: 'assets/kenney_game-icons/PNG/White/2x/arrowUp.png',
  medal: 'assets/kenney_game-icons/PNG/White/2x/medal1.png',
};

export const RANK_ASSETS = {
  silver1: 'assets/kenney_ranks-pack/PNG/Retina/Silver/rank001.png',
  silver2: 'assets/kenney_ranks-pack/PNG/Retina/Silver/rank002.png',
  silver3: 'assets/kenney_ranks-pack/PNG/Retina/Silver/rank003.png',
  gold1: 'assets/kenney_ranks-pack/PNG/Retina/Gold/rank001.png',
  gold2: 'assets/kenney_ranks-pack/PNG/Retina/Gold/rank002.png',
  gold3: 'assets/kenney_ranks-pack/PNG/Retina/Gold/rank003.png',
  gold4: 'assets/kenney_ranks-pack/PNG/Retina/Gold/rank004.png',
};

export const DECORATION_ASSETS = {
  treeGreen_twigs: `${ASSET_BASE}treeGreen_twigs.png`,
  treeBrown_small: `${ASSET_BASE}treeBrown_small.png`,
  wireCrooked: `${ASSET_BASE}wireCrooked.png`,
  oilSpill_large: `${ASSET_BASE}oilSpill_large.png`,
  crateWood: `${ASSET_BASE}crateWood.png`,
  barricadeWood: `${ASSET_BASE}barricadeWood.png`,
  crateMetal: `${ASSET_BASE}crateMetal.png`,
};
