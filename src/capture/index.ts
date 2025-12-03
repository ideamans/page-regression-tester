/**
 * Capture command implementation
 */

import { chromium, firefox, webkit } from 'playwright'
import type { CaptureOptions } from '../types.js'
import { logger } from '../utils/logger.js'
import { ensureDir, generateTimestampedFilename, resolvePath } from '../utils/file.js'
import { DISABLE_ANIMATIONS_CSS, getAllDeterministicScripts } from './deterministic.js'
import { createStructureSnapshot, saveStructureSnapshot } from './snapshot.js'
import { readFile, writeFile } from 'fs/promises'

/**
 * Execute capture command
 */
export async function executeCapture(options: CaptureOptions): Promise<void> {
  const browserType = options.browser || 'chromium'
  const headless = options.headless !== false
  const viewport = options.viewport || { width: 1440, height: 900, dpr: 2 }

  // Resolve output path
  let outputPath = resolvePath(options.output)
  if (!outputPath.match(/\.(png|jpg|jpeg)$/i)) {
    // If output is a directory, generate filename
    const filename = generateTimestampedFilename('capture', 'png')
    outputPath = `${outputPath}/${filename}`
  }

  logger.info(`Starting capture: ${options.url}`)
  logger.info(`Browser: ${browserType}, Headless: ${headless}`)
  logger.info(`Viewport: ${viewport.width}x${viewport.height}@${viewport.dpr}x`)

  // Launch browser with autoplay disabled
  const browserLauncher = browserType === 'firefox' ? firefox : browserType === 'webkit' ? webkit : chromium
  const launchOptions: { headless: boolean; args?: string[] } = { headless }

  // Add Chromium-specific args to disable autoplay
  if (browserType === 'chromium') {
    launchOptions.args = [
      '--autoplay-policy=user-gesture-required', // Require user gesture for autoplay
      '--disable-background-media-suspend', // Prevent media from being suspended
    ]
  }

  const browser = await browserLauncher.launch(launchOptions)

  try {
    // Create context
    const context = await browser.newContext({
      viewport: {
        width: viewport.width,
        height: viewport.height,
      },
      deviceScaleFactor: viewport.dpr || 2,
      userAgent: options.userAgent,
      reducedMotion: 'reduce',
    })

    // Setup URL blocking
    if (options.blockUrls && options.blockUrls.length > 0) {
      logger.debug(`Blocking ${options.blockUrls.length} URL patterns`)
      await context.route('**/*', (route) => {
        const url = route.request().url()
        const shouldBlock = options.blockUrls!.some((pattern) => {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'))
          return regex.test(url)
        })

        if (shouldBlock) {
          logger.debug(`Blocked: ${url}`)
          route.abort()
        } else {
          route.continue()
        }
      })
    }

    const page = await context.newPage()

    // Add deterministic scripts
    const deterministicScripts = getAllDeterministicScripts(options.mockTime, options.mockSeed)
    await page.addInitScript(deterministicScripts)

    // Inject custom JS if provided
    if (options.injectJs) {
      logger.debug(`Injecting custom JavaScript: ${options.injectJs}`)
      const jsContent = await readFile(options.injectJs, 'utf-8')
      await page.addInitScript(jsContent)
    }

    // Navigate
    logger.info('Navigating to page...')
    const timeout = options.waitTimeout || 30000
    await page.goto(options.url, {
      waitUntil: options.waitUntil || 'networkidle',
      timeout,
    })

    // Inject CSS
    if (options.disableAnimations !== false) {
      await page.addStyleTag({ content: DISABLE_ANIMATIONS_CSS })
    }

    if (options.injectCss) {
      logger.debug(`Injecting custom CSS: ${options.injectCss}`)
      const cssContent = await readFile(options.injectCss, 'utf-8')
      await page.addStyleTag({ content: cssContent })
    }

    // Wait for fonts
    logger.debug('Waiting for fonts...')
    await page.evaluate(async () => {
      if (document.fonts && document.fonts.status !== 'loaded') {
        await document.fonts.ready
      }
    })

    // Wait for selectors
    if (options.waitSelector && options.waitSelector.length > 0) {
      logger.debug(`Waiting for ${options.waitSelector.length} selectors`)
      for (const selector of options.waitSelector) {
        try {
          await page.waitForSelector(selector, { state: 'visible', timeout })
          logger.debug(`✓ ${selector}`)
        } catch (error) {
          logger.warn(`✗ Timeout waiting for: ${selector}`)
        }
      }
    }

    // Wait for images
    logger.debug('Waiting for images...')
    await page.evaluate(async () => {
      const images = Array.from(document.images) as HTMLImageElement[]
      await Promise.all(
        images
          .filter((img: HTMLImageElement) => !img.complete)
          .map(
            (img: HTMLImageElement) =>
              new Promise<void>((resolve) => {
                img.onload = img.onerror = () => resolve()
              })
          )
      )
    })

    // Small buffer for final rendering
    await page.waitForTimeout(100)

    // Apply masks
    if (options.mask && options.mask.length > 0) {
      logger.debug(`Applying masks to ${options.mask.length} selectors`)
      await page.evaluate((selectors: string[]) => {
        selectors.forEach((selector: string) => {
          const elements = document.querySelectorAll(selector)
          elements.forEach((el: Element) => {
            if (el instanceof HTMLElement) {
              el.style.visibility = 'hidden'
            }
          })
        })
      }, options.mask)
    }

    // Ensure output directory exists
    await ensureDir(outputPath)

    // Take screenshot
    logger.info('Taking screenshot...')
    await page.screenshot({
      path: outputPath,
      fullPage: false,
      clip: options.clip,
    })

    logger.success(`Screenshot saved: ${outputPath}`)

    // Save structure snapshot if requested
    if (options.saveSnapshot) {
      try {
        const snapshotPath = outputPath.replace(/\.(png|jpg|jpeg)$/i, '.snapshot.json')
        const snapshot = await createStructureSnapshot(page, options.url, viewport, options.snapshotSelectors)
        await saveStructureSnapshot(snapshot, snapshotPath)
      } catch (error) {
        logger.error('Failed to create structure snapshot', error as Error)
        throw error
      }
    }

    // Save text report if requested
    if (options.saveTxt !== false) {
      try {
        const txtPath = outputPath.replace(/\.(png|jpg|jpeg)$/i, '.txt')
        const timestamp = new Date().toISOString()
        const txtContent = [
          `result: SUCCESS`,
          `url: ${options.url}`,
          `timestamp: ${timestamp}`,
          `viewport: ${viewport.width}x${viewport.height}@${viewport.dpr}x`,
        ].join('\n') + '\n'
        await writeFile(txtPath, txtContent)
        logger.success(`Text report saved: ${txtPath}`)
      } catch (error) {
        logger.error('Failed to create text report', error as Error)
        throw error
      }
    }
  } finally {
    await browser.close()
  }
}
