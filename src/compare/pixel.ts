/**
 * Pixel-level comparison using pixelmatch
 */

import { readFile } from 'fs/promises'
import sharp from 'sharp'
import pixelmatch from 'pixelmatch'
import type { PixelComparisonResult, IgnoreRegion } from '../types.js'
import { logger } from '../utils/logger.js'

/**
 * Load image and convert to raw pixel data
 */
async function loadImageData(
  imagePath: string
): Promise<{ data: Buffer; width: number; height: number; channels: number }> {
  const image = sharp(imagePath)
  const metadata = await image.metadata()

  if (!metadata.width || !metadata.height) {
    throw new Error(`Failed to get image dimensions: ${imagePath}`)
  }

  // Convert to raw RGBA
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true })

  return {
    data,
    width: info.width,
    height: info.height,
    channels: info.channels,
  }
}

/**
 * Create a mask buffer for ignore regions
 */
function createMask(width: number, height: number, ignoreRegions?: IgnoreRegion[]): Uint8Array | undefined {
  if (!ignoreRegions || ignoreRegions.length === 0) {
    return undefined
  }

  const mask = new Uint8Array(width * height)
  mask.fill(255) // 255 = compare this pixel, 0 = ignore this pixel

  for (const region of ignoreRegions) {
    const { x, y, width: w, height: h } = region

    for (let py = y; py < y + h && py < height; py++) {
      for (let px = x; px < x + w && px < width; px++) {
        const idx = py * width + px
        if (idx >= 0 && idx < mask.length) {
          mask[idx] = 0 // Ignore this pixel
        }
      }
    }
  }

  return mask
}

/**
 * Calculate maximum color difference in the diff buffer
 */
function calculateMaxColorDiff(diffData: Uint8Array, width: number, height: number): number {
  let maxDiff = 0

  for (let i = 0; i < width * height; i++) {
    const idx = i * 4
    const r = diffData[idx]
    const g = diffData[idx + 1]
    const b = diffData[idx + 2]

    // Calculate luminance difference
    const diff = Math.max(r, g, b)
    if (diff > maxDiff) {
      maxDiff = diff
    }
  }

  return maxDiff
}

export interface PixelCompareOptions {
  threshold?: number
  colorThreshold?: number
  ignoreAntialiasing?: boolean
  ignoreRegions?: IgnoreRegion[]
}

/**
 * Compare two images at pixel level
 */
export async function comparePixels(
  baselinePath: string,
  currentPath: string,
  options: PixelCompareOptions = {}
): Promise<{ result: PixelComparisonResult; diffBuffer: Buffer }> {
  const threshold = options.threshold ?? 0.002
  const colorThreshold = options.colorThreshold ?? 10

  logger.debug('Loading images...')
  const baseline = await loadImageData(baselinePath)
  const current = await loadImageData(currentPath)

  // Check dimensions match
  if (baseline.width !== current.width || baseline.height !== current.height) {
    throw new Error(
      `Image dimensions do not match: baseline(${baseline.width}x${baseline.height}) vs current(${current.width}x${current.height})`
    )
  }

  const { width, height } = baseline
  const totalPixels = width * height

  logger.debug(`Comparing images: ${width}x${height} (${totalPixels} pixels)`)

  // Create diff buffer
  const diffData = new Uint8Array(width * height * 4)

  // Apply mask to baseline and current if ignore regions specified
  let maskedBaseline = baseline.data
  let maskedCurrent = current.data

  if (options.ignoreRegions && options.ignoreRegions.length > 0) {
    const mask = createMask(width, height, options.ignoreRegions)
    if (mask) {
      maskedBaseline = Buffer.from(baseline.data)
      maskedCurrent = Buffer.from(current.data)

      // Set ignored pixels to same color (black) in both images
      for (let i = 0; i < mask.length; i++) {
        if (mask[i] === 0) {
          const idx = i * 4
          maskedBaseline[idx] = 0
          maskedBaseline[idx + 1] = 0
          maskedBaseline[idx + 2] = 0
          maskedCurrent[idx] = 0
          maskedCurrent[idx + 1] = 0
          maskedCurrent[idx + 2] = 0
        }
      }
    }
  }

  // Perform pixel comparison
  const diffPixelCount = pixelmatch(maskedBaseline, maskedCurrent, diffData, width, height, {
    threshold: colorThreshold / 255, // pixelmatch expects 0-1 range
    includeAA: !options.ignoreAntialiasing,
    alpha: 0.1,
    aaColor: [255, 255, 0], // Yellow for antialiasing
    diffColor: [255, 0, 0], // Red for differences
  })

  // Calculate metrics
  const pixelDiffRatio = diffPixelCount / totalPixels
  const maxColorDiff = calculateMaxColorDiff(diffData, width, height)
  const pass = pixelDiffRatio <= threshold

  logger.debug(
    `Pixel diff: ${diffPixelCount} pixels (${(pixelDiffRatio * 100).toFixed(4)}%), max color diff: ${maxColorDiff}`
  )

  const result: PixelComparisonResult = {
    pixelDiffCount: diffPixelCount,
    pixelDiffRatio,
    maxColorDiff,
    pass,
  }

  // Convert diff data to PNG buffer
  const diffBuffer = await sharp(Buffer.from(diffData), {
    raw: {
      width,
      height,
      channels: 4,
    },
  })
    .png()
    .toBuffer()

  return { result, diffBuffer }
}
