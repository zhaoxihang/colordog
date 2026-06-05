/**
 * Quick probe: after step 8, what does each min-active assumption yield?
 * Run via copying board state then manually testing outcomes by calling getHint
 * on a board where only one candidate is left... 
 * Instead we import parse and use internal test hook.
 */
import { buildBoardFromColorGrid, getHint, simAssumptionTest } from '../src/utils/hintRules'

// We'll export test helper from hintRules temporarily by patching - use eval of built file
// Simpler: brute test by applying assumption flags manually and checking if 假设反证 returns

const colorGrid = [
  [0,0,0,0,0,1,1,1,1,2,2,3],
  [4,4,5,6,6,1,1,2,1,2,2,3],
  [4,4,5,6,2,1,1,2,2,2,2,3],
  [4,4,2,6,2,2,2,2,2,2,3,3],
  [4,4,2,2,2,2,2,2,2,7,3,3],
  [4,4,8,8,8,8,8,8,8,7,7,3],
  [4,10,8,8,8,8,7,7,7,7,11,3],
  [4,10,10,12,12,12,7,7,7,11,11,3],
  [10,10,10,12,12,12,7,7,7,7,11,3],
  [10,10,10,10,10,12,7,7,11,11,11,3],
  [10,10,10,10,10,12,7,7,11,11,11,11],
  [10,10,10,10,10,10,10,10,11,11,11,11],
]
const n = 12

function makeBoardAfter8() {
  const board = buildBoardFromColorGrid(n, colorGrid)
  const seen = new Set<string>()
  function flagCell(row: number, col: number) {
    const cell = board.grid[row][col]
    if (cell.isRevealed || cell.isFlagged) return
    cell.isFlagged = true
  }
  function revealDeducedCow(row: number, col: number) {
    const cell = board.grid[row][col]
    if (cell.isRevealed) return
    cell.hasCow = true
    cell.isRevealed = true
    cell.isFlagged = false
    for (let c = 0; c < n; c++) if (c !== col) flagCell(row, c)
    for (let r = 0; r < n; r++) if (r !== row) flagCell(r, col)
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue
      const nr = row + dr, nc = col + dc
      if (nr >= 0 && nr < n && nc >= 0 && nc < n) flagCell(nr, nc)
    }
  }
  for (let step = 0; step < 8; step++) {
    const hint = getHint(board)
    if (!hint) break
    const key = `${hint.type}:${hint.cells.map(([r, c]) => `${r},${c}`).sort().join('|')}`
    if (seen.has(key)) break
    seen.add(key)
    if (hint.type === 'cow') for (const [r, c] of hint.cells) revealDeducedCow(r, c)
    else for (const [r, c] of hint.cells) flagCell(r, c)
  }
  return board
}

const board = makeBoardAfter8()
const h = getHint(board)
console.log('getHint after 8:', h?.ruleName ?? 'NONE')
for (const [r, c, label] of [[0,0,'赤红(1,1)'], [0,4,'赤红(1,5)'], [2,5,'橙焰(3,6)']] as const) {
  const res = simAssumptionTest(board, r, c)
  console.log(label, res.outcome, res.outcome === 'contradiction' ? res.detail.reason : '')
}

// If NONE, min-active assumptions all complete or inconclusive.
// Try flagging only (1,1) manually - if assumption valid path exists, we shouldn't flag it.
// Compare: run full infer and count cows

import { inferCowsByHintDeduction } from '../src/utils/hintRules'
const inf = inferCowsByHintDeduction(n, colorGrid)
console.log('import cows', inf.cows.length, 'steps', inf.steps.length, 'stop', inf.stopReason)
