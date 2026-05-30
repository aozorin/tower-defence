import {
  GRID_COLS,
  GRID_ROWS,
  TILE_SIZE,
  ASSET_SCALE,
  PATHS,
  BASE_COL,
  BASE_ROW,
  MAIN_BASE_JUNCTION,
  RIGHT_BASE_JUNCTION,
  cellCenter,
  isRoad,
  isBuildSlot,
  getGrassTransitionKey,
  drawRotatedSprite,
} from '../core/world.js';

export function getPathThreatLevel(remainingCount) {
  if (remainingCount <= 0) return null;
  if (remainingCount <= 4) return { color: '#2ecc71' };
  if (remainingCount <= 8) return { color: '#f39c12' };
  return { color: '#e74c3c' };
}

export function drawMap(game) {
  const { ctx, images } = game;
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
          if ((n || s) && !(e || w)) key = 'tileSand_roadNorth';
          else if ((e || w) && !(n || s)) key = 'tileSand_roadEast';
          else if (roadNeighborCount >= 3) key = 'tileSand_roadCrossing';
          else if (n && e) key = 'tileSand_roadCornerUR';
          else if (n && w) key = 'tileSand_roadCornerUL';
          else if (s && e) key = 'tileSand_roadCornerLR';
          else if (s && w) key = 'tileSand_roadCornerLL';
          else key = 'tileSand_roadEast';
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
  for (const decoration of game.decorations) {
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
  ctx.fillStyle = '#000';
  ctx.font = '20px "Pixelify Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('БАЗА', baseCenter.x, baseCenter.y + 7);

  for (let i = 0; i < PATHS.length; i++) {
    if (game.pathFirstSpawned[i] && game.pathIndicatorMinTimer[i] <= 0) continue;
    const threat = getPathThreatLevel(game.pathSpawnRemaining[i]);
    if (!threat) continue;
    const start = PATHS[i][0];
    const markerCol = start.row === 0 ? start.col - 1 : start.col;
    const markerRow = start.row === 0 ? start.row + 1 : start.row;
    const center = cellCenter(markerCol, markerRow);
    const markerY = center.y - TILE_SIZE * 0.8;

    ctx.beginPath();
    ctx.arc(center.x, markerY, 16, 0, Math.PI * 2);
    ctx.fillStyle = threat.color;
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
