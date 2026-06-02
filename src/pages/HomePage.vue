<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import CowSprite from '@/components/CowSprite.vue'
import SkinPickerModal from '@/components/SkinPickerModal.vue'
import { useGame } from '@/composables/useGame'
import { useSkin } from '@/composables/useSkin'

const router = useRouter()
const { startGame } = useGame()
const { selectedSkin, previewSkin, pickerOpen, openPicker } = useSkin()

const heroSkin = computed(() => (pickerOpen.value ? previewSkin.value : selectedSkin.value))

function handleStart() {
  startGame()
  router.push('/game')
}
</script>

<template>
  <div class="home-page">
    <div class="bg-decor">
      <div class="grass" />
      <div class="cloud cloud-1" />
      <div class="cloud cloud-2" />
      <div class="cloud cloud-3" />
    </div>

    <div class="content">
      <div class="hero">
        <div class="logo-cow">
          <CowSprite
            :size="80"
            :skin="heroSkin"
            idle-only
          />
        </div>
        <h1 class="title">
          彩色牛牛
        </h1>
        <p class="subtitle">
          在彩色方格中找出隐藏的牛
        </p>
      </div>

      <div class="rules-card">
        <h3 class="rules-title">
          📋 游戏规则
        </h3>
        <div class="rule-item">
          <span class="rule-icon">🎯</span>
          <span>每行、每列恰好藏着一头牛</span>
        </div>
        <div class="rule-item">
          <span class="rule-icon">🚫</span>
          <span>牛的周围一格内不会有其他牛</span>
        </div>
        <div class="rule-item">
          <span class="rule-icon">🎨</span>
          <span>同色格子连成一片，每种颜色藏一头牛</span>
        </div>
        <div class="rule-item">
          <span class="rule-icon">✕</span>
          <span>点按格子 → 灰色叉（标记无牛）</span>
        </div>
        <div class="rule-item">
          <span class="rule-icon">👆</span>
          <span>快速双击 → 揭开（有牛🐄 / 无牛红色叉）</span>
        </div>
        <div class="rule-item">
          <span class="rule-icon">👆</span>
          <span>滑动格子 → 批量标记灰色叉</span>
        </div>
      </div>

      <button
        type="button"
        class="skin-btn"
        @click="openPicker"
      >
        🎨 选择皮肤
        <span class="skin-btn-current">{{ selectedSkin.name }}</span>
      </button>

      <button
        class="start-btn"
        @click="handleStart"
      >
        🎮 开始游戏
      </button>

      <p class="hint">
        随机生成 4×4 ~ 15×15 的方格
      </p>
    </div>

    <SkinPickerModal v-if="pickerOpen" />
  </div>
</template>

<style scoped>
.home-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #0c1f17 0%, #132e1f 40%, #1a4430 100%);
  position: relative;
  overflow: hidden;
  padding: 24px;
}

.bg-decor {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.grass {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 120px;
  background: linear-gradient(180deg, transparent 0%, rgba(34, 197, 94, 0.15) 100%);
}

.cloud {
  position: absolute;
  width: 120px;
  height: 40px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 40px;
  animation: drift 20s linear infinite;
}

.cloud-1 { top: 15%; left: -120px; animation-duration: 25s; }
.cloud-2 { top: 25%; left: -120px; animation-duration: 30s; animation-delay: 8s; }
.cloud-3 { top: 10%; left: -120px; animation-duration: 22s; animation-delay: 15s; }

@keyframes drift {
  from { transform: translateX(0); }
  to { transform: translateX(calc(100vw + 240px)); }
}

.content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  max-width: 440px;
  width: 100%;
}

.hero {
  text-align: center;
}

.logo-cow {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  animation: float 3s ease-in-out infinite;
  filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.3));
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}

.title {
  font-size: 48px;
  font-weight: 900;
  color: #fef3c7;
  margin: 0;
  text-shadow: 0 4px 16px rgba(251, 191, 36, 0.3);
  letter-spacing: 4px;
}

.subtitle {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.5);
  margin: 8px 0 0;
}

.rules-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 20px 24px;
  width: 100%;
  backdrop-filter: blur(8px);
}

.rules-title {
  font-size: 16px;
  font-weight: 700;
  color: #fbbf24;
  margin: 0 0 14px;
}

.rule-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}

.rule-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.skin-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  color: rgba(255, 255, 255, 0.85);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.skin-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(251, 191, 36, 0.35);
}

.skin-btn-current {
  font-size: 13px;
  font-weight: 600;
  color: #fbbf24;
}

.start-btn {
  padding: 16px 48px;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border: none;
  border-radius: 16px;
  color: #1a1a1a;
  font-size: 20px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 6px 24px rgba(245, 158, 11, 0.3);
  letter-spacing: 2px;
}

.start-btn:hover {
  transform: scale(1.06);
  box-shadow: 0 8px 32px rgba(245, 158, 11, 0.4);
}

.start-btn:active {
  transform: scale(0.97);
}

.hint {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.3);
  margin: 0;
}
</style>
