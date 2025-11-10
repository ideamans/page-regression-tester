/**
 * Tests for file utility
 */

import { mkdir, writeFile, rm } from 'fs/promises'
import { join } from 'path'
import { ensureDir, fileExists, readJson, writeJson, resolvePath, generateTimestampedFilename } from '../../src/utils/file.js'
import { tmpdir } from 'os'

describe('file utilities', () => {
  const testDir = join(tmpdir(), 'page-regression-tester-test')

  beforeEach(async () => {
    await rm(testDir, { recursive: true, force: true })
  })

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true })
  })

  describe('ensureDir', () => {
    it('should create directory if not exists', async () => {
      const filePath = join(testDir, 'subdir', 'file.txt')
      await ensureDir(filePath)
      expect(await fileExists(join(testDir, 'subdir'))).toBe(true)
    })

    it('should not throw if directory already exists', async () => {
      const filePath = join(testDir, 'file.txt')
      await mkdir(testDir, { recursive: true })
      await expect(ensureDir(filePath)).resolves.not.toThrow()
    })

    it('should create nested directories', async () => {
      const filePath = join(testDir, 'a', 'b', 'c', 'file.txt')
      await ensureDir(filePath)
      expect(await fileExists(join(testDir, 'a', 'b', 'c'))).toBe(true)
    })
  })

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      await mkdir(testDir, { recursive: true })
      const filePath = join(testDir, 'existing.txt')
      await writeFile(filePath, 'test')
      expect(await fileExists(filePath)).toBe(true)
    })

    it('should return false for non-existing file', async () => {
      expect(await fileExists(join(testDir, 'nonexistent.txt'))).toBe(false)
    })

    it('should return true for existing directory', async () => {
      await mkdir(testDir, { recursive: true })
      expect(await fileExists(testDir)).toBe(true)
    })
  })

  describe('readJson', () => {
    it('should read and parse JSON file', async () => {
      await mkdir(testDir, { recursive: true })
      const filePath = join(testDir, 'test.json')
      const data = { name: 'test', value: 123 }
      await writeFile(filePath, JSON.stringify(data))

      const result = await readJson<typeof data>(filePath)
      expect(result).toEqual(data)
    })

    it('should throw error for invalid JSON', async () => {
      await mkdir(testDir, { recursive: true })
      const filePath = join(testDir, 'invalid.json')
      await writeFile(filePath, 'not json')

      await expect(readJson(filePath)).rejects.toThrow()
    })

    it('should throw error for non-existing file', async () => {
      await expect(readJson(join(testDir, 'nonexistent.json'))).rejects.toThrow()
    })
  })

  describe('writeJson', () => {
    it('should write JSON file with proper formatting', async () => {
      const filePath = join(testDir, 'output.json')
      const data = { name: 'test', value: 123 }

      await writeJson(filePath, data)

      expect(await fileExists(filePath)).toBe(true)
      const result = await readJson<typeof data>(filePath)
      expect(result).toEqual(data)
    })

    it('should create directory if not exists', async () => {
      const filePath = join(testDir, 'subdir', 'output.json')
      const data = { test: true }

      await writeJson(filePath, data)

      expect(await fileExists(filePath)).toBe(true)
    })

    it('should handle complex objects', async () => {
      const filePath = join(testDir, 'complex.json')
      const data = {
        array: [1, 2, 3],
        nested: { a: { b: { c: 'value' } } },
        null: null,
        boolean: true,
      }

      await writeJson(filePath, data)
      const result = await readJson(filePath)
      expect(result).toEqual(data)
    })
  })

  describe('resolvePath', () => {
    it('should resolve relative path to absolute', () => {
      const result = resolvePath('test.txt')
      expect(result).toContain('test.txt')
      expect(result.startsWith('/')).toBe(true)
    })

    it('should handle already absolute paths', () => {
      const absolutePath = '/absolute/path/test.txt'
      const result = resolvePath(absolutePath)
      expect(result).toBe(absolutePath)
    })

    it('should handle nested paths', () => {
      const result = resolvePath('a/b/c/test.txt')
      expect(result).toContain('a/b/c/test.txt')
    })
  })

  describe('generateTimestampedFilename', () => {
    it('should generate filename with timestamp', () => {
      const filename = generateTimestampedFilename('test', 'png')
      expect(filename).toMatch(/^test-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/)
      expect(filename).toMatch(/\.png$/)
    })

    it('should handle different extensions', () => {
      const filename = generateTimestampedFilename('screenshot', 'jpg')
      expect(filename).toMatch(/^screenshot-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/)
      expect(filename).toMatch(/\.jpg$/)
    })

    it('should generate unique filenames', async () => {
      const filename1 = generateTimestampedFilename('test', 'png')
      // Wait a tiny bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10))
      const filename2 = generateTimestampedFilename('test', 'png')
      expect(filename1).not.toBe(filename2)
    })
  })
})
