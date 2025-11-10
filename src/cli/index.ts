#!/usr/bin/env node

/**
 * CLI entry point
 */

import { Command } from 'commander'
import { createCaptureCommand } from './capture.js'
import { createCompareCommand } from './compare.js'

const program = new Command()

program
  .name('page-regression-tester')
  .description('Visual regression testing tool for web pages')
  .version('0.1.0')

// Add commands
program.addCommand(createCaptureCommand())
program.addCommand(createCompareCommand())

// Parse arguments
program.parse(process.argv)

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp()
}
