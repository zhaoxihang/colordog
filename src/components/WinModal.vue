<script setup lang="ts">
defineEmits<{
  playAgain: []
}>()
</script>

<template>
  <div
    class="win-overlay"
    @click.self="() => {}"
  >
    <div class="win-modal">
      <div class="confetti">
        🎉
      </div>
      <h2 class="win-title">
        恭喜通关！
      </h2>
      <p class="win-subtitle">
        你找到了所有的牛！
      </p>
      <div class="win-cows">
        🐄🐄🐄
      </div>
      <button
        class="play-again-btn"
        @click="$emit('playAgain')"
      >
        🔄 再来一局
      </button>
    </div>
  </div>
</template>

<style scoped>
.win-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  animation: fade-in 0.3s ease;
}

.win-modal {
  background: linear-gradient(135deg, #1a3a2a 0%, #0f2418 100%);
  border: 2px solid rgba(251, 191, 36, 0.4);
  border-radius: 24px;
  padding: 40px 48px;
  text-align: center;
  animation: modal-pop 0.5s ease;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5), 0 0 40px rgba(251, 191, 36, 0.15);
}

.confetti {
  font-size: 48px;
  margin-bottom: 12px;
  animation: bounce 0.6s ease infinite alternate;
}

.win-title {
  font-size: 32px;
  font-weight: 800;
  color: #fbbf24;
  margin: 0 0 8px;
  text-shadow: 0 2px 8px rgba(251, 191, 36, 0.3);
}

.win-subtitle {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0 0 20px;
}

.win-cows {
  font-size: 36px;
  margin-bottom: 24px;
  letter-spacing: 8px;
}

.play-again-btn {
  padding: 12px 32px;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border: none;
  border-radius: 12px;
  color: #1a1a1a;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 16px rgba(245, 158, 11, 0.3);
}

.play-again-btn:hover {
  transform: scale(1.06);
  box-shadow: 0 6px 24px rgba(245, 158, 11, 0.4);
}

.play-again-btn:active {
  transform: scale(0.97);
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes modal-pop {
  0% { transform: scale(0.5); opacity: 0; }
  70% { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes bounce {
  from { transform: translateY(0); }
  to { transform: translateY(-8px); }
}
</style>
