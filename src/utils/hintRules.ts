import { COLOR_NAMES, type CellState } from './cowPlacer'

export interface HintInfo {
  ruleName: string
  description: string
  cells: [number, number][]
  type: 'flag' | 'cow'
  usesGuess?: boolean
}

interface BoardView {
  n: number
  grid: CellState[][]
  guessHintsUsed?: number
}

function getActiveCells(board: BoardView, colorIdx: number): [number, number][] {
  const cells: [number, number][] = []
  for (let r = 0; r < board.n; r++) {
    for (let c = 0; c < board.n; c++) {
      const cell = board.grid[r][c]
      if (cell.colorIndex === colorIdx && !cell.isRevealed && !cell.isFlagged) {
        cells.push([r, c])
      }
    }
  }
  return cells
}

function colorHasRevealedCow(board: BoardView, colorIdx: number): boolean {
  for (let r = 0; r < board.n; r++) {
    for (let c = 0; c < board.n; c++) {
      const cell = board.grid[r][c]
      if (cell.colorIndex === colorIdx && cell.isRevealed && cell.hasCow) {
        return true
      }
    }
  }
  return false
}

function getActiveCellsInLine(board: BoardView, lineIdx: number, direction: 'row' | 'col'): [number, number][] {
  const cells: [number, number][] = []
  for (let i = 0; i < board.n; i++) {
    const cell = direction === 'row' ? board.grid[lineIdx][i] : board.grid[i][lineIdx]
    if (!cell.isRevealed && !cell.isFlagged) {
      cells.push(direction === 'row' ? [lineIdx, i] : [i, lineIdx])
    }
  }
  return cells
}

function isConsecutive(cells: [number, number][], direction: 'row' | 'col'): boolean {
  const sorted = direction === 'row' ? [...cells].sort((a, b) => a[1] - b[1]) : [...cells].sort((a, b) => a[0] - b[0])
  for (let i = 1; i < sorted.length; i++) {
    const diff = direction === 'row' ? sorted[i][1] - sorted[i - 1][1] : sorted[i][0] - sorted[i - 1][0]
    if (diff !== 1) return false
  }
  return true
}

function filterFlaggable(board: BoardView, cells: [number, number][]): [number, number][] {
  return cells.filter(([r, c]) => {
    const cell = board.grid[r][c]
    return !cell.isRevealed && !cell.isFlagged
  })
}

function filterFlaggableOtherColor(board: BoardView, cells: [number, number][], colorIdx: number): [number, number][] {
  return cells.filter(([r, c]) => {
    const cell = board.grid[r][c]
    return !cell.isRevealed && !cell.isFlagged && cell.colorIndex !== colorIdx
  })
}

function dedup(cells: [number, number][]): [number, number][] {
  return [...new Map(cells.map(c => [`${c[0]},${c[1]}`, c])).values()] as [number, number][]
}

function combinations<T>(arr: T[], size: number): T[][] {
  if (size === 0) return [[]]
  if (arr.length < size) return []
  const result: T[][] = []
  for (let i = 0; i <= arr.length - size; i++) {
    const rest = combinations(arr.slice(i + 1), size - 1)
    for (const combo of rest) {
      result.push([arr[i], ...combo])
    }
  }
  return result
}

function collectLineOnly(board: BoardView, active: [number, number][], direction: 'row' | 'col'): [number, number][] {
  const activeSet = new Set(active.map(([r, c]) => `${r},${c}`))
  const result: [number, number][] = []
  if (direction === 'row') {
    const row = active[0][0]
    for (let cc = 0; cc < board.n; cc++) {
      if (!activeSet.has(`${row},${cc}`)) result.push([row, cc])
    }
  } else {
    const col = active[0][1]
    for (let rr = 0; rr < board.n; rr++) {
      if (!activeSet.has(`${rr},${col}`)) result.push([rr, col])
    }
  }
  return filterFlaggable(board, result)
}

function collectLinePlusAllAdj(board: BoardView, active: [number, number][], direction: 'row' | 'col'): [number, number][] {
  const result = collectLineOnly(board, active, direction)
  const activeSet = new Set(active.map(([r, c]) => `${r},${c}`))
  const adjCells: [number, number][] = []
  for (const [ar, ac] of active) {
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]] as [number, number][]) {
      const nr = ar + dr, nc = ac + dc
      if (nr >= 0 && nr < board.n && nc >= 0 && nc < board.n && !activeSet.has(`${nr},${nc}`)) {
        adjCells.push([nr, nc])
      }
    }
  }
  return dedup(filterFlaggable(board, [...result, ...adjCells]))
}

function collectLinePlusMidAdj(board: BoardView, active: [number, number][], direction: 'row' | 'col'): [number, number][] {
  const result = collectLineOnly(board, active, direction)
  const activeSet = new Set(active.map(([r, c]) => `${r},${c}`))
  const sorted = direction === 'row' ? [...active].sort((a, b) => a[1] - b[1]) : [...active].sort((a, b) => a[0] - b[0])
  const mid = sorted[1]
  const adjCells: [number, number][] = []
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]] as [number, number][]) {
    const nr = mid[0] + dr, nc = mid[1] + dc
    if (nr >= 0 && nr < board.n && nc >= 0 && nc < board.n && !activeSet.has(`${nr},${nc}`)) {
      adjCells.push([nr, nc])
    }
  }
  return dedup(filterFlaggable(board, [...result, ...adjCells]))
}

function findSharedAdjacent(board: BoardView, a: [number, number], b: [number, number]): [number, number][] {
  const adjA = new Set<string>()
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]] as [number, number][]) {
    const nr = a[0] + dr, nc = a[1] + dc
    if (nr >= 0 && nr < board.n && nc >= 0 && nc < board.n) adjA.add(`${nr},${nc}`)
  }
  const result: [number, number][] = []
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]] as [number, number][]) {
    const nr = b[0] + dr, nc = b[1] + dc
    if (nr >= 0 && nr < board.n && nc >= 0 && nc < board.n && adjA.has(`${nr},${nc}`)) {
      result.push([nr, nc])
    }
  }
  return result
}

function colorName(idx: number): string {
  return COLOR_NAMES[idx] || `颜色${idx + 1}`
}

function formatCellPos(r: number, c: number): string {
  return `第${r + 1}行第${c + 1}列`
}

function formatCellList(cells: [number, number][]): string {
  if (cells.length === 0) return ''
  if (cells.length <= 4) {
    return cells.map(([r, c]) => formatCellPos(r, c)).join('、')
  }
  return `${cells.length}格`
}

const DIRS_4: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]]

function getActiveNeighborsInSet(
  activeSet: Set<string>,
  r: number,
  c: number,
): [number, number][] {
  const result: [number, number][] = []
  for (const [dr, dc] of DIRS_4) {
    const nr = r + dr
    const nc = c + dc
    if (activeSet.has(`${nr},${nc}`)) result.push([nr, nc])
  }
  return result
}

