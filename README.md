# Page Regression Tester

Visual regression testing tool for web pages with deterministic capture.

## Features

- **Deterministic Page Capture**: Disables animations, fixes time/random, blocks external resources
- **Multiple Comparison Methods**: Pixel, SSIM, Layout, Structure comparison
- **Structure Snapshots**: Captures DOM structure and computed styles
- **CLI Tool**: Easy-to-use command-line interface
- **Docker Support**: Reproducible environment for consistent results
- **CI/CD Integration**: Designed for automated testing workflows

## Installation

```bash
npm install
npm run build
npm link
```

Or install Playwright browsers:

```bash
npx playwright install chromium
```

## Usage

### Capture Command

Capture a screenshot of a web page with deterministic behaviors:

```bash
page-regression-tester capture <url> [options]
```

#### Basic Example

```bash
# Simple screenshot
page-regression-tester capture https://example.com --output ./tmp/baseline.png

# With structure snapshot
page-regression-tester capture https://example.com \
  --output ./tmp/baseline.png \
  --save-snapshot

# Advanced options
page-regression-tester capture https://example.com \
  --output ./tmp/homepage.png \
  --viewport 1920x1080 \
  --dpr 2 \
  --wait-selector '[data-testid="hero"]' \
  --mask '[data-testid="carousel"]' \
  --mock-time "2025-01-01T00:00:00Z" \
  --block-urls "**/analytics/**,**/ads/**" \
  --save-snapshot
```

#### Capture Options

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <path>` | Output file path | `./tmp/capture.png` |
| `--viewport <size>` | Viewport size (WIDTHxHEIGHT) | `1440x900` |
| `--dpr <number>` | Device pixel ratio | `2` |
| `--wait-until <state>` | Wait until state (load/domcontentloaded/networkidle) | `networkidle` |
| `--wait-selector <selectors>` | Wait for selectors (comma-separated) | - |
| `--wait-timeout <ms>` | Wait timeout in milliseconds | `30000` |
| `--mask <selectors>` | Mask selectors (comma-separated) | - |
| `--disable-animations` | Disable animations and transitions | `true` |
| `--mock-time <time>` | Fix time to ISO 8601 timestamp | - |
| `--mock-seed <number>` | Random seed for Math.random() | `42` |
| `--block-urls <patterns>` | Block URL patterns (comma-separated) | - |
| `--inject-css <path>` | Inject custom CSS file | - |
| `--inject-js <path>` | Inject custom JavaScript file | - |
| `--browser <type>` | Browser type (chromium/firefox/webkit) | `chromium` |
| `--no-headless` | Run browser in headful mode | - |
| `--save-snapshot` | Save structure snapshot JSON | `false` |
| `--snapshot-selectors <selectors>` | Structure snapshot selectors (comma-separated) | `header,nav,[data-testid]` |

### Compare Command

Compare two screenshots and generate diff images:

```bash
page-regression-tester compare <baseline> <current> [options]
```

#### Basic Example

```bash
# Simple comparison (pixel-based)
page-regression-tester compare tmp/baseline.png tmp/current.png

# With SSIM and layout comparison
page-regression-tester compare tmp/baseline.png tmp/current.png \
  --method pixel,ssim,layout \
  --output ./tmp/diff/

# SSIM-only comparison (structural similarity)
page-regression-tester compare tmp/baseline.png tmp/current.png \
  --method ssim \
  --output ./tmp/diff/

# Multiple diff styles
page-regression-tester compare tmp/baseline.png tmp/current.png \
  --diff-style sidebyside \
  --output ./tmp/diff/
```

#### Compare Options

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <dir>` | Output directory for diff images | `./tmp/diff/` |
| `--method <methods>` | Comparison methods (comma-separated: pixel,ssim,layout) | `pixel,layout` |
| `--threshold <number>` | Diff threshold (0.0-1.0) | `0.002` |
| `--diff-style <style>` | Diff image style (heatmap/sidebyside/overlay/blend) | `heatmap` |
| `--ignore-regions <regions>` | Ignore regions (X,Y,W,H separated by semicolon) | - |
| `--ignore-antialiasing` | Ignore antialiasing differences | `true` |
| `--color-threshold <number>` | Color diff threshold (0-255) | `10` |
| `--baseline-snapshot <path>` | Baseline structure snapshot path | Auto-detect |
| `--current-snapshot <path>` | Current structure snapshot path | Auto-detect |
| `--json` | Output JSON result | `true` |

#### Comparison Methods

**pixel** - Pixel-by-pixel comparison using pixelmatch algorithm
- Detects exact pixel differences
- Best for detecting visual regressions
- Generates heatmap diff images
- Configurable color threshold and antialiasing detection

**ssim** - Structural Similarity Index (SSIM)
- Perceptual similarity metric based on luminance, contrast, and structure
- More aligned with human visual perception than pixel comparison
- Returns score from 0.0 (completely different) to 1.0 (identical)
- Less sensitive to minor rendering differences
- No diff image generation (numerical score only)

