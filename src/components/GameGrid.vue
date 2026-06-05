<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
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

const viewport = ref({
  w: typeof window !== 'undefined' ? window.innerWidth : 390,
  h: typeof window !== 'undefined' ? window.innerHeight : 844,
})

function readViewport() {
  const vv = window.visualViewport
  viewport.value = {
    w: vv?.width ?? window.innerWidth,
    h: vv?.height ?? window.innerHeight,
  }
}

onMounted(() => {
  readViewport()
  window.addEventListener('resize', readViewport)
  window.visualViewport?.addEventListener('resize', readViewport)
})

onUnmounted(() => {
  window.removeEventListener('resize', readViewport)
  window.visualViewport?.removeEventListener('resize', readViewport)
})

const layoutMetrics = computed(() => {
  const n = props.n
  const isMobile = viewport.value.w <= 600
  const isLarge = n >= 10

  if (isLarge && isMobile) {
    return { gap: 2, gridPad: 4, wrapPad: 2, sideMargin: 16, uiChromeH: 210 }
  }
  if (n >= 8 && isMobile) {
    return { gap: 3, gridPad: 6, wrapPad: 6, sideMargin: 20, uiChromeH: 195 }
  }
  return { gap: 4, gridPad: 12, wrapPad: 16, sideMargin: 24, uiChromeH: isMobile ? 175 : 100 }
})

const cellSize = computed(() => {
  const n = props.n
  const { w, h } = viewport.value
  const { gap, gridPad, wrapPad, sideMargin, uiChromeH } = layoutMetrics.value
  const isMobile = w <= 600

  const innerW = w - sideMargin - wrapPad * 2
  const innerH = h - uiChromeH - wrapPad * 2
  const fromW = (innerW - gridPad * 2 - gap * (n - 1)) / n
  const fromH = (innerH - gridPad * 2 - gap * (n - 1)) / n

  const maxSize = 60
  const minSize = n >= 12 ? 16 : n >= 10 ? 18 : isMobile ? 22 : 28

  const size = Math.floor(Math.min(fromW, fromH, maxSize))
  return Math.max(minSize, size)
})

const gridStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${props.n}, ${cellSize.value}px)`,
  gap: `${layoutMetrics.value.gap}px`,
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
  <div
    class="game-grid-wrapper"
    :class="{ 'is-compact': props.n >= 8 }"
    :style="{ padding: `${layoutMetrics.wrapPad}px` }"
  >
    <div
      class="game-grid"
      :style="{
        ...gridStyle,
        padding: `${layoutMetrics.gridPad}px`,
      }"
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
  overflow: hidden;
  max-width: 100%;
  box-sizing: border-box;
}

.game-grid-wrapper.is-compact .game-grid {
  border-radius: 10px;
}

.game-grid {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-sizing: border-box;
}
</style>
