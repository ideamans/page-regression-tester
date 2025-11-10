/**
 * Input validation utilities
 */

import type { Viewport, ClipRegion, IgnoreRegion } from '../types.js'

/**
 * Parse viewport string (e.g., "1440x900")
 */
export function parseViewport(viewportStr: string, dpr: number = 1): Viewport {
  const match = viewportStr.match(/^(\d+)x(\d+)$/)
  if (!match) {
    throw new Error(`Invalid viewport format: ${viewportStr}. Expected format: WIDTHxHEIGHT (e.g., 1440x900)`)
  }

  const width = parseInt(match[1], 10)
  const height = parseInt(match[2], 10)

  if (width <= 0 || height <= 0) {
    throw new Error(`Invalid viewport dimensions: width and height must be positive numbers`)
  }

  return { width, height, dpr }
}

/**
 * Parse clip region string (e.g., "0,0,1440,900")
 */
export function parseClipRegion(clipStr: string): ClipRegion {
  const parts = clipStr.split(',').map((s) => parseInt(s.trim(), 10))
  if (parts.length !== 4 || parts.some(isNaN)) {
    throw new Error(`Invalid clip region format: ${clipStr}. Expected format: X,Y,WIDTH,HEIGHT (e.g., 0,0,1440,900)`)
  }

  const [x, y, width, height] = parts
  if (width <= 0 || height <= 0) {
    throw new Error(`Invalid clip region: width and height must be positive numbers`)
  }

  return { x, y, width, height }
}

/**
 * Parse ignore regions string (e.g., "0,0,100,50;1340,0,100,50")
 */
export function parseIgnoreRegions(regionsStr: string): IgnoreRegion[] {
  return regionsStr
    .split(';')
    .map((region) => region.trim())
    .filter((region) => region.length > 0)
    .map((region) => {
      const parts = region.split(',').map((s) => parseInt(s.trim(), 10))
      if (parts.length !== 4 || parts.some(isNaN)) {
        throw new Error(
          `Invalid ignore region format: ${region}. Expected format: X,Y,WIDTH,HEIGHT (e.g., 0,0,100,50)`
        )
      }

      const [x, y, width, height] = parts
      if (width <= 0 || height <= 0) {
        throw new Error(`Invalid ignore region: width and height must be positive numbers`)
      }

      return { x, y, width, height }
    })
}

/**
 * Validate URL
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Validate threshold (0.0 - 1.0)
 */
export function validateThreshold(threshold: number): boolean {
  return threshold >= 0 && threshold <= 1
}

/**
 * Validate color threshold (0 - 255)
 */
export function validateColorThreshold(threshold: number): boolean {
  return threshold >= 0 && threshold <= 255
}
