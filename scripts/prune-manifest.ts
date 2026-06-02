import { readFile, writeFile } from 'node:fs/promises'
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
  hard?: Record<string, string[]>
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
  const dryRun = process.argv.includes('--dry-run')
  const manifestPath = 'public/puzzles/manifest.json'
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Manifest
  const next: Manifest = { easy: {}, hard: manifest.hard ?? {} }

  let kept = 0
  let dropped = 0

  for (const [size, files] of Object.entries(manifest.easy ?? {})) {
    next.easy![size] = []
    for (const file of files) {
      const puzzle = JSON.parse(
        await readFile(`public/puzzles/${file}`, 'utf8'),
      ) as StoredPuzzle
      const board = toBoard(puzzle)
      if (hasUniqueCowPlacement(board) && isHintSolvable(board)) {
        next.easy![size].push(file)
        kept++
      } else {
        dropped++
        console.log(`drop ${file}`)
      }
    }
    if (next.easy![size].length === 0) delete next.easy![size]
  }

  console.log(`kept=${kept} dropped=${dropped}`)
  if (!dryRun) {
    await writeFile(manifestPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
    console.log(`wrote ${manifestPath}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
