<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useSkin } from '@/composables/useSkin'
import type { SkinConfig } from '@/utils/skins'

const props = withDefaults(
  defineProps<{
    size?: number
    /** 是否循环播放；false 时停在第 0 帧 */
    animate?: boolean
    /** 指定皮肤；不传则用当前已选皮肤 */
    skin?: SkinConfig
    /** 仅播放待机循环（用于预览） */
    idleOnly?: boolean
  }>(),
  {
    size: 26,
    animate: true,
    idleOnly: false,
  },
)

const { selectedSkin } = useSkin()

const activeSkin = computed(() => props.skin ?? selectedSkin.value)
const spriteUrl = computed(
  () => `${import.meta.env.BASE_URL}${activeSkin.value.sprite}`,
)

const frameCount = computed(
  () => activeSkin.value.cols * activeSkin.value.rows,
)

const frame = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const bgPosition = computed(() => {
  const cols = activeSkin.value.cols
  const rows = activeSkin.value.rows
  const col = frame.value % cols
  const row = Math.floor(frame.value / cols)
  const x = cols > 1 ? (col / (cols - 1)) * 100 : 0
  const y = rows > 1 ? (row / (rows - 1)) * 100 : 0
  return `${x}% ${y}%`
})

const backgroundSize = computed(() => {
  const { cols, rows } = activeSkin.value
  return `${cols * 100}% ${rows * 100}%`
})

function stop() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function playRevealThenIdle() {
  stop()
  let i = 0
  frame.value = 0
  timer = setInterval(() => {
    frame.value = i
    i += 1
    if (i >= frameCount.value) {
      stop()
      startIdleLoop()
    }
  }, 80)
}

function startIdleLoop() {
  stop()
  timer = setInterval(() => {
    frame.value = (frame.value + 1) % frameCount.value
  }, 160)
}

function startAnimation() {
  if (!props.animate) {
    frame.value = 0
    return
  }
  if (props.idleOnly) {
    startIdleLoop()
  } else {
    playRevealThenIdle()
  }
}

onMounted(startAnimation)

watch(activeSkin, () => {
  startAnimation()
})

watch(
  () => [props.animate, props.idleOnly] as const,
  () => {
    startAnimation()
  },
)

onUnmounted(stop)
</script>

<template>
  <span
    class="cow-sprite"
    role="img"
    :aria-label="activeSkin.ariaLabel"
    :style="{
      width: size + 'px',
      height: size + 'px',
      backgroundImage: `url('${spriteUrl}')`,
      backgroundPosition: bgPosition,
      backgroundSize: backgroundSize,
    }"
  />
</template>

<style scoped>
.cow-sprite {
  display: inline-block;
  flex-shrink: 0;
  background-repeat: no-repeat;
}
</style>
