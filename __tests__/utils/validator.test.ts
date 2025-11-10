/**
 * Tests for validator utility
 */

import {
  parseViewport,
  parseClipRegion,
  parseIgnoreRegions,
  validateUrl,
  validateThreshold,
  validateColorThreshold,
} from '../../src/utils/validator.js'

describe('parseViewport', () => {
  it('should parse valid viewport string', () => {
    const viewport = parseViewport('1920x1080')
    expect(viewport).toEqual({ width: 1920, height: 1080, dpr: 1 })
  })

  it('should parse viewport with custom DPR', () => {
    const viewport = parseViewport('1440x900', 2)
    expect(viewport).toEqual({ width: 1440, height: 900, dpr: 2 })
  })

  it('should throw error for invalid format', () => {
    expect(() => parseViewport('invalid')).toThrow('Invalid viewport format')
    expect(() => parseViewport('1920')).toThrow('Invalid viewport format')
    expect(() => parseViewport('1920x')).toThrow('Invalid viewport format')
    expect(() => parseViewport('x1080')).toThrow('Invalid viewport format')
  })

  it('should throw error for zero or negative dimensions', () => {
    expect(() => parseViewport('0x1080')).toThrow('Invalid viewport dimensions')
    expect(() => parseViewport('1920x0')).toThrow('Invalid viewport dimensions')
    // Negative numbers don't match the regex pattern, so they fail at format check
    expect(() => parseViewport('-1920x1080')).toThrow('Invalid viewport format')
    expect(() => parseViewport('1920x-1080')).toThrow('Invalid viewport format')
  })
})

describe('parseClipRegion', () => {
  it('should parse valid clip region string', () => {
    const region = parseClipRegion('0,0,1920,1080')
    expect(region).toEqual({ x: 0, y: 0, width: 1920, height: 1080 })
  })

  it('should handle whitespace', () => {
    const region = parseClipRegion(' 10 , 20 , 300 , 400 ')
    expect(region).toEqual({ x: 10, y: 20, width: 300, height: 400 })
  })

  it('should throw error for invalid format', () => {
    expect(() => parseClipRegion('0,0,1920')).toThrow('Invalid clip region format')
    expect(() => parseClipRegion('0,0')).toThrow('Invalid clip region format')
    expect(() => parseClipRegion('invalid')).toThrow('Invalid clip region format')
    expect(() => parseClipRegion('a,b,c,d')).toThrow('Invalid clip region format')
  })

  it('should throw error for zero or negative dimensions', () => {
    expect(() => parseClipRegion('0,0,0,1080')).toThrow('Invalid clip region')
    expect(() => parseClipRegion('0,0,1920,0')).toThrow('Invalid clip region')
    expect(() => parseClipRegion('0,0,-100,100')).toThrow('Invalid clip region')
  })
})

describe('parseIgnoreRegions', () => {
  it('should parse single region', () => {
    const regions = parseIgnoreRegions('0,0,100,50')
    expect(regions).toEqual([{ x: 0, y: 0, width: 100, height: 50 }])
  })

  it('should parse multiple regions', () => {
    const regions = parseIgnoreRegions('0,0,100,50;1340,0,100,50')
    expect(regions).toEqual([
      { x: 0, y: 0, width: 100, height: 50 },
      { x: 1340, y: 0, width: 100, height: 50 },
    ])
  })

  it('should handle whitespace', () => {
    const regions = parseIgnoreRegions(' 0,0,100,50 ; 200,100,50,25 ')
    expect(regions).toEqual([
      { x: 0, y: 0, width: 100, height: 50 },
      { x: 200, y: 100, width: 50, height: 25 },
    ])
  })

  it('should ignore empty regions', () => {
    const regions = parseIgnoreRegions('0,0,100,50;;200,100,50,25')
    expect(regions).toEqual([
      { x: 0, y: 0, width: 100, height: 50 },
      { x: 200, y: 100, width: 50, height: 25 },
    ])
  })

  it('should return empty array for empty string', () => {
    const regions = parseIgnoreRegions('')
    expect(regions).toEqual([])
  })

  it('should throw error for invalid region format', () => {
    expect(() => parseIgnoreRegions('0,0,100')).toThrow('Invalid ignore region format')
    expect(() => parseIgnoreRegions('invalid;0,0,100,50')).toThrow('Invalid ignore region format')
  })

  it('should throw error for zero or negative dimensions', () => {
    expect(() => parseIgnoreRegions('0,0,0,50')).toThrow('Invalid ignore region')
    expect(() => parseIgnoreRegions('0,0,100,0')).toThrow('Invalid ignore region')
  })
})

describe('validateUrl', () => {
  it('should validate valid URLs', () => {
    expect(validateUrl('https://example.com')).toBe(true)
    expect(validateUrl('http://example.com')).toBe(true)
    expect(validateUrl('https://example.com/path?query=value')).toBe(true)
    expect(validateUrl('http://localhost:3000')).toBe(true)
  })

  it('should reject invalid URLs', () => {
    expect(validateUrl('not-a-url')).toBe(false)
    expect(validateUrl('ftp://example.com')).toBe(true) // FTP is valid URL
    expect(validateUrl('')).toBe(false)
    expect(validateUrl('//example.com')).toBe(false)
  })
})

describe('validateThreshold', () => {
  it('should validate threshold in range 0.0-1.0', () => {
    expect(validateThreshold(0)).toBe(true)
    expect(validateThreshold(0.5)).toBe(true)
    expect(validateThreshold(1)).toBe(true)
    expect(validateThreshold(0.99)).toBe(true)
  })

  it('should reject threshold out of range', () => {
    expect(validateThreshold(-0.1)).toBe(false)
    expect(validateThreshold(1.1)).toBe(false)
    expect(validateThreshold(100)).toBe(false)
    expect(validateThreshold(-1)).toBe(false)
  })
})

describe('validateColorThreshold', () => {
  it('should validate color threshold in range 0-255', () => {
    expect(validateColorThreshold(0)).toBe(true)
    expect(validateColorThreshold(128)).toBe(true)
    expect(validateColorThreshold(255)).toBe(true)
  })

  it('should reject color threshold out of range', () => {
    expect(validateColorThreshold(-1)).toBe(false)
    expect(validateColorThreshold(256)).toBe(false)
    expect(validateColorThreshold(1000)).toBe(false)
  })
})
