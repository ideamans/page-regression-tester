/**
 * Tests for layout comparison
 */

import { compareLayout } from '../../src/compare/layout.js'
import { writeJson } from '../../src/utils/file.js'
import type { StructureSnapshot } from '../../src/types.js'
import { tmpdir } from 'os'
import { join } from 'path'
import { rm } from 'fs/promises'

describe('compareLayout', () => {
  const testDir = join(tmpdir(), 'page-regression-layout-test')
  let baselinePath: string
  let currentPath: string

  beforeEach(async () => {
    await rm(testDir, { recursive: true, force: true })
    baselinePath = join(testDir, 'baseline-snapshot.json')
    currentPath = join(testDir, 'current-snapshot.json')
  })

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true })
  })

  const createSnapshot = (elements: any[]): StructureSnapshot => ({
    url: 'https://example.com',
    viewport: { width: 1440, height: 900 },
    timestamp: new Date().toISOString(),
    elements,
  })

  it('should detect identical layouts', async () => {
    const elements = [
      {
        xpath: '/html/body/div[1]',
        selector: 'div',
        tag: 'div',
        text: 'Hello',
        rect: { x: 0, y: 0, width: 100, height: 50 },
        styles: {
          display: 'block',
          position: 'static',
          fontSize: '16px',
          lineHeight: '1.5',
          color: 'rgb(0, 0, 0)',
          margin: '0px',
          padding: '0px',
        },
      },
    ]

    await writeJson(baselinePath, createSnapshot(elements))
    await writeJson(currentPath, createSnapshot(elements))

    const result = await compareLayout(baselinePath, currentPath)

    expect(result.pass).toBe(true)
    expect(result.addedElements).toBe(0)
    expect(result.removedElements).toBe(0)
    expect(result.movedElements).toBe(0)
    expect(result.resizedElements).toBe(0)
    expect(result.maxShift).toBe(0)
    expect(result.layoutDiffRatio).toBe(0)
    expect(result.layoutDiffs).toHaveLength(0)
  })

  it('should detect moved elements', async () => {
    const baselineElements = [
      {
        xpath: '/html/body/div[1]',
        selector: 'div',
        tag: 'div',
        text: 'Hello',
        rect: { x: 0, y: 0, width: 100, height: 50 },
        styles: {
          display: 'block',
          position: 'static',
          fontSize: '16px',
          lineHeight: '1.5',
          color: 'rgb(0, 0, 0)',
          margin: '0px',
          padding: '0px',
        },
      },
    ]

    const currentElements = [
      {
        ...baselineElements[0],
        rect: { x: 10, y: 20, width: 100, height: 50 }, // Moved 10px right, 20px down
      },
    ]

    await writeJson(baselinePath, createSnapshot(baselineElements))
    await writeJson(currentPath, createSnapshot(currentElements))

    const result = await compareLayout(baselinePath, currentPath)

    expect(result.movedElements).toBe(1)
    expect(result.resizedElements).toBe(0)
    expect(result.addedElements).toBe(0)
    expect(result.removedElements).toBe(0)
    expect(result.maxShift).toBeCloseTo(Math.sqrt(10 * 10 + 20 * 20))
    expect(result.layoutDiffs).toHaveLength(1)
    expect(result.layoutDiffs[0].status).toBe('moved')
    expect(result.layoutDiffs[0].positionDiff).toEqual({ dx: 10, dy: 20 })
  })

  it('should detect resized elements', async () => {
    const baselineElements = [
      {
        xpath: '/html/body/div[1]',
        selector: 'div',
        tag: 'div',
        text: 'Hello',
        rect: { x: 0, y: 0, width: 100, height: 50 },
        styles: {
          display: 'block',
          position: 'static',
          fontSize: '16px',
          lineHeight: '1.5',
          color: 'rgb(0, 0, 0)',
          margin: '0px',
          padding: '0px',
        },
      },
    ]

    const currentElements = [
      {
        ...baselineElements[0],
        rect: { x: 0, y: 0, width: 120, height: 60 }, // Resized
      },
    ]

    await writeJson(baselinePath, createSnapshot(baselineElements))
    await writeJson(currentPath, createSnapshot(currentElements))

    const result = await compareLayout(baselinePath, currentPath)

    expect(result.movedElements).toBe(0)
    expect(result.resizedElements).toBe(1)
    expect(result.addedElements).toBe(0)
    expect(result.removedElements).toBe(0)
    expect(result.layoutDiffs).toHaveLength(1)
    expect(result.layoutDiffs[0].status).toBe('resized')
    expect(result.layoutDiffs[0].sizeDiff).toEqual({ dw: 20, dh: 10 })
  })

  it('should detect added elements', async () => {
    const baselineElements = [
      {
        xpath: '/html/body/div[1]',
        selector: 'div',
        tag: 'div',
        text: 'Hello',
        rect: { x: 0, y: 0, width: 100, height: 50 },
        styles: {
          display: 'block',
          position: 'static',
          fontSize: '16px',
          lineHeight: '1.5',
          color: 'rgb(0, 0, 0)',
          margin: '0px',
          padding: '0px',
        },
      },
    ]

    const currentElements = [
      ...baselineElements,
      {
        xpath: '/html/body/div[2]',
        selector: 'div:nth-child(2)',
        tag: 'div',
        text: 'New',
        rect: { x: 0, y: 50, width: 100, height: 50 },
        styles: {
          display: 'block',
          position: 'static',
          fontSize: '16px',
          lineHeight: '1.5',
          color: 'rgb(0, 0, 0)',
          margin: '0px',
          padding: '0px',
        },
      },
    ]

    await writeJson(baselinePath, createSnapshot(baselineElements))
    await writeJson(currentPath, createSnapshot(currentElements))

    const result = await compareLayout(baselinePath, currentPath)

    expect(result.addedElements).toBe(1)
    expect(result.removedElements).toBe(0)
    expect(result.movedElements).toBe(0)
    expect(result.resizedElements).toBe(0)
    expect(result.layoutDiffs).toHaveLength(1)
    expect(result.layoutDiffs[0].status).toBe('added')
  })

  it('should detect removed elements', async () => {
    const baselineElements = [
      {
        xpath: '/html/body/div[1]',
        selector: 'div',
        tag: 'div',
        text: 'Hello',
        rect: { x: 0, y: 0, width: 100, height: 50 },
        styles: {
          display: 'block',
          position: 'static',
          fontSize: '16px',
          lineHeight: '1.5',
          color: 'rgb(0, 0, 0)',
          margin: '0px',
          padding: '0px',
        },
      },
      {
        xpath: '/html/body/div[2]',
        selector: 'div:nth-child(2)',
        tag: 'div',
        text: 'World',
        rect: { x: 0, y: 50, width: 100, height: 50 },
        styles: {
          display: 'block',
          position: 'static',
          fontSize: '16px',
          lineHeight: '1.5',
          color: 'rgb(0, 0, 0)',
          margin: '0px',
          padding: '0px',
        },
      },
    ]

    const currentElements = [baselineElements[0]]

    await writeJson(baselinePath, createSnapshot(baselineElements))
    await writeJson(currentPath, createSnapshot(currentElements))

    const result = await compareLayout(baselinePath, currentPath)

    expect(result.removedElements).toBe(1)
    expect(result.addedElements).toBe(0)
    expect(result.movedElements).toBe(0)
    expect(result.resizedElements).toBe(0)
    expect(result.layoutDiffs).toHaveLength(1)
    expect(result.layoutDiffs[0].status).toBe('removed')
  })

  it('should calculate layout diff ratio correctly', async () => {
    const baselineElements = [
      {
        xpath: '/html/body/div[1]',
        selector: 'div',
        tag: 'div',
        text: 'Element 1',
        rect: { x: 0, y: 0, width: 100, height: 50 },
        styles: {
          display: 'block',
          position: 'static',
          fontSize: '16px',
          lineHeight: '1.5',
          color: 'rgb(0, 0, 0)',
          margin: '0px',
          padding: '0px',
        },
      },
      {
        xpath: '/html/body/div[2]',
        selector: 'div:nth-child(2)',
        tag: 'div',
        text: 'Element 2',
        rect: { x: 0, y: 50, width: 100, height: 50 },
        styles: {
          display: 'block',
          position: 'static',
          fontSize: '16px',
          lineHeight: '1.5',
          color: 'rgb(0, 0, 0)',
          margin: '0px',
          padding: '0px',
        },
      },
    ]

    const currentElements = [
      {
        ...baselineElements[0],
        rect: { x: 10, y: 0, width: 100, height: 50 }, // Moved
      },
      // Element 2 removed
      {
        xpath: '/html/body/div[3]',
        selector: 'div:nth-child(3)',
        tag: 'div',
        text: 'Element 3',
        rect: { x: 0, y: 100, width: 100, height: 50 },
        styles: {
          display: 'block',
          position: 'static',
          fontSize: '16px',
          lineHeight: '1.5',
          color: 'rgb(0, 0, 0)',
          margin: '0px',
          padding: '0px',
        },
      }, // Added
    ]

    await writeJson(baselinePath, createSnapshot(baselineElements))
    await writeJson(currentPath, createSnapshot(currentElements))

    const result = await compareLayout(baselinePath, currentPath)

    // Total unique elements: 3 (div[1], div[2], div[3])
    // Changes: 1 moved + 1 removed + 1 added = 3
    // Ratio: 3 / 3 = 1.0
    expect(result.layoutDiffRatio).toBeCloseTo(1.0)
    expect(result.pass).toBe(false) // Should fail with default threshold 0.002
  })

  it('should respect threshold parameter', async () => {
    const baselineElements = [
      {
        xpath: '/html/body/div[1]',
        selector: 'div',
        tag: 'div',
        text: 'Hello',
        rect: { x: 0, y: 0, width: 100, height: 50 },
        styles: {
          display: 'block',
          position: 'static',
          fontSize: '16px',
          lineHeight: '1.5',
          color: 'rgb(0, 0, 0)',
          margin: '0px',
          padding: '0px',
        },
      },
    ]

    const currentElements = [
      {
        ...baselineElements[0],
        rect: { x: 5, y: 0, width: 100, height: 50 }, // Small move
      },
    ]

    await writeJson(baselinePath, createSnapshot(baselineElements))
    await writeJson(currentPath, createSnapshot(currentElements))

    // With strict threshold (1 element moved out of 1 = 1.0 ratio)
    const strictResult = await compareLayout(baselinePath, currentPath, 0.001)
    expect(strictResult.pass).toBe(false)

    // With lenient threshold (need to be >= 1.0 to pass since ratio is 1.0)
    const lenientResult = await compareLayout(baselinePath, currentPath, 1.0)
    expect(lenientResult.pass).toBe(true)
  })
})
