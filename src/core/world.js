export const GRID_COLS = 22;
export const GRID_ROWS = 14;
export const TILE_SIZE = 48;
export const ASSET_SCALE = TILE_SIZE / 128;
export const TANK_SPRITE_FACING = Math.PI / 2;
export const BULLET_FRONT_FLIP = Math.PI;

export const PATHS = [
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

export const BASE_COL = 11;
export const BASE_ROW = 13;
export const MAIN_BASE_JUNCTION = { col: 11, row: 10, tile: 'tileSand_roadSplitS' };
export const RIGHT_BASE_JUNCTION = { col: 13, row: 10, tile: 'tileSand_roadSplitN' };

export function cellCenter(col, row) {
  return {
    x: col * TILE_SIZE + TILE_SIZE / 2,
    y: row * TILE_SIZE + TILE_SIZE / 2,
  };
}

export function isBaseCell(col, row) {
  return col === BASE_COL && row === BASE_ROW;
}

export function angleFromDirection(dx, dy) {
  return Math.atan2(dy, dx) - TANK_SPRITE_FACING;
}

export function drawRotatedSprite(ctx, img, x, y, w, h, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load: ${src}`));
    img.src = src;
  });
}

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

export const ROAD_CELLS = buildRoadCells();

export const BUILD_SLOTS = (() => {
  const slots = [];
  for (let row = 1; row < GRID_ROWS - 1; row++) {
    for (let col = 1; col < GRID_COLS - 1; col++) {
      const key = `${col},${row}`;
      if (ROAD_CELLS.has(key)) continue;
      if (col === BASE_COL && row >= BASE_ROW - 1) continue;
      if (getRoadNeighbors(col, row, ROAD_CELLS).length > 0) slots.push({ col, row });
    }
  }
  return slots;
})();

const BUILD_SLOT_SET = new Set(BUILD_SLOTS.map((s) => `${s.col},${s.row}`));

export function isRoad(col, row) {
  return ROAD_CELLS.has(`${col},${row}`);
}

export function isBuildSlot(col, row) {
  return BUILD_SLOT_SET.has(`${col},${row}`);
}

export function getGrassTransitionKey(col, row) {
  if (isRoad(col, row) || isBuildSlot(col, row)) return null;
  if (isBuildSlot(col + 1, row)) return 'tileGrass_transitionE';
  if (isBuildSlot(col - 1, row)) return 'tileGrass_transitionW';
  if (isBuildSlot(col, row - 1)) return 'tileGrass_transitionN';
  if (isBuildSlot(col, row + 1)) return 'tileGrass_transitionS';
  return null;
}
