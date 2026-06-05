<script setup lang="ts">
import { ref } from 'vue'
import { COLORS } from '@/utils/cowPlacer'
import { loadImageFileToColorGrid } from '@/utils/colorGridFromImage'

const emit = defineEmits<{
  generated: [json: string]
}>()

const dropRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const outputJson = ref('')
const sourceGrid = ref<number[][] | null>(null)
const excludedCells = ref<Set<string>>(new Set())
const statusText = ref('拖入图片或点击选择')
const isDragging = ref(false)
const copySuccess = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

function cellKey(r: number, c: number): string {
  return `${r},${c}`
}

function isExcluded(r: number, c: number): boolean {
  return excludedCells.value.has(cellKey(r, c))
}

function buildFilteredGrid(grid: number[][], excluded: Set<string>): number[][] | null {
  const rows: number[][] = []
  for (let r = 0; r < grid.length; r++) {
    const filtered = grid[r].filter((_, c) => !excluded.has(cellKey(r, c)))
    if (filtered.length > 0) rows.push(filtered)
  }
  if (rows.length === 0) return null
  const len = rows[0].length
  if (len !== rows.length || !rows.every((row) => row.length === len)) return null
  return rows
}

function syncOutput() {
  if (!sourceGrid.value) return

  const filtered = buildFilteredGrid(sourceGrid.value, excludedCells.value)
  const excludedCount = excludedCells.value.size
  const sourceN = sourceGrid.value.length

  if (!filtered) {
    outputJson.value = ''
    statusText.value = excludedCount > 0
      ? `已排除 ${excludedCount} 格，当前不是 ${sourceN}×${sourceN} 方形网格，请继续调整`
      : `已识别 ${sourceN}×${sourceN} 色块网格`
    return
  }

  const result = { n: filtered.length, mode: 'easy' as const, colorGrid: filtered }
  const json = JSON.stringify(result, null, 2)
  outputJson.value = json
  statusText.value = excludedCount > 0
    ? `已识别 ${filtered.length}×${filtered.length}（已排除 ${excludedCount} 格）`
    : `已识别 ${filtered.length}×${filtered.length} 色块网格`
  emit('generated', json)
}

function setSourceGrid(grid: number[][]) {
  sourceGrid.value = grid
  excludedCells.value = new Set()
  syncOutput()
}

function toggleExclude(r: number, c: number) {
  if (!sourceGrid.value) return
  const key = cellKey(r, c)
  const next = new Set(excludedCells.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  excludedCells.value = next
  syncOutput()
}

async function processFile(file: File) {
  if (!file.type.startsWith('image/')) {
    statusText.value = '请选择图片文件'
    return
  }

  statusText.value = '识别中…'
  try {
    const result = await loadImageFileToColorGrid(file)
    if (!result) {
      statusText.value = '未识别到足够色块，请换一张图'
      sourceGrid.value = null
      excludedCells.value = new Set()
      outputJson.value = ''
      return
    }

    const canvas = canvasRef.value
    if (canvas) {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        canvas.width = img.width
        canvas.height = img.height
        canvas.getContext('2d')?.drawImage(img, 0, 0)
      }
      img.src = url
    }

    setSourceGrid(result.colorGrid)
  } catch {
    statusText.value = '图片处理失败'
  }
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) void processFile(file)
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  isDragging.value = true
}

function onDragLeave() {
  isDragging.value = false
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) void processFile(file)
  input.value = ''
}

function openFilePicker() {
  fileInputRef.value?.click()
}

function copyJson() {
  if (!outputJson.value) return
  navigator.clipboard.writeText(outputJson.value).then(() => {
    copySuccess.value = true
    setTimeout(() => { copySuccess.value = false }, 1500)
  })
}

function cellColor(index: number): string {
  return COLORS[index] ?? '#888'
}
</script>

