import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { createGameState, type GameMode, type GameState } from '../src/utils/cowPlacer'
import { isHintSolvable } from '../src/utils/hintRules'

interface StoredPuzzle {
  id: string
  n: number
  mode: GameMode
  colorGrid: number[][]
  cows: [number, number][]
}

type Manifest = Record<GameMode, Record<string, string[]>>

const outputDir = 'public/puzzles'
const modes: GameMode[] = ['easy']
const sizes = (process.env.PUZZLE_SIZES ?? '4,5,6,7,8,9,10,11,12,13,14,15')
  .split(',')
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isInteger(value) && value >= 4 && value <= 15)
const countPerSize = Number(process.env.PUZZLE_COUNT ?? 5)
const maxAttemptsPerPuzzle = Number(process.env.PUZZLE_ATTEMPTS ?? 30)

function toPuzzle(game: GameState, id: string): StoredPuzzle {
  const colorGrid: number[][] = []
  const cows: [number, number][] = []

  for (let r = 0; r < game.n; r++) {
    const row: number[] = []
    for (let c = 0; c < game.n; c++) {
      row.push(game.grid[r][c].colorIndex)
      if (game.grid[r][c].hasCow) cows.push([r, c])
    }
    colorGrid.push(row)
  }

  return {
    id,
    n: game.n,
    mode: game.mode,
    colorGrid,
    cows,
  }
}

async function loadExistingManifest(): Promise<Manifest> {
  try {
    const raw = await readFile(`${outputDir}/manifest.json`, 'utf8')
    const manifest = JSON.parse(raw) as Manifest
    return {
      easy: manifest.easy ?? {},
      hard: manifest.hard ?? {},
    }
  } catch {
    return { easy: {}, hard: {} }
  }
}

async function writeManifest(manifest: Manifest) {
  await writeFile(`${outputDir}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
}

function puzzleFileName(mode: GameMode, n: number, index: number): string {
  return `${mode}-${n}-${String(index).padStart(3, '0')}.json`
}

function puzzleId(mode: GameMode, n: number, index: number): string {
  return `${mode}-${n}-${String(index).padStart(3, '0')}`
}

function extractPuzzleIndex(fileName: string, mode: GameMode, n: number): number | null {
  const match = fileName.match(new RegExp(`^${mode}-${n}-(\\d{3,})\\.json$`))
  if (!match) return null
  return Number(match[1])
}

async function fileExists(fileName: string): Promise<boolean> {
  try {
    await access(`${outputDir}/${fileName}`)
    return true
  } catch {
    return false
  }
}

async function findNextPuzzleIndex(manifest: Manifest, mode: GameMode, n: number): Promise<number> {
  const usedIndexes = new Set<number>()

  for (const fileName of manifest[mode][String(n)] ?? []) {
    const index = extractPuzzleIndex(fileName, mode, n)
    if (index !== null) usedIndexes.add(index)
  }

  try {
    const files = await readdir(outputDir)
    for (const fileName of files) {
      const index = extractPuzzleIndex(fileName, mode, n)
      if (index !== null) usedIndexes.add(index)
    }
  } catch {
    // The output directory is created before this runs, but keep this tolerant for future callers.
  }

  let index = 1
  while (usedIndexes.has(index) || await fileExists(puzzleFileName(mode, n, index))) {
    index++
  }
  return index
}

async function main() {
  await mkdir(outputDir, { recursive: true })

  const manifest = await loadExistingManifest()

  for (const mode of modes) {
    for (const n of sizes) {
      manifest[mode][String(n)] = manifest[mode][String(n)] ?? []

      for (let count = 0; count < countPerSize; count++) {
        const index = await findNextPuzzleIndex(manifest, mode, n)
        const id = puzzleId(mode, n, index)
        const fileName = puzzleFileName(mode, n, index)
        let puzzle: StoredPuzzle | null = null

        for (let attempt = 1; attempt <= maxAttemptsPerPuzzle; attempt++) {
          const game = createGameState(n, mode)
          if (isHintSolvable(game)) {
            puzzle = toPuzzle(game, id)
            break
          }
          console.log(`retry ${id} (${attempt}/${maxAttemptsPerPuzzle})`)
        }

        if (!puzzle) {
          throw new Error(`${id} could not pass hint-chain validation after ${maxAttemptsPerPuzzle} attempts`)
        }

        if (await fileExists(fileName)) {
          throw new Error(`${fileName} already exists; refusing to overwrite it`)
        }

        await writeFile(
          `${outputDir}/${fileName}`,
          `${JSON.stringify(puzzle, null, 2)}\n`,
          'utf8'
        )
        if (!manifest[mode][String(n)].includes(fileName)) {
          manifest[mode][String(n)].push(fileName)
        }
        await writeManifest(manifest)
        console.log(`wrote ${fileName}`)
      }
    }
  }

  await writeManifest(manifest)
  console.log(`wrote ${outputDir}/manifest.json`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
