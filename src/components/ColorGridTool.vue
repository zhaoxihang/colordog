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
const previewGrid = ref<number[][] | null>(null)
const statusText = ref('拖入图片或点击选择')
const isDragging = ref(false)
const copySuccess = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

function emitResult(json: string, grid: number[][]) {
  outputJson.value = json
  previewGrid.value = grid
  emit('generated', json)
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
      previewGrid.value = null
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

    const json = JSON.stringify(result, null, 2)
    emitResult(json, result.colorGrid)
    statusText.value = `已识别 ${result.n}×${result.n} 色块网格`
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
      :class="{ dragging: isDragging, 'has-result': !!previewGrid }"
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
      v-if="previewGrid"
      class="grid-preview"
    >
      <div
        v-for="(row, r) in previewGrid"
        :key="r"
        class="preview-row"
      >
        <div
          v-for="(colorIdx, c) in row"
          :key="c"
          class="preview-cell"
          :style="{ backgroundColor: cellColor(colorIdx) }"
          :title="`颜色 ${colorIdx}`"
        />
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

.grid-preview {
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  align-self: flex-start;
  padding: 8px;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 8px;
}

.preview-row {
  display: flex;
  gap: 2px;
}

.preview-cell {
  width: 20px;
  height: 20px;
  border-radius: 3px;
  border: 1px solid rgba(0, 0, 0, 0.2);
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
