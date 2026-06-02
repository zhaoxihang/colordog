<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import GameGrid from '@/components/GameGrid.vue'
import StatusBar from '@/components/StatusBar.vue'
import WinModal from '@/components/WinModal.vue'
import CowSprite from '@/components/CowSprite.vue'
import { useGame, type HintInfo } from '@/composables/useGame'
import { COLORS, COLOR_NAMES } from '@/utils/cowPlacer'

const router = useRouter()
const {
  n,
  grid,
  cowsFound,
  totalCows,
  progress,
  showWin,
  isStartingGame,
  isVip,
  startGame,
  ensureGameStarted,
  startDrag,
  dragOver,
  endDrag,
  exportGame,
  importGame,
  revealRandomCow,
  getHint,
  applyHint,
} = useGame()

const showPanel = ref(false)
const jsonText = ref('')
const importText = ref('')
const copySuccess = ref(false)
const importSuccess = ref(false)
const importError = ref(false)
const currentHint = ref<HintInfo | null>(null)
const hintCellsSet = ref<Set<string>>(new Set())

function clearHintUi() {
  currentHint.value = null
  hintCellsSet.value = new Set()
}

async function handleRestart() {
  clearHintUi()
  await startGame()
}

async function handlePlayAgain() {
  clearHintUi()
  await startGame()
}

function handleBackHome() {
  router.push('/')
}

function handleGlobalMouseUp() {
  endDrag()
}

function handleGlobalTouchEnd() {
  endDrag()
}

function handleExport() {
  const data = exportGame()
  jsonText.value = JSON.stringify(data, null, 2)
  showPanel.value = true
}

function handleCopy() {
  navigator.clipboard.writeText(jsonText.value).then(() => {
    copySuccess.value = true
    setTimeout(() => { copySuccess.value = false }, 1500)
  })
}

function handleImport() {
  if (!importText.value.trim()) return
  const ok = importGame(importText.value.trim())
  if (ok) {
    importSuccess.value = true
    importError.value = false
    setTimeout(() => { importSuccess.value = false }, 1500)
  } else {
    importError.value = true
    importSuccess.value = false
    setTimeout(() => { importError.value = false }, 2000)
  }
}

function handleToggleVip() {
  isVip.value = !isVip.value
}

function handleRevealCow() {
  revealRandomCow()
}

function handleHint() {
  const hint = getHint()
  if (hint) {
    currentHint.value = hint
    hintCellsSet.value = new Set(hint.cells.map(([r, c]) => `${r},${c}`))
  } else {
    currentHint.value = { ruleName: '无提示', description: '当前没有可用的推理提示', cells: [], type: 'flag' as const }
    hintCellsSet.value = new Set()
  }
}

function handleApplyHint() {
  if (currentHint.value && currentHint.value.cells.length > 0) {
    applyHint(currentHint.value)
  }
  currentHint.value = null
  hintCellsSet.value = new Set()
}

function handleCloseHint() {
  currentHint.value = null
  hintCellsSet.value = new Set()
}

function isHintCell(r: number, c: number): boolean {
  return hintCellsSet.value.has(`${r},${c}`)
}

function colorizeDescription(desc: string): string {
  let result = desc
  const sorted = [...COLOR_NAMES]
    .map((name, idx) => ({ name, idx }))
    .filter(({ name }) => result.includes(name))
    .sort((a, b) => b.name.length - a.name.length)
  for (const { name, idx } of sorted) {
    result = result.split(name).join(
      `<span style="color:${COLORS[idx]};font-weight:700;text-shadow:0 0 6px ${COLORS[idx]}66">${name}</span>`
    )
  }
  return result
}

onMounted(() => {
  ensureGameStarted()
  window.addEventListener('mouseup', handleGlobalMouseUp)
  window.addEventListener('touchend', handleGlobalTouchEnd)
})

onUnmounted(() => {
  window.removeEventListener('mouseup', handleGlobalMouseUp)
  window.removeEventListener('touchend', handleGlobalTouchEnd)
})
</script>

