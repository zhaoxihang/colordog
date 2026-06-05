<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import ColorGridTool from '@/components/ColorGridTool.vue'

const router = useRouter()
const jsonForGame = ref('')

function onGenerated(json: string) {
  jsonForGame.value = json
}

function goImportInGame() {
  if (!jsonForGame.value) return
  sessionStorage.setItem('colordog.pendingImport', jsonForGame.value)
  router.push({ path: '/game', query: { import: '1' } })
}
</script>

<template>
  <div class="grid-tool-page">
    <div class="top-bar">
      <button
        type="button"
        class="back-btn"
        @click="router.push('/')"
      >
        ← 首页
      </button>
      <h1 class="page-title">
        图片识别关卡
      </h1>
      <div class="spacer" />
    </div>

    <p class="intro">
      拖入彩色方格截图，自动识别为 <code>n × n</code> 的 colorGrid JSON；识别错的格子可点击画叉排除（无 cows，导入游戏时会自动推演补全）。
    </p>

    <div class="tool-card">
      <ColorGridTool @generated="onGenerated" />
    </div>

    <button
      type="button"
      class="import-game-btn"
      :disabled="!jsonForGame"
      @click="goImportInGame"
    >
      ▶ 导入并开始游戏
    </button>
  </div>
</template>

<style scoped>
.grid-tool-page {
  min-height: 100vh;
  padding: 16px 20px 32px;
  background: linear-gradient(180deg, #0c1f17 0%, #132e1f 40%, #1a4430 100%);
  color: #e2e8f0;
}

.top-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.back-btn {
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  cursor: pointer;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: #fef3c7;
}

.spacer {
  flex: 1;
}

.intro {
  margin: 0 0 16px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.5;
}

.intro code {
  color: #fbbf24;
}

.tool-card {
  max-width: 560px;
  margin: 0 auto;
  padding: 16px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}

.import-game-btn {
  display: block;
  width: 100%;
  max-width: 560px;
  margin: 20px auto 0;
  padding: 12px 24px;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.import-game-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.import-game-btn:not(:disabled):hover {
  transform: scale(1.02);
}
</style>
