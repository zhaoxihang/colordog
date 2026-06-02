// scripts/trace-hint-chain.ts
import { readFile } from "node:fs/promises";

// src/utils/cowPlacer.ts
var COLOR_NAMES = [
  "\u8D64\u7EA2",
  "\u6A59\u7130",
  "\u91D1\u9EC4",
  "\u9752\u67E0",
  "\u7FE0\u7EFF",
  "\u78A7\u84DD",
  "\u5929\u9752",
  "\u5B9D\u84DD",
  "\u975B\u84DD",
  "\u7D2B\u7F57\u5170",
  "\u5170\u7D2B",
  "\u54C1\u7EA2",
  "\u73AB\u7EA2",
  "\u73CA\u745A",
  "\u77F3\u7070"
];

// src/utils/hintRules.ts
function getActiveCells(board, colorIdx) {
  const cells = [];
  for (let r = 0; r < board.n; r++) {
    for (let c = 0; c < board.n; c++) {
      const cell = board.grid[r][c];
      if (cell.colorIndex === colorIdx && !cell.isRevealed && !cell.isFlagged) {
        cells.push([r, c]);
      }
    }
  }
  return cells;
}
function getActiveCellsInLine(board, lineIdx, direction) {
  const cells = [];
  for (let i = 0; i < board.n; i++) {
    const cell = direction === "row" ? board.grid[lineIdx][i] : board.grid[i][lineIdx];
    if (!cell.isRevealed && !cell.isFlagged) {
      cells.push(direction === "row" ? [lineIdx, i] : [i, lineIdx]);
    }
  }
  return cells;
}
function isConsecutive(cells, direction) {
  const sorted = direction === "row" ? [...cells].sort((a, b) => a[1] - b[1]) : [...cells].sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < sorted.length; i++) {
    const diff = direction === "row" ? sorted[i][1] - sorted[i - 1][1] : sorted[i][0] - sorted[i - 1][0];
    if (diff !== 1) return false;
  }
  return true;
}
function filterFlaggable(board, cells) {
  return cells.filter(([r, c]) => {
    const cell = board.grid[r][c];
    return !cell.isRevealed && !cell.isFlagged;
  });
}
function filterFlaggableOtherColor(board, cells, colorIdx) {
  return cells.filter(([r, c]) => {
    const cell = board.grid[r][c];
    return !cell.isRevealed && !cell.isFlagged && cell.colorIndex !== colorIdx;
  });
}
function dedup(cells) {
  return [...new Map(cells.map((c) => [`${c[0]},${c[1]}`, c])).values()];
}
function combinations(arr, size) {
  if (size === 0) return [[]];
  if (arr.length < size) return [];
  const result = [];
  for (let i = 0; i <= arr.length - size; i++) {
    const rest = combinations(arr.slice(i + 1), size - 1);
    for (const combo of rest) {
      result.push([arr[i], ...combo]);
    }
  }
  return result;
}
function collectLineOnly(board, active, direction) {
  const activeSet = new Set(active.map(([r, c]) => `${r},${c}`));
  const result = [];
  if (direction === "row") {
    const row = active[0][0];
    for (let cc = 0; cc < board.n; cc++) {
      if (!activeSet.has(`${row},${cc}`)) result.push([row, cc]);
    }
  } else {
    const col = active[0][1];
    for (let rr = 0; rr < board.n; rr++) {
      if (!activeSet.has(`${rr},${col}`)) result.push([rr, col]);
    }
  }
  return filterFlaggable(board, result);
}
function collectLinePlusAllAdj(board, active, direction) {
  const result = collectLineOnly(board, active, direction);
  const activeSet = new Set(active.map(([r, c]) => `${r},${c}`));
  const adjCells = [];
  for (const [ar, ac] of active) {
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = ar + dr, nc = ac + dc;
      if (nr >= 0 && nr < board.n && nc >= 0 && nc < board.n && !activeSet.has(`${nr},${nc}`)) {
        adjCells.push([nr, nc]);
      }
    }
  }
  return dedup(filterFlaggable(board, [...result, ...adjCells]));
}
function collectLinePlusMidAdj(board, active, direction) {
  const result = collectLineOnly(board, active, direction);
  const activeSet = new Set(active.map(([r, c]) => `${r},${c}`));
  const sorted = direction === "row" ? [...active].sort((a, b) => a[1] - b[1]) : [...active].sort((a, b) => a[0] - b[0]);
  const mid = sorted[1];
  const adjCells = [];
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const nr = mid[0] + dr, nc = mid[1] + dc;
    if (nr >= 0 && nr < board.n && nc >= 0 && nc < board.n && !activeSet.has(`${nr},${nc}`)) {
      adjCells.push([nr, nc]);
    }
  }
  return dedup(filterFlaggable(board, [...result, ...adjCells]));
}
function findSharedAdjacent(board, a, b) {
  const adjA = /* @__PURE__ */ new Set();
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const nr = a[0] + dr, nc = a[1] + dc;
    if (nr >= 0 && nr < board.n && nc >= 0 && nc < board.n) adjA.add(`${nr},${nc}`);
  }
  const result = [];
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const nr = b[0] + dr, nc = b[1] + dc;
    if (nr >= 0 && nr < board.n && nc >= 0 && nc < board.n && adjA.has(`${nr},${nc}`)) {
      result.push([nr, nc]);
    }
  }
  return result;
}
function colorName(idx) {
  return COLOR_NAMES[idx] || `\u989C\u8272${idx + 1}`;
}
var DIRS_4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];
function getActiveNeighborsInSet(activeSet, r, c) {
  const result = [];
  for (const [dr, dc] of DIRS_4) {
    const nr = r + dr;
    const nc = c + dc;
    if (activeSet.has(`${nr},${nc}`)) result.push([nr, nc]);
  }
  return result;
}
function findTShapeMiddle(active) {
  if (active.length !== 4) return null;
  const activeSet = new Set(active.map(([r, c]) => `${r},${c}`));
  for (const [r, c] of active) {
    const neighbors = getActiveNeighborsInSet(activeSet, r, c);
    if (neighbors.length !== 3) continue;
    const leftKey = `${r},${c - 1}`;
    const rightKey = `${r},${c + 1}`;
    if (activeSet.has(leftKey) && activeSet.has(rightKey)) {
      const stem = neighbors.find(([nr]) => nr !== r);
      if (!stem) continue;
      const expected = /* @__PURE__ */ new Set([leftKey, `${r},${c}`, rightKey, `${stem[0]},${stem[1]}`]);
      if (expected.size === 4 && active.every(([ar, ac]) => expected.has(`${ar},${ac}`))) {
        return [r, c];
      }
    }
    const topKey = `${r - 1},${c}`;
    const bottomKey = `${r + 1},${c}`;
    if (activeSet.has(topKey) && activeSet.has(bottomKey)) {
      const stem = neighbors.find(([, nc]) => nc !== c);
      if (!stem) continue;
      const expected = /* @__PURE__ */ new Set([topKey, `${r},${c}`, bottomKey, `${stem[0]},${stem[1]}`]);
      if (expected.size === 4 && active.every(([ar, ac]) => expected.has(`${ar},${ac}`))) {
        return [r, c];
      }
    }
  }
  return null;
}
function collectMidOrthogonalOtherColor(board, activeSet, mid, colorIdx) {
  const [r, c] = mid;
  const result = [];
  for (const [dr, dc] of DIRS_4) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr < 0 || nr >= board.n || nc < 0 || nc >= board.n) continue;
    if (activeSet.has(`${nr},${nc}`)) continue;
    result.push([nr, nc]);
  }
  return filterFlaggableOtherColor(board, result, colorIdx);
}
function ruleTShape(board) {
  for (let colorIdx = 0; colorIdx < board.n; colorIdx++) {
    const active = getActiveCells(board, colorIdx);
    const mid = findTShapeMiddle(active);
    if (!mid) continue;
    const activeSet = new Set(active.map(([r, c]) => `${r},${c}`));
    const flaggable = collectMidOrthogonalOtherColor(board, activeSet, mid, colorIdx);
    if (flaggable.length > 0) {
      return {
        ruleName: "T\u5B57\u5F62",
        description: `${colorName(colorIdx)}\u8FDE\u6210T\u5F62\uFF08\u4E00\u6A2A\u4E09\u683C\uFF09\uFF0C\u6A2A\u81C2\u4E2D\u95F4\u683C\u76F8\u90BB\u7684\u5F02\u8272\u683C\u53EF\u753B\u53C9`,
        cells: flaggable,
        type: "flag"
      };
    }
  }
  return null;
}
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
function cloneBoardView(board) {
  return {
    n: board.n,
    guessHintsUsed: board.guessHintsUsed ?? 0,
    grid: board.grid.map((row) => row.map((cell) => ({ ...cell })))
  };
}
function simFlagCell(board, row, col) {
  const cell = board.grid[row][col];
  if (cell.isRevealed || cell.isFlagged) return;
  cell.isFlagged = true;
}
function applyAssumedCow(board, row, col) {
  const cell = board.grid[row][col];
  cell.isRevealed = true;
  cell.isFlagged = false;
  for (let c = 0; c < board.n; c++) {
    if (c !== col) simFlagCell(board, row, c);
  }
  for (let r = 0; r < board.n; r++) {
    if (r !== row) simFlagCell(board, r, col);
  }
  for (const [dr, dc] of DIRS_8) {
    if (dr === 0 && dc === 0) continue;
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < board.n && nc >= 0 && nc < board.n) {
      simFlagCell(board, nr, nc);
    }
  }
}
var DEDUCTIVE_RULES = [
  ruleSingleColor,
  ruleSameLine,
  ruleThreeCorner,
  ruleFourCorner,
  ruleTShape,
  ruleLinePlusOne,
  ruleOnlyOneActiveInLine,
  ruleLineAllSameColor,
  ruleNColorsNLines,
  ruleNLinesOnlyNColors,
  ruleSolutionSet
];
function getDeductiveHint(board) {
  for (const rule of DEDUCTIVE_RULES) {
    const hint = rule(board);
    if (hint) return hint;
  }
  return null;
}
function findMinActiveColorGroups(board) {
  let minCount = Infinity;
  const groups = [];
  for (let colorIdx = 0; colorIdx < board.n; colorIdx++) {
    const active = getActiveCells(board, colorIdx);
    if (active.length === 0) continue;
    if (active.length < minCount) {
      minCount = active.length;
      groups.length = 0;
      groups.push({ colorIdx, active });
    } else if (active.length === minCount) {
      groups.push({ colorIdx, active });
    }
  }
  if (!Number.isFinite(minCount) || minCount < 2) return [];
  return groups;
}
function ruleHypothesisContradiction(board) {
  const groups = findMinActiveColorGroups(board);
  if (groups.length === 0) return null;
  const toFlag = [];
  for (const { active } of groups) {
    for (const [hr, hc] of active) {
      const sim = cloneBoardView(board);
      applyAssumedCow(sim, hr, hc);
      const hint = getDeductiveHint(sim);
      if (!hint || hint.type !== "cow") continue;
      const badDeduction = hint.cells.some(([r, c]) => !board.grid[r][c].hasCow);
      if (badDeduction) {
        toFlag.push([hr, hc]);
      }
    }
  }
  const flaggable = filterFlaggable(board, dedup(toFlag));
  if (flaggable.length === 0) return null;
  const colorLabel = groups.length === 1 ? colorName(groups[0].colorIdx) : "\u6D3B\u8DC3\u683C\u6700\u5C11\u7684\u989C\u8272";
  return {
    ruleName: "\u5047\u8BBE\u53CD\u8BC1",
    description: `\u5047\u5B9A${colorLabel}\u67D0\u683C\u4E3A\u725B\u5E76\u6807\u8BB0\u5176\u884C\u5217\u4E0E\u5468\u56F4\u540E\uFF0C\u63A8\u7406\u5F97\u5230\u7684\u725B\u4F4D\u7F6E\u4E0D\u6210\u7ACB\uFF0C\u6545\u8BE5\u5047\u8BBE\u683C\u53EF\u753B\u53C9`,
    cells: flaggable,
    type: "flag"
  };
}
function getHint(board) {
  const deductive = getDeductiveHint(board);
  if (deductive) return deductive;
  const contradiction = ruleHypothesisContradiction(board);
  if (contradiction) return contradiction;
  return null;
}
function ruleSingleColor(board) {
  for (let colorIdx = 0; colorIdx < board.n; colorIdx++) {
    const active = getActiveCells(board, colorIdx);
    if (active.length !== 1) continue;
    const [r, c] = active[0];
    return {
      ruleName: "\u552F\u4E00\u989C\u8272",
      description: `${colorName(colorIdx)}\u53EA\u52691\u683C\uFF0C\u8FD9\u683C\u5FC5\u5B9A\u662F\u725B`,
      cells: [[r, c]],
      type: "cow"
    };
  }
  return null;
}
function ruleSameLine(board) {
  for (let colorIdx = 0; colorIdx < board.n; colorIdx++) {
    const active = getActiveCells(board, colorIdx);
    if (active.length < 2) continue;
    const name = colorName(colorIdx);
    const sameRow = active.every(([r]) => r === active[0][0]);
    if (sameRow) {
      const hint = checkSameLineDir(board, active, name, colorIdx, "row");
      if (hint) return hint;
    }
    const sameCol = active.every(([, c]) => c === active[0][1]);
    if (sameCol) {
      const hint = checkSameLineDir(board, active, name, colorIdx, "col");
      if (hint) return hint;
    }
  }
  return null;
}
function checkSameLineDir(board, active, name, colorIdx, direction) {
  const consecutive = isConsecutive(active, direction);
  const label = direction === "row" ? "\u884C" : "\u5217";
  let flaggable;
  let desc;
  let ruleName;
  if (active.length === 2 && consecutive) {
    flaggable = collectLinePlusAllAdj(board, active, direction);
    desc = `${name}\u53EA\u67092\u683C\u76F8\u8FDE\u540C${label}\uFF0C\u8BE5${label}\u5176\u4F59\u548C\u4E24\u683C\u76F8\u90BB\u53EF\u753B\u53C9`;
    ruleName = `\u53EA\u67092\u683C\u76F8\u8FDE\u540C${label}`;
  } else if (active.length === 3 && consecutive) {
    flaggable = collectLinePlusMidAdj(board, active, direction);
    desc = `${name}\u53EA\u67093\u683C\u76F8\u8FDE\u540C${label}\uFF0C\u8BE5${label}\u5176\u4F59\u548C\u4E2D\u95F4\u76F8\u90BB\u53EF\u753B\u53C9`;
    ruleName = `\u53EA\u67093\u683C\u76F8\u8FDE\u540C${label}`;
  } else if (consecutive) {
    flaggable = collectLineOnly(board, active, direction);
    desc = `${name}\u6709${active.length}\u683C\u76F8\u8FDE\u540C${label}\uFF0C\u8BE5${label}\u5176\u4F59\u53EF\u753B\u53C9`;
    ruleName = `${active.length}\u683C\u76F8\u8FDE\u540C${label}`;
  } else {
    flaggable = collectLineOnly(board, active, direction);
    desc = `${name}\u6709${active.length}\u683C\u5728\u540C\u4E00${label}\uFF0C\u8BE5${label}\u5176\u4F59\u53EF\u753B\u53C9`;
    ruleName = `${active.length}\u683C\u540C${label}`;
  }
  if (flaggable.length > 0) {
    return { ruleName, description: desc, cells: flaggable, type: "flag" };
  }
  return null;
}
function ruleThreeCorner(board) {
  for (let colorIdx = 0; colorIdx < board.n; colorIdx++) {
    const active = getActiveCells(board, colorIdx);
    if (active.length !== 3) continue;
    const sameRow = active.every(([r]) => r === active[0][0]);
    const sameCol = active.every(([, c]) => c === active[0][1]);
    if (sameRow || sameCol) continue;
    const colorSet = new Set(active.map(([r, c]) => `${r},${c}`));
    const result = [];
    for (let r = 0; r < board.n; r++) {
      for (let c = 0; c < board.n; c++) {
        if (colorSet.has(`${r},${c}`)) continue;
        if (board.grid[r][c].colorIndex === colorIdx) continue;
        const adjCells = [];
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const nr = r + dr, nc = c + dc;
          if (colorSet.has(`${nr},${nc}`)) adjCells.push([nr, nc]);
        }
        if (adjCells.length >= 2) {
          const rows = new Set(adjCells.map(([ar]) => ar));
          const cols = new Set(adjCells.map(([, ac]) => ac));
          if (rows.size >= 2 && cols.size >= 2) result.push([r, c]);
        }
      }
    }
    const flaggable = filterFlaggableOtherColor(board, result, colorIdx);
    if (flaggable.length > 0) {
      return {
        ruleName: "\u4E09\u683C\u5939\u89D2",
        description: `${colorName(colorIdx)}\u53EA\u67093\u683C\u4E14\u4E0D\u5728\u540C\u884C\u5217\uFF0C\u5939\u89D2\u5904\u7684\u5176\u4ED6\u989C\u8272\u53EF\u753B\u53C9`,
        cells: flaggable,
        type: "flag"
      };
    }
  }
  return null;
}
function ruleFourCorner(board) {
  for (let colorIdx = 0; colorIdx < board.n; colorIdx++) {
    const active = getActiveCells(board, colorIdx);
    if (active.length !== 4) continue;
    const sameRow = active.every(([r]) => r === active[0][0]);
    const sameCol = active.every(([, c]) => c === active[0][1]);
    if (sameRow || sameCol) continue;
    const cornerCells = findFourCornerCells(board, active, colorIdx);
    if (cornerCells.length > 0) {
      const flaggable = filterFlaggableOtherColor(board, cornerCells, colorIdx);
      if (flaggable.length > 0) {
        return {
          ruleName: "\u5939\u89D2",
          description: `${colorName(colorIdx)}\u67094\u683C\uFF0C\u4E24\u4E24\u5728\u4E0D\u540C\u884C/\u5217\u4E14\u4EC5\u4E00\u5BF9\u76F8\u90BB\uFF0C\u5939\u89D2\u5904\u53EF\u753B\u53C9`,
          cells: flaggable,
          type: "flag"
        };
      }
    }
  }
  return null;
}
function findFourCornerCells(board, active, colorIdx) {
  const colorSet = new Set(active.map(([r, c]) => `${r},${c}`));
  const byRow = /* @__PURE__ */ new Map();
  for (const cell of active) {
    if (!byRow.has(cell[0])) byRow.set(cell[0], []);
    byRow.get(cell[0]).push(cell);
  }
  const rowPairs = [...byRow.entries()].filter(([, cells]) => cells.length === 2);
  if (rowPairs.length === 2) {
    const [rowA, cellsA] = rowPairs[0];
    const [rowB, cellsB] = rowPairs[1];
    if (Math.abs(rowA - rowB) === 1) {
      let adjCount = 0;
      for (const [, ca] of cellsA) {
        for (const [, cb] of cellsB) {
          if (ca === cb) adjCount++;
        }
      }
      if (adjCount === 1) {
        return findCornerPoints(board, cellsA, cellsB, colorSet, colorIdx);
      }
    }
  }
  const byCol = /* @__PURE__ */ new Map();
  for (const cell of active) {
    if (!byCol.has(cell[1])) byCol.set(cell[1], []);
    byCol.get(cell[1]).push(cell);
  }
  const colPairs = [...byCol.entries()].filter(([, cells]) => cells.length === 2);
  if (colPairs.length === 2) {
    const [colA, cellsA] = colPairs[0];
    const [colB, cellsB] = colPairs[1];
    if (Math.abs(colA - colB) === 1) {
      let adjCount = 0;
      for (const [ra] of cellsA) {
        for (const [rb] of cellsB) {
          if (ra === rb) adjCount++;
        }
      }
      if (adjCount === 1) {
        return findCornerPoints(board, cellsA, cellsB, colorSet, colorIdx);
      }
    }
  }
  return [];
}
function findCornerPoints(board, groupA, groupB, colorSet, colorIdx) {
  const result = [];
  for (const [ar, ac] of groupA) {
    for (const [br, bc] of groupB) {
      if (ar !== br && ac !== bc) {
        const candidates = [[ar, bc], [br, ac]];
        for (const [r, c] of candidates) {
          if (r >= 0 && r < board.n && c >= 0 && c < board.n && !colorSet.has(`${r},${c}`) && board.grid[r][c].colorIndex !== colorIdx) {
            let adjA = false, adjB = false;
            for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
              if (colorSet.has(`${r + dr},${c + dc}`)) {
                if (r + dr === ar && c + dc === ac) adjA = true;
                if (r + dr === br && c + dc === bc) adjB = true;
              }
            }
            if (adjA && adjB) result.push([r, c]);
          }
        }
      }
    }
  }
  return result;
}
function ruleLinePlusOne(board) {
  for (let colorIdx = 0; colorIdx < board.n; colorIdx++) {
    const active = getActiveCells(board, colorIdx);
    if (active.length < 4) continue;
    const name = colorName(colorIdx);
    for (let i = 0; i < active.length; i++) {
      const lone = active[i];
      const rest = active.filter((_, idx) => idx !== i);
      if (rest.length < 3) continue;
      const sameRow = rest.every(([, c]) => c === rest[0][1]);
      const sameCol = rest.every(([r]) => r === rest[0][0]);
      if ((sameRow || sameCol) && isConsecutive(rest, sameRow ? "row" : "col")) {
        const isAdj = rest.some(([r, c]) => Math.abs(r - lone[0]) <= 1 && Math.abs(c - lone[1]) <= 1);
        const notInLine = sameRow ? lone[1] !== rest[0][1] : lone[0] !== rest[0][0];
        if (isAdj && notInLine) {
          const sorted = sameRow ? [...rest].sort((a, b) => a[1] - b[1]) : [...rest].sort((a, b) => a[0] - b[0]);
          const mid = sorted[Math.floor(sorted.length / 2)];
          const shared = findSharedAdjacent(board, mid, lone);
          if (shared.length > 0) {
            const flaggable = filterFlaggableOtherColor(board, shared, colorIdx);
            if (flaggable.length > 0) {
              return {
                ruleName: "\u591A\u683C\u52A0\u4E00",
                description: `${name}\u6709${active.length}\u683C\uFF0C${rest.length}\u683C\u76F8\u8FDE\u6210\u7EBF+1\u683C\u5728\u65C1\uFF0C\u5171\u540C\u76F8\u90BB\u7684\u5176\u4ED6\u989C\u8272\u53EF\u753B\u53C9`,
                cells: flaggable,
                type: "flag"
              };
            }
          }
        }
      }
    }
  }
  return null;
}
function ruleOnlyOneActiveInLine(board) {
  for (let lineIdx = 0; lineIdx < board.n; lineIdx++) {
    const rowActive = getActiveCellsInLine(board, lineIdx, "row");
    if (rowActive.length === 1) {
      return {
        ruleName: "\u552F\u4E00\u6D3B\u8DC3\u884C",
        description: `\u7B2C${lineIdx + 1}\u884C\u53EA\u52691\u683C\uFF0C\u5FC5\u5B9A\u662F\u725B`,
        cells: [rowActive[0]],
        type: "cow"
      };
    }
    const colActive = getActiveCellsInLine(board, lineIdx, "col");
    if (colActive.length === 1) {
      return {
        ruleName: "\u552F\u4E00\u6D3B\u8DC3\u5217",
        description: `\u7B2C${lineIdx + 1}\u5217\u53EA\u52691\u683C\uFF0C\u5FC5\u5B9A\u662F\u725B`,
        cells: [colActive[0]],
        type: "cow"
      };
    }
  }
  return null;
}
function ruleLineAllSameColor(board) {
  for (let lineIdx = 0; lineIdx < board.n; lineIdx++) {
    const rowHint = checkLineAllSameColor(board, lineIdx, "row");
    if (rowHint) return rowHint;
    const colHint = checkLineAllSameColor(board, lineIdx, "col");
    if (colHint) return colHint;
  }
  return null;
}
function checkLineAllSameColor(board, lineIdx, direction) {
  let lineColor = -1;
  let allSame = true;
  for (let i = 0; i < board.n; i++) {
    const cell = direction === "row" ? board.grid[lineIdx][i] : board.grid[i][lineIdx];
    if (cell.isRevealed || cell.isFlagged) {
      allSame = false;
      break;
    }
    if (lineColor === -1) lineColor = cell.colorIndex;
    else if (cell.colorIndex !== lineColor) {
      allSame = false;
      break;
    }
  }
  if (allSame && lineColor >= 0) {
    const name = colorName(lineColor);
    const label = direction === "row" ? "\u884C" : "\u5217";
    const flaggable = [];
    for (let j = 0; j < board.n; j++) {
      if (j === lineIdx) continue;
      for (let i = 0; i < board.n; i++) {
        const cell = direction === "row" ? board.grid[j][i] : board.grid[i][j];
        if (cell.colorIndex === lineColor && !cell.isRevealed && !cell.isFlagged) {
          flaggable.push(direction === "row" ? [j, i] : [i, j]);
        }
      }
    }
    if (flaggable.length > 0) {
      return {
        ruleName: `\u6574${label}\u540C\u8272`,
        description: `\u7B2C${lineIdx + 1}${label}\u5168\u662F${name}\uFF0C\u8BE5\u8272\u4E0D\u5728\u8BE5${label}\u7684\u53EF\u753B\u53C9`,
        cells: flaggable,
        type: "flag"
      };
    }
  }
  return null;
}
function ruleNColorsNLines(board) {
  const rowHint = checkNColorsNLines(board, "row");
  if (rowHint) return rowHint;
  return checkNColorsNLines(board, "col");
}
function checkNColorsNLines(board, direction) {
  const colorLines = /* @__PURE__ */ new Map();
  for (let colorIdx = 0; colorIdx < board.n; colorIdx++) {
    const active = getActiveCells(board, colorIdx);
    if (active.length === 0) continue;
    const lines = new Set(active.map(direction === "row" ? ([r]) => r : ([, c]) => c));
    colorLines.set(colorIdx, lines);
  }
  const label = direction === "row" ? "\u884C" : "\u5217";
  const colors = [...colorLines.keys()];
  for (let size = 2; size <= Math.min(colors.length, board.n); size++) {
    const combos = combinations(colors, size);
    for (const combo of combos) {
      const allLines = /* @__PURE__ */ new Set();
      for (const c of combo) {
        for (const l of colorLines.get(c)) allLines.add(l);
      }
      if (allLines.size === size) {
        const comboSet = new Set(combo);
        const flaggable = [];
        for (const line of allLines) {
          for (let i = 0; i < board.n; i++) {
            const cell = direction === "row" ? board.grid[line][i] : board.grid[i][line];
            if (!comboSet.has(cell.colorIndex) && !cell.isRevealed && !cell.isFlagged) {
              flaggable.push(direction === "row" ? [line, i] : [i, line]);
            }
          }
        }
        if (flaggable.length > 0) {
          const names = combo.map((c) => colorName(c)).join("\u3001");
          return {
            ruleName: `${size}\u8272${size}${label}`,
            description: `${names}\u7684\u6D3B\u8DC3\u683C\u5168\u5728${size}${label}\u5185\uFF0C\u8FD9\u4E9B${label}\u4E2D\u5176\u4F59\u989C\u8272\u53EF\u753B\u53C9`,
            cells: flaggable,
            type: "flag"
          };
        }
      }
    }
  }
  return null;
}
function ruleNLinesOnlyNColors(board) {
  const rowHint = checkNLinesOnlyNColors(board, "row");
  if (rowHint) return rowHint;
  return checkNLinesOnlyNColors(board, "col");
}
function checkNLinesOnlyNColors(board, direction) {
  const lineColors = /* @__PURE__ */ new Map();
  for (let l = 0; l < board.n; l++) {
    const colors = /* @__PURE__ */ new Set();
    for (let i = 0; i < board.n; i++) {
      const cell = direction === "row" ? board.grid[l][i] : board.grid[i][l];
      if (!cell.isRevealed && !cell.isFlagged) colors.add(cell.colorIndex);
    }
    if (colors.size > 0) lineColors.set(l, colors);
  }
  const label = direction === "row" ? "\u884C" : "\u5217";
  const lines = [...lineColors.keys()];
  for (let size = 2; size <= Math.min(lines.length, board.n); size++) {
    const combos = combinations(lines, size);
    for (const combo of combos) {
      const allColors = /* @__PURE__ */ new Set();
      for (const l of combo) {
        for (const c of lineColors.get(l)) allColors.add(c);
      }
      if (allColors.size === size) {
        const flaggable = [];
        for (const colorIdx of allColors) {
          for (let l = 0; l < board.n; l++) {
            if (combo.includes(l)) continue;
            for (let i = 0; i < board.n; i++) {
              const cell = direction === "row" ? board.grid[l][i] : board.grid[i][l];
              if (cell.colorIndex === colorIdx && !cell.isRevealed && !cell.isFlagged) {
                flaggable.push(direction === "row" ? [l, i] : [i, l]);
              }
            }
          }
        }
        if (flaggable.length > 0) {
          const colorNames = [...allColors].map((c) => colorName(c)).join("\u3001");
          const lineLabels = combo.map((l) => `${l + 1}`).join("\u3001");
          return {
            ruleName: `${size}${label}\u4EC5${size}\u8272`,
            description: `\u7B2C${lineLabels}${label}\u53EA\u6D3B\u8DC3\u4E86${colorNames}\uFF0C\u8FD9\u4E9B\u989C\u8272\u5728${label}\u5916\u53EF\u753B\u53C9`,
            cells: flaggable,
            type: "flag"
          };
        }
      }
    }
  }
  return null;
}
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
function ruleSolutionSet(board) {
  const { solutions, truncated, activeCells } = enumerateCowSolutions(board, {
    maxSolutions: 200,
    maxNodes: 2e4,
    allowFullBoard: false
  });
  if (truncated || solutions.length === 0) return null;
  for (const [r, c] of activeCells) {
    const key = `${r},${c}`;
    if (solutions.every((solution) => solution.has(key))) {
      return {
        ruleName: "\u552F\u4E00\u89E3\u5B9A\u4F4D",
        description: `\u6240\u6709\u53EF\u89E3\u884C\u90FD\u8981\u6C42\u7B2C${r + 1}\u884C\u7B2C${c + 1}\u5217\u662F\u725B`,
        cells: [[r, c]],
        type: "cow"
      };
    }
  }
  const flaggable = activeCells.filter(([r, c]) => {
    const key = `${r},${c}`;
    return solutions.every((solution) => !solution.has(key));
  });
  if (flaggable.length > 0) {
    return {
      ruleName: "\u552F\u4E00\u89E3\u6392\u9664",
      description: "\u8FD9\u4E9B\u683C\u5B50\u4E0D\u51FA\u73B0\u5728\u4EFB\u4F55\u53EF\u89E3\u884C\u4E2D\uFF0C\u53EF\u753B\u53C9",
      cells: flaggable,
      type: "flag"
    };
  }
  return null;
}

