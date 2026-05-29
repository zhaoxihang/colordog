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

export function getHint(board: BoardView): HintInfo | null {
  const rules: ((board: BoardView) => HintInfo | null)[] = [
    ruleSingleColor,
    ruleSameLine,
    ruleThreeCorner,
    ruleFourCorner,
    ruleLinePlusOne,
    ruleOnlyOneActiveInLine,
    ruleLineAllSameColor,
    ruleNColorsNLines,
    ruleNLinesOnlyNColors,
    ruleSolutionSet,
    ruleLimitedGuessCow,
  ]

  for (const rule of rules) {
    const hint = rule(board)
    if (hint) return hint
  }
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

function ruleSingleColor(board: BoardView): HintInfo | null {
  for (let colorIdx = 0; colorIdx < board.n; colorIdx++) {
    const active = getActiveCells(board, colorIdx)
    if (active.length !== 1) continue
    const [r, c] = active[0]
    return {
      ruleName: '唯一颜色',
      description: `${colorName(colorIdx)}只剩1格，这格必定是牛`,
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
        description: `所有可行解都要求第${r + 1}行第${c + 1}列是牛`,
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
      description: '这些格子不出现在任何可行解中，可画叉',
      cells: flaggable,
      type: 'flag',
    }
  }

  return null
}

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
