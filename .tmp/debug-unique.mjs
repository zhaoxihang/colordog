// src/utils/hintRules.ts
function enumerateCowSolutions(board, options) {
  const candidatesByRow = [];
  const activeCells = [];
  for (let r = 0; r < board.n; r++) {
    const row = [];
    for (let c = 0; c < board.n; c++) {
      const cell = board.grid[r][c];
      if (!cell.isRevealed && !cell.isFlagged) {
        row.push([r, c]);
        activeCells.push([r, c]);
      } else if (cell.isRevealed && cell.hasCow) {
        row.push([r, c]);
      }
    }
    candidatesByRow.push(row);
  }
  if (!options.allowFullBoard && activeCells.length > board.n * 4) {
    return { solutions: [], truncated: false, activeCells };
  }
  const solutions = [];
  const usedCols = /* @__PURE__ */ new Set();
  const usedColors = /* @__PURE__ */ new Set();
  const placed = [];
  const solvedRows = /* @__PURE__ */ new Set();
  let nodeCount = 0;
  let truncated = false;
  function canPlace(r, c) {
    const cell = board.grid[r][c];
    if (usedCols.has(c) || usedColors.has(cell.colorIndex)) return false;
    for (const [pr, pc] of placed) {
      if (Math.abs(pr - r) <= 1 && Math.abs(pc - c) <= 1) return false;
    }
    return true;
  }
  function pickRow() {
    let bestRow = -1;
    let bestCount = Infinity;
    for (let r = 0; r < board.n; r++) {
      if (solvedRows.has(r)) continue;
      let count = 0;
      for (const [rr, cc] of candidatesByRow[r]) {
        if (canPlace(rr, cc)) count++;
      }
      if (count < bestCount) {
        bestCount = count;
        bestRow = r;
      }
    }
    return bestRow;
  }
  function search() {
    if (truncated) return;
    nodeCount++;
    if (nodeCount > options.maxNodes || solutions.length >= options.maxSolutions) {
      truncated = true;
      return;
    }
    if (solvedRows.size === board.n) {
      solutions.push(new Set(placed.map(([r, c]) => `${r},${c}`)));
      return;
    }
    const row = pickRow();
    if (row < 0) return;
    solvedRows.add(row);
    for (const [r, c] of candidatesByRow[row]) {
      if (!canPlace(r, c)) continue;
      const colorIdx = board.grid[r][c].colorIndex;
      usedCols.add(c);
      usedColors.add(colorIdx);
      placed.push([r, c]);
      search();
      placed.pop();
      usedColors.delete(colorIdx);
      usedCols.delete(c);
      if (truncated) break;
    }
    solvedRows.delete(row);
  }
  search();
  return { solutions, truncated, activeCells };
}
function countCowSolutions(board, limit = 2) {
  const maxNodes = Math.min(12e4, 8e3 + board.n * board.n * 600);
  const { solutions, truncated } = enumerateCowSolutions(board, {
    maxSolutions: limit,
    maxNodes,
    allowFullBoard: true
  });
  if (truncated) return limit + 1;
  return solutions.length;
}

// scripts/debug-unique.ts
function snakeColor(n) {
  const colorOf = Array.from({ length: n }, () => Array(n).fill(-1));
  const path = [];
  for (let r = 0; r < n; r++) {
    if (r % 2 === 0) for (let c = 0; c < n; c++) path.push([r, c]);
    else for (let c = n - 1; c >= 0; c--) path.push([r, c]);
  }
  for (let i = 0; i < path.length; i++) {
    const [r, c] = path[i];
    colorOf[r][c] = Math.floor(i / n);
  }
  return colorOf;
}
function boardFromColors(n, colorOf) {
  return {
    n,
    grid: colorOf.map(
      (row) => row.map((colorIndex) => ({
        colorIndex,
        hasCow: false,
        isRevealed: false,
        isFlagged: false,
        isWrong: false
      }))
    )
  };
}
for (const n of [4, 5, 6, 7, 8]) {
  const board = boardFromColors(n, snakeColor(n));
  console.log(`n=${n} snake solutions`, countCowSolutions(board, 10));
}
