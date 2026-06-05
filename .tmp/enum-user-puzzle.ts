import { buildBoardFromColorGrid, enumerateCowSolutions } from '../src/utils/hintRules'
import { COLOR_NAMES } from '../src/utils/cowPlacer'

const colorGrid = [
  [0,0,0,0,0,1,1,1,1,2,2,3],
  [4,4,5,6,6,1,1,2,1,2,2,3],
  [4,4,5,6,2,1,1,2,2,2,2,3],
  [4,4,2,6,2,2,2,2,2,2,3,3],
  [4,4,2,2,2,2,2,2,2,7,3,3],
  [4,4,8,8,8,8,8,8,8,7,7,3],
  [4,10,8,8,8,8,7,7,7,7,11,3],
  [4,10,10,12,12,12,7,7,7,11,11,3],
  [10,10,10,12,12,12,7,7,7,7,11,3],
  [10,10,10,10,10,12,7,7,11,11,11,3],
  [10,10,10,10,10,12,7,7,11,11,11,11],
  [10,10,10,10,10,10,10,10,11,11,11,11],
]
const n = 12
const board = buildBoardFromColorGrid(n, colorGrid)
const { solutions, truncated } = enumerateCowSolutions(board, {
  maxSolutions: 20,
  maxNodes: 500000,
  allowFullBoard: true,
})
console.log('solutions', solutions.length, 'truncated', truncated)
for (const sol of solutions.slice(0, 5)) {
  const cows = [...sol].map(k => {
    const [r,c] = k.split(',').map(Number)
    return `(${r+1},${c+1})${COLOR_NAMES[colorGrid[r][c]]}`
  })
  console.log(cows.join(' '))
}
const with11 = solutions.filter(s => s.has('0,0'))
const with1162 = with11.filter(s => s.has('5,1'))
console.log('with 赤红@(1,1):', with11.length)
console.log('with 赤红@(1,1) AND 翠绿@(6,2):', with1162.length)
