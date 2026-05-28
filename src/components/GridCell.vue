<script setup lang="ts">
import { computed } from 'vue'
import { COLORS } from '@/utils/cowPlacer'
import type { CellState } from '@/utils/cowPlacer'

const props = defineProps<{
  cell: CellState
  row: number
  col: number
  cellSize: number
  isHint: boolean
  hintActive: boolean
}>()

const emit = defineEmits<{
  dragStart: [row: number, col: number]
  dragOver: [row: number, col: number]
}>()

const bgColor = computed(() => COLORS[props.cell.colorIndex] || '#ccc')

const crossSize = computed(() => {
  const s = props.cellSize
  if (s <= 32) return 16
  if (s <= 44) return 22
  return 28
})

const cowSize = computed(() => {
  const s = props.cellSize
  if (s <= 32) return 14
  if (s <= 44) return 20
  return 26
})

function onMouseDown(e: MouseEvent) {
  e.preventDefault()
  emit('dragStart', props.row, props.col)
}

function onMouseEnter() {
  emit('dragOver', props.row, props.col)
}

function onTouchStart(e: TouchEvent) {
  e.preventDefault()
  emit('dragStart', props.row, props.col)
}

function onTouchMove(e: TouchEvent) {
  const touch = e.touches[0]
  const el = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null
  if (el && el.dataset.row !== undefined && el.dataset.col !== undefined) {
    const r = Number(el.dataset.row)
    const c = Number(el.dataset.col)
    emit('dragOver', r, c)
  }
}
</script>

<template>
  <div
    class="cell"
    :class="{
      revealed: cell.isRevealed,
      flagged: cell.isFlagged,
      'has-cow': cell.isRevealed && cell.hasCow,
      'wrong-guess': cell.isWrong,
      'hint-cell': isHint && hintActive,
      'dimmed': hintActive && !isHint,
    }"
    :style="{
      width: cellSize + 'px',
      height: cellSize + 'px',
      backgroundColor: bgColor,
    }"
    :data-row="row"
    :data-col="col"
    @mousedown="onMouseDown"
    @mouseenter="onMouseEnter"
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
  >
    <transition name="pop">
      <svg
        v-if="cell.isFlagged && !cell.isRevealed"
        class="cross-flag"
        :width="crossSize"
        :height="crossSize"
        viewBox="0 0 24 24"
      >
        <line
          x1="4" y1="4" x2="20" y2="20"
          stroke="rgba(200,200,200,0.9)"
          stroke-width="3.5"
          stroke-linecap="round"
        />
        <line
          x1="20" y1="4" x2="4" y2="20"
          stroke="rgba(200,200,200,0.9)"
          stroke-width="3.5"
          stroke-linecap="round"
        />
      </svg>
    </transition>

    <transition name="cow-pop">
      <span
        v-if="cell.isRevealed && cell.hasCow"
        class="cow"
        :style="{ fontSize: cowSize + 'px' }"
      >🐄</span>
    </transition>

    <transition name="wrong-pop">
      <svg
        v-if="cell.isWrong"
        class="cross-wrong"
        :width="crossSize"
        :height="crossSize"
        viewBox="0 0 24 24"
      >
        <line
          x1="4" y1="4" x2="20" y2="20"
          stroke="rgba(255,60,60,0.95)"
          stroke-width="3.5"
          stroke-linecap="round"
        />
        <line
          x1="20" y1="4" x2="4" y2="20"
          stroke="rgba(255,60,60,0.95)"
          stroke-width="3.5"
          stroke-linecap="round"
        />
      </svg>
    </transition>
  </div>
</template>

<style scoped>
.cell {
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 2px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  position: relative;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.cell:hover:not(.revealed) {
  transform: scale(1.08);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.3);
  z-index: 1;
}

.cell:active:not(.revealed) {
  transform: scale(0.95);
}

.cell.revealed {
  cursor: default;
  border-color: rgba(255, 255, 255, 0.15);
}

.cell.revealed:not(.has-cow):not(.wrong-guess) {
  opacity: 0.55;
}

.cell.has-cow {
  animation: cow-glow 0.6s ease;
  border-color: rgba(255, 255, 255, 0.6);
  box-shadow: 0 0 16px rgba(255, 215, 0, 0.5);
}

@keyframes cow-glow {
  0% { transform: scale(1); }
  30% { transform: scale(1.2); }
  60% { transform: scale(0.95); }
  100% { transform: scale(1); }
}

.cell.wrong-guess {
  animation: wrong-shake 0.4s ease;
  border-color: rgba(255, 60, 60, 0.6);
  box-shadow: 0 0 14px rgba(255, 60, 60, 0.45), 0 0 28px rgba(255, 60, 60, 0.2);
}

@keyframes wrong-shake {
  0% { transform: scale(1); }
  15% { transform: scale(1.1) translateX(-2px); }
  30% { transform: scale(1.1) translateX(2px); }
  45% { transform: scale(1.05) translateX(-1px); }
  60% { transform: scale(1.05) translateX(1px); }
  100% { transform: scale(1); }
}

.cross-flag {
  filter: drop-shadow(0 0 6px rgba(200, 200, 200, 0.6)) drop-shadow(0 0 12px rgba(200, 200, 200, 0.3));
}

.cross-wrong {
  filter: drop-shadow(0 0 6px rgba(255, 60, 60, 0.7)) drop-shadow(0 0 14px rgba(255, 60, 60, 0.4));
}

.cell.hint-cell {
  animation: hint-pulse 1s ease-in-out infinite;
  z-index: 10;
  position: relative;
  border-color: rgba(251, 191, 36, 0.8) !important;
}

@keyframes hint-pulse {
  0%, 100% { box-shadow: 0 0 8px rgba(251, 191, 36, 0.4), 0 0 16px rgba(251, 191, 36, 0.2); }
  50% { box-shadow: 0 0 16px rgba(251, 191, 36, 0.7), 0 0 32px rgba(251, 191, 36, 0.4); }
}

.cell.dimmed {
  opacity: 0.3;
  filter: blur(1px);
}

.cow {
  line-height: 1;
}

.pop-enter-active {
  animation: pop-in 0.25s ease;
}
.pop-leave-active {
  animation: pop-in 0.15s ease reverse;
}

@keyframes pop-in {
  0% { transform: scale(0); opacity: 0; }
  70% { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
}

.cow-pop-enter-active {
  animation: cow-bounce 0.5s ease;
}

@keyframes cow-bounce {
  0% { transform: scale(0) rotate(-15deg); opacity: 0; }
  50% { transform: scale(1.3) rotate(5deg); opacity: 1; }
  70% { transform: scale(0.9) rotate(-2deg); }
  100% { transform: scale(1) rotate(0deg); }
}

.wrong-pop-enter-active {
  animation: wrong-pop-in 0.4s ease;
}

@keyframes wrong-pop-in {
  0% { transform: scale(0) rotate(0deg); opacity: 0; }
  50% { transform: scale(1.3) rotate(10deg); opacity: 1; }
  75% { transform: scale(0.9) rotate(-5deg); }
  100% { transform: scale(1) rotate(0deg); }
}
</style>
