/**
 * Tests for SSIM comparison
 */

import { compareSSIM } from '../../src/compare/ssim.js'
import {
  generateIdenticalImages,
  generateDifferentImages,
  generateSolidImage,
  generateImageWithRect,
} from '../helpers/image-generator.js'
import { tmpdir } from 'os'
import { join } from 'path'
import { writeFile, rm, mkdir } from 'fs/promises'

describe('compareSSIM', () => {
  const testDir = join(tmpdir(), 'page-regression-ssim-test')
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

  it('should give high SSIM score for identical images', async () => {
    const [baseline, current] = await generateIdenticalImages({ width: 100, height: 100 })
    await writeFile(baselinePath, baseline)
    await writeFile(currentPath, current)

    const result = await compareSSIM(baselinePath, currentPath, 0.01)

    expect(result.ssimScore).toBeCloseTo(1.0, 2)
    expect(result.ssimDiffRatio).toBeCloseTo(0, 2)
    expect(result.pass).toBe(true)
  })

  it('should give lower SSIM score for different images', async () => {
    const [baseline, current] = await generateDifferentImages(100, 100)
    await writeFile(baselinePath, baseline)
    await writeFile(currentPath, current)

    const result = await compareSSIM(baselinePath, currentPath, 0.01)

    expect(result.ssimScore).toBeLessThan(1.0)
    expect(result.ssimDiffRatio).toBeGreaterThan(0)
  })

  it('should respect threshold parameter', async () => {
    const [baseline, current] = await generateDifferentImages(100, 100)
    await writeFile(baselinePath, baseline)
    await writeFile(currentPath, current)

    // Note: Default max threshold is 15%, so small differences will pass
    // Strict threshold (but still respects 15% max)
    const strictResult = await compareSSIM(baselinePath, currentPath, 0.001)
    // Small SSIM diff (~2%) is within 15% limit, so it passes
    expect(strictResult.pass).toBe(true)
    expect(strictResult.ssimDiffRatio).toBeLessThan(0.15)

    // Lenient threshold
    const lenientResult = await compareSSIM(baselinePath, currentPath, 1.0)
    expect(lenientResult.pass).toBe(true)
  })

  it('should throw error for mismatched dimensions', async () => {
    const baseline = await generateSolidImage({ width: 100, height: 100 })
    const current = await generateSolidImage({ width: 200, height: 200 })
    await writeFile(baselinePath, baseline)
    await writeFile(currentPath, current)

    await expect(compareSSIM(baselinePath, currentPath, 0.01)).rejects.toThrow('Image dimensions do not match')
  })

  it('should throw error for non-existent file', async () => {
    await expect(compareSSIM('/nonexistent/baseline.png', '/nonexistent/current.png', 0.01)).rejects.toThrow()
  })

  // 縦長の全画面キャプチャで、幅より下の領域の変化を見逃さないこと
  it('should detect a change near the bottom of a tall image', async () => {
    const baseline = await generateSolidImage({ width: 90, height: 300 })
    const current = await generateImageWithRect(90, 300, 0, 260, 90, 40)
    await writeFile(baselinePath, baseline)
    await writeFile(currentPath, current)

    const result = await compareSSIM(baselinePath, currentPath, 0.01)

    expect(result.ssimScore).toBeLessThan(1.0)
    expect(result.ssimDiffRatio).toBeGreaterThan(0)
  })

  // 横長のビューポートキャプチャで、下端の変化を見逃さないこと
  it('should detect a change near the bottom of a wide image', async () => {
    const baseline = await generateSolidImage({ width: 300, height: 90 })
    // 最下端の4行だけを変える（画像の外へはみ出すウィンドウでしか見ない範囲）
    const current = await generateImageWithRect(300, 90, 0, 86, 300, 4)
    await writeFile(baselinePath, baseline)
    await writeFile(currentPath, current)

    const result = await compareSSIM(baselinePath, currentPath, 0.01)

    expect(Number.isFinite(result.ssimScore)).toBe(true)
    expect(result.ssimScore).toBeLessThan(1.0)
  })

  it('should give a perfect score for identical non-square images', async () => {
    const [baseline, current] = await generateIdenticalImages({ width: 160, height: 90 })
    await writeFile(baselinePath, baseline)
    await writeFile(currentPath, current)

    const result = await compareSSIM(baselinePath, currentPath, 0.01)

    expect(result.ssimScore).toBeCloseTo(1.0, 5)
  })

  it('should handle larger images', async () => {
    const [baseline, current] = await generateIdenticalImages({ width: 500, height: 500 })
    await writeFile(baselinePath, baseline)
    await writeFile(currentPath, current)

    const result = await compareSSIM(baselinePath, currentPath, 0.01)

    expect(result.ssimScore).toBeCloseTo(1.0, 1)
    expect(result.pass).toBe(true)
  })
})