/** T 形：横（或竖）臂恰好 3 格连成一线，第 4 格从中间格伸出；返回横臂中间格坐标 */
function findTShapeMiddle(active: [number, number][]): [number, number] | null {
  if (active.length !== 4) return null
  const activeSet = new Set(active.map(([r, c]) => `${r},${c}`))

  for (const [r, c] of active) {
    const neighbors = getActiveNeighborsInSet(activeSet, r, c)
    if (neighbors.length !== 3) continue

    const leftKey = `${r},${c - 1}`
    const rightKey = `${r},${c + 1}`
    if (activeSet.has(leftKey) && activeSet.has(rightKey)) {
      const stem = neighbors.find(([nr]) => nr !== r)
      if (!stem) continue
      const expected = new Set([leftKey, `${r},${c}`, rightKey, `${stem[0]},${stem[1]}`])
      if (expected.size === 4 && active.every(([ar, ac]) => expected.has(`${ar},${ac}`))) {
        return [r, c]
      }
    }

    const topKey = `${r - 1},${c}`
    const bottomKey = `${r + 1},${c}`
    if (activeSet.has(topKey) && activeSet.has(bottomKey)) {
      const stem = neighbors.find(([, nc]) => nc !== c)
      if (!stem) continue
      const expected = new Set([topKey, `${r},${c}`, bottomKey, `${stem[0]},${stem[1]}`])
      if (expected.size === 4 && active.every(([ar, ac]) => expected.has(`${ar},${ac}`))) {
        return [r, c]
      }
    }
  }
  return null
}

function collectMidOrthogonalOtherColor(
  board: BoardView,
  activeSet: Set<string>,
  mid: [number, number],
  colorIdx: number,
): [number, number][] {
  const [r, c] = mid
  const result: [number, number][] = []
  for (const [dr, dc] of DIRS_4) {
    const nr = r + dr
    const nc = c + dc
    if (nr < 0 || nr >= board.n || nc < 0 || nc >= board.n) continue
    if (activeSet.has(`${nr},${nc}`)) continue
    result.push([nr, nc])
  }
  return filterFlaggableOtherColor(board, result, colorIdx)
}

function ruleTShape(board: BoardView): HintInfo | null {
  for (let colorIdx = 0; colorIdx < board.n; colorIdx++) {
    const active = getActiveCells(board, colorIdx)
    const mid = findTShapeMiddle(active)
    if (!mid) continue

    const activeSet = new Set(active.map(([r, c]) => `${r},${c}`))
    const flaggable = collectMidOrthogonalOtherColor(board, activeSet, mid, colorIdx)
    if (flaggable.length > 0) {
      return {
        ruleName: 'T字形',
        description: `${colorName(colorIdx)}连成T形（一横三格），横臂中间格相邻的异色格可画叉`,
        cells: flaggable,
        type: 'flag',
      }
    }
  }
  return null
}

const DIRS_8: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
]

function cloneBoardView(board: BoardView): BoardView {
  return {
    n: board.n,
    guessHintsUsed: board.guessHintsUsed ?? 0,
    grid: board.grid.map((row) => row.map((cell) => ({ ...cell }))),
  }
}

function simFlagCell(board: BoardView, row: number, col: number) {
  const cell = board.grid[row][col]
  if (cell.isRevealed || cell.isFlagged) return
  cell.isFlagged = true
}

function simPlaceCow(board: BoardView, row: number, col: number) {
  const cell = board.grid[row][col]
  if (cell.isRevealed) return
  cell.hasCow = true
  cell.isRevealed = true
  cell.isFlagged = false

  for (let c = 0; c < board.n; c++) {
    if (c !== col) simFlagCell(board, row, c)
  }
  for (let r = 0; r < board.n; r++) {
    if (r !== row) simFlagCell(board, r, col)
  }
  for (const [dr, dc] of DIRS_8) {
    if (dr === 0 && dc === 0) continue
    const nr = row + dr
    const nc = col + dc
    if (nr >= 0 && nr < board.n && nc >= 0 && nc < board.n) {
      simFlagCell(board, nr, nc)
    }
  }
}

function countSimCows(sim: BoardView): number {
  let count = 0
  for (let r = 0; r < sim.n; r++) {
    for (let c = 0; c < sim.n; c++) {
      if (sim.grid[r][c].hasCow && sim.grid[r][c].isRevealed) count++
    }
  }
  return count
}

type CowPlacementConflict =
  | 'sameRow'
  | 'sameCol'
  | 'adjacent'
  | 'sameColor'
  | 'confirmedMismatch'

const COW_CONFLICT_LABEL: Record<CowPlacementConflict, string> = {
  sameRow: '与本次假设链中已推出的牛同行',
  sameCol: '与本次假设链中已推出的牛同列',
  adjacent: '与本次假设链中已推出的牛相邻',
  sameColor: '与该颜色已推出的牛位置冲突',
  confirmedMismatch: '与该颜色已确定的牛位置不符',
}

function cowPlacementConflict(
  sim: BoardView,
  board: BoardView,
  row: number,
  col: number,
): CowPlacementConflict | null {
  const colorIdx = sim.grid[row][col].colorIndex

  for (let pr = 0; pr < sim.n; pr++) {
    for (let pc = 0; pc < sim.n; pc++) {
      if (pr === row && pc === col) continue
      const other = sim.grid[pr][pc]
      if (!other.isRevealed || !other.hasCow) continue
      if (pr === row) return 'sameRow'
      if (pc === col) return 'sameCol'
      if (Math.abs(pr - row) <= 1 && Math.abs(pc - col) <= 1) return 'adjacent'
      if (other.colorIndex === colorIdx) return 'sameColor'
    }
  }

  for (let pr = 0; pr < board.n; pr++) {
    for (let pc = 0; pc < board.n; pc++) {
      const confirmed = board.grid[pr][pc]
      if (!confirmed.isRevealed || !confirmed.hasCow) continue
      if (confirmed.colorIndex === colorIdx && (pr !== row || pc !== col)) {
        return 'confirmedMismatch'
      }
    }
  }

  return null
}

function flagConflictsWithCow(sim: BoardView, board: BoardView, row: number, col: number): boolean {
  const simCell = sim.grid[row][col]
  if (simCell.isRevealed && simCell.hasCow) return true
  const confirmed = board.grid[row][col]
  return confirmed.isRevealed && confirmed.hasCow
}

interface AssumptionContradiction {
  assumed: [number, number]
  reason: 'cowConflict' | 'badFlag'
  conflictDetail?: string
  triggerRule: string
  triggerCells: [number, number][]
}

type AssumptionSimResult =
  | { outcome: 'contradiction'; detail: AssumptionContradiction }
  | { outcome: 'complete' }
  | { outcome: 'inconclusive' }

/**
 * 假定某格为牛后，在模拟盘上连续跑 deductive 规则：
 * - 推出新牛时检查与假设链内已推牛、已确定牛是否冲突
 * - 冲突 → 假设不成立；无冲突则继续，直到找全 n 头牛（假设成立）或无更多提示
 */
