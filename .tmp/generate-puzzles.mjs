// scripts/generate-puzzles.ts
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";

// src/utils/hintRules.ts
var HINT_COLOR_NAMES = Array.from({ length: 15 }, (_, idx) => `\u989C\u8272${idx + 1}`);
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
  return HINT_COLOR_NAMES[idx] || `\u989C\u8272${idx + 1}`;
}
function getHint(board) {
  const rules = [
    ruleSingleColor,
    ruleSameLine,
    ruleThreeCorner,
    ruleFourCorner,
    ruleLinePlusOne,
    ruleOnlyOneActiveInLine,
    ruleLineAllSameColor,
    ruleNColorsNLines,
    ruleNLinesOnlyNColors,
    ruleSolutionSet,
    ruleLimitedGuessCow
  ];
  for (const rule of rules) {
    const hint = rule(board);
    if (hint) return hint;
  }
  return null;
}
function isHintSolvable(board) {
  const testBoard = {
    n: board.n,
    guessHintsUsed: 0,
    grid: board.grid.map(
      (row) => row.map((cell) => ({
        ...cell,
        isRevealed: false,
        isFlagged: false,
        isWrong: false
      }))
    )
  };
  let cowsFound = 0;
  const seenHints = /* @__PURE__ */ new Set();
  const maxSteps = board.n * board.n * 4;
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
  for (let step = 0; step < maxSteps; step++) {
    if (cowsFound >= board.n) return true;
    const hint = getHint(testBoard);
    if (!hint) return false;
    const key = `${hint.type}:${hint.cells.map(([r, c]) => `${r},${c}`).sort().join("|")}`;
    if (seenHints.has(key)) return false;
    seenHints.add(key);
    if (hint.type === "cow") {
      if (hint.usesGuess) {
        testBoard.guessHintsUsed = (testBoard.guessHintsUsed ?? 0) + 1;
      }
      for (const [r, c] of hint.cells) {
        if (!revealCell(r, c)) return false;
      }
    } else {
      for (const [r, c] of hint.cells) {
        if (testBoard.grid[r][c].hasCow) return false;
        flagCell(r, c);
      }
    }
  }
  return cowsFound >= board.n;
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
function ruleSolutionSet(board) {
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
  if (activeCells.length > board.n * 4) return null;
  const solutions = [];
  const usedCols = /* @__PURE__ */ new Set();
  const usedColors = /* @__PURE__ */ new Set();
  const placed = [];
  const solvedRows = /* @__PURE__ */ new Set();
  let nodeCount = 0;
  let truncated = false;
  const maxSolutions = 200;
  const maxNodes = 2e4;
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
    if (nodeCount > maxNodes || solutions.length >= maxSolutions) {
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
  if (truncated || solutions.length === 0) return null;
  for (const [r, c] of activeCells) {
    const key = `${r},${c}`;
    if (solutions.every((solution) => solution.has(key))) {
      return {
        ruleName: "\u552F\u4E00\u89E3\u5B9A\u4F4D",
        description: `\u6240\u6709\u53EF\u884C\u89E3\u90FD\u8981\u6C42\u7B2C${r + 1}\u884C\u7B2C${c + 1}\u5217\u662F\u725B`,
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
      description: "\u8FD9\u4E9B\u683C\u5B50\u4E0D\u51FA\u73B0\u5728\u4EFB\u4F55\u53EF\u884C\u89E3\u4E2D\uFF0C\u53EF\u753B\u53C9",
      cells: flaggable,
      type: "flag"
    };
  }
  return null;
}
function ruleLimitedGuessCow(board) {
  if ((board.guessHintsUsed ?? 0) >= 3) return null;
  for (let colorIdx = 0; colorIdx < board.n; colorIdx++) {
    const active = getActiveCells(board, colorIdx);
    if (active.length < 2 || active.length > 3) continue;
    const cow = active.find(([r, c]) => board.grid[r][c].hasCow);
    if (!cow) continue;
    return {
      ruleName: "\u731C\u6D4B\u63D0\u793A",
      description: `${colorName(colorIdx)}\u53EA\u5269${active.length}\u683C\uFF0C\u53EF\u4ECE\u4E2D\u5C1D\u8BD5\u63ED\u5F00\u4E00\u5934\u725B\uFF08\u672C\u5173\u6700\u591A3\u6B21\uFF09`,
      cells: [cow],
      type: "cow",
      usesGuess: true
    };
  }
  return null;
}

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
  if (n >= 8) {
    const smallRegionCount = Math.min(3, n - 1);
    const targets2 = Array.from({ length: smallRegionCount }, () => 2 + Math.floor(Math.random() * 2));
    let remaining2 = total - targets2.reduce((sum, size) => sum + size, 0);
    const largeRegionCount = n - smallRegionCount;
    for (let i = 0; i < largeRegionCount; i++) {
      if (i === largeRegionCount - 1) {
        targets2.push(remaining2);
      } else {
        const left = largeRegionCount - i;
        const avg = remaining2 / left;
        const minSize = Math.max(4, Math.floor(avg * 0.45));
        const maxSize = Math.min(remaining2 - 4 * (left - 1), Math.ceil(avg * 1.7));
        const hi = Math.max(minSize, maxSize);
        const size = minSize + Math.floor(Math.random() * (hi - minSize + 1));
        targets2.push(size);
        remaining2 -= size;
      }
    }
    return shuffle(targets2);
  }
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
  for (let retry = 0; retry < 80; retry++) {
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
    const game = {
      n,
      mode,
      grid: grid2,
      cowsFound: 0,
      totalCows: n,
      isWon: false,
      guessHintsUsed: 0
    };
    if (isHintSolvable(game)) return game;
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
    const game = { n, mode, grid: grid2, cowsFound: 0, totalCows: n, isWon: false, guessHintsUsed: 0 };
    if (isHintSolvable(game)) return game;
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
  return { n, mode, grid, cowsFound: 0, totalCows: n, isWon: false, guessHintsUsed: 0 };
}

// scripts/generate-puzzles.ts
var outputDir = "public/puzzles";
var modes = ["easy"];
var sizes = (process.env.PUZZLE_SIZES ?? "4,5,6,7,8,9,10,11,12,13,14,15").split(",").map((value) => Number(value.trim())).filter((value) => Number.isInteger(value) && value >= 4 && value <= 15);
var countPerSize = Number(process.env.PUZZLE_COUNT ?? 5);
var maxAttemptsPerPuzzle = Number(process.env.PUZZLE_ATTEMPTS ?? 30);
function toPuzzle(game, id) {
  const colorGrid = [];
  const cows = [];
  for (let r = 0; r < game.n; r++) {
    const row = [];
    for (let c = 0; c < game.n; c++) {
      row.push(game.grid[r][c].colorIndex);
      if (game.grid[r][c].hasCow) cows.push([r, c]);
    }
    colorGrid.push(row);
  }
  return {
    id,
    n: game.n,
    mode: game.mode,
    colorGrid,
    cows
  };
}
async function loadExistingManifest() {
  try {
    const raw = await readFile(`${outputDir}/manifest.json`, "utf8");
    const manifest = JSON.parse(raw);
    return {
      easy: manifest.easy ?? {},
      hard: manifest.hard ?? {}
    };
  } catch {
    return { easy: {}, hard: {} };
  }
}
async function writeManifest(manifest) {
  await writeFile(`${outputDir}/manifest.json`, `${JSON.stringify(manifest, null, 2)}
`, "utf8");
}
function puzzleFileName(mode, n, index) {
  return `${mode}-${n}-${String(index).padStart(3, "0")}.json`;
}
function puzzleId(mode, n, index) {
  return `${mode}-${n}-${String(index).padStart(3, "0")}`;
}
function extractPuzzleIndex(fileName, mode, n) {
  const match = fileName.match(new RegExp(`^${mode}-${n}-(\\d{3,})\\.json$`));
  if (!match) return null;
  return Number(match[1]);
}
async function fileExists(fileName) {
  try {
    await access(`${outputDir}/${fileName}`);
    return true;
  } catch {
    return false;
  }
}
async function findNextPuzzleIndex(manifest, mode, n) {
  const usedIndexes = /* @__PURE__ */ new Set();
  for (const fileName of manifest[mode][String(n)] ?? []) {
    const index2 = extractPuzzleIndex(fileName, mode, n);
    if (index2 !== null) usedIndexes.add(index2);
  }
  try {
    const files = await readdir(outputDir);
    for (const fileName of files) {
      const index2 = extractPuzzleIndex(fileName, mode, n);
      if (index2 !== null) usedIndexes.add(index2);
    }
  } catch {
  }
  let index = 1;
  while (usedIndexes.has(index) || await fileExists(puzzleFileName(mode, n, index))) {
    index++;
  }
  return index;
}
async function main() {
  await mkdir(outputDir, { recursive: true });
  const manifest = await loadExistingManifest();
  for (const mode of modes) {
    for (const n of sizes) {
      manifest[mode][String(n)] = manifest[mode][String(n)] ?? [];
      for (let count = 0; count < countPerSize; count++) {
        const index = await findNextPuzzleIndex(manifest, mode, n);
        const id = puzzleId(mode, n, index);
        const fileName = puzzleFileName(mode, n, index);
        let puzzle = null;
        for (let attempt = 1; attempt <= maxAttemptsPerPuzzle; attempt++) {
          const game = createGameState(n, mode);
          if (isHintSolvable(game)) {
            puzzle = toPuzzle(game, id);
            break;
          }
          console.log(`retry ${id} (${attempt}/${maxAttemptsPerPuzzle})`);
        }
        if (!puzzle) {
          throw new Error(`${id} could not pass hint-chain validation after ${maxAttemptsPerPuzzle} attempts`);
        }
        if (await fileExists(fileName)) {
          throw new Error(`${fileName} already exists; refusing to overwrite it`);
        }
        await writeFile(
          `${outputDir}/${fileName}`,
          `${JSON.stringify(puzzle, null, 2)}
`,
          "utf8"
        );
        if (!manifest[mode][String(n)].includes(fileName)) {
          manifest[mode][String(n)].push(fileName);
        }
        await writeManifest(manifest);
        console.log(`wrote ${fileName}`);
      }
    }
  }
  await writeManifest(manifest);
  console.log(`wrote ${outputDir}/manifest.json`);
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
