/**
 * Helper functions to generate test images
 */

import sharp from 'sharp'

export interface ImageOptions {
  width?: number
  height?: number
  color?: { r: number; g: number; b: number }
}

/**
 * Generate a solid color image
 */
export async function generateSolidImage(options: ImageOptions = {}): Promise<Buffer> {
  const width = options.width || 100
  const height = options.height || 100
  const color = options.color || { r: 255, g: 255, b: 255 }

  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: color,
    },
  })
    .png()
    .toBuffer()
}

/**
 * Generate an image with a rectangle
 */
export async function generateImageWithRect(
  width: number,
  height: number,
  rectX: number,
  rectY: number,
  rectWidth: number,
  rectHeight: number,
  bgColor: { r: number; g: number; b: number } = { r: 255, g: 255, b: 255 },
  rectColor: { r: number; g: number; b: number } = { r: 0, g: 0, b: 0 }
): Promise<Buffer> {
  // Create base image
  const base = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: bgColor,
    },
  })
    .png()
    .toBuffer()

  // Create rectangle overlay
  const rect = await sharp({
    create: {
      width: rectWidth,
      height: rectHeight,
      channels: 3,
      background: rectColor,
    },
  })
    .png()
    .toBuffer()

  // Composite rectangle onto base
  return sharp(base)
    .composite([
      {
        input: rect,
        top: rectY,
        left: rectX,
      },
    ])
    .png()
    .toBuffer()
}

/**
 * Generate two identical images
 */
export async function generateIdenticalImages(options: ImageOptions = {}): Promise<[Buffer, Buffer]> {
  const image = await generateSolidImage(options)
  return [image, Buffer.from(image)]
}

/**
 * Generate two slightly different images
 */
export async function generateDifferentImages(
  width: number = 100,
  height: number = 100
): Promise<[Buffer, Buffer]> {
  const baseline = await generateSolidImage({ width, height, color: { r: 255, g: 255, b: 255 } })

  // Create current with a small difference
  const current = await generateImageWithRect(width, height, 10, 10, 5, 5, { r: 255, g: 255, b: 255 }, { r: 0, g: 0, b: 0 })

  return [baseline, current]
}
