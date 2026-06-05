export interface ColorGridFromImageResult {
  n: number
  mode: 'easy'
  colorGrid: number[][]
}

function isBackground(rgb: [number, number, number]): boolean {
  return rgb[0] > 230 && rgb[1] > 230 && rgb[2] > 230
}

/**
 * 从画布像素数据识别色块网格（与原 color_grid_tool.html 逻辑一致）。
 */
export function extractColorGridFromImageData(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  options?: { minRegionPixels?: number; rowThreshold?: number },
): ColorGridFromImageResult | null {
  const minRegionPixels = options?.minRegionPixels ?? 50
  const rowThreshold = options?.rowThreshold ?? 10

  const visited = new Uint8Array(width * height)
  const regions: [number, number][][] = []

  const idx = (x: number, y: number) => y * width + x
  const rgbAt = (x: number, y: number): [number, number, number] => {
    const i = (y * width + x) * 4
    return [data[i], data[i + 1], data[i + 2]]
  }

  function flood(sx: number, sy: number): [number, number][] {
    const stack: [number, number][] = [[sx, sy]]
    const pts: [number, number][] = []
    visited[idx(sx, sy)] = 1

    while (stack.length > 0) {
      const [x, y] = stack.pop()!
      pts.push([x, y])

      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]) {
        const nx = x + dx
        const ny = y + dy
        if (nx >= 0 && ny >= 0 && nx < width && ny < height) {
          const i = idx(nx, ny)
          if (!visited[i] && !isBackground(rgbAt(nx, ny))) {
            visited[i] = 1
            stack.push([nx, ny])
          }
        }
      }
    }
    return pts
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (visited[idx(x, y)]) continue
      if (isBackground(rgbAt(x, y))) continue
      const region = flood(x, y)
      if (region.length > minRegionPixels) regions.push(region)
    }
  }

  if (regions.length === 0) return null

  const cells = regions.map((region) => {
    let sx = 0
    let sy = 0
    let sr = 0
    let sg = 0
    let sb = 0
    for (const [x, y] of region) {
      sx += x
      sy += y
      const c = rgbAt(x, y)
      sr += c[0]
      sg += c[1]
      sb += c[2]
    }
    const n = region.length
    return { cx: sx / n, cy: sy / n, rgb: [sr / n, sg / n, sb / n] as [number, number, number] }
  })

  cells.sort((a, b) => a.cy - b.cy)

  const rows: typeof cells[] = []
  for (const cell of cells) {
    let placed = false
    for (const row of rows) {
      if (Math.abs(row[0].cy - cell.cy) < rowThreshold) {
        row.push(cell)
        placed = true
        break
      }
    }
    if (!placed) rows.push([cell])
  }

  for (const row of rows) {
    row.sort((a, b) => a.cx - b.cx)
  }

  const palette: [number, number, number][] = []
  function classify(rgb: [number, number, number]): number {
    let min = Infinity
    let id = -1
    palette.forEach((p, i) => {
      const d = (rgb[0] - p[0]) ** 2 + (rgb[1] - p[1]) ** 2 + (rgb[2] - p[2]) ** 2
      if (d < min) {
        min = d
        id = i
      }
    })
    if (min > 500) {
      palette.push(rgb)
      return palette.length - 1
    }
    return id
  }

  const colorGrid = rows.map((row) => row.map((c) => classify(c.rgb)))

  return {
    n: rows.length,
    mode: 'easy',
    colorGrid,
  }
}

export function extractColorGridFromCanvas(canvas: HTMLCanvasElement): ColorGridFromImageResult | null {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const { width, height } = canvas
  if (width === 0 || height === 0) return null
  const imgData = ctx.getImageData(0, 0, width, height)
  return extractColorGridFromImageData(width, height, imgData.data)
}

export function loadImageFileToColorGrid(file: File): Promise<ColorGridFromImageResult | null> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(null)
        return
      }
      ctx.drawImage(img, 0, 0)
      resolve(extractColorGridFromCanvas(canvas))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片加载失败'))
    }
    img.src = url
  })
}