<template>
  <div class="game-page">
    <div class="bg-pattern" />

    <div class="game-layout">
      <div class="top-bar">
        <button
          class="back-btn"
          @click="handleBackHome"
        >
          ← 首页
        </button>
        <h2 class="game-title">
          彩色牛牛
        </h2>
        <div class="spacer" />
      </div>

      <StatusBar
        :cows-found="cowsFound"
        :total-cows="totalCows"
        :progress="progress"
        :n="n"
        :is-vip="isVip"
        @restart="handleRestart"
        @toggle-vip="handleToggleVip"
      />

      <div class="play-area">
        <div class="grid-area">
          <GameGrid
            :grid="grid"
            :n="n"
            :hint-cells="hintCellsSet"
            :hint-active="!!currentHint"
            @cell-drag-start="startDrag"
            @cell-drag-over="dragOver"
          />
        </div>
        <div
          v-if="currentHint"
          class="hint-bar"
        >
          <div class="hint-info">
            <span class="hint-rule" :class="currentHint.type">{{ currentHint.ruleName }}</span>
            <p
              class="hint-desc"
              v-html="colorizeDescription(currentHint.description)"
            />
          </div>
          <div class="hint-actions">
            <button
              v-if="currentHint.cells.length > 0"
              class="hint-apply-btn"
              :class="currentHint.type"
              @click="handleApplyHint"
            >
              {{ currentHint.type === 'cow' ? '🐄 揭开' : '✅ 应用' }}
            </button>
            <button
              class="hint-close-btn"
              aria-label="关闭提示"
              @click="handleCloseHint"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      <div class="tips">
        <span>点按 = ✕标记</span>
        <span class="divider">|</span>
        <span>快速双击 = 揭开格子</span>
        <span class="divider">|</span>
        <span>滑动 = 批量标记</span>
      </div>

      <div class="action-bar">
        <button
          class="action-btn cow-btn"
          @click="handleRevealCow"
        >
          <CowSprite
            class="cow-btn-sprite"
            :size="24"
            idle-only
          />
          <span>+牛</span>
        </button>
        <button
          class="action-btn hint-btn"
          @click="handleHint"
        >
          💡 提示
        </button>
      </div>

      <div class="io-bar">
        <button
          class="io-btn export-btn"
          @click="handleExport"
        >
          📤 导出
        </button>
        <button
          class="io-btn import-toggle-btn"
          :class="{ active: showPanel }"
          @click="showPanel = !showPanel"
        >
          📥 导入
        </button>
      </div>

      <div
        v-if="showPanel"
        class="io-panel"
      >
        <div class="panel-section">
          <div class="panel-header">
            <span class="panel-title">导出 JSON</span>
            <button
              class="copy-btn"
              :class="{ success: copySuccess }"
              @click="handleCopy"
            >
              {{ copySuccess ? '✓ 已复制' : '📋 复制' }}
            </button>
          </div>
          <textarea
            v-model="jsonText"
            class="json-area"
            readonly
            rows="6"
          />
        </div>

        <div class="panel-section">
          <div class="panel-header">
            <span class="panel-title">导入 JSON</span>
            <button
              class="load-btn"
              :class="{ success: importSuccess, error: importError }"
              @click="handleImport"
            >
              {{ importSuccess ? '✓ 成功' : importError ? '✗ 格式错误' : '▶ 加载' }}
            </button>
          </div>
          <textarea
            v-model="importText"
            class="json-area"
            placeholder="粘贴 JSON 数据..."
            rows="6"
          />
        </div>
      </div>
    </div>

    <WinModal
      v-if="showWin"
      :loading="isStartingGame"
      @play-again="handlePlayAgain"
    />

    <div
      v-if="isStartingGame"
      class="loading-overlay"
    >
      正在加载新关卡…
    </div>
  </div>
</template>

<style scoped>
.game-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #0c1f17 0%, #132e1f 40%, #1a4430 100%);
  position: relative;
  overflow: auto;
}

.bg-pattern {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle at 20% 30%, rgba(34, 197, 94, 0.06) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(251, 191, 36, 0.04) 0%, transparent 50%);
  pointer-events: none;
}

.game-layout {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.top-bar {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  gap: 12px;
}

.back-btn {
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.14);
  color: rgba(255, 255, 255, 0.9);
}

.game-title {
  font-size: 18px;
  font-weight: 700;
  color: #fef3c7;
  margin: 0;
  text-shadow: 0 2px 8px rgba(251, 191, 36, 0.2);
}

.spacer {
  flex: 1;
}

.play-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 0;
  width: 100%;
  padding: 0 12px 4px;
  box-sizing: border-box;
}

