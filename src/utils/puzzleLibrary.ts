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

const MANIFEST_URL = '/puzzles/manifest.json'
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

export async function loadRandomPuzzle(n: number, mode: GameMode): Promise<StoredPuzzle | null> {
  const manifest = await loadManifest()
  const names = manifest?.[mode]?.[String(n)]
  if (!names || names.length === 0) return null

  const name = pickPuzzleName(names)
  if (!name) return null

  try {
    const response = await fetch(`/puzzles/${name}`, { cache: 'no-cache' })
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