**layout** - XPath-based element position/size comparison
- Compares DOM element positions and dimensions from structure snapshots
- Detects added, removed, moved, and resized elements
- Requires `--save-snapshot` during capture
- Filters elements by 64x64 pixel minimum size
- Useful for detecting layout shifts

#### Output Files

- `diff-heatmap.png` - Heatmap showing differences
- `diff-sidebyside.png` - Side-by-side comparison (if requested)
- `diff-overlay.png` - Overlay comparison (if requested)
- `diff-blend.png` - Blended comparison (if requested)
- `result.json` - Detailed comparison results

### Workflow Command

*Coming soon...*

Run complete regression test workflows:

```bash
page-regression-tester workflow --config ./config.yaml
```

## Deterministic Features

This tool implements various techniques to make web pages deterministic (reproducible):

### 1. Animations & Transitions

- Disables all CSS animations and transitions
- Stops requestAnimationFrame loops
- Disables Web Animations API
- Sets `prefers-reduced-motion`

### 2. Time & Randomness

- Fixes `Date.now()` to a specific timestamp
- Seeds `Math.random()` with a fixed value
- Freezes `Performance.now()`

### 3. External Resources

- Blocks analytics, ads, and tracking scripts
- Mocks API responses
- Disables autoplay for videos/audio
- Blocks or mocks dynamic content

### 4. Fonts

- Waits for all fonts to load
- Uses consistent font rendering

### 5. Lazy Loading

- Stubs `IntersectionObserver` to trigger immediately
- Loads all images before capturing

### 6. Scroll & Focus

- Disables smooth scrolling
- Prevents auto-scroll behaviors
- Hides text cursors

See [SPEC.md](./SPEC.md) for detailed specification and [CONCEPT.md](./CONCEPT.md) for design philosophy.

## Project Structure

```
page-regression-tester/
├── src/
│   ├── cli/                    # CLI commands
│   │   ├── index.ts            # Main CLI entry point
│   │   └── capture.ts          # Capture command
│   ├── capture/                # Capture module
│   │   ├── index.ts            # Capture execution
│   │   ├── deterministic.ts   # Deterministic scripts
│   │   └── snapshot.ts         # Structure snapshot
│   ├── compare/                # Compare module (coming soon)
│   ├── report/                 # Report generation (coming soon)
│   ├── config/                 # Configuration loader (coming soon)
│   ├── utils/                  # Utilities
│   │   ├── logger.ts           # Logging
│   │   ├── file.ts             # File operations
│   │   └── validator.ts        # Input validation
│   └── types.ts                # TypeScript type definitions
├── bin/
│   └── cli.js                  # CLI executable
├── dist/                       # Compiled JavaScript
├── package.json
├── tsconfig.json
├── SPEC.md                     # Full specification
├── CONCEPT.md                  # Design concepts
└── README.md                   # This file
```

## Development

### Setup

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium

# Build
npm run build

# Link for local development
npm link
```

### Development Commands

```bash
# Watch mode
npm run dev

# Lint
npm run lint

# Format
npm run format

# Test
npm test
```

## Roadmap

### Phase 1: Capture ✅ Complete
- [x] Project setup
- [x] Basic types and utilities
- [x] Capture command with deterministic behaviors
- [x] Structure snapshot with 64x64 filter
- [x] XPath-based element identification

### Phase 2: Compare ✅ Complete
- [x] Pixel comparison (pixelmatch)
- [x] Layout comparison (XPath-based)
- [x] Diff image generation (heatmap/sidebyside/overlay/blend)
- [x] JSON report generation
- [x] Compare command CLI

### Phase 3: Advanced Features 🚧 In Progress
- [x] SSIM comparison
- [ ] Structure comparison (DOM/styles)
- [ ] HTML report generation
- [ ] Workflow command
- [ ] Configuration file support (YAML/JSON)

### Phase 4: Production Ready
- [ ] Docker support
- [x] Test coverage (97%+ coverage with 83 unit tests)
- [ ] CI/CD examples
- [ ] Documentation improvements

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration
```

### Test Coverage

The project has comprehensive test coverage:

- **Overall Coverage**: 97%+ (statements, branches, functions, lines)
- **Unit Tests**: 83 tests covering:
  - Utility modules (file, validator, logger, presets)
  - Comparison modules (pixel, SSIM, layout, diff-image)
  - Helper modules (image generation)

**Test Files:**
- `__tests__/utils/` - Utility function tests
- `__tests__/compare/` - Comparison algorithm tests
- `__tests__/helpers/` - Test helper utilities

**Note**: Capture modules and CLI commands require integration tests with Playwright and are excluded from unit test coverage metrics.

## License

MIT

## References

- [SPEC.md](./SPEC.md) - Detailed specification
- [CONCEPT.md](./CONCEPT.md) - Design philosophy and concepts
- [Playwright Documentation](https://playwright.dev/)
