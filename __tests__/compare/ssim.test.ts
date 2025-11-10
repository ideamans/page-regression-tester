/**
 * Tests for SSIM comparison
 */

import { compareSSIM } from '../../src/compare/ssim.js'
import { generateIdenticalImages, generateDifferentImages, generateSolidImage } from '../helpers/image-generator.js'
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

    // Strict threshold
    const strictResult = await compareSSIM(baselinePath, currentPath, 0.001)
    expect(strictResult.pass).toBe(false)

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

  it('should handle larger images', async () => {
    const [baseline, current] = await generateIdenticalImages({ width: 500, height: 500 })
    await writeFile(baselinePath, baseline)
    await writeFile(currentPath, current)

    const result = await compareSSIM(baselinePath, currentPath, 0.01)

    expect(result.ssimScore).toBeCloseTo(1.0, 1)
    expect(result.pass).toBe(true)
  })
})
