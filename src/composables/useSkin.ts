import { computed, ref } from 'vue'
import { DEFAULT_SKIN_ID, getSkinById, SKINS, type SkinConfig } from '@/utils/skins'

const STORAGE_KEY = 'colordog.skin'

function loadSkinId(): string {
  try {
    const id = localStorage.getItem(STORAGE_KEY)
    if (id && SKINS.some((skin) => skin.id === id)) return id
  } catch {
    // ignore
  }
  return DEFAULT_SKIN_ID
}

function saveSkinId(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // ignore
  }
}

const selectedSkinId = ref(loadSkinId())
const previewSkinId = ref(selectedSkinId.value)
const pickerOpen = ref(false)

export function useSkin() {
  const selectedSkin = computed(() => getSkinById(selectedSkinId.value))
  const previewSkin = computed(() => getSkinById(previewSkinId.value))

  function openPicker() {
    previewSkinId.value = selectedSkinId.value
    pickerOpen.value = true
  }

  function closePicker() {
    pickerOpen.value = false
  }

  function setPreview(id: string) {
    previewSkinId.value = id
  }

  function confirmPreview() {
    selectedSkinId.value = previewSkinId.value
    saveSkinId(selectedSkinId.value)
    pickerOpen.value = false
  }

  function selectSkin(id: string) {
    selectedSkinId.value = id
    previewSkinId.value = id
    saveSkinId(id)
  }

  return {
    skins: SKINS,
    selectedSkin,
    previewSkin,
    selectedSkinId,
    previewSkinId,
    pickerOpen,
    openPicker,
    closePicker,
    setPreview,
    confirmPreview,
    selectSkin,
  }
}

export type { SkinConfig }