function simAssumptionTest(board: BoardView, hr: number, hc: number): AssumptionSimResult {
  const sim = cloneBoardView(board)
  simPlaceCow(sim, hr, hc)
  const seen = new Set<string>()
  const maxSteps = board.n * board.n

  for (let step = 0; step < maxSteps; step++) {
    if (countSimCows(sim) >= board.n) {
      return { outcome: 'complete' }
    }

    const hint = getDeductiveHint(sim)
    if (!hint) return { outcome: 'inconclusive' }

    const key = `${hint.type}:${hint.cells.map(([r, c]) => `${r},${c}`).sort().join('|')}`
    if (seen.has(key)) return { outcome: 'inconclusive' }
    seen.add(key)

    if (hint.type === 'cow') {
      for (const [r, c] of hint.cells) {
        const conflict = cowPlacementConflict(sim, board, r, c)
        if (conflict) {
          return {
            outcome: 'contradiction',
            detail: {
              assumed: [hr, hc],
              reason: 'cowConflict',
              conflictDetail: COW_CONFLICT_LABEL[conflict],
              triggerRule: hint.ruleName,
              triggerCells: [[r, c]],
            },
          }
        }
        simPlaceCow(sim, r, c)
      }
    } else {
      for (const [r, c] of hint.cells) {
        if (flagConflictsWithCow(sim, board, r, c)) {
          return {
            outcome: 'contradiction',
            detail: {
              assumed: [hr, hc],
              reason: 'badFlag',
              triggerRule: hint.ruleName,
              triggerCells: [[r, c]],
            },
          }
        }
        simFlagCell(sim, r, c)
      }
    }
  }

  if (countSimCows(sim) >= board.n) return { outcome: 'complete' }
  return { outcome: 'inconclusive' }
}

function formatAssumptionContradiction(
  colorIdx: number,
  contradiction: AssumptionContradiction,
): string {
  const assumedPos = formatCellPos(contradiction.assumed[0], contradiction.assumed[1])
  const triggerPos = formatCellList(contradiction.triggerCells)
  const colorLabel = colorName(colorIdx)

  if (contradiction.reason === 'cowConflict') {
    const detail = contradiction.conflictDetail ?? '与已推出的牛冲突'
    return `假设${colorLabel}的${assumedPos}为牛，排除其同行、同列及周围8格后继续推理，「${contradiction.triggerRule}」推出${triggerPos}为牛，但${detail}，故假设不成立、${assumedPos}可画叉`
  }
  return `假设${colorLabel}的${assumedPos}为牛，排除其同行、同列及周围8格后继续推理，「${contradiction.triggerRule}」要求给${triggerPos}画叉，但该处已有牛，故假设不成立、${assumedPos}可画叉`
}

function formatMinActiveColorIntro(groups: { colorIdx: number; active: [number, number][] }[]): string {
  const minCount = groups[0]?.active.length ?? 0
  if (groups.length === 1) {
    return `${colorName(groups[0].colorIdx)}只剩${minCount}个活跃格（全场最少）`
  }
  const names = groups.map((g) => colorName(g.colorIdx)).join('、')
  return `${names}均只剩${minCount}个活跃格（全场最少）`
}

function formatAssumptionValidated(colorIdx: number, cell: [number, number], n: number): string {
  const pos = formatCellPos(cell[0], cell[1])
  return `假设${colorName(colorIdx)}的${pos}为牛并连续推演，可无冲突推出全部${n}头牛，故该假设成立、${pos}必定是牛`
}

const DEDUCTIVE_RULES: ((board: BoardView) => HintInfo | null)[] = [
  ruleRevealedCowExclusion,
  ruleColorCowAlreadyRevealed,
  ruleSingleColor,
  ruleSameLine,
  ruleThreeCorner,
  ruleFourCorner,
  ruleTwoColorSingleAdjacency,
  ruleTShape,
  ruleLinePlusOne,
  ruleOnlyOneActiveInLine,
  ruleLineAllSameColor,
  ruleNColorsNLines,
  ruleNLinesOnlyNColors,
  // ruleSolutionSet,
]

function getDeductiveHint(board: BoardView): HintInfo | null {
  for (const rule of DEDUCTIVE_RULES) {
    const hint = rule(board)
    if (hint) return hint
  }
  return null
}

function findMinActiveColorGroups(board: BoardView): { colorIdx: number; active: [number, number][] }[] {
  let minCount = Infinity
  const groups: { colorIdx: number; active: [number, number][] }[] = []

  for (let colorIdx = 0; colorIdx < board.n; colorIdx++) {
    const active = getActiveCells(board, colorIdx)
    if (active.length === 0) continue
    if (active.length < minCount) {
      minCount = active.length
      groups.length = 0
      groups.push({ colorIdx, active })
    } else if (active.length === minCount) {
      groups.push({ colorIdx, active })
    }
  }

  if (!Number.isFinite(minCount) || minCount < 2) return []
  return groups
}

/** 其它规则均无时：对活跃格最少的颜色做假设反证 */
function ruleHypothesisContradiction(board: BoardView): HintInfo | null {
  const groups = findMinActiveColorGroups(board)
  if (groups.length === 0) return null

  const validatedByColor = new Map<number, [number, number][]>()
  const contradictions: { colorIdx: number; detail: AssumptionContradiction }[] = []

  for (const { colorIdx, active } of groups) {
    for (const [hr, hc] of active) {
      const result = simAssumptionTest(board, hr, hc)
      if (result.outcome === 'complete') {
        const list = validatedByColor.get(colorIdx) ?? []
        list.push([hr, hc])
        validatedByColor.set(colorIdx, list)
      } else if (result.outcome === 'contradiction') {
        contradictions.push({ colorIdx, detail: result.detail })
      }
    }
  }

  const certainCows: [number, number][] = []
  const validatedParts: string[] = []
  for (const { colorIdx } of groups) {
    const cells = validatedByColor.get(colorIdx) ?? []
    if (cells.length !== 1) continue
    certainCows.push(cells[0])
    validatedParts.push(formatAssumptionValidated(colorIdx, cells[0], board.n))
  }

  const intro = formatMinActiveColorIntro(groups)

  const cowCells = filterFlaggable(board, dedup(certainCows))
  if (cowCells.length > 0) {
    return {
      ruleName: '假设反证',
      description: `${intro}。${validatedParts.join('；')}`,
      cells: cowCells,
      type: 'cow',
    }
  }

  const toFlag = contradictions.map((c) => c.detail.assumed)
  const flaggable = filterFlaggable(board, dedup(toFlag))
  if (flaggable.length === 0) return null

  const detailParts = contradictions
    .filter((c) => flaggable.some(([r, col]) => r === c.detail.assumed[0] && col === c.detail.assumed[1]))
    .map((c) => formatAssumptionContradiction(c.colorIdx, c.detail))

  const description = detailParts.length === 1
    ? `${intro}。${detailParts[0]}`
    : `${intro}，逐一检验各假设：${detailParts.join('；')}`

  return {
    ruleName: '假设反证',
    description,
    cells: flaggable,
    type: 'flag',
  }
}

export function getHint(board: BoardView): HintInfo | null {
  const deductive = getDeductiveHint(board)
  if (deductive) return deductive

  const contradiction = ruleHypothesisContradiction(board)
  if (contradiction) return contradiction

  // 猜测提示暂关闭，题库与提示链校验均不依赖
  // return ruleLimitedGuessCow(board)
  return null
}

