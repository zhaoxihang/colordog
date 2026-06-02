import { readFile } from 'node:fs/promises'
import type { CellState } from '../src/utils/cowPlacer'
import { getHint } from '../src/utils/hintRules'

const file = process.argv[2] ?? 'easy-12-013.json'
const maxSteps = Number(process.argv[3] ?? 200)

interface StoredPuzzle {
  n: number
  colorGrid: number[][]
  cows: [number, number][]
}

async function main() {
  const puzzle = JSON.parse(
    await readFile(`public/puzzles/${file}`, 'utf8'),
  ) as StoredPuzzle

  const testBoard = {
    n: puzzle.n,
    guessHintsUsed: 0,
    grid: puzzle.colorGrid.map((row, r) =>
      row.map((colorIndex, c) => ({
        colorIndex,
        hasCow: puzzle.cows.some(([cr, cc]) => cr === r && cc === c),
        isRevealed: false,
        isFlagged: false,
        isWrong: false,
      })),
    ) as CellState[][],
  }

  let cowsFound = 0
  const seen = new Set<string>()

  function flagCell(row: number, col: number) {
    const cell = testBoard.grid[row][col]
    if (cell.isRevealed || cell.isFlagged) return
    cell.isFlagged = true
  }

  function revealCell(row: number, col: number): boolean {
    const cell = testBoard.grid[row][col]
    if (cell.isRevealed) return true
    if (!cell.hasCow) return false
    cell.isRevealed = true
    cell.isFlagged = false
    cowsFound++
    for (let c = 0; c < testBoard.n; c++) {
      if (c !== col) flagCell(row, c)
    }
    for (let r = 0; r < testBoard.n; r++) {
      if (r !== row) flagCell(r, col)
    }
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue
        const nr = row + dr
        const nc = col + dc
        if (nr >= 0 && nr < testBoard.n && nc >= 0 && nc < testBoard.n) {
          flagCell(nr, nc)
        }
      }
    }
    return true
  }

  for (let step = 1; step <= maxSteps; step++) {
    if (cowsFound >= puzzle.n) {
      console.log(`solved in ${step - 1} steps`)
      return
    }

    const hint = getHint(testBoard)
    if (!hint) {
      console.log(`stuck at step ${step}, cowsFound=${cowsFound}/${puzzle.n}`)
      return
    }

    const key = `${hint.type}:${hint.cells.map(([r, c]) => `${r},${c}`).sort().join('|')}`
    if (seen.has(key)) {
      console.log(`loop at step ${step}: ${hint.ruleName}`)
      return
    }
    seen.add(key)

    console.log(
      `${step}. [${hint.type}] ${hint.ruleName} -> ${hint.cells.map(([r, c]) => `(${r},${c})`).join(' ')}`,
    )

    if (hint.type === 'cow') {
      for (const [r, c] of hint.cells) {
        if (!revealCell(r, c)) {
          console.log(`  invalid cow at (${r},${c})`)
          return
        }
      }
    } else {
      for (const [r, c] of hint.cells) {
        if (testBoard.grid[r][c].hasCow) {
          console.log(`  flags cow at (${r},${c})`)
          return
        }
        flagCell(r, c)
      }
    }
  }
}

main()
