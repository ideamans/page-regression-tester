/**
 * Common types used across the application
 */

export type BrowserType = 'chromium' | 'firefox' | 'webkit'
export type WaitUntilState = 'load' | 'domcontentloaded' | 'networkidle'
export type DiffStyle = 'heatmap' | 'sidebyside' | 'overlay' | 'blend'
export type ComparisonMethod = 'pixel' | 'ssim'
export type PresetType = 'desktop' | 'mobile'

/**
 * Viewport configuration
 */
export interface Viewport {
  width: number
  height: number
  dpr?: number
}

/**
 * Clip region for screenshot
 */
export interface ClipRegion {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Ignore region for comparison
 */
export interface IgnoreRegion {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Capture options
 */
export interface CaptureOptions {
  url: string
  output: string
  viewport?: Viewport
  clip?: ClipRegion
  waitUntil?: WaitUntilState
  waitSelector?: string[]
  waitTimeout?: number
  mask?: string[]
  disableAnimations?: boolean
  mockTime?: string
  mockSeed?: number
  blockUrls?: string[]
  injectCss?: string
  injectJs?: string
  browser?: BrowserType
  headless?: boolean
  saveSnapshot?: boolean
  snapshotSelectors?: string[]
  userAgent?: string
  preset?: PresetType
  saveTxt?: boolean
}

/**
 * Compare options
 */
export interface CompareOptions {
  baseline: string
  current: string
  output: string
  method?: ComparisonMethod[]
  threshold?: number
  diffStyle?: DiffStyle
  ignoreRegions?: IgnoreRegion[]
  ignoreAntialiasing?: boolean
  colorThreshold?: number
  outputFormat?: 'png' | 'jpg' | 'webp'
  txt?: boolean
  json?: boolean
}

/**
 * Element snapshot for structure comparison
 */
export interface ElementSnapshot {
  xpath: string // XPath for unique identification
  selector: string // CSS selector (best match)
  tag: string
  role?: string
  id?: string
  testid?: string
  text: string
  rect: {
    x: number
    y: number
    width: number
    height: number
  }
  styles: {
    display: string
    position: string
    fontSize: string
    lineHeight: string
    color: string
    margin: string
    padding: string
  }
}

/**
 * Structure snapshot
 */
export interface StructureSnapshot {
  url: string
  viewport: Viewport
  timestamp: string
  elements: ElementSnapshot[]
}

/**
 * Pixel comparison result
 */
export interface PixelComparisonResult {
  pixelDiffCount: number
  pixelDiffRatio: number
  maxColorDiff: number
  pass: boolean
}

/**
 * SSIM comparison result
 */
export interface SSIMComparisonResult {
  ssimScore: number
  ssimDiffRatio: number
  pass: boolean
}

/**
 * Structure diff for a single element
 */
export interface StructureDiff {
  selector: string
  type: 'style' | 'missing' | 'added'
  property?: string
  baseline?: string
  current?: string
  message?: string
}

/**
 * Structure comparison result
 */
export interface StructureComparisonResult {
  structureDiffCount: number
  structureDiffs: StructureDiff[]
  pass: boolean
}

/**
 * Complete comparison result
 */
export interface ComparisonResult {
  baseline: string
  current: string
  timestamp: string
  methods: ComparisonMethod[]
  threshold: number
  results: {
    pixel?: PixelComparisonResult
    ssim?: SSIMComparisonResult
    structure?: StructureComparisonResult
  }
  overallPass: boolean
  overallScore: number // 0.0-1.0, where 1.0 means identical
}
