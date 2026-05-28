// src/utils/cowPlacer.ts
var DIRS_4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];
var DIRS_8 = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1]
];
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function generateTargetSizes(n) {
  const total = n * n;
  const targets = [];
  let remaining = total;
  for (let i = 0; i < n; i++) {
    if (i === n - 1) {
      targets.push(remaining);
    } else {
      const left = n - i;
      const avg = remaining / left;
      const minSize = 1;
      const maxSize = Math.min(remaining - minSize * (left - 1), Math.ceil(avg * 2.2));
      const lo = Math.max(minSize, Math.floor(avg * 0.25));
      const hi = Math.max(lo + 1, Math.floor(maxSize));
      const size = lo + Math.floor(Math.random() * (hi - lo + 1));
      targets.push(size);
      remaining -= size;
    }
  }
  return shuffle(targets);
}
function growRegions(n, dirs) {
  const colorOf = Array.from({ length: n }, () => Array(n).fill(-1));
  const seeds = [];
  const used = /* @__PURE__ */ new Set();
  while (seeds.length < n) {
    const r = Math.floor(Math.random() * n);
    const c = Math.floor(Math.random() * n);
    const key = `${r},${c}`;
    if (!used.has(key)) {
      used.add(key);
      seeds.push([r, c]);
      colorOf[r][c] = seeds.length - 1;
    }
  }
  const targetSizes = generateTargetSizes(n);
  const regionSize = new Array(n).fill(1);
  const frontierMap = /* @__PURE__ */ new Map();
  function addFrontier(r, c, colorIdx) {
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < n && nc >= 0 && nc < n && colorOf[nr][nc] === -1) {
        const key = `${nr},${nc}`;
        if (!frontierMap.has(key)) frontierMap.set(key, /* @__PURE__ */ new Set());
        frontierMap.get(key).add(colorIdx);
      }
    }
  }
  for (let i = 0; i < n; i++) {
    addFrontier(seeds[i][0], seeds[i][1], i);
  }
  let totalAssigned = n;
  const target = n * n;
  while (totalAssigned < target) {
    if (frontierMap.size === 0) return null;
    let bestKey = "";
    let bestNumOptions = Infinity;
    let bestColors = [];
    for (const [key, colors] of frontierMap) {
      const needColors = [...colors].filter((c2) => regionSize[c2] < targetSizes[c2]);
      if (needColors.length === 0) continue;
      if (needColors.length < bestNumOptions) {
        bestNumOptions = needColors.length;
        bestKey = key;
        bestColors = needColors;
      }
    }
    if (bestKey === "") {
      for (const [key, colors] of frontierMap) {
        if (colors.size < bestNumOptions || bestKey === "") {
          bestNumOptions = colors.size;
          bestKey = key;
          bestColors = [...colors];
        }
      }
    }
    if (bestKey === "") return null;
    const minSize = Math.min(...bestColors.map((c2) => regionSize[c2]));
    const smallestColors = bestColors.filter((c2) => regionSize[c2] === minSize);
    const colorIdx = smallestColors[Math.floor(Math.random() * smallestColors.length)];
    const parts = bestKey.split(",");
    const r = Number(parts[0]);
    const c = Number(parts[1]);
    colorOf[r][c] = colorIdx;
    regionSize[colorIdx]++;
    totalAssigned++;
    frontierMap.delete(bestKey);
    addFrontier(r, c, colorIdx);
  }
  return colorOf;
}
function placeCowsInRegions(n, colorOf) {
  const rowOrder = shuffle(Array.from({ length: n }, (_, i) => i));
  const cowColForRow = new Array(n).fill(-1);
  const usedCols = /* @__PURE__ */ new Set();
  const usedColors = /* @__PURE__ */ new Set();
  const placedCows = [];
  function tryRow(idx) {
    if (idx === n) return true;
    const row = rowOrder[idx];
    const cellsInRow = [];
    for (let c = 0; c < n; c++) {
      if (!usedCols.has(c) && !usedColors.has(colorOf[row][c])) {
        cellsInRow.push({ c, color: colorOf[row][c] });
      }
    }
    const shuffled = shuffle(cellsInRow);
    for (const { c, color } of shuffled) {
      let adjOk = true;
      for (const [pr, pc] of placedCows) {
        if (Math.abs(pr - row) <= 1 && Math.abs(pc - c) <= 1) {
          adjOk = false;
          break;
        }
      }
      if (!adjOk) continue;
      cowColForRow[row] = c;
      usedCols.add(c);
      usedColors.add(color);
      placedCows.push([row, c]);
      if (tryRow(idx + 1)) return true;
      cowColForRow[row] = -1;
      usedCols.delete(c);
      usedColors.delete(color);
      placedCows.pop();
    }
    return false;
  }
  if (tryRow(0)) {
    const result = new Array(n).fill(0);
    for (let r = 0; r < n; r++) {
      result[r] = cowColForRow[r];
    }
    return result;
  }
  return null;
}
function createSnakeColorOf(n) {
  const colorOf = Array.from({ length: n }, () => Array(n).fill(-1));
  const path = [];
  for (let r = 0; r < n; r++) {
    if (r % 2 === 0) {
      for (let c = 0; c < n; c++) path.push([r, c]);
    } else {
      for (let c = n - 1; c >= 0; c--) path.push([r, c]);
    }
  }
  for (let i = 0; i < path.length; i++) {
    const [r, c] = path[i];
    colorOf[r][c] = Math.floor(i / n);
  }
  return colorOf;
}
function createGameState(n, mode = "hard") {
  const dirs = mode === "easy" ? DIRS_4 : DIRS_8;
  for (let retry = 0; retry < 300; retry++) {
    const colorOf2 = growRegions(n, dirs);
    if (!colorOf2) continue;
    const cowCols = placeCowsInRegions(n, colorOf2);
    if (!cowCols) continue;
    const grid2 = Array.from(
      { length: n },
      (_, r) => Array.from({ length: n }, (_2, c) => ({
        colorIndex: colorOf2[r][c],
        hasCow: cowCols[r] === c,
        isRevealed: false,
        isFlagged: false,
        isWrong: false
      }))
    );
    return {
      n,
      mode,
      grid: grid2,
      cowsFound: 0,
      totalCows: n,
      isWon: false
    };
  }
  for (let retry = 0; retry < 100; retry++) {
    const colorOf2 = createSnakeColorOf(n);
    const cowCols = placeCowsInRegions(n, colorOf2);
    if (!cowCols) continue;
    const grid2 = Array.from(
      { length: n },
      (_, r) => Array.from({ length: n }, (_2, c) => ({
        colorIndex: colorOf2[r][c],
        hasCow: cowCols[r] === c,
        isRevealed: false,
        isFlagged: false,
        isWrong: false
      }))
    );
    return { n, mode, grid: grid2, cowsFound: 0, totalCows: n, isWon: false };
  }
  const colorOf = createSnakeColorOf(n);
  const grid = Array.from(
    { length: n },
    (_, r) => Array.from({ length: n }, (_2, c) => ({
      colorIndex: colorOf[r][c],
      hasCow: false,
      isRevealed: false,
      isFlagged: false,
      isWrong: false
    }))
  );
  for (let r = 0; r < n; r++) {
    grid[r][r].hasCow = true;
  }
  return { n, mode, grid, cowsFound: 0, totalCows: n, isWon: false };
}

