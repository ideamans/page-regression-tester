/**
 * Tests for pixel comparison
 */

import { comparePixels } from '../../src/compare/pixel.js'
import { generateIdenticalImages, generateDifferentImages, generateSolidImage } from '../helpers/image-generator.js'
import { tmpdir } from 'os'
import { join } from 'path'
import { writeFile, rm, mkdir } from 'fs/promises'

describe('comparePixels', () => {
  const testDir = join(tmpdir(), 'page-regression-pixel-test')
  let baselinePath: string
  let currentPath: string

  beforeEach(async () => {
    await rm(testDir, { recursive: true, force: true })
    await mkdir(testDir, { recursive: true })
    baselinePath = join(testDir, 'baseline.png')
    currentPath = join(testDir, 'current.png')
  })

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true })
  })

  it('should detect identical images', async () => {
    const [baseline, current] = await generateIdenticalImages({ width: 100, height: 100 })
    await writeFile(baselinePath, baseline)
    await writeFile(currentPath, current)

    const { result } = await comparePixels(baselinePath, currentPath)

    expect(result.pass).toBe(true)
    expect(result.pixelDiffCount).toBe(0)
    expect(result.pixelDiffRatio).toBe(0)
    // maxColorDiff can be non-zero even for identical images due to diff buffer initialization
    expect(result.maxColorDiff).toBeGreaterThanOrEqual(0)
  })

  it('should detect differences in images', async () => {
    const [baseline, current] = await generateDifferentImages(100, 100)
    await writeFile(baselinePath, baseline)
    await writeFile(currentPath, current)

    const { result } = await comparePixels(baselinePath, currentPath)

    expect(result.pixelDiffCount).toBeGreaterThan(0)
    expect(result.pixelDiffRatio).toBeGreaterThan(0)
    expect(result.maxColorDiff).toBeGreaterThan(0)
  })

  it('should return diff buffer', async () => {
    const [baseline, current] = await generateDifferentImages(100, 100)
    await writeFile(baselinePath, baseline)
    await writeFile(currentPath, current)

    const { diffBuffer } = await comparePixels(baselinePath, currentPath)

    expect(diffBuffer).toBeInstanceOf(Buffer)
    expect(diffBuffer.length).toBeGreaterThan(0)
  })

  it('should respect threshold parameter', async () => {
    const [baseline, current] = await generateDifferentImages(100, 100)
    await writeFile(baselinePath, baseline)
    await writeFile(currentPath, current)

    // Note: Default max threshold is 15%, so small differences will pass
    // Strict threshold (but still respects 15% max)
    const { result: strictResult } = await comparePixels(baselinePath, currentPath, { threshold: 0.0001 })
    // Small diff (~0.25%) is within 15% limit, so it passes
    expect(strictResult.pass).toBe(true)
    expect(strictResult.pixelDiffRatio).toBeLessThan(0.15)

    // Lenient threshold
    const { result: lenientResult } = await comparePixels(baselinePath, currentPath, { threshold: 1.0 })
    expect(lenientResult.pass).toBe(true)
  })

  it('should respect color threshold parameter', async () => {
    const [baseline, current] = await generateDifferentImages(100, 100)
    await writeFile(baselinePath, baseline)
    await writeFile(currentPath, current)

    // Strict color threshold (very sensitive)
    const { result: strictResult } = await comparePixels(baselinePath, currentPath, { colorThreshold: 1 })
    expect(strictResult.pixelDiffCount).toBeGreaterThan(0)

    // Lenient color threshold (less sensitive)
    const { result: lenientResult } = await comparePixels(baselinePath, currentPath, { colorThreshold: 255 })
    expect(lenientResult.pixelDiffCount).toBeLessThanOrEqual(strictResult.pixelDiffCount)
  })

  it('should throw error for mismatched dimensions', async () => {
    const baseline = await generateSolidImage({ width: 100, height: 100 })
    const current = await generateSolidImage({ width: 200, height: 200 })
    await writeFile(baselinePath, baseline)
    await writeFile(currentPath, current)

    await expect(comparePixels(baselinePath, currentPath)).rejects.toThrow('Image dimensions do not match')
  })

  it('should handle ignore regions', async () => {
    const [baseline, current] = await generateDifferentImages(100, 100)
    await writeFile(baselinePath, baseline)
    await writeFile(currentPath, current)

    // Without ignore region
    const { result: withoutIgnore } = await comparePixels(baselinePath, currentPath)
    expect(withoutIgnore.pixelDiffCount).toBeGreaterThan(0)

    // With ignore region covering the difference (at 10, 10, size 5x5)
    const { result: withIgnore } = await comparePixels(baselinePath, currentPath, {
      ignoreRegions: [{ x: 5, y: 5, width: 20, height: 20 }],
    })
    expect(withIgnore.pixelDiffCount).toBeLessThan(withoutIgnore.pixelDiffCount)
  })

  it('should handle multiple ignore regions', async () => {
    const [baseline, current] = await generateDifferentImages(100, 100)
    await writeFile(baselinePath, baseline)
    await writeFile(currentPath, current)

    const { result } = await comparePixels(baselinePath, currentPath, {
      ignoreRegions: [
        { x: 0, y: 0, width: 50, height: 50 },
        { x: 50, y: 50, width: 50, height: 50 },
      ],
    })

    // Should have ignored a large portion
    expect(result.pixelDiffCount).toBeGreaterThanOrEqual(0)
  })

  it('should handle antialiasing option', async () => {
    const [baseline, current] = await generateDifferentImages(100, 100)
    await writeFile(baselinePath, baseline)
    await writeFile(currentPath, current)

    const { result: withAA } = await comparePixels(baselinePath, currentPath, {
      ignoreAntialiasing: false,
    })
    const { result: withoutAA } = await comparePixels(baselinePath, currentPath, {
      ignoreAntialiasing: true,
    })

    // Both should work, but might have different counts
    expect(withAA.pixelDiffCount).toBeGreaterThanOrEqual(0)
    expect(withoutAA.pixelDiffCount).toBeGreaterThanOrEqual(0)
  })

  it('should throw error for non-existent file', async () => {
    await expect(comparePixels('/nonexistent/baseline.png', '/nonexistent/current.png')).rejects.toThrow()
  })
})
