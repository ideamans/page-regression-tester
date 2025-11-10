/**
 * Capture command CLI
 */

import { Command } from 'commander'
import type { CaptureOptions, PresetType } from '../types.js'
import { executeCapture } from '../capture/index.js'
import { logger } from '../utils/logger.js'
import { parseViewport, validateUrl } from '../utils/validator.js'
import { getPreset } from '../utils/presets.js'

export function createCaptureCommand(): Command {
  const command = new Command('capture')

  command
    .description('Capture a screenshot of a web page with deterministic behaviors')
    .argument('<url>', 'URL to capture')
    .option('-o, --output <path>', 'Output file path', './tmp/capture.png')
    .option('--preset <type>', 'Device preset (desktop|mobile)')
    .option('--viewport <size>', 'Viewport size (WIDTHxHEIGHT)')
    .option('--dpr <number>', 'Device pixel ratio')
    .option('--user-agent <string>', 'User-Agent string')
    .option('--clip <region>', 'Clip region (X,Y,WIDTH,HEIGHT)')
    .option('--wait-until <state>', 'Wait until state (load|domcontentloaded|networkidle)', 'networkidle')
    .option('--wait-selector <selectors>', 'Wait for selectors (comma-separated)')
    .option('--wait-timeout <ms>', 'Wait timeout in milliseconds', '30000')
    .option('--mask <selectors>', 'Mask selectors (comma-separated)')
    .option('--keep-animations', 'Keep animations and transitions (disabled by default for deterministic capture)')
    .option('--mock-time <time>', 'Fix time to ISO 8601 timestamp')
    .option('--mock-seed <number>', 'Random seed for Math.random()', '42')
    .option('--block-urls <patterns>', 'Block URL patterns (comma-separated)')
    .option('--inject-css <path>', 'Inject custom CSS file')
    .option('--inject-js <path>', 'Inject custom JavaScript file')
    .option('--browser <type>', 'Browser type (chromium|firefox|webkit)', 'chromium')
    .option('--headful', 'Run browser in headful mode (headless by default)')
    .option('--disable-snapshot', 'Disable structure snapshot JSON output (enabled by default)')
    .option('--snapshot-selectors <selectors>', 'Structure snapshot selectors (comma-separated)')
    .option('--disable-txt', 'Disable text report output (enabled by default)')
    .action(async (url: string, cmdOptions) => {
      try {
        // Validate URL
        if (!validateUrl(url)) {
          logger.error(`Invalid URL: ${url}`)
          process.exit(1)
        }

        // Apply preset if specified
        const preset = cmdOptions.preset ? getPreset(cmdOptions.preset as PresetType) : getPreset('desktop')

        // Parse viewport (override preset if specified)
        let viewport = preset.viewport
        if (cmdOptions.viewport || cmdOptions.dpr) {
          const viewportStr = cmdOptions.viewport || `${preset.viewport.width}x${preset.viewport.height}`
          const dpr = cmdOptions.dpr ? parseFloat(cmdOptions.dpr) : preset.viewport.dpr
          viewport = parseViewport(viewportStr, dpr)
        }

        // Parse user agent (override preset if specified)
        const userAgent = cmdOptions.userAgent || preset.userAgent

        // Parse options
        const options: CaptureOptions = {
          url,
          output: cmdOptions.output,
          viewport,
          userAgent,
          waitUntil: cmdOptions.waitUntil,
          waitTimeout: parseInt(cmdOptions.waitTimeout, 10),
          disableAnimations: !cmdOptions.keepAnimations,
          mockTime: cmdOptions.mockTime,
          mockSeed: cmdOptions.mockSeed ? parseInt(cmdOptions.mockSeed, 10) : 42,
          browser: cmdOptions.browser,
          headless: !cmdOptions.headful,
          saveSnapshot: !cmdOptions.disableSnapshot,
          saveTxt: !cmdOptions.disableTxt,
        }

        // Parse comma-separated lists
        if (cmdOptions.waitSelector) {
          options.waitSelector = cmdOptions.waitSelector.split(',').map((s: string) => s.trim())
        }

        if (cmdOptions.mask) {
          options.mask = cmdOptions.mask.split(',').map((s: string) => s.trim())
        }

        if (cmdOptions.blockUrls) {
          options.blockUrls = cmdOptions.blockUrls.split(',').map((s: string) => s.trim())
        }

        if (cmdOptions.snapshotSelectors) {
          options.snapshotSelectors = cmdOptions.snapshotSelectors.split(',').map((s: string) => s.trim())
        }

        if (cmdOptions.injectCss) {
          options.injectCss = cmdOptions.injectCss
        }

        if (cmdOptions.injectJs) {
          options.injectJs = cmdOptions.injectJs
        }

        if (cmdOptions.clip) {
          const { parseClipRegion } = await import('../utils/validator.js')
          options.clip = parseClipRegion(cmdOptions.clip)
        }

        // Execute capture
        await executeCapture(options)
      } catch (error) {
        logger.error('Capture failed', error as Error)
        process.exit(1)
      }
    })

  return command
}