// test-cow.ts
var DIRS_42 = [[-1, 0], [1, 0], [0, -1], [0, 1]];
var DIRS_82 = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1]
];
function bfs(colorGrid, n, startR, startC, color, dirs) {
  const visited = /* @__PURE__ */ new Set();
  const queue = [[startR, startC]];
  visited.add(`${startR},${startC}`);
  while (queue.length > 0) {
    const [r, c] = queue.shift();
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      const key = `${nr},${nc}`;
      if (nr >= 0 && nr < n && nc >= 0 && nc < n && !visited.has(key) && colorGrid[nr][nc] === color) {
        visited.add(key);
        queue.push([nr, nc]);
      }
    }
  }
  return visited;
}
function testMode(mode) {
  let totalPass = 0;
  let totalFail = 0;
  const dirs = mode === "easy" ? DIRS_42 : DIRS_82;
  const modeLabel = mode === "easy" ? "\u4F4E\u7EA7" : "\u9AD8\u7EA7";
  for (let n = 4; n <= 15; n++) {
    for (let trial = 0; trial < 10; trial++) {
      const gs = createGameState(n, mode);
      const { grid } = gs;
      let cowCount = 0;
      const rowCows = new Array(n).fill(0);
      const colCows = new Array(n).fill(0);
      const cowPositions = [];
      const colorGrid = Array.from({ length: n }, () => Array(n).fill(-1));
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          colorGrid[r][c] = grid[r][c].colorIndex;
          if (grid[r][c].hasCow) {
            cowCount++;
            rowCows[r]++;
            colCows[c]++;
            cowPositions.push([r, c]);
          }
        }
      }
      if (cowCount !== n) {
        console.log(`FAIL [${modeLabel}] n=${n} trial=${trial}: cowCount=${cowCount}`);
        totalFail++;
        continue;
      }
      let rowOk = true;
      let colOk = true;
      for (let i = 0; i < n; i++) {
        if (rowCows[i] !== 1) rowOk = false;
        if (colCows[i] !== 1) colOk = false;
      }
      if (!rowOk || !colOk) {
        console.log(`FAIL [${modeLabel}] n=${n} trial=${trial}: row/col constraint`);
        totalFail++;
        continue;
      }
      let adjOk = true;
      for (let i = 0; i < cowPositions.length; i++) {
        for (let j = i + 1; j < cowPositions.length; j++) {
          const dr = Math.abs(cowPositions[i][0] - cowPositions[j][0]);
          const dc = Math.abs(cowPositions[i][1] - cowPositions[j][1]);
          if (dr <= 1 && dc <= 1) adjOk = false;
        }
      }
      if (!adjOk) {
        console.log(`FAIL [${modeLabel}] n=${n} trial=${trial}: adjacent cows`);
        totalFail++;
        continue;
      }
      const colorCounts = new Array(n).fill(0);
      const cowColorSet = /* @__PURE__ */ new Set();
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          colorCounts[colorGrid[r][c]]++;
          if (grid[r][c].hasCow) cowColorSet.add(colorGrid[r][c]);
        }
      }
      let totalCells = colorCounts.reduce((a, b) => a + b, 0);
      if (totalCells !== n * n) {
        console.log(`FAIL [${modeLabel}] n=${n} trial=${trial}: total cells=${totalCells}`);
        totalFail++;
        continue;
      }
      let allColorsPresent = true;
      for (let i = 0; i < n; i++) {
        if (colorCounts[i] < 1) allColorsPresent = false;
      }
      if (!allColorsPresent || cowColorSet.size !== n) {
        console.log(`FAIL [${modeLabel}] n=${n} trial=${trial}: color presence`);
        totalFail++;
        continue;
      }
      let connectedOk = true;
      for (let color = 0; color < n; color++) {
        let startR = -1, startC = -1;
        for (let r = 0; r < n; r++) {
          for (let c = 0; c < n; c++) {
            if (colorGrid[r][c] === color) {
              startR = r;
              startC = c;
              break;
            }
          }
          if (startR >= 0) break;
        }
        const visited = bfs(colorGrid, n, startR, startC, color, dirs);
        if (visited.size !== colorCounts[color]) {
          connectedOk = false;
          console.log(`FAIL [${modeLabel}] n=${n} trial=${trial}: color ${color} not connected (visited=${visited.size}, count=${colorCounts[color]})`);
        }
      }
      if (!connectedOk) {
        totalFail++;
        continue;
      }
      const maxCount = Math.max(...colorCounts);
      const minCount = Math.min(...colorCounts);
      console.log(`PASS [${modeLabel}] n=${n} trial=${trial} (sizes: min=${minCount} max=${maxCount} ratio=${(maxCount / minCount).toFixed(1)})`);
      totalPass++;
    }
  }
  console.log(`
=== ${modeLabel}\u6A21\u5F0F: ${totalPass} PASS, ${totalFail} FAIL ===
`);
  return { totalPass, totalFail };
}
var easy = testMode("easy");
var hard = testMode("hard");
console.log(`
=== \u603B\u8BA1: ${easy.totalPass + hard.totalPass} PASS, ${easy.totalFail + hard.totalFail} FAIL ===`);