export function isHintSolvable(board: BoardView): boolean {
  const testBoard: BoardView = {
    n: board.n,
    guessHintsUsed: 0,
    grid: board.grid.map((row) =>
      row.map((cell) => ({
        ...cell,
        isRevealed: false,
        isFlagged: false,
        isWrong: false,
      }))
    ),
  }
  let cowsFound = 0
  const seenHints = new Set<string>()
  const maxSteps = board.n * board.n * 4

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

  for (let step = 0; step < maxSteps; step++) {
    if (cowsFound >= board.n) return true

    const hint = getHint(testBoard)
    if (!hint) return false

    const key = `${hint.type}:${hint.cells.map(([r, c]) => `${r},${c}`).sort().join('|')}`
    if (seenHints.has(key)) return false
    seenHints.add(key)

    if (hint.type === 'cow') {
      if (hint.usesGuess) {
        testBoard.guessHintsUsed = (testBoard.guessHintsUsed ?? 0) + 1
      }
      for (const [r, c] of hint.cells) {
        if (!revealCell(r, c)) return false
      }
    } else {
      for (const [r, c] of hint.cells) {
        if (testBoard.grid[r][c].hasCow) return false
        flagCell(r, c)
      }
    }
  }

  return cowsFound >= board.n
}

function collectExclusionAroundRevealedCow(
  board: BoardView,
  row: number,
  col: number,
): [number, number][] {
  const result: [number, number][] = []
  const seen = new Set<string>()

  function add(r: number, c: number) {
    if (r < 0 || r >= board.n || c < 0 || c >= board.n) return
    if (r === row && c === col) return
    const key = `${r},${c}`
    if (seen.has(key)) return
    seen.add(key)
    result.push([r, c])
  }

  for (let c = 0; c < board.n; c++) {
    if (c !== col) add(row, c)
  }
  for (let r = 0; r < board.n; r++) {
    if (r !== row) add(r, col)
  }
  for (const [dr, dc] of DIRS_8) {
    if (dr === 0 && dc === 0) continue
    add(row + dr, col + dc)
  }

  return result
}

/** 已揭开的牛：其同行、同列及周围 8 格（不含牛格）可画叉 */
function ruleRevealedCowExclusion(board: BoardView): HintInfo | null {
  const cowCells: [number, number][] = []
  for (let r = 0; r < board.n; r++) {
    for (let c = 0; c < board.n; c++) {
      const cell = board.grid[r][c]
      if (cell.isRevealed && cell.hasCow) {
        cowCells.push([r, c])
      }
    }
  }
  if (cowCells.length === 0) return null

  const cells: [number, number][] = []
  const seen = new Set<string>()
  for (const [row, col] of cowCells) {
    for (const [r, c] of collectExclusionAroundRevealedCow(board, row, col)) {
      const key = `${r},${c}`
      if (seen.has(key)) continue
      seen.add(key)
      cells.push([r, c])
    }
  }

  const flaggable = filterFlaggable(board, cells)
  if (flaggable.length === 0) return null

  const [r0, c0] = cowCells[0]
  const description = cowCells.length === 1
    ? `第${r0 + 1}行第${c0 + 1}列已揭开牛，其同行、同列及周围可画叉`
    : `已揭开的牛所在行、列及周围可画叉`

  return {
    ruleName: '已揭开的牛',
    description,
    cells: flaggable,
    type: 'flag',
  }
}

/** 某色牛已揭开 → 该色其余活跃格可画叉（每种颜色恰一头牛）  */
function ruleColorCowAlreadyRevealed(board: BoardView): HintInfo | null {
  for (let colorIdx = 0; colorIdx < board.n; colorIdx++) {
    if (!colorHasRevealedCow(board, colorIdx)) continue

    const active = getActiveCells(board, colorIdx)
    if (active.length === 0) continue

    const flaggable = filterFlaggable(board, active)
    if (flaggable.length > 0) {
      return {
        ruleName: '该色牛已揭开',
        description: `${colorName(colorIdx)}的牛已揭开，该色其余活跃格可画叉`,
        cells: flaggable,
        type: 'flag',
      }
    }
  }
  return null
}

function ruleSingleColor(board: BoardView): HintInfo | null {
  for (let colorIdx = 0; colorIdx < board.n; colorIdx++) {
    if (colorHasRevealedCow(board, colorIdx)) continue

    const active = getActiveCells(board, colorIdx)
    if (active.length !== 1) continue
    const [r, c] = active[0]
    return {
      ruleName: '唯一颜色',
      description: `${colorName(colorIdx)}只剩1格且该色牛未揭开，这格必定是牛`,
      cells: [[r, c]],
      type: 'cow',
    }
  }
  return null
}

function ruleSameLine(board: BoardView): HintInfo | null {
  for (let colorIdx = 0; colorIdx < board.n; colorIdx++) {
    const active = getActiveCells(board, colorIdx)
    if (active.length < 2) continue
    const name = colorName(colorIdx)

    const sameRow = active.every(([r]) => r === active[0][0])
    if (sameRow) {
      const hint = checkSameLineDir(board, active, name, colorIdx, 'row')
      if (hint) return hint
    }

    const sameCol = active.every(([, c]) => c === active[0][1])
    if (sameCol) {
      const hint = checkSameLineDir(board, active, name, colorIdx, 'col')
      if (hint) return hint
    }
  }
  return null
}

function checkSameLineDir(
  board: BoardView,
  active: [number, number][],
  name: string,
  colorIdx: number,
  direction: 'row' | 'col'
): HintInfo | null {
  const consecutive = isConsecutive(active, direction)
  const label = direction === 'row' ? '行' : '列'
  let flaggable: [number, number][]
  let desc: string
  let ruleName: string

  if (active.length === 2 && consecutive) {
    flaggable = collectLinePlusAllAdj(board, active, direction)
    desc = `${name}只有2格相连同${label}，该${label}其余和两格相邻可画叉`
    ruleName = `只有2格相连同${label}`
  } else if (active.length === 3 && consecutive) {
    flaggable = collectLinePlusMidAdj(board, active, direction)
    desc = `${name}只有3格相连同${label}，该${label}其余和中间相邻可画叉`
    ruleName = `只有3格相连同${label}`
  } else if (consecutive) {
    flaggable = collectLineOnly(board, active, direction)
    desc = `${name}有${active.length}格相连同${label}，该${label}其余可画叉`
    ruleName = `${active.length}格相连同${label}`
  } else {
    flaggable = collectLineOnly(board, active, direction)
    desc = `${name}有${active.length}格在同一${label}，该${label}其余可画叉`
    ruleName = `${active.length}格同${label}`
  }

  if (flaggable.length > 0) {
    return { ruleName, description: desc, cells: flaggable, type: 'flag' }
  }
  return null
}

