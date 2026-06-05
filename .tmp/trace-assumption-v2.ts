import { buildBoardFromColorGrid, getHint } from '../src/utils/hintRules'
import { COLOR_NAMES } from '../src/utils/cowPlacer'

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

for (let step = 0; step < 40; step++) {
  const hint = getHint(board)
  if (!hint) { console.log(`stuck ${step + 1}`); break }
  const key = `${hint.type}:${hint.cells.map(([r, c]) => `${r},${c}`).sort().join('|')}`
  if (seen.has(key)) { console.log(`loop ${step + 1}`); break }
  seen.add(key)
  console.log(`${step + 1}. ${hint.ruleName} ${hint.type}`)
  if (hint.ruleName === '假设反证') console.log('  ', hint.description.slice(0, 200))
  if (hint.type === 'cow') for (const [r, c] of hint.cells) revealDeducedCow(r, c)
  else for (const [r, c] of hint.cells) flagCell(r, c)
}
