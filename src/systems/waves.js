import { PATHS } from '../core/world.js';
import { Enemy } from '../entities/enemy.js';

export function getWaveConfig(game) {
  const difficultyPower = game.getProgressPower();
  const enemiesPerWave = Math.round((6 + game.wave * 3) * (1 + difficultyPower * 0.01));
  const spawnInterval = Math.max(0.55, (2.4 - game.wave * 0.18) / (1 + difficultyPower * 0.012));
  const bluePackChance = Math.min(0.48, 0.1 + game.wave * 0.045);
  const sandChance = game.wave >= 3 ? Math.min(0.16, 0.03 + game.wave * 0.016) : 0;
  const greenChance = game.wave >= 5 ? Math.min(0.13, 0.01 + game.wave * 0.012) : 0;
  return { enemiesPerWave, spawnInterval, bluePackChance, sandChance, greenChance };
}

export function generatePathSpawnPlan(totalEnemies) {
  const plan = new Array(PATHS.length).fill(0);
  for (let i = 0; i < totalEnemies; i++) {
    const idx = Math.floor(Math.random() * PATHS.length);
    plan[idx]++;
  }
  return plan;
}

export function shufflePathIndexes() {
  const indexes = PATHS.map((_, idx) => idx);
  for (let i = indexes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
  }
  return indexes;
}

export function getBossLaneCount(game) {
  if (game.wave < 5) return 0;
  if (game.wave < 10) return 1;
  if (game.wave < 15) return 2;
  return 3;
}

export function generateBossSpawnSchedule(game) {
  const laneCount = getBossLaneCount(game);
  if (laneCount === 0) return [];

  const pathIndexes = shufflePathIndexes().slice(0, laneCount);
  if (game.wave < 25) {
    return pathIndexes.map((pathIndex) => ({
      pathIndex,
      spawnAtCount: game.enemiesPerWave,
      spawned: false,
    }));
  }

  const schedule = [];
  const usedSpawnCounts = new Set();
  const secondBossChance = game.wave >= 50 ? 0.65 : 0.35;
  const firstBossMinProgress = game.wave >= 50 ? 0 : 0.28;

  const reserveSpawnCount = (preferred) => {
    let spawnAtCount = Math.max(0, Math.min(game.enemiesPerWave, Math.round(preferred)));
    while (usedSpawnCounts.has(spawnAtCount) && spawnAtCount < game.enemiesPerWave) spawnAtCount++;
    while (usedSpawnCounts.has(spawnAtCount) && spawnAtCount > 0) spawnAtCount--;
    usedSpawnCounts.add(spawnAtCount);
    return spawnAtCount;
  };

  pathIndexes.forEach((pathIndex, idx) => {
    const earlyProgress = firstBossMinProgress + Math.random() * 0.35;
    const firstPreferred = idx === 0 && game.wave >= 50 ? 0 : game.enemiesPerWave * earlyProgress;
    schedule.push({ pathIndex, spawnAtCount: reserveSpawnCount(firstPreferred), spawned: false });

    if (Math.random() < secondBossChance) {
      const lateProgress = 0.62 + Math.random() * 0.28;
      schedule.push({
        pathIndex,
        spawnAtCount: reserveSpawnCount(game.enemiesPerWave * lateProgress),
        spawned: false,
      });
    }
  });

  return schedule.sort((a, b) => a.spawnAtCount - b.spawnAtCount);
}

export function takePathForSpawn(game, groupSize = 1) {
  const available = game.pathSpawnRemaining
    .map((count, idx) => ({ count, idx }))
    .filter((entry) => entry.count > 0);
  if (available.length === 0) return Math.floor(Math.random() * PATHS.length);

  const totalWeight = available.reduce((sum, entry) => sum + entry.count, 0);
  let roll = Math.random() * totalWeight;
  let selectedIdx = available[0].idx;
  for (const entry of available) {
    roll -= entry.count;
    if (roll <= 0) {
      selectedIdx = entry.idx;
      break;
    }
  }

  game.pathSpawnRemaining[selectedIdx] = Math.max(0, game.pathSpawnRemaining[selectedIdx] - Math.max(1, groupSize));
  return selectedIdx;
}

