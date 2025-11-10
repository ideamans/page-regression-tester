/**
 * Structure snapshot extraction
 */

import type { Page } from 'playwright'
import type { ElementSnapshot, StructureSnapshot, Viewport } from '../types.js'
import { logger } from '../utils/logger.js'
import { writeJson } from '../utils/file.js'

/**
 * Extract all visible elements with size >= 64x64
 * Note: This function runs in the browser context, so it has access to DOM APIs
 * All helper functions must be defined inline within this function
 */
function extractAllVisibleElements(): ElementSnapshot[] {
  const MIN_SIZE = 64

  // Helper: Generate XPath for an element
  const getXPath = (element: Element): string => {
    if (element.id) {
      return `//*[@id="${element.id}"]`
    }

    const parts: string[] = []
    let current: Element | null = element

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 1
      let sibling: Element | null = current.previousElementSibling

      while (sibling) {
        if (sibling.nodeName === current.nodeName) {
          index++
        }
        sibling = sibling.previousElementSibling
      }

      const tagName = current.nodeName.toLowerCase()
      const part = index > 1 ? `${tagName}[${index}]` : tagName
      parts.unshift(part)

      current = current.parentElement
    }

    return '/' + parts.join('/')
  }

  // Helper: Generate best CSS selector for an element
  const getBestSelector = (element: HTMLElement): string => {
    if (element.getAttribute('data-testid')) {
      return `[data-testid="${element.getAttribute('data-testid')}"]`
    }

    if (element.id) {
      return `#${element.id}`
    }

    const classes = Array.from(element.classList)
    for (const cls of classes) {
      const matches = document.querySelectorAll(`.${cls}`)
      if (matches.length === 1) {
        return `.${cls}`
      }
    }

    const parent = element.parentElement
    if (parent) {
      const siblings = Array.from(parent.children).filter((el) => el.tagName === element.tagName)
      const index = siblings.indexOf(element) + 1
      const parentSelector = parent.id ? `#${parent.id}` : parent.tagName.toLowerCase()
      return `${parentSelector} > ${element.tagName.toLowerCase()}:nth-child(${index})`
    }

    return element.tagName.toLowerCase()
  }

  // Helper: Check if element is visible and meets size requirements
  const isElementVisible = (element: HTMLElement, rect: DOMRect): boolean => {
    const cs = window.getComputedStyle(element)

    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') {
      return false
    }

    if (rect.width < MIN_SIZE || rect.height < MIN_SIZE) {
      return false
    }

    // Only include elements within viewport bounds
    const viewportHeight = window.innerHeight
    if (rect.top >= viewportHeight || rect.bottom <= 0) {
      return false
    }

    return true
  }

  // Main extraction logic
  const results: ElementSnapshot[] = []
  const allElements = document.querySelectorAll('*')

  allElements.forEach((el: Element) => {
    if (!(el instanceof HTMLElement)) return

    const rect = el.getBoundingClientRect()

    if (!isElementVisible(el, rect)) {
      return
    }

    const cs = window.getComputedStyle(el)
    const xpath = getXPath(el)
    const selector = getBestSelector(el)

    results.push({
      xpath,
      selector,
      tag: el.tagName,
      role: el.getAttribute('role') || undefined,
      id: el.id || undefined,
      testid: el.getAttribute('data-testid') || undefined,
      text: (el.textContent || '').trim().slice(0, 120),
      rect: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
      styles: {
        display: cs.display,
        position: cs.position,
        fontSize: cs.fontSize,
        lineHeight: cs.lineHeight,
        color: cs.color,
        margin: `${cs.marginTop} ${cs.marginRight} ${cs.marginBottom} ${cs.marginLeft}`,
        padding: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
      },
    })
  })

  return results
}

/**
 * Extract element information by selectors (backward compatibility)
 * Note: This function runs in the browser context
 * All helper functions must be defined inline within this function
 */
function extractElementsBySelectors(selectors: string[]): ElementSnapshot[] {
  // Helper: Generate XPath for an element
  const getXPath = (element: Element): string => {
    if (element.id) {
      return `//*[@id="${element.id}"]`
    }

    const parts: string[] = []
    let current: Element | null = element

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 1
      let sibling: Element | null = current.previousElementSibling

      while (sibling) {
        if (sibling.nodeName === current.nodeName) {
          index++
        }
        sibling = sibling.previousElementSibling
      }

      const tagName = current.nodeName.toLowerCase()
      const part = index > 1 ? `${tagName}[${index}]` : tagName
      parts.unshift(part)

      current = current.parentElement
    }

    return '/' + parts.join('/')
  }

  // Helper: Generate best CSS selector for an element
  const getBestSelector = (element: HTMLElement): string => {
    if (element.getAttribute('data-testid')) {
      return `[data-testid="${element.getAttribute('data-testid')}"]`
    }

    if (element.id) {
      return `#${element.id}`
    }

    const classes = Array.from(element.classList)
    for (const cls of classes) {
      const matches = document.querySelectorAll(`.${cls}`)
      if (matches.length === 1) {
        return `.${cls}`
      }
    }

    const parent = element.parentElement
    if (parent) {
      const siblings = Array.from(parent.children).filter((el) => el.tagName === element.tagName)
      const index = siblings.indexOf(element) + 1
      const parentSelector = parent.id ? `#${parent.id}` : parent.tagName.toLowerCase()
      return `${parentSelector} > ${element.tagName.toLowerCase()}:nth-child(${index})`
    }

    return element.tagName.toLowerCase()
  }

  // Main extraction logic
  const results: ElementSnapshot[] = []

  selectors.forEach((selector: string) => {
    const elements = document.querySelectorAll(selector)
    elements.forEach((el: Element) => {
      if (!(el instanceof HTMLElement)) return

      const rect = el.getBoundingClientRect()
      const cs = window.getComputedStyle(el)
      const xpath = getXPath(el)
      const bestSelector = getBestSelector(el)

      results.push({
        xpath,
        selector: bestSelector,
        tag: el.tagName,
        role: el.getAttribute('role') || undefined,
        id: el.id || undefined,
        testid: el.getAttribute('data-testid') || undefined,
        text: (el.textContent || '').trim().slice(0, 120),
        rect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
        styles: {
          display: cs.display,
          position: cs.position,
          fontSize: cs.fontSize,
          lineHeight: cs.lineHeight,
          color: cs.color,
          margin: `${cs.marginTop} ${cs.marginRight} ${cs.marginBottom} ${cs.marginLeft}`,
          padding: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
        },
      })
    })
  })

  return results
}

/**
 * Create structure snapshot from page
 */
export async function createStructureSnapshot(
  page: Page,
  url: string,
  viewport: Viewport,
  selectors?: string[]
): Promise<StructureSnapshot> {
  logger.debug('Extracting structure snapshot...')

  let elements: ElementSnapshot[]

  if (selectors && selectors.length > 0) {
    // Use specific selectors if provided
    elements = await page.evaluate(extractElementsBySelectors, selectors)
  } else {
    // Extract all visible elements >= 64x64
    elements = await page.evaluate(extractAllVisibleElements)
  }

  const snapshot: StructureSnapshot = {
    url,
    viewport,
    timestamp: new Date().toISOString(),
    elements,
  }

  logger.debug(`Extracted ${elements.length} elements (>= 64x64 pixels)`)

  return snapshot
}

/**
 * Save structure snapshot to file
 */
export async function saveStructureSnapshot(snapshot: StructureSnapshot, outputPath: string): Promise<void> {
  await writeJson(outputPath, snapshot)
  logger.success(`Structure snapshot saved to ${outputPath}`)
}
