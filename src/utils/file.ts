/**
 * File utility functions
 */

import { mkdir, access, readFile, writeFile } from 'fs/promises'
import { dirname, resolve } from 'path'
import { constants } from 'fs'

/**
 * Ensure directory exists, create if not
 */
export async function ensureDir(filePath: string): Promise<void> {
  const dir = dirname(filePath)
  try {
    await access(dir, constants.W_OK)
  } catch {
    await mkdir(dir, { recursive: true })
  }
}

/**
 * Check if file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.R_OK)
    return true
  } catch {
    return false
  }
}

/**
 * Read JSON file
 */
export async function readJson<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, 'utf-8')
  return JSON.parse(content)
}

/**
 * Write JSON file
 */
export async function writeJson(filePath: string, data: unknown): Promise<void> {
  await ensureDir(filePath)
  const content = JSON.stringify(data, null, 2)
  await writeFile(filePath, content, 'utf-8')
}

/**
 * Resolve path relative to current working directory
 */
export function resolvePath(path: string): string {
  return resolve(process.cwd(), path)
}

/**
 * Generate output filename with timestamp
 */
export function generateTimestampedFilename(prefix: string, extension: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `${prefix}-${timestamp}.${extension}`
}