function ruleThreeCorner(board: BoardView): HintInfo | null {
  for (let colorIdx = 0; colorIdx < board.n; colorIdx++) {
    const active = getActiveCells(board, colorIdx)
    if (active.length !== 3) continue
    const sameRow = active.every(([r]) => r === active[0][0])
    const sameCol = active.every(([, c]) => c === active[0][1])
    if (sameRow || sameCol) continue

    const colorSet = new Set(active.map(([r, c]) => `${r},${c}`))
    const result: [number, number][] = []

    for (let r = 0; r < board.n; r++) {
      for (let c = 0; c < board.n; c++) {
        if (colorSet.has(`${r},${c}`)) continue
        if (board.grid[r][c].colorIndex === colorIdx) continue
        const adjCells: [number, number][] = []
        for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]] as [number, number][]) {
          const nr = r + dr, nc = c + dc
          if (colorSet.has(`${nr},${nc}`)) adjCells.push([nr, nc])
        }
        if (adjCells.length >= 2) {
          const rows = new Set(adjCells.map(([ar]) => ar))
          const cols = new Set(adjCells.map(([, ac]) => ac))
          if (rows.size >= 2 && cols.size >= 2) result.push([r, c])
        }
      }
    }

    const flaggable = filterFlaggableOtherColor(board, result, colorIdx)
    if (flaggable.length > 0) {
      return {
        ruleName: '三格夹角',
        description: `${colorName(colorIdx)}只有3格且不在同行列，夹角处的其他颜色可画叉`,
        cells: flaggable,
        type: 'flag',
      }
    }
  }
  return null
}

function isOrthogonallyAdjacent(a: [number, number], b: [number, number]): boolean {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1
}

/** 两活跃格四向相邻成线段：同行为横向线，同列为纵向线 */
function twoActiveCellsFormLine(active: [number, number][]): 'row' | 'col' | null {
  if (active.length !== 2) return null
  const [[r0, c0], [r1, c1]] = active
  if (!isOrthogonallyAdjacent(active[0], active[1])) return null
  if (r0 === r1) return 'row'
  if (c0 === c1) return 'col'
  return null
}

function getUniqueCrossAdjacentPair(
  activeA: [number, number][],
  activeB: [number, number][],
): [[number, number], [number, number]] | null {
  let pair: [[number, number], [number, number]] | null = null
  for (const a of activeA) {
    for (const b of activeB) {
      if (!isOrthogonallyAdjacent(a, b)) continue
      if (pair) return null
      pair = [a, b]
    }
  }
  return pair
}

function otherActiveCell(active: [number, number][], cell: [number, number]): [number, number] {
  const [r0, c0] = active[0]
  return r0 === cell[0] && c0 === cell[1] ? active[1] : active[0]
}

function isOrthAdjacentToAny(cell: [number, number], targets: [number, number][]): boolean {
  return targets.some((t) => isOrthogonallyAdjacent(cell, t))
}

function fourCellsNotAllSameRowOrCol(
  activeA: [number, number][],
  activeB: [number, number][],
): boolean {
  const all = [...activeA, ...activeB]
  const sameRow = all.every(([r]) => r === all[0][0])
  const sameCol = all.every(([, c]) => c === all[0][1])
  return !sameRow && !sameCol
}

/** 两色各剩 2 活跃格（各自相连成线、两线平行、四格不同行且不同列），且仅一对异色相邻 → 该相邻两格可画叉 */
function ruleTwoColorSingleAdjacency(board: BoardView): HintInfo | null {
  for (let colorA = 0; colorA < board.n; colorA++) {
    const activeA = getActiveCells(board, colorA)
    const lineA = twoActiveCellsFormLine(activeA)
    if (!lineA) continue

    for (let colorB = colorA + 1; colorB < board.n; colorB++) {
      const activeB = getActiveCells(board, colorB)
      const lineB = twoActiveCellsFormLine(activeB)
      if (!lineB || lineA !== lineB) continue
      if (!fourCellsNotAllSameRowOrCol(activeA, activeB)) continue

      const pair = getUniqueCrossAdjacentPair(activeA, activeB)
      if (!pair) continue

      const [touchA, touchB] = pair
      const otherA = otherActiveCell(activeA, touchA)
      const otherB = otherActiveCell(activeB, touchB)
      if (isOrthAdjacentToAny(otherA, activeB)) continue
      if (isOrthAdjacentToAny(otherB, activeA)) continue

      const lineLabel = lineA === 'row' ? '横线' : '竖线'
      const flaggable = filterFlaggable(board, [touchA, touchB])
      if (flaggable.length > 0) {
        return {
          ruleName: '双色单邻',
          description: `${colorName(colorA)}与${colorName(colorB)}各剩2格相连成平行${lineLabel}（四格不同行且不同列），且仅一对异色相邻，牛必在另两格，相邻的两格可画叉`,
          cells: flaggable,
          type: 'flag',
        }
      }
    }
  }
  return null
}

function ruleFourCorner(board: BoardView): HintInfo | null {
  for (let colorIdx = 0; colorIdx < board.n; colorIdx++) {
    const active = getActiveCells(board, colorIdx)
    if (active.length !== 4) continue
    const sameRow = active.every(([r]) => r === active[0][0])
    const sameCol = active.every(([, c]) => c === active[0][1])
    if (sameRow || sameCol) continue

    const cornerCells = findFourCornerCells(board, active, colorIdx)
    if (cornerCells.length > 0) {
      const flaggable = filterFlaggableOtherColor(board, cornerCells, colorIdx)
      if (flaggable.length > 0) {
        return {
          ruleName: '夹角',
          description: `${colorName(colorIdx)}有4格，两两在不同行/列且仅一对相邻，夹角处可画叉`,
          cells: flaggable,
          type: 'flag',
        }
      }
    }
  }
  return null
}

function findFourCornerCells(board: BoardView, active: [number, number][], colorIdx: number): [number, number][] {
  const colorSet = new Set(active.map(([r, c]) => `${r},${c}`))

  const byRow = new Map<number, [number, number][]>()
  for (const cell of active) {
    if (!byRow.has(cell[0])) byRow.set(cell[0], [])
    byRow.get(cell[0])!.push(cell)
  }
  const rowPairs = [...byRow.entries()].filter(([, cells]) => cells.length === 2)
  if (rowPairs.length === 2) {
    const [rowA, cellsA] = rowPairs[0]
    const [rowB, cellsB] = rowPairs[1]
    if (Math.abs(rowA - rowB) === 1) {
      let adjCount = 0
      for (const [, ca] of cellsA) {
        for (const [, cb] of cellsB) {
          if (ca === cb) adjCount++
        }
      }
      if (adjCount === 1) {
        return findCornerPoints(board, cellsA, cellsB, colorSet, colorIdx)
      }
    }
  }

  const byCol = new Map<number, [number, number][]>()
  for (const cell of active) {
    if (!byCol.has(cell[1])) byCol.set(cell[1], [])
    byCol.get(cell[1])!.push(cell)
  }
  const colPairs = [...byCol.entries()].filter(([, cells]) => cells.length === 2)
  if (colPairs.length === 2) {
    const [colA, cellsA] = colPairs[0]
    const [colB, cellsB] = colPairs[1]
    if (Math.abs(colA - colB) === 1) {
      let adjCount = 0
      for (const [ra] of cellsA) {
        for (const [rb] of cellsB) {
          if (ra === rb) adjCount++
        }
      }
      if (adjCount === 1) {
        return findCornerPoints(board, cellsA, cellsB, colorSet, colorIdx)
      }
    }
  }

  return []
}

