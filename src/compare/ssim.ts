/**
 * SSIM (Structural Similarity Index) comparison
 * Based on the paper: "Image Quality Assessment: From Error Visibility to Structural Similarity"
 * by Wang, Bovik, Sheikh, and Simoncelli (2004)
 */

import sharp from 'sharp'
import { SSIMComparisonResult } from '../types.js'
import { logger } from '../utils/logger.js'

/**
 * SSIM parameters (from the original paper)
 */
const K1 = 0.01 // Small constant to stabilize division with weak denominator
const K2 = 0.03 // Small constant to stabilize division with weak denominator
const L = 255 // Dynamic range of pixel values (8-bit grayscale)
const C1 = (K1 * L) ** 2
const C2 = (K2 * L) ** 2
const WINDOW_SIZE = 11 // Gaussian window size

/**
 * Compute mean of a region
 */
function computeMean(data: Buffer, x: number, y: number, width: number, windowSize: number): number {
  let sum = 0
  let count = 0

  const halfWindow = Math.floor(windowSize / 2)
  const startX = Math.max(0, x - halfWindow)
  const endX = Math.min(width, x + halfWindow + 1)
  const startY = Math.max(0, y - halfWindow)
  const endY = Math.min(width, y + halfWindow + 1) // Note: assumes square image for simplicity

  for (let py = startY; py < endY; py++) {
    for (let px = startX; px < endX; px++) {
      const idx = py * width + px
      sum += data[idx]
      count++
    }
  }

  return count > 0 ? sum / count : 0
}

/**
 * Compute variance and covariance of two regions
 */
function computeVariance(
  data1: Buffer,
  data2: Buffer,
  x: number,
  y: number,
  width: number,
  windowSize: number,
  mean1: number,
  mean2: number
): { variance1: number; variance2: number; covariance: number } {
  let sumVar1 = 0
  let sumVar2 = 0
  let sumCovar = 0
  let count = 0

  const halfWindow = Math.floor(windowSize / 2)
  const startX = Math.max(0, x - halfWindow)
  const endX = Math.min(width, x + halfWindow + 1)
  const startY = Math.max(0, y - halfWindow)
  const endY = Math.min(width, y + halfWindow + 1)

  for (let py = startY; py < endY; py++) {
    for (let px = startX; px < endX; px++) {
      const idx = py * width + px
      const diff1 = data1[idx] - mean1
      const diff2 = data2[idx] - mean2
      sumVar1 += diff1 * diff1
      sumVar2 += diff2 * diff2
      sumCovar += diff1 * diff2
      count++
    }
  }

  return {
    variance1: count > 0 ? sumVar1 / count : 0,
    variance2: count > 0 ? sumVar2 / count : 0,
    covariance: count > 0 ? sumCovar / count : 0,
  }
}

/**
 * Compute SSIM between two grayscale images
 */
function computeSSIM(data1: Buffer, data2: Buffer, width: number, height: number): number {
  let ssimSum = 0
  let pixelCount = 0

  // Sample every nth pixel to improve performance
  const step = Math.max(1, Math.floor(WINDOW_SIZE / 2))

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      // Compute local means
      const mean1 = computeMean(data1, x, y, width, WINDOW_SIZE)
      const mean2 = computeMean(data2, x, y, width, WINDOW_SIZE)

      // Compute local variances and covariance
      const { variance1, variance2, covariance } = computeVariance(
        data1,
        data2,
        x,
        y,
        width,
        WINDOW_SIZE,
        mean1,
        mean2
      )

      // SSIM formula
      const numerator = (2 * mean1 * mean2 + C1) * (2 * covariance + C2)
      const denominator = (mean1 * mean1 + mean2 * mean2 + C1) * (variance1 + variance2 + C2)

      const ssim = denominator > 0 ? numerator / denominator : 1
      ssimSum += ssim
      pixelCount++
    }
  }

  return pixelCount > 0 ? ssimSum / pixelCount : 1
}

/**
 * Compare two images using SSIM
 */
export async function compareSSIM(
  baselinePath: string,
  currentPath: string,
  threshold: number
): Promise<SSIMComparisonResult> {
  logger.info('Running SSIM comparison...')

  // Load images and convert to grayscale
  const baseline = await sharp(baselinePath)
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const current = await sharp(currentPath)
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true })

  // Verify dimensions match
  if (
    baseline.info.width !== current.info.width ||
    baseline.info.height !== current.info.height
  ) {
    throw new Error(
      `Image dimensions do not match: baseline ${baseline.info.width}x${baseline.info.height} vs current ${current.info.width}x${current.info.height}`
    )
  }

  const width = baseline.info.width
  const height = baseline.info.height

  // Compute SSIM score
  const ssimScore = computeSSIM(baseline.data, current.data, width, height)
  const ssimDiffRatio = 1 - ssimScore

  const pass = ssimDiffRatio <= threshold

  logger.info(`SSIM score: ${ssimScore.toFixed(4)} (diff: ${ssimDiffRatio.toFixed(4)}) - ${pass ? 'PASS' : 'FAIL'}`)

  return {
    ssimScore,
    ssimDiffRatio,
    pass,
  }
}
