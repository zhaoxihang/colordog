import {
  buildBoardFromColorGrid,
  getHint,
  inferCowsByHintDeduction,
  type InferenceStepLog,
} from '../src/utils/hintRules'
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

function cellLabel(r: number, c: number) {
  const ci = colorGrid[r][c]
  return `(${r + 1},${c + 1}) ${COLOR_NAMES[ci] ?? ci}`
}

function dumpCows(board: ReturnType<typeof buildBoardFromColorGrid>, label: string) {
  const cows: string[] = []
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (board.grid[r][c].hasCow) cows.push(cellLabel(r, c))
    }
  }
  console.log(`${label}: ${cows.length ? cows.join('; ') : '(none)'}`)
}

function activeOfColor(b: ReturnType<typeof buildBoardFromColorGrid>, colorIdx: number) {
  const cells: string[] = []
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const cell = b.grid[r][c]
      if (cell.colorIndex === colorIdx && !cell.isRevealed && !cell.isFlagged) {
        cells.push(`(${r + 1},${c + 1})`)
      }
    }
  }
  return cells
}

// Replay import deduction up to step 8
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
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const nr = row + dr, nc = col + dc
      if (nr >= 0 && nr < n && nc >= 0 && nc < n) flagCell(nr, nc)
    }
  }
}

const steps: InferenceStepLog[] = []
for (let step = 0; step < 8; step++) {
  const hint = getHint(board)
  if (!hint) break
  const key = `${hint.type}:${hint.cells.map(([r, c]) => `${r},${c}`).sort().join('|')}`
  if (seen.has(key)) break
  seen.add(key)
  steps.push({
    step: steps.length + 1,
    ruleName: hint.ruleName,
    type: hint.type,
    description: hint.description,
    cellsText: hint.cells.map(([r, c]) => `(${r + 1},${c + 1})`).join(' '),
  })
  if (hint.type === 'cow') {
    for (const [r, c] of hint.cells) revealDeducedCow(r, c)
  } else {
    for (const [r, c] of hint.cells) flagCell(r, c)
  }
}

console.log('=== Steps 1-8 ===')
for (const s of steps) {
  console.log(`${s.step}. ${s.type} ${s.ruleName} -> ${s.cellsText}`)
}
console.log('')
dumpCows(board, 'Cows after step 8')

console.log('\n=== Step 9 hint ===')
const step9 = getHint(board)
if (step9) {
  console.log(step9.ruleName, step9.type, step9.cells.map(([r,c]) => `(${r+1},${c+1})`).join(' '))
  console.log(step9.description)
}

console.log('\n=== Before step 9 ===')
console.log('翠绿 active:', activeOfColor(board, 4).join(' '))
console.log('赤红 active:', activeOfColor(board, 0).join(' '))

console.log('\n=== Target cell (6,2) ===')
console.log('color:', COLOR_NAMES[colorGrid[5][1]], 'hasCow:', board.grid[5][1].hasCow)

// Apply step 9 on main board and continue
const board2 = buildBoardFromColorGrid(n, colorGrid)
const seen2 = new Set<string>()
for (let step = 0; step < 8; step++) {
  const hint = getHint(board2)
  if (!hint) break
  const key = `${hint.type}:${hint.cells.map(([r, c]) => `${r},${c}`).sort().join('|')}`
  if (seen2.has(key)) break
  seen2.add(key)
  if (hint.type === 'cow') for (const [r, c] of hint.cells) {
    const cell = board2.grid[r][c]; cell.hasCow = true; cell.isRevealed = true; cell.isFlagged = false
    for (let c2 = 0; c2 < n; c2++) if (c2 !== c) { const x = board2.grid[r][c2]; if (!x.isRevealed) x.isFlagged = true }
    for (let r2 = 0; r2 < n; r2++) if (r2 !== r) { const x = board2.grid[r2][c]; if (!x.isRevealed) x.isFlagged = true }
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue
      const nr = r+dr, nc = c+dc
      if (nr>=0&&nr<n&&nc>=0&&nc<n) { const x = board2.grid[nr][nc]; if (!x.isRevealed) x.isFlagged = true }
    }
  } else for (const [r, c] of hint.cells) { const x = board2.grid[r][c]; if (!x.isRevealed) x.isFlagged = true }
}
console.log('\n=== Main chain after step 9+ ===')
for (let step = 8; step < 25; step++) {
  const hint = getHint(board2)
  if (!hint) { console.log(`stuck ${step+1}`); break }
  const key = `${hint.type}:${hint.cells.map(([r, c]) => `${r},${c}`).sort().join('|')}`
  if (seen2.has(key)) { console.log(`loop ${step+1}`); break }
  seen2.add(key)
  console.log(`${step+1}: ${hint.ruleName} ${hint.type} ${hint.cells.map(([r,c])=>`(${r+1},${c+1})`).join(' ')}`)
  if (hint.type === 'cow') for (const [r, c] of hint.cells) {
    const cell = board2.grid[r][c]; cell.hasCow = true; cell.isRevealed = true; cell.isFlagged = false
    for (let c2 = 0; c2 < n; c2++) if (c2 !== c) { const x = board2.grid[r][c2]; if (!x.isRevealed) x.isFlagged = true }
    for (let r2 = 0; r2 < n; r2++) if (r2 !== r) { const x = board2.grid[r2][c]; if (!x.isRevealed) x.isFlagged = true }
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue
      const nr = r+dr, nc = c+dc
      if (nr>=0&&nr<n&&nc>=0&&nc<n) { const x = board2.grid[nr][nc]; if (!x.isRevealed) x.isFlagged = true }
    }
  } else for (const [r, c] of hint.cells) { const x = board2.grid[r][c]; if (!x.isRevealed) x.isFlagged = true }
}
const cows2: string[] = []
for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (board2.grid[r][c].hasCow) cows2.push(cellLabel(r,c))
console.log('deduced cows:', cows2.join('; '))

