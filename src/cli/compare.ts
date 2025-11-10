/**
 * Compare command CLI
 */

import { Command } from 'commander'
import type { CompareOptions, ComparisonMethod, DiffStyle } from '../types.js'
import { executeCompare } from '../compare/index.js'
import { logger } from '../utils/logger.js'
import { parseIgnoreRegions, validateThreshold, validateColorThreshold } from '../utils/validator.js'

export function createCompareCommand(): Command {
  const command = new Command('compare')

  command
    .description('Compare two screenshots and generate diff images')
    .argument('<baseline>', 'Baseline image path')
    .argument('<current>', 'Current image path')
    .option('-o, --output <dir>', 'Output directory for diff images and reports', './tmp/diff/')
    .option(
      '--method <methods>',
      'Comparison methods (comma-separated: pixel,ssim)',
      'pixel'
    )
    .option('--threshold <number>', 'Diff threshold (0.0-1.0)', '0.002')
    .option('--diff-style <style>', 'Diff image style (heatmap|sidebyside|overlay|blend)', 'heatmap')
    .option('--ignore-regions <regions>', 'Ignore regions (X,Y,W,H separated by semicolon)')
    .option('--include-antialiasing', 'Include antialiasing in diff detection (ignored by default)')
    .option('--color-threshold <number>', 'Color diff threshold (0-255)', '10')
    .option('--output-format <format>', 'Output format (png|jpg|webp)', 'png')
    .option('--disable-txt', 'Disable text report output (enabled by default)')
    .option('--disable-json', 'Disable JSON result output (enabled by default)')
    .action(async (baseline: string, current: string, cmdOptions) => {
      try {
        // Parse and validate options
        const threshold = parseFloat(cmdOptions.threshold)
        if (!validateThreshold(threshold)) {
          logger.error('Threshold must be between 0.0 and 1.0')
          process.exit(1)
        }

        const colorThreshold = parseInt(cmdOptions.colorThreshold, 10)
        if (!validateColorThreshold(colorThreshold)) {
          logger.error('Color threshold must be between 0 and 255')
          process.exit(1)
        }

        // Parse methods
        const methods = cmdOptions.method.split(',').map((m: string) => m.trim()) as ComparisonMethod[]
        const validMethods: ComparisonMethod[] = ['pixel', 'ssim']

        for (const method of methods) {
          if (!validMethods.includes(method)) {
            logger.error(`Invalid comparison method: ${method}`)
            logger.error(`Valid methods: ${validMethods.join(', ')}`)
            process.exit(1)
          }
        }

        // Validate diff style
        const validStyles: DiffStyle[] = ['heatmap', 'sidebyside', 'overlay', 'blend']
        if (!validStyles.includes(cmdOptions.diffStyle as DiffStyle)) {
          logger.error(`Invalid diff style: ${cmdOptions.diffStyle}`)
          logger.error(`Valid styles: ${validStyles.join(', ')}`)
          process.exit(1)
        }

        const options: CompareOptions = {
          baseline,
          current,
          output: cmdOptions.output,
          method: methods,
          threshold,
          diffStyle: cmdOptions.diffStyle as DiffStyle,
          ignoreAntialiasing: !cmdOptions.includeAntialiasing,
          colorThreshold,
          outputFormat: cmdOptions.outputFormat,
          txt: !cmdOptions.disableTxt,
          json: !cmdOptions.disableJson,
        }

        // Parse ignore regions if provided
        if (cmdOptions.ignoreRegions) {
          options.ignoreRegions = parseIgnoreRegions(cmdOptions.ignoreRegions)
        }

        // Execute comparison
        const result = await executeCompare(options)

        // Exit with appropriate code
        process.exit(result.overallPass ? 0 : 1)
      } catch (error) {
        logger.error('Comparison failed', error as Error)
        process.exit(2)
      }
    })

  return command
}
