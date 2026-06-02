<script setup lang="ts">
import CowSprite from '@/components/CowSprite.vue'
import { useSkin } from '@/composables/useSkin'
const {
  skins,
  previewSkin,
  previewSkinId,
  setPreview,
  confirmPreview,
  closePicker,
} = useSkin()

function handleSelect(id: string) {
  setPreview(id)
}
</script>

<template>
  <div
    class="skin-overlay"
    @click.self="closePicker"
  >
    <div class="skin-modal">
      <div class="skin-modal-header">
        <h2 class="skin-modal-title">
          选择皮肤
        </h2>
        <button
          type="button"
          class="skin-close-btn"
          aria-label="关闭"
          @click="closePicker"
        >
          ✕
        </button>
      </div>

      <p class="skin-modal-hint">
        点击卡片预览，确认后在对局中生效
      </p>

      <div class="skin-preview-large">
        <CowSprite
          :size="96"
          :skin="previewSkin"
          idle-only
        />
        <span class="skin-preview-name">{{ previewSkin.name }}</span>
      </div>

      <div class="skin-options">
        <button
          v-for="skin in skins"
          :key="skin.id"
          type="button"
          class="skin-option"
          :class="{ active: previewSkinId === skin.id }"
          @click="handleSelect(skin.id)"
        >
          <div class="skin-option-preview">
            <CowSprite
              :size="56"
              :skin="skin"
              idle-only
            />
          </div>
          <span class="skin-option-name">{{ skin.name }}</span>
        </button>
      </div>

      <div class="skin-modal-actions">
        <button
          type="button"
          class="skin-btn secondary"
          @click="closePicker"
        >
          取消
        </button>
        <button
          type="button"
          class="skin-btn primary"
          @click="confirmPreview"
        >
          确认使用
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.skin-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(6px);
}

.skin-modal {
  width: 100%;
  max-width: 400px;
  background: linear-gradient(160deg, #1a3a2a 0%, #0f2418 100%);
  border: 2px solid rgba(251, 191, 36, 0.35);
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.45);
}

.skin-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.skin-modal-title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: #fef3c7;
}

.skin-close-btn {
  width: 32px;
  height: 32px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.7);
  font-size: 16px;
  cursor: pointer;
}

.skin-modal-hint {
  margin: 0 0 16px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

.skin-preview-large {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px;
  margin-bottom: 16px;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.skin-preview-name {
  font-size: 16px;
  font-weight: 700;
  color: #fbbf24;
}

.skin-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
}

.skin-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 8px;
  border: 2px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
}

.skin-option:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-2px);
}

.skin-option.active {
  border-color: rgba(251, 191, 36, 0.7);
  background: rgba(251, 191, 36, 0.1);
  box-shadow: 0 0 16px rgba(251, 191, 36, 0.2);
}

.skin-option-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 64px;
}

.skin-option-name {
  font-size: 14px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.85);
}

.skin-modal-actions {
  display: flex;
  gap: 10px;
}

.skin-btn {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  border: none;
  transition: transform 0.15s ease;
}

.skin-btn:active {
  transform: scale(0.97);
}

.skin-btn.secondary {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.skin-btn.primary {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #1a1a1a;
  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35);
}
</style>