function findCornerPoints(
  board: BoardView,
  groupA: [number, number][],
  groupB: [number, number][],
  colorSet: Set<string>,
  colorIdx: number
): [number, number][] {
  const result: [number, number][] = []
  for (const [ar, ac] of groupA) {
    for (const [br, bc] of groupB) {
      if (ar !== br && ac !== bc) {
        const candidates: [number, number][] = [[ar, bc], [br, ac]]
        for (const [r, c] of candidates) {
          if (r >= 0 && r < board.n && c >= 0 && c < board.n
            && !colorSet.has(`${r},${c}`)
            && board.grid[r][c].colorIndex !== colorIdx) {
            let adjA = false, adjB = false
            for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]] as [number, number][]) {
              if (colorSet.has(`${r+dr},${c+dc}`)) {
                if (r+dr === ar && c+dc === ac) adjA = true
                if (r+dr === br && c+dc === bc) adjB = true
              }
            }
            if (adjA && adjB) result.push([r, c])
          }
        }
      }
    }
  }
  return result
}

function ruleLinePlusOne(board: BoardView): HintInfo | null {
  for (let colorIdx = 0; colorIdx < board.n; colorIdx++) {
    const active = getActiveCells(board, colorIdx)
    if (active.length < 4) continue
    const name = colorName(colorIdx)

    for (let i = 0; i < active.length; i++) {
      const lone = active[i]
      const rest = active.filter((_, idx) => idx !== i)
      if (rest.length < 3) continue
      const sameRow = rest.every(([, c]) => c === rest[0][1])
      const sameCol = rest.every(([r]) => r === rest[0][0])
      if ((sameRow || sameCol) && isConsecutive(rest, sameRow ? 'row' : 'col')) {
        const isAdj = rest.some(([r, c]) => Math.abs(r - lone[0]) <= 1 && Math.abs(c - lone[1]) <= 1)
        const notInLine = sameRow ? lone[1] !== rest[0][1] : lone[0] !== rest[0][0]
        if (isAdj && notInLine) {
          const sorted = sameRow ? [...rest].sort((a, b) => a[1] - b[1]) : [...rest].sort((a, b) => a[0] - b[0])
          const mid = sorted[Math.floor(sorted.length / 2)]
          const shared = findSharedAdjacent(board, mid, lone)
          if (shared.length > 0) {
            const flaggable = filterFlaggableOtherColor(board, shared, colorIdx)
            if (flaggable.length > 0) {
              return {
                ruleName: '多格加一',
                description: `${name}有${active.length}格，${rest.length}格相连成线+1格在旁，共同相邻的其他颜色可画叉`,
                cells: flaggable,
                type: 'flag',
              }
            }
          }
        }
      }
    }
  }
  return null
}

function ruleOnlyOneActiveInLine(board: BoardView): HintInfo | null {
  for (let lineIdx = 0; lineIdx < board.n; lineIdx++) {
    const rowActive = getActiveCellsInLine(board, lineIdx, 'row')
    if (rowActive.length === 1) {
      return {
        ruleName: '唯一活跃行',
        description: `第${lineIdx + 1}行只剩1格，必定是牛`,
        cells: [rowActive[0]],
        type: 'cow',
      }
    }
    const colActive = getActiveCellsInLine(board, lineIdx, 'col')
    if (colActive.length === 1) {
      return {
        ruleName: '唯一活跃列',
        description: `第${lineIdx + 1}列只剩1格，必定是牛`,
        cells: [colActive[0]],
        type: 'cow',
      }
    }
  }
  return null
}

function ruleLineAllSameColor(board: BoardView): HintInfo | null {
  for (let lineIdx = 0; lineIdx < board.n; lineIdx++) {
    const rowHint = checkLineAllSameColor(board, lineIdx, 'row')
    if (rowHint) return rowHint
    const colHint = checkLineAllSameColor(board, lineIdx, 'col')
    if (colHint) return colHint
  }
  return null
}

function checkLineAllSameColor(board: BoardView, lineIdx: number, direction: 'row' | 'col'): HintInfo | null {
  let lineColor = -1
  let allSame = true

  for (let i = 0; i < board.n; i++) {
    const cell = direction === 'row' ? board.grid[lineIdx][i] : board.grid[i][lineIdx]
    if (cell.isRevealed || cell.isFlagged) { allSame = false; break }
    if (lineColor === -1) lineColor = cell.colorIndex
    else if (cell.colorIndex !== lineColor) { allSame = false; break }
  }

  if (allSame && lineColor >= 0) {
    const name = colorName(lineColor)
    const label = direction === 'row' ? '行' : '列'
    const flaggable: [number, number][] = []
    for (let j = 0; j < board.n; j++) {
      if (j === lineIdx) continue
      for (let i = 0; i < board.n; i++) {
        const cell = direction === 'row' ? board.grid[j][i] : board.grid[i][j]
        if (cell.colorIndex === lineColor && !cell.isRevealed && !cell.isFlagged) {
          flaggable.push(direction === 'row' ? [j, i] : [i, j])
        }
      }
    }
    if (flaggable.length > 0) {
      return {
        ruleName: `整${label}同色`,
        description: `第${lineIdx + 1}${label}全是${name}，该色不在该${label}的可画叉`,
        cells: flaggable,
        type: 'flag',
      }
    }
  }
  return null
}

function ruleNColorsNLines(board: BoardView): HintInfo | null {
  const rowHint = checkNColorsNLines(board, 'row')
  if (rowHint) return rowHint
  return checkNColorsNLines(board, 'col')
}

function checkNColorsNLines(board: BoardView, direction: 'row' | 'col'): HintInfo | null {
  const colorLines = new Map<number, Set<number>>()
  for (let colorIdx = 0; colorIdx < board.n; colorIdx++) {
    const active = getActiveCells(board, colorIdx)
    if (active.length === 0) continue
    const lines = new Set(active.map(direction === 'row' ? ([r]) => r : ([, c]) => c))
    colorLines.set(colorIdx, lines)
  }

  const label = direction === 'row' ? '行' : '列'
  const colors = [...colorLines.keys()]
  for (let size = 2; size <= Math.min(colors.length, board.n); size++) {
    const combos = combinations(colors, size)
    for (const combo of combos) {
      const allLines = new Set<number>()
      for (const c of combo) {
        for (const l of colorLines.get(c)!) allLines.add(l)
      }
      if (allLines.size === size) {
        const comboSet = new Set(combo)
        const flaggable: [number, number][] = []
        for (const line of allLines) {
          for (let i = 0; i < board.n; i++) {
            const cell = direction === 'row' ? board.grid[line][i] : board.grid[i][line]
            if (!comboSet.has(cell.colorIndex) && !cell.isRevealed && !cell.isFlagged) {
              flaggable.push(direction === 'row' ? [line, i] : [i, line])
            }
          }
        }
        if (flaggable.length > 0) {
          const names = combo.map(c => colorName(c)).join('、')
          return {
            ruleName: `${size}色${size}${label}`,
            description: `${names}的活跃格全在${size}${label}内，这些${label}中其余颜色可画叉`,
            cells: flaggable,
            type: 'flag',
          }
        }
      }
    }
  }
  return null
}

