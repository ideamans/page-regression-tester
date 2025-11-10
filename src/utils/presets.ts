/**
 * Device presets for capture
 */

import type { Viewport } from '../types.js'

export interface DevicePreset {
  viewport: Viewport
  userAgent: string
}

/**
 * Desktop preset (default)
 */
export const DESKTOP_PRESET: DevicePreset = {
  viewport: {
    width: 1440,
    height: 900,
    dpr: 2,
  },
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
}

/**
 * Mobile preset (iPhone 12/13/14 Pro)
 */
export const MOBILE_PRESET: DevicePreset = {
  viewport: {
    width: 390,
    height: 844,
    dpr: 3,
  },
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
}

/**
 * Get preset by name
 */
export function getPreset(preset: 'desktop' | 'mobile'): DevicePreset {
  switch (preset) {
    case 'mobile':
      return MOBILE_PRESET
    case 'desktop':
    default:
      return DESKTOP_PRESET
  }
}
