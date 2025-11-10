/**
 * Tests for logger utility
 */

import { Logger } from '../../src/utils/logger.js'

describe('Logger', () => {
  let logger: Logger
  let consoleSpy: {
    log: jest.SpyInstance
    warn: jest.SpyInstance
    error: jest.SpyInstance
  }

  beforeEach(() => {
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
    }
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('non-verbose mode', () => {
    beforeEach(() => {
      logger = new Logger(false)
    })

    it('should log info messages', () => {
      logger.info('test message')
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('ℹ'), 'test message')
    })

    it('should log success messages', () => {
      logger.success('test success')
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('✔'), 'test success')
    })

    it('should log warning messages', () => {
      logger.warn('test warning')
      expect(consoleSpy.warn).toHaveBeenCalledWith(expect.stringContaining('⚠'), 'test warning')
    })

    it('should log error messages', () => {
      logger.error('test error')
      expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('✖'), 'test error')
    })

    it('should log error with stack trace', () => {
      const error = new Error('test error')
      logger.error('error occurred', error)
      expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('✖'), 'error occurred')
      expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('test error'))
    })

    it('should not log debug messages in non-verbose mode', () => {
      logger.debug('test debug')
      expect(consoleSpy.log).not.toHaveBeenCalled()
    })
  })

  describe('verbose mode', () => {
    beforeEach(() => {
      logger = new Logger(true)
    })

    it('should log debug messages in verbose mode', () => {
      logger.debug('test debug')
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('→'), 'test debug')
    })

    it('should log all message types', () => {
      logger.info('info')
      logger.success('success')
      logger.warn('warn')
      logger.error('error')
      logger.debug('debug')

      expect(consoleSpy.log).toHaveBeenCalledTimes(3) // info, success, debug
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1)
      expect(consoleSpy.error).toHaveBeenCalledTimes(1)
    })
  })
})
