/**
 * Layout comparison based on structure snapshots
 */

import type { StructureSnapshot, LayoutComparisonResult, LayoutDiff, ElementSnapshot } from '../types.js'
import { logger } from '../utils/logger.js'
import { readJson } from '../utils/file.js'

/**
 * Calculate Euclidean distance between two points
 */
function calculateDistance(dx: number, dy: number): number {
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Find matching element in current snapshot by xpath
 */
function findMatchingElement(xpath: string, elements: ElementSnapshot[]): ElementSnapshot | undefined {
  return elements.find((el) => el.xpath === xpath)
}

/**
 * Compare layout between two structure snapshots
 */
export async function compareLayout(
  baselineSnapshotPath: string,
  currentSnapshotPath: string,
  threshold: number = 0.002
): Promise<LayoutComparisonResult> {
  logger.debug('Loading structure snapshots...')

  const baseline: StructureSnapshot = await readJson(baselineSnapshotPath)
  const current: StructureSnapshot = await readJson(currentSnapshotPath)

  const layoutDiffs: LayoutDiff[] = []
  let addedElements = 0
  let removedElements = 0
  let movedElements = 0
  let resizedElements = 0
  let maxShift = 0

  // Create maps for quick lookup
  const baselineMap = new Map<string, ElementSnapshot>()
  const currentMap = new Map<string, ElementSnapshot>()

  baseline.elements.forEach((el) => baselineMap.set(el.xpath, el))
  current.elements.forEach((el) => currentMap.set(el.xpath, el))

  // Check for removed and moved/resized elements
  for (const [xpath, baselineEl] of baselineMap) {
    const currentEl = currentMap.get(xpath)

    if (!currentEl) {
      // Element removed
      removedElements++
      layoutDiffs.push({
        xpath,
        selector: baselineEl.selector,
        status: 'removed',
        baselineRect: baselineEl.rect,
      })
    } else {
      // Element exists in both - check for changes
      const dx = currentEl.rect.x - baselineEl.rect.x
      const dy = currentEl.rect.y - baselineEl.rect.y
      const dw = currentEl.rect.width - baselineEl.rect.width
      const dh = currentEl.rect.height - baselineEl.rect.height

      const hasMoved = dx !== 0 || dy !== 0
      const hasResized = dw !== 0 || dh !== 0

      if (hasMoved || hasResized) {
        const totalShift = calculateDistance(dx, dy)
        maxShift = Math.max(maxShift, totalShift)

        let status: LayoutDiff['status'] = 'unchanged'
        if (hasMoved && hasResized) {
          movedElements++
          resizedElements++
          status = 'moved'
        } else if (hasMoved) {
          movedElements++
          status = 'moved'
        } else if (hasResized) {
          resizedElements++
          status = 'resized'
        }

        layoutDiffs.push({
          xpath,
          selector: currentEl.selector,
          status,
          baselineRect: baselineEl.rect,
          currentRect: currentEl.rect,
          positionDiff: { dx, dy },
          sizeDiff: { dw, dh },
          totalShift,
        })
      }
    }
  }

  // Check for added elements
  for (const [xpath, currentEl] of currentMap) {
    if (!baselineMap.has(xpath)) {
      addedElements++
      layoutDiffs.push({
        xpath,
        selector: currentEl.selector,
        status: 'added',
        currentRect: currentEl.rect,
      })
    }
  }

  // Calculate normalized layout diff ratio
  // Based on: (moved + resized + added + removed) / total unique elements
  const totalUniqueElements = new Set([...baselineMap.keys(), ...currentMap.keys()]).size
  const totalChanges = movedElements + resizedElements + addedElements + removedElements
  const layoutDiffRatio = totalUniqueElements > 0 ? totalChanges / totalUniqueElements : 0

  const pass = layoutDiffRatio <= threshold

  logger.debug(
    `Layout comparison: ${addedElements} added, ${removedElements} removed, ${movedElements} moved, ${resizedElements} resized`
  )
  logger.debug(`Max shift: ${maxShift.toFixed(2)}px, diff ratio: ${(layoutDiffRatio * 100).toFixed(4)}%`)

  return {
    addedElements,
    removedElements,
    movedElements,
    resizedElements,
    maxShift,
    layoutDiffRatio,
    layoutDiffs,
    pass,
  }
}
