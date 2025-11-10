/**
 * Compare command implementation
 */

import { writeFile } from 'fs/promises'
import type { CompareOptions, ComparisonResult } from '../types.js'
import { logger } from '../utils/logger.js'
import { ensureDir, fileExists, resolvePath } from '../utils/file.js'
import { comparePixels } from './pixel.js'
import { generateDiffImage } from './diff-image.js'
import { compareSSIM } from './ssim.js'

/**
 * Generate text report from comparison result (concise, human-readable)
 */
function generateTextReport(result: ComparisonResult): string {
  const lines: string[] = []

  // Most important info first
  lines.push(`result: ${result.overallPass ? 'PASS' : 'FAIL'}`)
  lines.push(`score: ${(result.overallScore * 100).toFixed(2)}%`)
  lines.push(`timestamp: ${result.timestamp}`)

  // Detailed results if failed
  if (!result.overallPass) {
    if (result.results.pixel && !result.results.pixel.pass) {
      lines.push(`pixel: ${(result.results.pixel.pixelDiffRatio * 100).toFixed(2)}% diff`)
    }
    if (result.results.ssim && !result.results.ssim.pass) {
      lines.push(`ssim: ${result.results.ssim.ssimScore.toFixed(4)}`)
    }
  }

  return lines.join('\n') + '\n'
}

/**
 * Execute compare command
 */
export async function executeCompare(options: CompareOptions): Promise<ComparisonResult> {
  const baselinePath = resolvePath(options.baseline)
  const currentPath = resolvePath(options.current)
  const outputDir = resolvePath(options.output)

  // Validate input files exist
  if (!(await fileExists(baselinePath))) {
    throw new Error(`Baseline image not found: ${baselinePath}`)
  }

  if (!(await fileExists(currentPath))) {
    throw new Error(`Current image not found: ${currentPath}`)
  }

  logger.info(`Comparing images...`)
  logger.info(`Baseline: ${baselinePath}`)
  logger.info(`Current: ${currentPath}`)

  const methods = options.method || ['pixel']
  const threshold = options.threshold ?? 0.002
  const timestamp = new Date().toISOString()

  const result: ComparisonResult = {
    baseline: baselinePath,
    current: currentPath,
    timestamp,
    methods,
    threshold,
    results: {},
    overallPass: true,
    overallScore: 1.0, // Will be calculated later
  }

  // Ensure output directory exists
  await ensureDir(`${outputDir}/result.json`)

  // Pixel comparison
  if (methods.includes('pixel')) {
    logger.info('Running pixel comparison...')

    const { result: pixelResult, diffBuffer } = await comparePixels(baselinePath, currentPath, {
      threshold,
      colorThreshold: options.colorThreshold,
      ignoreAntialiasing: options.ignoreAntialiasing,
      ignoreRegions: options.ignoreRegions,
    })

    result.results.pixel = pixelResult

    if (!pixelResult.pass) {
      result.overallPass = false
    }

    logger.info(
      `Pixel diff: ${pixelResult.pixelDiffCount} pixels (${(pixelResult.pixelDiffRatio * 100).toFixed(4)}%) - ${pixelResult.pass ? 'PASS' : 'FAIL'}`
    )

    // Generate diff images
    const diffStyle = options.diffStyle || 'heatmap'

    logger.info(`Generating diff image (${diffStyle})...`)
    const diffImage = await generateDiffImage({
      style: diffStyle,
      baselinePath,
      currentPath,
      diffBuffer,
    })

    const diffPath = `${outputDir}/diff-${diffStyle}.png`
    await writeFile(diffPath, diffImage)
    logger.success(`Diff image saved: ${diffPath}`)

    // Also save heatmap if a different style was chosen
    if (diffStyle !== 'heatmap') {
      const heatmapPath = `${outputDir}/diff-heatmap.png`
      await writeFile(heatmapPath, diffBuffer)
      logger.success(`Heatmap saved: ${heatmapPath}`)
    }
  }

  // SSIM comparison
  if (methods.includes('ssim')) {
    const ssimResult = await compareSSIM(baselinePath, currentPath, threshold)

    result.results.ssim = ssimResult

    if (!ssimResult.pass) {
      result.overallPass = false
    }

    logger.info(
      `SSIM score: ${ssimResult.ssimScore.toFixed(4)} (diff: ${(ssimResult.ssimDiffRatio * 100).toFixed(4)}%) - ${ssimResult.pass ? 'PASS' : 'FAIL'}`
    )
  }


  // Calculate overall similarity score (0.0-1.0, where 1.0 means identical)
  let scoreSum = 0
  let scoreCount = 0

  if (result.results.pixel) {
    // Pixel: 1.0 - diffRatio
    scoreSum += 1.0 - result.results.pixel.pixelDiffRatio
    scoreCount++
  }

  if (result.results.ssim) {
    // SSIM: already 0.0-1.0 where 1.0 is identical
    scoreSum += result.results.ssim.ssimScore
    scoreCount++
  }

  // Calculate average score across all methods used
  result.overallScore = scoreCount > 0 ? scoreSum / scoreCount : 1.0

  // Override: If overall similarity is >= 85% (diff <= 15%), consider it PASS
  if (result.overallScore >= 0.85) {
    result.overallPass = true
  }

  // Save text report
  if (options.txt !== false) {
    const txtPath = `${outputDir}/result.txt`
    const textReport = generateTextReport(result)
    await writeFile(txtPath, textReport)
    logger.success(`Text report saved: ${txtPath}`)
  }

  // Save JSON result
  if (options.json !== false) {
    const jsonPath = `${outputDir}/result.json`
    await writeFile(jsonPath, JSON.stringify(result, null, 2))
    logger.success(`JSON result saved: ${jsonPath}`)
  }

  // Summary
  logger.info('---')
  logger.info(`Overall Score: ${(result.overallScore * 100).toFixed(2)}% similarity`)
  logger.info(`Overall: ${result.overallPass ? 'PASS ✓' : 'FAIL ✗'}`)

  return result
}
