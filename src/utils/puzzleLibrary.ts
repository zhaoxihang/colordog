import type { GameMode } from './cowPlacer'

export interface StoredPuzzle {
  id: string
  n: number
  mode: GameMode
  colorGrid: number[][]
  cows: [number, number][]
}

interface PuzzleManifest {
  [mode: string]: {
    [size: string]: string[]
  }
}

const BASE_URL = import.meta.env.BASE_URL
const MANIFEST_URL = `${BASE_URL}puzzles/manifest.json`
const PLAYED_KEY = 'colordog.playedPuzzles'

let manifestCache: PuzzleManifest | null = null

async function loadManifest(): Promise<PuzzleManifest | null> {
  if (manifestCache) return manifestCache

  try {
    const response = await fetch(MANIFEST_URL, { cache: 'no-cache' })
    if (!response.ok) return null
    manifestCache = await response.json() as PuzzleManifest
    return manifestCache
  } catch {
    return null
  }
}

function getPlayedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(PLAYED_KEY)
    const ids = raw ? JSON.parse(raw) as string[] : []
    return new Set(ids)
  } catch {
    return new Set()
  }
}

function savePlayedIds(ids: Set<string>) {
  try {
    localStorage.setItem(PLAYED_KEY, JSON.stringify([...ids]))
  } catch {
    // localStorage may be unavailable in privacy modes; puzzle loading should still work.
  }
}

function pickPuzzleName(names: string[]): string | null {
  if (names.length === 0) return null

  const played = getPlayedIds()
  let candidates = names.filter((name) => !played.has(name))

  if (candidates.length === 0) {
    for (const name of names) played.delete(name)
    candidates = names
  }

  const chosen = candidates[Math.floor(Math.random() * candidates.length)]
  played.add(chosen)
  savePlayedIds(played)
  return chosen
}

export async function getAvailableSizes(mode: GameMode): Promise<number[]> {
  const manifest = await loadManifest()
  const bucket = manifest?.[mode]
  if (!bucket) return []

  return Object.keys(bucket)
    .map((value) => Number(value))
    .filter((n) => Number.isInteger(n) && (bucket[String(n)]?.length ?? 0) > 0)
    .sort((a, b) => a - b)
}

/** 从 manifest 里随机选一个已有题库的边长并加载 */
export async function loadRandomPuzzleAny(mode: GameMode): Promise<StoredPuzzle | null> {
  const sizes = await getAvailableSizes(mode)
  if (sizes.length === 0) return null

  const shuffled = [...sizes].sort(() => Math.random() - 0.5)
  for (const n of shuffled) {
    const puzzle = await loadRandomPuzzle(n, mode)
    if (puzzle) return puzzle
  }
  return null
}

export async function loadRandomPuzzle(n: number, mode: GameMode): Promise<StoredPuzzle | null> {
  const manifest = await loadManifest()
  const names = manifest?.[mode]?.[String(n)]
  if (!names || names.length === 0) return null

  const name = pickPuzzleName(names)
  if (!name) return null

  try {
    const response = await fetch(`${BASE_URL}puzzles/${name}`, { cache: 'no-cache' })
    if (!response.ok) return null
    const puzzle = await response.json() as StoredPuzzle
    if (puzzle.n !== n || puzzle.mode !== mode || puzzle.colorGrid.length !== n || puzzle.cows.length !== n) {
      return null
    }
    return puzzle
  } catch {
    return null
  }
}
