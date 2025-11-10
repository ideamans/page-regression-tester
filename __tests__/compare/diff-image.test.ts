/**
 * Tests for diff image generation
 */

import { generateDiffImage } from '../../src/compare/diff-image.js'
import { generateIdenticalImages, generateDifferentImages } from '../helpers/image-generator.js'
import sharp from 'sharp'
import { tmpdir } from 'os'
import { join } from 'path'
import { writeFile, rm, mkdir } from 'fs/promises'

describe('generateDiffImage', () => {
  const testDir = join(tmpdir(), 'page-regression-diff-image-test')
  let baselinePath: string
  let currentPath: string
  let diffBufferPath: string

  beforeEach(async () => {
    await rm(testDir, { recursive: true, force: true })
    await mkdir(testDir, { recursive: true })
    baselinePath = join(testDir, 'baseline.png')
    currentPath = join(testDir, 'current.png')
    diffBufferPath = join(testDir, 'diff-buffer.png')
  })

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true })
  })

  const createDiffBuffer = async (width: number, height: number): Promise<Buffer> => {
    // Create a simple diff buffer (red for differences)
    return sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toBuffer()
  }

  it('should generate heatmap diff image', async () => {
    const [baseline, current] = await generateDifferentImages(100, 100)
    await writeFile(baselinePath, baseline)
    await writeFile(currentPath, current)

    const diffBuffer = await createDiffBuffer(100, 100)

    const result = await generateDiffImage({
      style: 'heatmap',
      baselinePath,
      currentPath,
      diffBuffer,
    })

    expect(result).toBeInstanceOf(Buffer)
    expect(result.length).toBeGreaterThan(0)

    // Verify it's a valid image
    const metadata = await sharp(result).metadata()
    expect(metadata.width).toBe(100)
    expect(metadata.height).toBe(100)
  })

  it('should generate side-by-side diff image', async () => {
    const [baseline, current] = await generateDifferentImages(100, 100)
    await writeFile(baselinePath, baseline)
    await writeFile(currentPath, current)

    const diffBuffer = await createDiffBuffer(100, 100)

    const result = await generateDiffImage({
      style: 'sidebyside',
      baselinePath,
      currentPath,
      diffBuffer,
    })

    expect(result).toBeInstanceOf(Buffer)

    // Verify it's 3x wider (baseline | diff | current)
    const metadata = await sharp(result).metadata()
    expect(metadata.width).toBe(300)
    expect(metadata.height).toBe(100)
  })

  it('should generate overlay diff image', async () => {
    const [baseline, current] = await generateDifferentImages(100, 100)
    await writeFile(baselinePath, baseline)
    await writeFile(currentPath, current)

    const diffBuffer = await createDiffBuffer(100, 100)

    const result = await generateDiffImage({
      style: 'overlay',
      baselinePath,
      currentPath,
      diffBuffer,
    })

    expect(result).toBeInstanceOf(Buffer)

    // Overlay should be same size as original
    const metadata = await sharp(result).metadata()
    expect(metadata.width).toBe(100)
    expect(metadata.height).toBe(100)
  })

  it('should generate blend diff image', async () => {
    const [baseline, current] = await generateDifferentImages(100, 100)
    await writeFile(baselinePath, baseline)
    await writeFile(currentPath, current)

    const diffBuffer = await createDiffBuffer(100, 100)

    const result = await generateDiffImage({
      style: 'blend',
      baselinePath,
      currentPath,
      diffBuffer,
    })

    expect(result).toBeInstanceOf(Buffer)

    // Blend should be same size as original
    const metadata = await sharp(result).metadata()
    expect(metadata.width).toBe(100)
    expect(metadata.height).toBe(100)
  })

  it('should throw error for unknown style', async () => {
    const [baseline, current] = await generateDifferentImages(100, 100)
    await writeFile(baselinePath, baseline)
    await writeFile(currentPath, current)

    const diffBuffer = await createDiffBuffer(100, 100)

    await expect(
      generateDiffImage({
        // @ts-expect-error Testing invalid style
        style: 'invalid',
        baselinePath,
        currentPath,
        diffBuffer,
      })
    ).rejects.toThrow('Unknown diff style')
  })

  it('should handle different image sizes', async () => {
    const [baseline, current] = await generateDifferentImages(200, 150)
    await writeFile(baselinePath, baseline)
    await writeFile(currentPath, current)

    const diffBuffer = await createDiffBuffer(200, 150)

    const sideBySide = await generateDiffImage({
      style: 'sidebyside',
      baselinePath,
      currentPath,
      diffBuffer,
    })
    const metadata = await sharp(sideBySide).metadata()
    expect(metadata.width).toBe(600)
    expect(metadata.height).toBe(150)
  })
})