// scripts/trace-hint-chain.ts
var file = process.argv[2] ?? "easy-12-013.json";
var maxSteps = Number(process.argv[3] ?? 200);
async function main() {
  const puzzle = JSON.parse(
    await readFile(`public/puzzles/${file}`, "utf8")
  );
  const testBoard = {
    n: puzzle.n,
    guessHintsUsed: 0,
    grid: puzzle.colorGrid.map(
      (row, r) => row.map((colorIndex, c) => ({
        colorIndex,
        hasCow: puzzle.cows.some(([cr, cc]) => cr === r && cc === c),
        isRevealed: false,
        isFlagged: false,
        isWrong: false
      }))
    )
  };
  let cowsFound = 0;
  const seen = /* @__PURE__ */ new Set();
  function flagCell(row, col) {
    const cell = testBoard.grid[row][col];
    if (cell.isRevealed || cell.isFlagged) return;
    cell.isFlagged = true;
  }
  function revealCell(row, col) {
    const cell = testBoard.grid[row][col];
    if (cell.isRevealed) return true;
    if (!cell.hasCow) return false;
    cell.isRevealed = true;
    cell.isFlagged = false;
    cowsFound++;
    for (let c = 0; c < testBoard.n; c++) {
      if (c !== col) flagCell(row, c);
    }
    for (let r = 0; r < testBoard.n; r++) {
      if (r !== row) flagCell(r, col);
    }
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < testBoard.n && nc >= 0 && nc < testBoard.n) {
          flagCell(nr, nc);
        }
      }
    }
    return true;
  }
  for (let step = 1; step <= maxSteps; step++) {
    if (cowsFound >= puzzle.n) {
      console.log(`solved in ${step - 1} steps`);
      return;
    }
    const hint = getHint(testBoard);
    if (!hint) {
      console.log(`stuck at step ${step}, cowsFound=${cowsFound}/${puzzle.n}`);
      return;
    }
    const key = `${hint.type}:${hint.cells.map(([r, c]) => `${r},${c}`).sort().join("|")}`;
    if (seen.has(key)) {
      console.log(`loop at step ${step}: ${hint.ruleName}`);
      return;
    }
    seen.add(key);
    console.log(
      `${step}. [${hint.type}] ${hint.ruleName} -> ${hint.cells.map(([r, c]) => `(${r},${c})`).join(" ")}`
    );
    if (hint.type === "cow") {
      for (const [r, c] of hint.cells) {
        if (!revealCell(r, c)) {
          console.log(`  invalid cow at (${r},${c})`);
          return;
        }
      }
    } else {
      for (const [r, c] of hint.cells) {
        if (testBoard.grid[r][c].hasCow) {
          console.log(`  flags cow at (${r},${c})`);
          return;
        }
        flagCell(r, c);
      }
    }
  }
}
main();
