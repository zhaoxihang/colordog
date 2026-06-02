import { readFile } from 'node:fs/promises'
import type { CellState } from '../src/utils/cowPlacer'
import { hasUniqueCowPlacement, isHintSolvable } from '../src/utils/hintRules'

interface StoredPuzzle {
  id: string
  n: number
  mode: string
  colorGrid: number[][]
  cows: [number, number][]
}

interface Manifest {
  easy?: Record<string, string[]>
}

function toBoard(puzzle: StoredPuzzle) {
  const grid: CellState[][] = Array.from({ length: puzzle.n }, (_, r) =>
    Array.from({ length: puzzle.n }, (_, c) => ({
      colorIndex: puzzle.colorGrid[r][c],
      hasCow: puzzle.cows.some(([cr, cc]) => cr === r && cc === c),
      isRevealed: false,
      isFlagged: false,
      isWrong: false,
    })),
  )
  return { n: puzzle.n, grid, guessHintsUsed: 0 }
}

async function main() {
  const manifest = JSON.parse(await readFile('public/puzzles/manifest.json', 'utf8')) as Manifest
  const files = new Set<string>()
  for (const names of Object.values(manifest.easy ?? {})) {
    for (const name of names) files.add(name)
  }

  let ok = 0
  let badUnique = 0
  let badHint = 0
  const failures: string[] = []

  for (const file of [...files].sort()) {
    const puzzle = JSON.parse(
      await readFile(`public/puzzles/${file}`, 'utf8'),
    ) as StoredPuzzle
    const board = toBoard(puzzle)
    const unique = hasUniqueCowPlacement(board)
    const solvable = isHintSolvable(board)

    if (unique && solvable) {
      ok++
      continue
    }

    if (!unique) badUnique++
    if (!solvable) badHint++
    failures.push(`${file}: unique=${unique} hintChain=${solvable}`)
  }

  console.log(`total=${files.size} ok=${ok} nonUnique=${badUnique} noHintChain=${badHint}`)
  if (failures.length > 0) {
    console.log('failures:')
    for (const line of failures) console.log(`  ${line}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
