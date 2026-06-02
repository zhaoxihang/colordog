import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { getHint } from '../src/utils/hintRules'
import type { HintInfo } from '../src/utils/hintRules'
import type { CellState, GameMode } from '../src/utils/cowPlacer'

interface StoredPuzzle {
  id: string
  n: number
  mode: GameMode
  colorGrid: number[][]
  cows: [number, number][]
}

interface Manifest {
  [mode: string]: {
    [size: string]: string[]
  }
}

type Board = {
  n: number
  grid: CellState[][]
  guessHintsUsed?: number
}

const outputDir = 'public/puzzles'
const outputFile = `${outputDir}/scores.json`

// 规则权重：默认值。你后续可以按 ruleName 修改。
const RULE_WEIGHT_DEFAULT = 10
const RULE_WEIGHTS: Array<[string, number]> = [
  ['已揭开的牛', 1],
  ['唯一颜色', 2],
  ['唯一活跃行', 3],
  ['唯一活跃列', 3],
  ['只有2格相连同', 4],
  ['只有3格相连同', 5],
  ['三格夹角', 6],
  ['夹角', 6],
  ['T字形', 6],
  ['多格加一', 7],
  ['双色单邻', 7],
  ['整行', 7],
  ['整列', 7],
  ['假设反证', 20],
]

function ruleWeight(ruleName: string): number {
  for (const [key, w] of RULE_WEIGHTS) {
    if (ruleName === key) return w
  }
  for (const [key, w] of RULE_WEIGHTS) {
    if (ruleName.includes(key)) return w
  }
  return RULE_WEIGHT_DEFAULT
}

function buildBoard(puzzle: StoredPuzzle): Board {
  const cowsSet = new Set(puzzle.cows.map(([r, c]) => `${r},${c}`))
  const grid: CellState[][] = Array.from({ length: puzzle.n }, (_, r) =>
    Array.from({ length: puzzle.n }, (_, c) => ({
      colorIndex: puzzle.colorGrid[r][c],
      hasCow: cowsSet.has(`${r},${c}`),
      isRevealed: false,
      isFlagged: false,
      isWrong: false,
    })),
  )
  return { n: puzzle.n, grid, guessHintsUsed: 0 }
}

function applyCowReveal(sim: Board, truth: Board, row: number, col: number, state: { cowsFound: number }) {
  if (!truth.grid[row][col].hasCow) throw new Error(`invalid reveal: (${row},${col}) hasCow=false`)

  const simCell = sim.grid[row][col]
  if (simCell.isRevealed) return

  simCell.isRevealed = true
  simCell.isFlagged = false
  state.cowsFound++

  // 与 isHintSolvable 一致：揭开牛后，同行/同列/周围 8 格都打叉
  for (let c = 0; c < sim.n; c++) {
    if (c !== col) {
      const sc = sim.grid[row][c]
      if (!sc.isRevealed) sc.isFlagged = true
    }
  }
  for (let r = 0; r < sim.n; r++) {
    if (r !== row) {
      const sc = sim.grid[r][col]
      if (!sc.isRevealed) sc.isFlagged = true
    }
  }

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const nr = row + dr
      const nc = col + dc
      if (nr < 0 || nr >= sim.n || nc < 0 || nc >= sim.n) continue
      const sc = sim.grid[nr][nc]
      if (!sc.isRevealed) sc.isFlagged = true
    }
  }
}

function applyFlag(sim: Board, truth: Board, row: number, col: number) {
  if (truth.grid[row][col].hasCow) throw new Error(`invalid flag: (${row},${col}) hasCow=true`)
  const cell = sim.grid[row][col]
  if (cell.isRevealed) return
  cell.isFlagged = true
}

function solveAndScore(puzzle: StoredPuzzle, maxStepsFactor = 4) {
  const truth = buildBoard(puzzle)
  const sim: Board = {
    n: truth.n,
    guessHintsUsed: truth.guessHintsUsed ?? 0,
    grid: truth.grid.map((row) =>
      row.map((cell) => ({
        ...cell,
        isRevealed: false,
        isFlagged: false,
        isWrong: false,
      })),
    ),
  }

  const usage: Record<string, number> = {}
  const seenHints = new Set<string>()
  const state = { cowsFound: 0 }
  let steps = 0
  const maxSteps = puzzle.n * puzzle.n * maxStepsFactor

  for (let step = 0; step < maxSteps; step++) {
    if (state.cowsFound >= puzzle.n) {
      steps = step
      const totalScore = Object.entries(usage).reduce((sum, [ruleName, cnt]) => {
        return sum + ruleWeight(ruleName) * cnt
      }, 0)
      return { solved: true, steps, ruleUsage: usage, totalScore }
    }

    const hint = getHint(sim as any) as HintInfo | null
    if (!hint) break

    const key = `${hint.type}:${hint.cells.map(([r, c]) => `${r},${c}`).sort().join('|')}`
    if (seenHints.has(key)) break
    seenHints.add(key)

    steps = step + 1
    usage[hint.ruleName] = (usage[hint.ruleName] ?? 0) + 1

    if (hint.type === 'cow') {
      for (const [r, c] of hint.cells) applyCowReveal(sim, truth, r, c, state)
    } else {
      for (const [r, c] of hint.cells) applyFlag(sim, truth, r, c)
    }
  }

  const totalScore = Object.entries(usage).reduce((sum, [ruleName, cnt]) => {
    return sum + ruleWeight(ruleName) * cnt
  }, 0)
  return { solved: false, steps, ruleUsage: usage, totalScore }
}

async function main() {
  const args = process.argv.slice(2)
  const modeArg = args.find((a) => a.startsWith('--mode='))?.split('=')[1] as GameMode | undefined
  const fileArg = args.find((a) => a.startsWith('--file='))?.split('=')[1]

  await mkdir(outputDir, { recursive: true })

  const manifestRaw = await readFile(`${outputDir}/manifest.json`, 'utf8')
  const manifest = JSON.parse(manifestRaw) as Manifest

  const puzzleFiles: string[] = []
  if (fileArg) {
    puzzleFiles.push(fileArg)
  } else {
    const modes: GameMode[] = modeArg ? [modeArg] : (Object.keys(manifest) as GameMode[])
    for (const mode of modes) {
      const bucket = manifest?.[mode]
      if (!bucket) continue
      for (const list of Object.values(bucket)) {
        for (const f of list) puzzleFiles.push(f)
      }
    }
  }

  const uniq = [...new Set(puzzleFiles)]
  const results: Record<
    string,
    { n: number; solved: boolean; steps: number; ruleUsage: Record<string, number>; totalScore: number }
  > = {}

  for (const file of uniq) {
    const raw = await readFile(`${outputDir}/${file}`, 'utf8')
    const puzzle = JSON.parse(raw) as StoredPuzzle
    const r = solveAndScore(puzzle)
    results[file] = {
      n: puzzle.n,
      solved: r.solved,
      steps: r.steps,
      ruleUsage: r.ruleUsage,
      totalScore: r.totalScore,
    }
    console.log(`${file}: solved=${r.solved} steps=${r.steps} score=${r.totalScore}`)
  }

  const scored = Object.entries(results)
    .map(([file, r]) => ({ file, ...r }))
    .sort((a, b) => b.totalScore - a.totalScore)

  const output = {
    generatedAt: new Date().toISOString(),
    ruleWeights: Object.fromEntries(RULE_WEIGHTS),
    results,
    top: scored.slice(0, 20),
  }

  await writeFile(outputFile, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

