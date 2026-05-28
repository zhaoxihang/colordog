<script setup lang="ts">
import { computed } from 'vue'
import GridCell from './GridCell.vue'
import type { CellState } from '@/utils/cowPlacer'

const props = defineProps<{
  grid: CellState[][]
  n: number
  hintCells: Set<string>
  hintActive: boolean
}>()

const emit = defineEmits<{
  cellDragStart: [row: number, col: number]
  cellDragOver: [row: number, col: number]
}>()

const cellSize = computed(() => {
  const maxSize = 60
  const minSize = 28
  const available = Math.min(window.innerWidth - 48, 720)
  const size = Math.floor(available / props.n) - 4
  return Math.max(minSize, Math.min(maxSize, size))
})

const gridStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${props.n}, ${cellSize.value}px)`,
  gap: '4px',
  justifyContent: 'center',
}))

const flatCells = computed(() => {
  const cells: { cell: CellState; row: number; col: number }[] = []
  for (let r = 0; r < props.grid.length; r++) {
    for (let c = 0; c < props.grid[r].length; c++) {
      cells.push({ cell: props.grid[r][c], row: r, col: c })
    }
  }
  return cells
})
</script>

<template>
  <div class="game-grid-wrapper">
    <div
      class="game-grid"
      :style="gridStyle"
    >
      <GridCell
        v-for="item in flatCells"
        :key="`${item.row}-${item.col}`"
        :cell="item.cell"
        :row="item.row"
        :col="item.col"
        :cell-size="cellSize"
        :is-hint="hintCells.has(`${item.row},${item.col}`)"
        :hint-active="hintActive"
        @drag-start="(r: number, c: number) => emit('cellDragStart', r, c)"
        @drag-over="(r: number, c: number) => emit('cellDragOver', r, c)"
      />
    </div>
  </div>
</template>

<style scoped>
.game-grid-wrapper {
  display: flex;
  justify-content: center;
  padding: 16px;
  overflow: auto;
}

.game-grid {
  padding: 12px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
