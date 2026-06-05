import { buildBoardFromColorGrid, getHint } from '../src/utils/hintRules'

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
  seen.add(key)
  if (hint.type === 'cow') for (const [r, c] of hint.cells) revealDeducedCow(r, c)
  else for (const [r, c] of hint.cells) flagCell(r, c)
}

const step9 = getHint(board)
console.log('step9', step9?.ruleName ?? 'none', step9?.description?.slice(0,120) ?? '')
