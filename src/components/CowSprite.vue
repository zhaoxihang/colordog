<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const SPRITE_URL = `${import.meta.env.BASE_URL}keaitu_sprite.png`
const COLS = 4
const ROWS = 2
const FRAME_COUNT = COLS * ROWS

const props = withDefaults(
  defineProps<{
    size?: number
    /** 是否循环播放；false 时停在第 0 帧 */
    animate?: boolean
  }>(),
  {
    size: 26,
    animate: true,
  },
)

const frame = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const bgPosition = computed(() => {
  const col = frame.value % COLS
  const row = Math.floor(frame.value / COLS)
  const x = COLS > 1 ? (col / (COLS - 1)) * 100 : 0
  const y = ROWS > 1 ? (row / (ROWS - 1)) * 100 : 0
  return `${x}% ${y}%`
})

function stop() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

/** 揭开时快速播一遍，再进入待机循环 */
function playRevealThenIdle() {
  stop()
  let i = 0
  frame.value = 0
  timer = setInterval(() => {
    frame.value = i
    i += 1
    if (i >= FRAME_COUNT) {
      stop()
      startIdleLoop()
    }
  }, 80)
}

function startIdleLoop() {
  stop()
  timer = setInterval(() => {
    frame.value = (frame.value + 1) % FRAME_COUNT
  }, 160)
}

onMounted(() => {
  if (props.animate) {
    playRevealThenIdle()
  } else {
    frame.value = 0
  }
})

onUnmounted(stop)
</script>

<template>
  <span
    class="cow-sprite"
    role="img"
    aria-label="牛"
    :style="{
      width: size + 'px',
      height: size + 'px',
      backgroundImage: `url('${SPRITE_URL}')`,
      backgroundPosition: bgPosition,
    }"
  />
</template>

<style scoped>
.cow-sprite {
  display: inline-block;
  flex-shrink: 0;
  background-repeat: no-repeat;
  background-size: 400% 200%;
}
</style>
