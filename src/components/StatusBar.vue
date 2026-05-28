<script setup lang="ts">
defineProps<{
  cowsFound: number
  totalCows: number
  progress: number
  n: number
  isVip: boolean
}>()

const emit = defineEmits<{
  restart: []
  toggleVip: []
}>()
</script>

<template>
  <div class="status-bar">
    <div class="status-left">
      <span class="cow-icon">🐄</span>
      <span class="count">{{ cowsFound }} / {{ totalCows }}</span>
    </div>
    <div class="status-center">
      <div class="progress-track">
        <div
          class="progress-fill"
          :style="{ width: progress + '%' }"
        />
      </div>
      <span class="size-label">{{ n }}×{{ n }}</span>
    </div>
    <div class="status-right">
      <button
        class="vip-btn"
        :class="{ active: isVip }"
        @click="emit('toggleVip')"
      >
        👑 VIP
      </button>
      <button
        class="restart-btn"
        @click="emit('restart')"
      >
        🔄 重来
      </button>
    </div>
  </div>
</template>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  gap: 12px;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cow-icon {
  font-size: 24px;
}

.count {
  font-size: 18px;
  font-weight: 700;
  color: #fef3c7;
  letter-spacing: 0.5px;
}

.status-center {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  max-width: 280px;
}

.progress-track {
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #fbbf24, #f59e0b);
  border-radius: 4px;
  transition: width 0.4s ease;
}

.size-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  white-space: nowrap;
}

.status-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.vip-btn {
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.35);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.vip-btn.active {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.25), rgba(245, 158, 11, 0.2));
  border-color: rgba(251, 191, 36, 0.5);
  color: #fbbf24;
  text-shadow: 0 0 8px rgba(251, 191, 36, 0.4);
  animation: vip-glow 2s ease-in-out infinite;
}

@keyframes vip-glow {
  0%, 100% { box-shadow: 0 0 4px rgba(251, 191, 36, 0.2); }
  50% { box-shadow: 0 0 12px rgba(251, 191, 36, 0.4); }
}

.restart-btn {
  padding: 6px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.restart-btn:hover {
  background: rgba(255, 255, 255, 0.18);
  transform: scale(1.05);
}

.restart-btn:active {
  transform: scale(0.95);
}
</style>
