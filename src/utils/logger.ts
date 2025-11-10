/**
 * Logger utility with colored output
 */

import chalk from 'chalk'

export class Logger {
  constructor(private verbose: boolean = false) {}

  info(message: string): void {
    console.log(chalk.blue('ℹ'), message)
  }

  success(message: string): void {
    console.log(chalk.green('✔'), message)
  }

  warn(message: string): void {
    console.warn(chalk.yellow('⚠'), message)
  }

  error(message: string, error?: Error): void {
    console.error(chalk.red('✖'), message)
    if (error) {
      console.error(chalk.red(error.stack || error.message))
    }
  }

  debug(message: string): void {
    if (this.verbose) {
      console.log(chalk.gray('→'), message)
    }
  }
}

export const logger = new Logger()
