import {
  GRID_COLS,
  GRID_ROWS,
  isRoad,
  isBuildSlot,
  isBaseCell,
} from '../core/world.js';

const DECORATION_SPAWN_CHANCE = 0.24;

export function generateDecorations(availableDecorationKeys) {
  const decorations = [];
  if (!availableDecorationKeys || availableDecorationKeys.length === 0) return decorations;

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      if (isRoad(col, row)) continue;
      if (isBuildSlot(col, row)) continue;
      if (isBaseCell(col, row)) continue;
      if (Math.random() > DECORATION_SPAWN_CHANCE) continue;

      const decorationKey = availableDecorationKeys[
        Math.floor(Math.random() * availableDecorationKeys.length)
      ];
      const rotation = (Math.random() - 0.5) * 0.3;
      const scale = 0.72 + Math.random() * 0.36;
      decorations.push({ col, row, decorationKey, rotation, scale });
    }
  }

  return decorations;
}