// Simulate assumption at (1,1) = 赤红
console.log('\n=== Under assumption 赤红@(1,1) is cow ===')
const sim = buildBoardFromColorGrid(n, colorGrid)
// copy flags/reveals from board after step 8
for (let r = 0; r < n; r++) {
  for (let c = 0; c < n; c++) {
    sim.grid[r][c].isFlagged = board.grid[r][c].isFlagged
    sim.grid[r][c].isRevealed = board.grid[r][c].isRevealed
    sim.grid[r][c].hasCow = board.grid[r][c].hasCow
  }
}
function simRevealCow(row: number, col: number) {
  const cell = sim.grid[row][col]
  if (cell.isRevealed) return
  cell.isRevealed = true
  cell.isFlagged = false
  for (let c = 0; c < n; c++) if (c !== col) { const x = sim.grid[row][c]; if (!x.isRevealed) x.isFlagged = true }
  for (let r = 0; r < n; r++) if (r !== row) { const x = sim.grid[r][col]; if (!x.isRevealed) x.isFlagged = true }
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const nr = row + dr, nc = col + dc
      if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
        const x = sim.grid[nr][nc]
        if (!x.isRevealed) x.isFlagged = true
      }
    }
  }
}
simRevealCow(0, 0)
console.log('After assume 赤红@(1,1): 翠绿 active =', activeOfColor(sim, 4).join(' '))
console.log('赤红 active =', activeOfColor(sim, 0).join(' '))
let simStep = 0
const simSeen = new Set<string>()
while (simStep < 50) {
  const hint = getHint(sim)
  if (!hint) { console.log('sim stuck'); break }
  const key = `${hint.type}:${hint.cells.map(([r, c]) => `${r},${c}`).sort().join('|')}`
  if (simSeen.has(key)) { console.log('sim loop'); break }
  simSeen.add(key)
  simStep++
  console.log(`sim ${simStep}. ${hint.ruleName} ${hint.type} ${hint.cells.map(([r,c])=>`(${r+1},${c+1})`).join(' ')}`)
  if (hint.type === 'cow') {
    for (const [r, c] of hint.cells) {
      const ok = board.grid[r][c].hasCow
      console.log(`  cow at (${r+1},${c+1}) truth.hasCow=${ok} color=${COLOR_NAMES[colorGrid[r][c]]}`)
      if (!ok) { console.log('  -> CONTRADICTION badCow'); process.exit(0) }
      simRevealCow(r, c)
    }
  } else {
    for (const [r, c] of hint.cells) {
      if (board.grid[r][c].hasCow) { console.log(`  flag (${r+1},${c+1}) truth has cow -> badFlag`); process.exit(0) }
      const cell = sim.grid[r][c]
      if (!cell.isRevealed) cell.isFlagged = true
    }
  }
}

// Continue main chain from step 9
for (let step = 8; step < 30; step++) {
  const hint = getHint(board)
  if (!hint) { console.log(`main stuck at ${step + 1}`); break }
  const key = `${hint.type}:${hint.cells.map(([r, c]) => `${r},${c}`).sort().join('|')}`
  if (seen.has(key)) { console.log(`main loop at ${step + 1}`); break }
  seen.add(key)
  console.log(`step ${step + 1}: ${hint.ruleName} ${hint.type} ${hint.cells.map(([r,c])=>`(${r+1},${c+1})`).join(' ')}`)
  if (hint.type === 'cow') {
    for (const [r, c] of hint.cells) revealDeducedCow(r, c)
  } else {
    for (const [r, c] of hint.cells) flagCell(r, c)
  }
}
console.log('')
dumpCows(board, 'All deduced cows')
console.log('翠绿 active now:', activeOfColor(board, 4).join(' '))