export function spawnRedEnemy(game) {
  const pathIndex = takePathForSpawn(game, 1);
  const path = PATHS[pathIndex];
  game.enemies.push(new Enemy(game, 'red', path, 0, game.wave));
  game.pathFirstSpawned[pathIndex] = true;
  game.enemiesSpawned++;
}

export function spawnSandEnemy(game) {
  const pathIndex = takePathForSpawn(game, 1);
  const path = PATHS[pathIndex];
  game.enemies.push(new Enemy(game, 'sand', path, 0, game.wave));
  game.pathFirstSpawned[pathIndex] = true;
  game.enemiesSpawned++;
}

export function spawnBluePack(game) {
  const remaining = game.enemiesPerWave - game.enemiesSpawned;
  let count = 2 + Math.floor(Math.random() * 9);
  count = Math.min(count, remaining);
  if (count < 2) {
    spawnRedEnemy(game);
    return;
  }

  const pathIndex = takePathForSpawn(game, count);
  const path = PATHS[pathIndex];
  for (let i = 0; i < count; i++) {
    game.enemies.push(new Enemy(game, 'blue', path, -i * 0.07, game.wave));
  }
  game.pathFirstSpawned[pathIndex] = true;
  game.enemiesSpawned += count;
}

export function spawnGreenEnemy(game) {
  const pathIndex = takePathForSpawn(game, 1);
  const path = PATHS[pathIndex];
  game.enemies.push(new Enemy(game, 'green', path, 0, game.wave));
  game.pathFirstSpawned[pathIndex] = true;
  game.enemiesSpawned++;
}

export function spawnBoss(game, pathIndex = Math.floor(Math.random() * PATHS.length)) {
  const path = PATHS[pathIndex];
  game.enemies.push(new Enemy(game, 'dark', path, 0, game.wave));
  game.pathFirstSpawned[pathIndex] = true;
}

export function spawnDueBosses(game) {
  if (game.wave < 5) return;
  const due = game.bossSpawnSchedule.filter((entry) => !entry.spawned && game.enemiesSpawned >= entry.spawnAtCount);
  if (due.length === 0) return;

  const entriesToSpawn = game.wave < 25 ? due : [due[0]];
  for (const entry of entriesToSpawn) {
    spawnBoss(game, entry.pathIndex);
    entry.spawned = true;
  }
}

export function areBossesDone(game) {
  return game.wave < 5 || game.bossSpawnSchedule.every((entry) => entry.spawned);
}

export function spawnEnemy(game) {
  const roll = Math.random();
  if (game.wave >= 4 && roll < game.greenChance) {
    spawnGreenEnemy(game);
  } else if (game.wave >= 3 && roll < game.greenChance + game.sandChance) {
    spawnSandEnemy(game);
  } else if (roll < game.greenChance + game.sandChance + game.bluePackChance) {
    spawnBluePack(game);
  } else {
    spawnRedEnemy(game);
  }
}

export function startWave(game) {
  const config = getWaveConfig(game);
  game.enemiesPerWave = config.enemiesPerWave;
  game.spawnInterval = config.spawnInterval;
  game.bluePackChance = config.bluePackChance;
  game.sandChance = config.sandChance;
  game.greenChance = config.greenChance;
  game.waveActive = true;
  game.enemiesSpawned = 0;
  game.spawnTimer = 0;
  game.pathSpawnPlan = generatePathSpawnPlan(game.enemiesPerWave);
  game.pathSpawnRemaining = [...game.pathSpawnPlan];
  game.pathFirstSpawned = new Array(PATHS.length).fill(false);
  game.pathIndicatorMinTimer = new Array(PATHS.length).fill(5);
  game.bossSpawnSchedule = generateBossSpawnSchedule(game);
  game.showWaveBanner(`В0ЛНА ${game.wave}`);
  spawnDueBosses(game);
}
