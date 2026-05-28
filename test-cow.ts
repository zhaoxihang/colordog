import { createGameState, type GameMode } from './src/utils/cowPlacer'

const DIRS_4: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]]
const DIRS_8: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
]

function bfs(colorGrid: number[][], n: number, startR: number, startC: number, color: number, dirs: [number, number][]): Set<string> {
  const visited = new Set<string>()
  const queue: [number, number][] = [[startR, startC]]
  visited.add(`${startR},${startC}`)
  while (queue.length > 0) {
    const [r, c] = queue.shift()!
    for (const [dr, dc] of dirs) {
      const nr = r + dr
      const nc = c + dc
      const key = `${nr},${nc}`
      if (nr >= 0 && nr < n && nc >= 0 && nc < n && !visited.has(key) && colorGrid[nr][nc] === color) {
        visited.add(key)
        queue.push([nr, nc])
      }
    }
  }
  return visited
}

function testMode(mode: GameMode) {
  let totalPass = 0
  let totalFail = 0
  const dirs = mode === 'easy' ? DIRS_4 : DIRS_8
  const modeLabel = mode === 'easy' ? '低级' : '高级'

  for (let n = 4; n <= 15; n++) {
    for (let trial = 0; trial < 10; trial++) {
      const gs = createGameState(n, mode)
      const { grid } = gs

      let cowCount = 0
      const rowCows = new Array(n).fill(0)
      const colCows = new Array(n).fill(0)
      const cowPositions: [number, number][] = []
      const colorGrid: number[][] = Array.from({ length: n }, () => Array(n).fill(-1))

      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          colorGrid[r][c] = grid[r][c].colorIndex
          if (grid[r][c].hasCow) {
            cowCount++
            rowCows[r]++
            colCows[c]++
            cowPositions.push([r, c])
          }
        }
      }

      if (cowCount !== n) {
        console.log(`FAIL [${modeLabel}] n=${n} trial=${trial}: cowCount=${cowCount}`)
        totalFail++
        continue
      }

      let rowOk = true
      let colOk = true
      for (let i = 0; i < n; i++) {
        if (rowCows[i] !== 1) rowOk = false
        if (colCows[i] !== 1) colOk = false
      }
      if (!rowOk || !colOk) {
        console.log(`FAIL [${modeLabel}] n=${n} trial=${trial}: row/col constraint`)
        totalFail++
        continue
      }

      let adjOk = true
      for (let i = 0; i < cowPositions.length; i++) {
        for (let j = i + 1; j < cowPositions.length; j++) {
          const dr = Math.abs(cowPositions[i][0] - cowPositions[j][0])
          const dc = Math.abs(cowPositions[i][1] - cowPositions[j][1])
          if (dr <= 1 && dc <= 1) adjOk = false
        }
      }
      if (!adjOk) {
        console.log(`FAIL [${modeLabel}] n=${n} trial=${trial}: adjacent cows`)
        totalFail++
        continue
      }

      const colorCounts = new Array(n).fill(0)
      const cowColorSet = new Set<number>()
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          colorCounts[colorGrid[r][c]]++
          if (grid[r][c].hasCow) cowColorSet.add(colorGrid[r][c])
        }
      }

      let totalCells = colorCounts.reduce((a, b) => a + b, 0)
      if (totalCells !== n * n) {
        console.log(`FAIL [${modeLabel}] n=${n} trial=${trial}: total cells=${totalCells}`)
        totalFail++
        continue
      }

      let allColorsPresent = true
      for (let i = 0; i < n; i++) {
        if (colorCounts[i] < 1) allColorsPresent = false
      }
      if (!allColorsPresent || cowColorSet.size !== n) {
        console.log(`FAIL [${modeLabel}] n=${n} trial=${trial}: color presence`)
        totalFail++
        continue
      }

      let connectedOk = true
      for (let color = 0; color < n; color++) {
        let startR = -1, startC = -1
        for (let r = 0; r < n; r++) {
          for (let c = 0; c < n; c++) {
            if (colorGrid[r][c] === color) { startR = r; startC = c; break }
          }
          if (startR >= 0) break
        }
        const visited = bfs(colorGrid, n, startR, startC, color, dirs)
        if (visited.size !== colorCounts[color]) {
          connectedOk = false
          console.log(`FAIL [${modeLabel}] n=${n} trial=${trial}: color ${color} not connected (visited=${visited.size}, count=${colorCounts[color]})`)
        }
      }

      if (!connectedOk) { totalFail++; continue }

      const maxCount = Math.max(...colorCounts)
      const minCount = Math.min(...colorCounts)
      console.log(`PASS [${modeLabel}] n=${n} trial=${trial} (sizes: min=${minCount} max=${maxCount} ratio=${(maxCount/minCount).toFixed(1)})`)
      totalPass++
    }
  }

  console.log(`\n=== ${modeLabel}模式: ${totalPass} PASS, ${totalFail} FAIL ===\n`)
  return { totalPass, totalFail }
}

const easy = testMode('easy')
const hard = testMode('hard')
console.log(`\n=== 总计: ${easy.totalPass + hard.totalPass} PASS, ${easy.totalFail + hard.totalFail} FAIL ===`)
