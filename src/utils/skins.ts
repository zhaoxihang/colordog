export interface SkinConfig {
  id: string
  name: string
  sprite: string
  cols: number
  rows: number
  ariaLabel: string
}

export const SKINS: SkinConfig[] = [
  {
    id: 'keaitu',
    name: '可爱兔',
    sprite: 'keaitu_sprite.png',
    cols: 4,
    rows: 2,
    ariaLabel: '兔',
  },
  {
    id: 'keaimao',
    name: '可爱猫',
    sprite: 'keaimao.png',
    cols: 4,
    rows: 2,
    ariaLabel: '猫',
  },
]

export const DEFAULT_SKIN_ID = 'keaitu'

export function getSkinById(id: string): SkinConfig {
  return SKINS.find((skin) => skin.id === id) ?? SKINS[0]
}
