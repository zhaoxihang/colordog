import { ref, computed } from 'vue'
import { createGameState, COLORS, type GameState, type CellState, type GameMode } from '@/utils/cowPlacer'
import { getHint as computeHint, type HintInfo } from '@/utils/hintRules'
import { loadRandomPuzzle, type StoredPuzzle } from '@/utils/puzzleLibrary'

export type { HintInfo }

export interface PuzzleJSON {
  n: number
  mode: GameMode
  colorGrid: number[][]
  cows: [number, number][]
}

const state = ref<GameState>(createGameState(5, 'easy'))
const showWin = ref(false)
const isVip = ref(false)
const isDragging = ref(false)
let dragMoved = false
let dragStartRow = -1
let dragStartCol = -1
let dragMode: 'flag' | 'unflag' = 'flag'
let lastTapRow = -1
let lastTapCol = -1
let lastTapTime = 0

export function useGame() {
  const n = computed(() => state.value.n)
  const grid = computed(() => state.value.grid)
  const cowsFound = computed(() => state.value.cowsFound)
  const totalCows = computed(() => state.value.totalCows)
  const isWon = computed(() => state.value.isWon)
  const progress = computed(() =>
    totalCows.value > 0 ? (cowsFound.value / totalCows.value) * 100 : 0
  )

  function buildGameFromPuzzle(puzzle: StoredPuzzle): GameState {
    const pn = puzzle.n
    const pgrid: CellState[][] = Array.from({ length: pn }, (_, r) =>
      Array.from({ length: pn }, (_, c) => ({
        colorIndex: puzzle.colorGrid[r][c],
        hasCow: puzzle.cows.some(([cr, cc]) => cr === r && cc === c),
        isRevealed: false,
        isFlagged: false,
        isWrong: false,
      }))
    )

    return {
      n: pn,
      mode: puzzle.mode,
      grid: pgrid,
      cowsFound: 0,
      totalCows: pn,
      isWon: false,
      guessHintsUsed: 0,
    }
  }

  async function startGame(customN?: number) {
    const size = customN ?? Math.floor(Math.random() * 12) + 4
    const puzzle = await loadRandomPuzzle(size, 'easy')
    state.value = puzzle ? buildGameFromPuzzle(puzzle) : createGameState(size, 'easy')
    showWin.value = false
  }

  function toggleFlag(row: number, col: number) {
    const cell = state.value.grid[row][col]
    if (cell.isRevealed) return
    cell.isFlagged = !cell.isFlagged
  }

  function flagCell(row: number, col: number) {
    const cell = state.value.grid[row][col]
    if (cell.isRevealed || cell.isFlagged) return
    cell.isFlagged = true
  }

  function unflagCell(row: number, col: number) {
    const cell = state.value.grid[row][col]
    if (cell.isRevealed || !cell.isFlagged) return
    cell.isFlagged = false
  }

  function revealCell(row: number, col: number) {
    const cell = state.value.grid[row][col]
    if (cell.isRevealed) return

    cell.isRevealed = true
    cell.isFlagged = false

    if (cell.hasCow) {
      state.value.cowsFound++
      autoFlagAroundCow(row, col)
      if (state.value.cowsFound >= state.value.totalCows) {
        state.value.isWon = true
        setTimeout(() => {
          showWin.value = true
        }, 500)
      }
    } else {
      cell.isWrong = true
    }
  }

  function autoFlagAroundCow(row: number, col: number) {
    const g = state.value
    for (let c = 0; c < g.n; c++) {
      if (c !== col) flagCell(row, c)
    }
    for (let r = 0; r < g.n; r++) {
      if (r !== row) flagCell(r, col)
    }
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue
        const nr = row + dr
        const nc = col + dc
        if (nr >= 0 && nr < g.n && nc >= 0 && nc < g.n) {
          flagCell(nr, nc)
        }
      }
    }
  }

  function startDrag(row: number, col: number) {
    const cell = state.value.grid[row][col]
    if (cell.isRevealed) return

    const now = Date.now()
    if (row === lastTapRow && col === lastTapCol && now - lastTapTime < 300) {
      cell.isFlagged = false
      revealCell(row, col)
      lastTapRow = -1
      lastTapCol = -1
      lastTapTime = 0
      return
    }

    isDragging.value = true
    dragMoved = false
    dragStartRow = row
    dragStartCol = col
    dragMode = cell.isFlagged ? 'unflag' : 'flag'

    if (dragMode === 'flag') {
      flagCell(row, col)
    } else {
      unflagCell(row, col)
    }

    lastTapRow = row
    lastTapCol = col
    lastTapTime = now
  }

  function dragOver(row: number, col: number) {
    if (!isDragging.value) return
    const cell = state.value.grid[row][col]
    if (cell.isRevealed) return

    if (row !== dragStartRow || col !== dragStartCol) {
      dragMoved = true
    }

    if (dragMode === 'flag') {
      if (!cell.isFlagged) flagCell(row, col)
    } else {
      if (cell.isFlagged) unflagCell(row, col)
    }
  }

  function endDrag() {
    if (dragMoved) {
      lastTapRow = -1
      lastTapCol = -1
      lastTapTime = 0
    }
    isDragging.value = false
    dragMoved = false
    dragStartRow = -1
    dragStartCol = -1
  }

  function exportGame(): PuzzleJSON {
    const g = state.value
    const colorGrid: number[][] = []
    const cows: [number, number][] = []
    for (let r = 0; r < g.n; r++) {
      const row: number[] = []
      for (let c = 0; c < g.n; c++) {
        row.push(g.grid[r][c].colorIndex)
        if (g.grid[r][c].hasCow) {
          cows.push([r, c])
        }
      }
      colorGrid.push(row)
    }
    return { n: g.n, mode: g.mode, colorGrid, cows }
  }

  function importGame(json: string): boolean {
    try {
      const puzzle: PuzzleJSON = JSON.parse(json)
      if (!puzzle.n || !puzzle.colorGrid || !puzzle.cows || !puzzle.mode) return false
      if (puzzle.colorGrid.length !== puzzle.n) return false
      if (puzzle.cows.length !== puzzle.n) return false

      state.value = buildGameFromPuzzle({ id: 'imported', ...puzzle })
      showWin.value = false
      return true
    } catch {
      return false
    }
  }

  function revealRandomCow(): boolean {
    const g = state.value
    const unrevealed: [number, number][] = []
    for (let r = 0; r < g.n; r++) {
      for (let c = 0; c < g.n; c++) {
        if (g.grid[r][c].hasCow && !g.grid[r][c].isRevealed) {
          unrevealed.push([r, c])
        }
      }
    }
    if (unrevealed.length === 0) return false
    const [r, c] = unrevealed[Math.floor(Math.random() * unrevealed.length)]
    g.grid[r][c].isFlagged = false
    revealCell(r, c)
    return true
  }

  function getHint(): HintInfo | null {
    return computeHint(state.value)
  }

  function applyHint(hint: HintInfo) {
    if (hint.type === 'cow') {
      if (hint.usesGuess) {
        state.value.guessHintsUsed++
      }
      for (const [r, c] of hint.cells) {
        const cell = state.value.grid[r][c]
        if (!cell.isRevealed) {
          cell.isFlagged = false
          revealCell(r, c)
        }
      }
    } else {
      for (const [r, c] of hint.cells) {
        flagCell(r, c)
      }
    }
  }

  function getCellColor(cell: CellState): string {
    return COLORS[cell.colorIndex] || '#ccc'
  }

  return {
    state,
    showWin,
    n,
    grid,
    cowsFound,
    totalCows,
    isWon,
    progress,
    isVip,
    startGame,
    toggleFlag,
    revealCell,
    flagCell,
    unflagCell,
    startDrag,
    dragOver,
    endDrag,
    getCellColor,
    exportGame,
    importGame,
    revealRandomCow,
    getHint,
    applyHint,
  }
}
