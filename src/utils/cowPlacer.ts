import { isHintSolvable } from './hintRules'

export type GameMode = 'easy' | 'hard'

export interface CellState {
  colorIndex: number
  hasCow: boolean
  isRevealed: boolean
  isFlagged: boolean
  isWrong: boolean
}

export interface GameState {
  n: number
  mode: GameMode
  grid: CellState[][]
  cowsFound: number
  totalCows: number
  isWon: boolean
  guessHintsUsed: number
}

export const COLORS = [
  '#EF4444',
  '#F97316',
  '#EAB308',
  '#84CC16',
  '#22C55E',
  '#14B8A6',
  '#06B6D4',
  '#3B82F6',
  '#6366F1',
  '#8B5CF6',
  '#A855F7',
  '#D946EF',
  '#EC4899',
  '#F43F5E',
  '#78716C',
]

export const COLOR_NAMES = [
  '赤红',
  '橙焰',
  '金黄',
  '青柠',
  '翠绿',
  '碧蓝',
  '天青',
  '宝蓝',
  '靛蓝',
  '紫罗兰',
  '兰紫',
  '品红',
  '玫红',
  '珊瑚',
  '石灰',
]

const DIRS_4: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]]
const DIRS_8: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function generateTargetSizes(n: number): number[] {
  const total = n * n
  if (n >= 8) {
    const smallRegionCount = Math.min(3, n - 1)
    const targets = Array.from({ length: smallRegionCount }, () => 2 + Math.floor(Math.random() * 2))
    let remaining = total - targets.reduce((sum, size) => sum + size, 0)
    const largeRegionCount = n - smallRegionCount

    for (let i = 0; i < largeRegionCount; i++) {
      if (i === largeRegionCount - 1) {
        targets.push(remaining)
      } else {
        const left = largeRegionCount - i
        const avg = remaining / left
        const minSize = Math.max(4, Math.floor(avg * 0.45))
        const maxSize = Math.min(remaining - 4 * (left - 1), Math.ceil(avg * 1.7))
        const hi = Math.max(minSize, maxSize)
        const size = minSize + Math.floor(Math.random() * (hi - minSize + 1))
        targets.push(size)
        remaining -= size
      }
    }

    return shuffle(targets)
  }

  const targets: number[] = []
  let remaining = total

  for (let i = 0; i < n; i++) {
    if (i === n - 1) {
      targets.push(remaining)
    } else {
      const left = n - i
      const avg = remaining / left
      const minSize = 1
      const maxSize = Math.min(remaining - minSize * (left - 1), Math.ceil(avg * 2.2))
      const lo = Math.max(minSize, Math.floor(avg * 0.25))
      const hi = Math.max(lo + 1, Math.floor(maxSize))
      const size = lo + Math.floor(Math.random() * (hi - lo + 1))
      targets.push(size)
      remaining -= size
    }
  }

  return shuffle(targets)
}

function growRegions(n: number, dirs: [number, number][]): number[][] | null {
  const colorOf: number[][] = Array.from({ length: n }, () => Array(n).fill(-1))
  const seeds: [number, number][] = []
  const used = new Set<string>()

  while (seeds.length < n) {
    const r = Math.floor(Math.random() * n)
    const c = Math.floor(Math.random() * n)
    const key = `${r},${c}`
    if (!used.has(key)) {
      used.add(key)
      seeds.push([r, c])
      colorOf[r][c] = seeds.length - 1
    }
  }

  const targetSizes = generateTargetSizes(n)
  const regionSize = new Array(n).fill(1)
  const frontierMap = new Map<string, Set<number>>()

  function addFrontier(r: number, c: number, colorIdx: number) {
    for (const [dr, dc] of dirs) {
      const nr = r + dr
      const nc = c + dc
      if (nr >= 0 && nr < n && nc >= 0 && nc < n && colorOf[nr][nc] === -1) {
        const key = `${nr},${nc}`
        if (!frontierMap.has(key)) frontierMap.set(key, new Set())
        frontierMap.get(key)!.add(colorIdx)
      }
    }
  }

  for (let i = 0; i < n; i++) {
    addFrontier(seeds[i][0], seeds[i][1], i)
  }

  let totalAssigned = n
  const target = n * n

  while (totalAssigned < target) {
    if (frontierMap.size === 0) return null

    let bestKey = ''
    let bestNumOptions = Infinity
    let bestColors: number[] = []

    for (const [key, colors] of frontierMap) {
      const needColors = [...colors].filter((c) => regionSize[c] < targetSizes[c])
      if (needColors.length === 0) continue
      if (needColors.length < bestNumOptions) {
        bestNumOptions = needColors.length
        bestKey = key
        bestColors = needColors
      }
    }

    if (bestKey === '') {
      for (const [key, colors] of frontierMap) {
        if (colors.size < bestNumOptions || bestKey === '') {
          bestNumOptions = colors.size
          bestKey = key
          bestColors = [...colors]
        }
      }
    }

    if (bestKey === '') return null

    const minSize = Math.min(...bestColors.map((c) => regionSize[c]))
    const smallestColors = bestColors.filter((c) => regionSize[c] === minSize)
    const colorIdx = smallestColors[Math.floor(Math.random() * smallestColors.length)]

    const parts = bestKey.split(',')
    const r = Number(parts[0])
    const c = Number(parts[1])

    colorOf[r][c] = colorIdx
    regionSize[colorIdx]++
    totalAssigned++

    frontierMap.delete(bestKey)
    addFrontier(r, c, colorIdx)
  }

  return colorOf
}