.grid-area {
  flex: 0 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.hint-bar {
  flex: 0 0 auto;
  width: 100%;
  max-width: min(100%, 720px);
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 10px;
  background: linear-gradient(135deg, rgba(26, 46, 35, 0.95), rgba(30, 58, 42, 0.95));
  border: 1px solid rgba(251, 191, 36, 0.35);
  border-radius: 12px;
  padding: 10px 12px;
  backdrop-filter: blur(12px);
  box-sizing: border-box;
}

.hint-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.hint-rule {
  font-size: 14px;
  font-weight: 800;
  color: #fbbf24;
  text-shadow: 0 0 8px rgba(251, 191, 36, 0.3);
  line-height: 1.3;
}

.hint-rule.cow {
  color: #4ade80;
  text-shadow: 0 0 8px rgba(34, 197, 94, 0.3);
}

.hint-desc {
  margin: 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.5;
  word-break: break-word;
  overflow-wrap: break-word;
  writing-mode: horizontal-tb;
}

.hint-desc :deep(span) {
  display: inline;
}

.hint-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  align-items: center;
}

.hint-apply-btn {
  padding: 6px 16px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.15));
  border: 1px solid rgba(251, 191, 36, 0.4);
  border-radius: 8px;
  color: #fbbf24;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.hint-apply-btn.cow {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.25), rgba(22, 163, 74, 0.2));
  border-color: rgba(34, 197, 94, 0.4);
  color: #4ade80;
}

.hint-apply-btn:hover {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.35), rgba(22, 163, 74, 0.3));
  transform: scale(1.05);
}

.hint-close-btn {
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.hint-close-btn:hover {
  background: rgba(255, 255, 255, 0.14);
  color: rgba(255, 255, 255, 0.9);
}

.tips {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.35);
  flex-wrap: wrap;
}

.divider {
  color: rgba(255, 255, 255, 0.15);
}

.io-bar {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding: 8px 20px;
}

.io-btn {
  padding: 6px 18px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.io-btn:hover {
  background: rgba(255, 255, 255, 0.14);
  color: rgba(255, 255, 255, 0.9);
}

.io-btn.active {
  background: rgba(251, 191, 36, 0.15);
  border-color: rgba(251, 191, 36, 0.3);
  color: #fbbf24;
}

.io-panel {
  padding: 0 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panel-section {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 12px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.panel-title {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
}

.copy-btn,
.load-btn {
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.copy-btn:hover,
.load-btn:hover {
  background: rgba(255, 255, 255, 0.18);
}

.copy-btn.success,
.load-btn.success {
  background: rgba(34, 197, 94, 0.2);
  border-color: rgba(34, 197, 94, 0.4);
  color: #4ade80;
}

.load-btn.error {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.4);
  color: #f87171;
}

.json-area {
  width: 100%;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.8);
  font-family: 'Courier New', monospace;
  font-size: 11px;
  padding: 8px;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
}

.json-area:focus {
  border-color: rgba(251, 191, 36, 0.4);
}

.json-area::placeholder {
  color: rgba(255, 255, 255, 0.25);
}

.action-bar {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 8px 20px;
}

.action-btn {
  padding: 10px 28px;
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cow-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.15));
  border-color: rgba(34, 197, 94, 0.4);
  color: #4ade80;
}

.cow-btn-sprite {
  flex-shrink: 0;
}

.cow-btn:hover {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(22, 163, 74, 0.25));
  transform: scale(1.05);
  box-shadow: 0 0 16px rgba(34, 197, 94, 0.3);
}

.cow-btn:active {
  transform: scale(0.95);
}

.hint-btn {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.15));
  border-color: rgba(251, 191, 36, 0.4);
  color: #fbbf24;
}

.hint-btn:hover {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.3), rgba(245, 158, 11, 0.25));
  transform: scale(1.05);
  box-shadow: 0 0 16px rgba(251, 191, 36, 0.3);
}

.hint-btn:active {
  transform: scale(0.95);
}

.loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  color: #fef3c7;
  font-size: 16px;
  font-weight: 700;
  backdrop-filter: blur(4px);
}

@media (max-width: 600px) {
  .top-bar {
    padding: 8px 12px;
  }

  .game-title {
    font-size: 16px;
  }

  .play-area {
    padding: 0 8px 4px;
  }

  .hint-bar {
    flex-direction: column;
    align-items: stretch;
    margin-top: 8px;
    padding: 8px 10px;
  }

  .hint-rule {
    font-size: 13px;
  }

  .hint-desc {
    font-size: 12px;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    overflow: hidden;
  }

  .hint-actions {
    justify-content: flex-end;
  }

  .hint-apply-btn,
  .hint-close-btn {
    padding: 8px 14px;
    font-size: 14px;
  }

  .tips {
    display: none;
  }

  .action-bar {
    padding: 6px 12px;
    gap: 10px;
  }

  .action-btn {
    flex: 1;
    padding: 10px 12px;
    font-size: 15px;
  }
}

</style>