<template>
  <div class="color-grid-tool">
    <div
      ref="dropRef"
      class="drop-zone"
      :class="{ dragging: isDragging, 'has-result': !!sourceGrid }"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
      @click="openFilePicker"
    >
      <input
        ref="fileInputRef"
        type="file"
        accept="image/*"
        class="file-input"
        @change="onFileChange"
      >
      <p class="drop-title">
        🖼️ 拖图片到这里
      </p>
      <p class="drop-hint">
        或点击选择 · 自动识别色块生成 JSON
      </p>
      <p class="drop-status">
        {{ statusText }}
      </p>
    </div>

    <canvas
      ref="canvasRef"
      class="preview-canvas"
    />

    <div
      v-if="sourceGrid"
      class="grid-preview-wrap"
    >
      <p class="grid-preview-hint">
        点击错误格子画叉排除（再点一次取消）
      </p>
      <div class="grid-preview">
        <div
          v-for="(row, r) in sourceGrid"
          :key="r"
          class="preview-row"
        >
          <button
            v-for="(colorIdx, c) in row"
            :key="c"
            type="button"
            class="preview-cell"
            :class="{ excluded: isExcluded(r, c) }"
            :style="{ backgroundColor: cellColor(colorIdx) }"
            :title="isExcluded(r, c) ? '已排除，点击恢复' : `颜色 ${colorIdx}，点击排除`"
            @click.stop="toggleExclude(r, c)"
          >
            <svg
              v-if="isExcluded(r, c)"
              class="preview-cross"
              viewBox="0 0 24 24"
            >
              <line
                x1="4" y1="4" x2="20" y2="20"
                stroke="rgba(255, 80, 80, 0.95)"
                stroke-width="3.5"
                stroke-linecap="round"
              />
              <line
                x1="20" y1="4" x2="4" y2="20"
                stroke="rgba(255, 80, 80, 0.95)"
                stroke-width="3.5"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <textarea
      v-model="outputJson"
      class="json-output"
      readonly
      placeholder="识别结果 JSON 将显示在这里"
      rows="5"
    />

    <button
      type="button"
      class="copy-btn"
      :class="{ success: copySuccess }"
      :disabled="!outputJson"
      @click.stop="copyJson"
    >
      {{ copySuccess ? '✓ 已复制' : '📋 复制 JSON' }}
    </button>
  </div>
</template>

<style scoped>
.color-grid-tool {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.drop-zone {
  position: relative;
  min-height: 100px;
  padding: 16px;
  border: 2px dashed rgba(255, 255, 255, 0.25);
  border-radius: 10px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.drop-zone:hover,
.drop-zone.dragging {
  border-color: rgba(251, 191, 36, 0.5);
  background: rgba(251, 191, 36, 0.06);
}

.drop-zone.has-result {
  border-color: rgba(34, 197, 94, 0.35);
}

.file-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.drop-title {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 700;
  color: #fef3c7;
}

.drop-hint,
.drop-status {
  margin: 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
}

.drop-status {
  margin-top: 8px;
  color: rgba(255, 255, 255, 0.6);
}

.preview-canvas {
  max-width: 100%;
  max-height: 160px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  display: block;
}

.grid-preview-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-self: flex-start;
}

.grid-preview-hint {
  margin: 0;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.45);
}

.grid-preview {
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 8px;
}

.preview-row {
  display: flex;
  gap: 2px;
}

.preview-cell {
  position: relative;
  width: 24px;
  height: 24px;
  padding: 0;
  border-radius: 3px;
  border: 1px solid rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease;
}

.preview-cell:hover {
  transform: scale(1.08);
  z-index: 1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
}

.preview-cell.excluded {
  opacity: 0.45;
  border-color: rgba(255, 80, 80, 0.5);
  box-shadow: inset 0 0 0 1px rgba(255, 80, 80, 0.35);
}

.preview-cross {
  position: absolute;
  inset: 2px;
  width: calc(100% - 4px);
  height: calc(100% - 4px);
  pointer-events: none;
  filter: drop-shadow(0 0 4px rgba(255, 80, 80, 0.5));
}

.json-output {
  width: 100%;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #4ade80;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  padding: 8px;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
}

.copy-btn {
  align-self: flex-start;
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.copy-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.copy-btn.success {
  background: rgba(34, 197, 94, 0.2);
  border-color: rgba(34, 197, 94, 0.4);
  color: #4ade80;
}
</style>