function placeCowsInRegions(n: number, colorOf: number[][]): number[] | null {
  const rowOrder = shuffle(Array.from({ length: n }, (_, i) => i))
  const cowColForRow = new Array(n).fill(-1)
  const usedCols = new Set<number>()
  const usedColors = new Set<number>()
  const placedCows: [number, number][] = []

  function tryRow(idx: number): boolean {
    if (idx === n) return true

    const row = rowOrder[idx]
    const cellsInRow: { c: number; color: number }[] = []
    for (let c = 0; c < n; c++) {
      if (!usedCols.has(c) && !usedColors.has(colorOf[row][c])) {
        cellsInRow.push({ c, color: colorOf[row][c] })
      }
    }

    const shuffled = shuffle(cellsInRow)

    for (const { c, color } of shuffled) {
      let adjOk = true
      for (const [pr, pc] of placedCows) {
        if (Math.abs(pr - row) <= 1 && Math.abs(pc - c) <= 1) {
          adjOk = false
          break
        }
      }
      if (!adjOk) continue

      cowColForRow[row] = c
      usedCols.add(c)
      usedColors.add(color)
      placedCows.push([row, c])

      if (tryRow(idx + 1)) return true

      cowColForRow[row] = -1
      usedCols.delete(c)
      usedColors.delete(color)
      placedCows.pop()
    }

    return false
  }

  if (tryRow(0)) {
    const result = new Array(n).fill(0)
    for (let r = 0; r < n; r++) {
      result[r] = cowColForRow[r]
    }
    return result
  }
  return null
}

function createSnakeColorOf(n: number): number[][] {
  const colorOf: number[][] = Array.from({ length: n }, () => Array(n).fill(-1))
  const path: [number, number][] = []
  for (let r = 0; r < n; r++) {
    if (r % 2 === 0) {
      for (let c = 0; c < n; c++) path.push([r, c])
    } else {
      for (let c = n - 1; c >= 0; c--) path.push([r, c])
    }
  }
  for (let i = 0; i < path.length; i++) {
    const [r, c] = path[i]
    colorOf[r][c] = Math.floor(i / n)
  }
  return colorOf
}

export function createGameState(n: number, mode: GameMode = 'hard'): GameState {
  const dirs = mode === 'easy' ? DIRS_4 : DIRS_8

  for (let retry = 0; retry < 80; retry++) {
    const colorOf = growRegions(n, dirs)
    if (!colorOf) continue

    const cowCols = placeCowsInRegions(n, colorOf)
    if (!cowCols) continue

    const grid: CellState[][] = Array.from({ length: n }, (_, r) =>
      Array.from({ length: n }, (_, c) => ({
        colorIndex: colorOf[r][c],
        hasCow: cowCols[r] === c,
        isRevealed: false,
        isFlagged: false,
        isWrong: false,
      }))
    )

    const game: GameState = {
      n,
      mode,
      grid,
      cowsFound: 0,
      totalCows: n,
      isWon: false,
      guessHintsUsed: 0,
    }

    if (isHintSolvable(game)) return game
  }

  for (let retry = 0; retry < 100; retry++) {
    const colorOf = createSnakeColorOf(n)
    const cowCols = placeCowsInRegions(n, colorOf)
    if (!cowCols) continue

    const grid: CellState[][] = Array.from({ length: n }, (_, r) =>
      Array.from({ length: n }, (_, c) => ({
        colorIndex: colorOf[r][c],
        hasCow: cowCols[r] === c,
        isRevealed: false,
        isFlagged: false,
        isWrong: false,
      }))
    )

    const game: GameState = { n, mode, grid, cowsFound: 0, totalCows: n, isWon: false, guessHintsUsed: 0 }
    if (isHintSolvable(game)) return game
  }

  const colorOf = createSnakeColorOf(n)
  const grid: CellState[][] = Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => ({
      colorIndex: colorOf[r][c],
      hasCow: false,
      isRevealed: false,
      isFlagged: false,
      isWrong: false,
    }))
  )
  for (let r = 0; r < n; r++) {
    grid[r][r].hasCow = true
  }
  return { n, mode, grid, cowsFound: 0, totalCows: n, isWon: false, guessHintsUsed: 0 }
}
