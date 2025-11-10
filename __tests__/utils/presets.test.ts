/**
 * Tests for device presets
 */

import { getPreset, DESKTOP_PRESET, MOBILE_PRESET } from '../../src/utils/presets.js'

describe('Device Presets', () => {
  describe('DESKTOP_PRESET', () => {
    it('should have correct viewport dimensions', () => {
      expect(DESKTOP_PRESET.viewport).toEqual({
        width: 1440,
        height: 900,
        dpr: 2,
      })
    })

    it('should have desktop user agent', () => {
      expect(DESKTOP_PRESET.userAgent).toContain('Macintosh')
      expect(DESKTOP_PRESET.userAgent).toContain('Chrome')
    })
  })

  describe('MOBILE_PRESET', () => {
    it('should have correct viewport dimensions', () => {
      expect(MOBILE_PRESET.viewport).toEqual({
        width: 390,
        height: 844,
        dpr: 3,
      })
    })

    it('should have mobile user agent', () => {
      expect(MOBILE_PRESET.userAgent).toContain('iPhone')
      expect(MOBILE_PRESET.userAgent).toContain('Mobile')
    })
  })

  describe('getPreset', () => {
    it('should return desktop preset for "desktop"', () => {
      const preset = getPreset('desktop')
      expect(preset).toEqual(DESKTOP_PRESET)
    })

    it('should return mobile preset for "mobile"', () => {
      const preset = getPreset('mobile')
      expect(preset).toEqual(MOBILE_PRESET)
    })

    it('should return desktop preset as default', () => {
      // @ts-expect-error Testing invalid input
      const preset = getPreset('invalid')
      expect(preset).toEqual(DESKTOP_PRESET)
    })
  })
})