function ruleNLinesOnlyNColors(board: BoardView): HintInfo | null {
  const rowHint = checkNLinesOnlyNColors(board, 'row')
  if (rowHint) return rowHint
  return checkNLinesOnlyNColors(board, 'col')
}

function checkNLinesOnlyNColors(board: BoardView, direction: 'row' | 'col'): HintInfo | null {
  const lineColors = new Map<number, Set<number>>()
  for (let l = 0; l < board.n; l++) {
    const colors = new Set<number>()
    for (let i = 0; i < board.n; i++) {
      const cell = direction === 'row' ? board.grid[l][i] : board.grid[i][l]
      if (!cell.isRevealed && !cell.isFlagged) colors.add(cell.colorIndex)
    }
    if (colors.size > 0) lineColors.set(l, colors)
  }

  const label = direction === 'row' ? '行' : '列'
  const lines = [...lineColors.keys()]
  for (let size = 2; size <= Math.min(lines.length, board.n); size++) {
    const combos = combinations(lines, size)
    for (const combo of combos) {
      const allColors = new Set<number>()
      for (const l of combo) {
        for (const c of lineColors.get(l)!) allColors.add(c)
      }
      if (allColors.size === size) {
        const flaggable: [number, number][] = []
        for (const colorIdx of allColors) {
          for (let l = 0; l < board.n; l++) {
            if (combo.includes(l)) continue
            for (let i = 0; i < board.n; i++) {
              const cell = direction === 'row' ? board.grid[l][i] : board.grid[i][l]
              if (cell.colorIndex === colorIdx && !cell.isRevealed && !cell.isFlagged) {
                flaggable.push(direction === 'row' ? [l, i] : [i, l])
              }
            }
          }
        }
        if (flaggable.length > 0) {
          const colorNames = [...allColors].map(c => colorName(c)).join('、')
          const lineLabels = combo.map(l => `${l + 1}`).join('、')
          return {
            ruleName: `${size}${label}仅${size}色`,
            description: `第${lineLabels}${label}只活跃了${colorNames}，这些颜色在${label}外可画叉`,
            cells: flaggable,
            type: 'flag',
          }
        }
      }
    }
  }
  return null
}

interface EnumerateCowSolutionsOptions {
  maxSolutions: number
  maxNodes: number
  /** 为 true 时跳过「活跃格过多」限制，用于开局整盘唯一解判定 */
  allowFullBoard?: boolean
}

function enumerateCowSolutions(
  board: BoardView,
  options: EnumerateCowSolutionsOptions,
): { solutions: Set<string>[]; truncated: boolean; activeCells: [number, number][] } {
  const candidatesByRow: [number, number][][] = []
  const activeCells: [number, number][] = []

  for (let r = 0; r < board.n; r++) {
    const row: [number, number][] = []
    for (let c = 0; c < board.n; c++) {
      const cell = board.grid[r][c]
      if (!cell.isRevealed && !cell.isFlagged) {
        row.push([r, c])
        activeCells.push([r, c])
      } else if (cell.isRevealed && cell.hasCow) {
        row.push([r, c])
      }
    }
    candidatesByRow.push(row)
  }

  if (!options.allowFullBoard && activeCells.length > board.n * 4) {
    return { solutions: [], truncated: false, activeCells }
  }

  const solutions: Set<string>[] = []
  const usedCols = new Set<number>()
  const usedColors = new Set<number>()
  const placed: [number, number][] = []
  const solvedRows = new Set<number>()
  let nodeCount = 0
  let truncated = false

  function canPlace(r: number, c: number): boolean {
    const cell = board.grid[r][c]
    if (usedCols.has(c) || usedColors.has(cell.colorIndex)) return false
    for (const [pr, pc] of placed) {
      if (Math.abs(pr - r) <= 1 && Math.abs(pc - c) <= 1) return false
    }
    return true
  }

  function pickRow(): number {
    let bestRow = -1
    let bestCount = Infinity
    for (let r = 0; r < board.n; r++) {
      if (solvedRows.has(r)) continue
      let count = 0
      for (const [rr, cc] of candidatesByRow[r]) {
        if (canPlace(rr, cc)) count++
      }
      if (count < bestCount) {
        bestCount = count
        bestRow = r
      }
    }
    return bestRow
  }

  function search() {
    if (truncated) return
    nodeCount++
    if (nodeCount > options.maxNodes || solutions.length >= options.maxSolutions) {
      truncated = true
      return
    }
    if (solvedRows.size === board.n) {
      solutions.push(new Set(placed.map(([r, c]) => `${r},${c}`)))
      return
    }

    const row = pickRow()
    if (row < 0) return

    solvedRows.add(row)
    for (const [r, c] of candidatesByRow[row]) {
      if (!canPlace(r, c)) continue
      const colorIdx = board.grid[r][c].colorIndex
      usedCols.add(c)
      usedColors.add(colorIdx)
      placed.push([r, c])
      search()
      placed.pop()
      usedColors.delete(colorIdx)
      usedCols.delete(c)
      if (truncated) break
    }
    solvedRows.delete(row)
  }

  search()
  return { solutions, truncated, activeCells }
}

/** 统计满足规则的放牛方案数（达到 limit 即停，用于题库生成） */
export function countCowSolutions(board: BoardView, limit = 2): number {
  const maxNodes = Math.min(120_000, 8_000 + board.n * board.n * 600)
  const { solutions, truncated } = enumerateCowSolutions(board, {
    maxSolutions: limit,
    maxNodes,
    allowFullBoard: true,
  })
  if (truncated) return limit + 1
  return solutions.length
}

export function hasUniqueCowPlacement(board: BoardView): boolean {
  return countCowSolutions(board, 2) === 1
}

export function buildBoardFromColorGrid(n: number, colorGrid: number[][]): BoardView {
  return {
    n,
    grid: colorGrid.map((row, r) =>
      row.map((colorIndex, c) => ({
        colorIndex,
        hasCow: false,
        isRevealed: false,
        isFlagged: false,
        isWrong: false,
      })),
    ),
  }
}

function solutionSetToCows(solution: Set<string>): [number, number][] {
  return [...solution].map((key) => {
    const [r, c] = key.split(',').map(Number)
    return [r, c] as [number, number]
  })
}

/** 枚举完整放牛方案：唯一解或唯一「提示链可解」方案时返回，否则 null */
export function tryInferFullCowPositions(
  n: number,
  colorGrid: number[][],
): [number, number][] | null {
  const board = buildBoardFromColorGrid(n, colorGrid)
  const maxNodes = Math.min(120_000, 8_000 + n * n * 600)
  const { solutions, truncated } = enumerateCowSolutions(board, {
    maxSolutions: 50,
    maxNodes,
    allowFullBoard: true,
  })

  if (truncated || solutions.length === 0) return null
  if (solutions.length === 1) return solutionSetToCows(solutions[0])

  const hintSolvable = solutions.filter((sol) => {
    const testBoard = buildBoardFromColorGrid(n, colorGrid)
    for (const key of sol) {
      const [r, c] = key.split(',').map(Number)
      testBoard.grid[r][c].hasCow = true
    }
    return isHintSolvable(testBoard)
  })

  if (hintSolvable.length === 1) return solutionSetToCows(hintSolvable[0])
  return null
}

