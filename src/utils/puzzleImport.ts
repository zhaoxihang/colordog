import type { GameMode } from './cowPlacer'
import { inferCowsForImport, type InferenceStepLog } from './hintRules'

export interface PuzzleImportInput {
  n: number
  mode: GameMode
  colorGrid: number[][]
  cows?: [number, number][]
}

export interface PuzzleImportResult {
  ok: true
  puzzle: {
    n: number
    mode: GameMode
    colorGrid: number[][]
    cows: [number, number][]
  }
  cowsInferred: boolean
  note: string
  deductionLog: InferenceStepLog[]
  deductionStopReason: string | null
}

export interface PuzzleImportFailure {
  ok: false
  reason: string
}

export type ParsePuzzleImportResult = PuzzleImportResult | PuzzleImportFailure

function isGameMode(value: unknown): value is GameMode {
  return value === 'easy' || value === 'hard'
}

function validateColorGrid(n: number, colorGrid: unknown): colorGrid is number[][] {
  if (!Array.isArray(colorGrid) || colorGrid.length !== n) return false
  for (const row of colorGrid) {
    if (!Array.isArray(row) || row.length !== n) return false
    for (const cell of row) {
      if (!Number.isInteger(cell) || cell < 0) return false
    }
  }
  return true
}

function validateCows(n: number, cows: unknown): cows is [number, number][] {
  if (!Array.isArray(cows) || cows.length > n) return false
  const seen = new Set<string>()
  for (const item of cows) {
    if (!Array.isArray(item) || item.length !== 2) return false
    const [r, c] = item
    if (!Number.isInteger(r) || !Number.isInteger(c) || r < 0 || r >= n || c < 0 || c >= n) {
      return false
    }
    const key = `${r},${c}`
    if (seen.has(key)) return false
    seen.add(key)
  }
  return true
}

export function parsePuzzleImport(json: string): ParsePuzzleImportResult {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return { ok: false, reason: 'JSON 格式错误' }
  }

  if (!raw || typeof raw !== 'object') {
    return { ok: false, reason: '数据格式无效' }
  }

  const data = raw as Record<string, unknown>
  const n = data.n
  if (!Number.isInteger(n) || n < 4 || n > 15) {
    return { ok: false, reason: '边长 n 须为 4～15 的整数' }
  }

  const mode = data.mode ?? 'easy'
  if (!isGameMode(mode)) {
    return { ok: false, reason: 'mode 须为 easy 或 hard' }
  }

  if (!validateColorGrid(n, data.colorGrid)) {
    return { ok: false, reason: `colorGrid 须为 ${n}×${n} 的非负整数颜色矩阵` }
  }

  const colorGrid = data.colorGrid as number[][]

  let cows: [number, number][]
  let cowsInferred = false
  let note = ''
  let deductionLog: InferenceStepLog[] = []
  let deductionStopReason: string | null = null

  if (data.cows === undefined || data.cows === null) {
    const inferred = inferCowsForImport(n, colorGrid)
    cows = inferred.cows
    note = inferred.note
    deductionLog = inferred.deductionLog
    deductionStopReason = inferred.stopReason
    cowsInferred = true
  } else if (!validateCows(n, data.cows)) {
    return { ok: false, reason: `cows 须为不超过 ${n} 个的不重复 [行, 列] 坐标` }
  } else {
    cows = data.cows as [number, number][]
  }

  return {
    ok: true,
    puzzle: { n, mode, colorGrid, cows },
    cowsInferred,
    note,
    deductionLog,
    deductionStopReason,
  }
}