export interface InferenceStepLog {
  step: number
  ruleName: string
  type: 'flag' | 'cow'
  description: string
  cellsText: string
}

export interface HintDeductionResult {
  cows: [number, number][]
  steps: InferenceStepLog[]
  stopReason: 'done' | 'no_hint' | 'loop' | 'max_steps'
}

function formatInferenceCells(cells: [number, number][]): string {
  if (cells.length === 0) return ''
  if (cells.length <= 6) {
    return cells.map(([r, c]) => `(${r + 1},${c + 1})`).join(' ')
  }
  return `${cells.length} 格`
}

/**
 * 用当前提示链推演，能确定多少牛就标记多少（不要求布局有完整解）。
 */
export function inferCowsByHintDeduction(
  n: number,
  colorGrid: number[][],
): HintDeductionResult {
  const testBoard = buildBoardFromColorGrid(n, colorGrid)
  const seenHints = new Set<string>()
  const maxSteps = n * n * 4
  const steps: InferenceStepLog[] = []

  function flagCell(row: number, col: number) {
    const cell = testBoard.grid[row][col]
    if (cell.isRevealed || cell.isFlagged) return
    cell.isFlagged = true
  }

  function revealDeducedCow(row: number, col: number) {
    const cell = testBoard.grid[row][col]
    if (cell.isRevealed) return
    cell.hasCow = true
    cell.isRevealed = true
    cell.isFlagged = false

    for (let c = 0; c < n; c++) {
      if (c !== col) flagCell(row, c)
    }
    for (let r = 0; r < n; r++) {
      if (r !== row) flagCell(r, col)
    }
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue
        const nr = row + dr
        const nc = col + dc
        if (nr >= 0 && nr < n && nc >= 0 && nc < n) flagCell(nr, nc)
      }
    }
  }

  let stopReason: HintDeductionResult['stopReason'] = 'no_hint'

  for (let step = 0; step < maxSteps; step++) {
    const hint = getHint(testBoard)
    if (!hint) {
      stopReason = 'no_hint'
      break
    }

    const key = `${hint.type}:${hint.cells.map(([r, c]) => `${r},${c}`).sort().join('|')}`
    if (seenHints.has(key)) {
      stopReason = 'loop'
      break
    }
    seenHints.add(key)

    steps.push({
      step: steps.length + 1,
      ruleName: hint.ruleName,
      type: hint.type,
      description: hint.description,
      cellsText: formatInferenceCells(hint.cells),
    })

    if (hint.type === 'cow') {
      for (const [r, c] of hint.cells) {
        revealDeducedCow(r, c)
      }
    } else {
      for (const [r, c] of hint.cells) {
        if (testBoard.grid[r][c].hasCow) continue
        flagCell(r, c)
      }
    }

    if (step === maxSteps - 1) stopReason = 'max_steps'
    else stopReason = 'done'
  }

  const cows: [number, number][] = []
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (testBoard.grid[r][c].hasCow) cows.push([r, c])
    }
  }
  return { cows, steps, stopReason }
}

const STOP_REASON_LABEL: Record<HintDeductionResult['stopReason'], string> = {
  done: '推演链已应用完当前可用提示',
  no_hint: '无更多可用提示，推演停止',
  loop: '提示重复，推演停止',
  max_steps: '达到步数上限，推演停止',
}

export interface ImportInferenceResult {
  cows: [number, number][]
  note: string
  deductionLog: InferenceStepLog[]
  stopReason: string | null
}

export function inferCowsForImport(
  n: number,
  colorGrid: number[][],
): ImportInferenceResult {
  const full = tryInferFullCowPositions(n, colorGrid)
  if (full && full.length === n) {
    return {
      cows: full,
      note: '已根据颜色布局推断全部牛的位置',
      deductionLog: [{
        step: 1,
        ruleName: '枚举唯一解',
        type: 'cow',
        description: `在 ${n}×${n} 布局下找到唯一合法放牛方案`,
        cellsText: formatInferenceCells(full),
      }],
      stopReason: null,
    }
  }

  const { cows: deduced, steps, stopReason } = inferCowsByHintDeduction(n, colorGrid)
  if (deduced.length > 0) {
    const note = deduced.length === n
      ? '已通过推演链推断全部牛的位置'
      : `已通过推演链推断 ${deduced.length}/${n} 头牛（布局可能无解或不完整）`
    return {
      cows: deduced,
      note,
      deductionLog: steps,
      stopReason: STOP_REASON_LABEL[stopReason],
    }
  }

  if (full && full.length > 0) {
    return {
      cows: full,
      note: `枚举得到 ${full.length}/${n} 头牛（未满足完整约束，仍可导入）`,
      deductionLog: [{
        step: 1,
        ruleName: '枚举多解',
        type: 'cow',
        description: `采用其中一种放牛方案（共 ${full.length} 头）`,
        cellsText: formatInferenceCells(full),
      }],
      stopReason: null,
    }
  }

  return {
    cows: [],
    note: '未能推断牛的位置，已按无牛布局导入',
    deductionLog: steps,
    stopReason: steps.length > 0
      ? STOP_REASON_LABEL[stopReason]
      : '无任何可用推演步骤',
  }
}

/** 已停用：getDeductiveHint 不再调用；保留供日后调整 */
function ruleSolutionSet(board: BoardView): HintInfo | null {
  const { solutions, truncated, activeCells } = enumerateCowSolutions(board, {
    maxSolutions: 200,
    maxNodes: 20_000,
    allowFullBoard: false,
  })

  if (truncated || solutions.length === 0) return null

  for (const [r, c] of activeCells) {
    const key = `${r},${c}`
    if (solutions.every((solution) => solution.has(key))) {
      return {
        ruleName: '唯一解定位',
        description: `所有可解行都要求第${r + 1}行第${c + 1}列是牛`,
        cells: [[r, c]],
        type: 'cow',
      }
    }
  }

  const flaggable = activeCells.filter(([r, c]) => {
    const key = `${r},${c}`
    return solutions.every((solution) => !solution.has(key))
  })
  if (flaggable.length > 0) {
    return {
      ruleName: '唯一解排除',
      description: '这些格子不出现在任何可解行中，可画叉',
      cells: flaggable,
      type: 'flag',
    }
  }

  return null
}

/** 已停用：getHint 不再调用；保留供日后恢复 */
function ruleLimitedGuessCow(board: BoardView): HintInfo | null {
  if ((board.guessHintsUsed ?? 0) >= 3) return null

  for (let colorIdx = 0; colorIdx < board.n; colorIdx++) {
    const active = getActiveCells(board, colorIdx)
    if (active.length < 2 || active.length > 3) continue

    const cow = active.find(([r, c]) => board.grid[r][c].hasCow)
    if (!cow) continue

    return {
      ruleName: '猜测提示',
      description: `${colorName(colorIdx)}只剩${active.length}格，可从中尝试揭开一头牛（本关最多3次）`,
      cells: [cow],
      type: 'cow',
      usesGuess: true,
    }
  }

  return null
}
