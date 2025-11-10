# Repository Guidelines

## Project Structure & Module Organization
`src/` holds the TypeScript sources: CLI wiring lives in `src/cli`, deterministic capture in `src/capture`, comparison/reporting in `src/compare` and `src/report`, shared helpers in `src/utils`, and types in `src/types.ts`. Tests live in `__tests__/` and should mirror the source tree for quick lookups. Generated assets land in `dist/`, while screenshots, diffs, and fixtures belong under `tmp/`. Consult `SPEC.md` and `CONCEPT.md` whenever you change behavior—they capture the expected UX.

## Build, Test & Development Commands
- `npm run dev` – TypeScript watch mode.
- `npm run build` – emits ESM bundles to `dist/` (run before publishing).
- `npm run lint` / `npm run format` – ESLint and Prettier over `src/**/*.ts`.
- `npm test` – Jest unit suite; `npm run test:integration` targets browser-backed cases.
- `npm run test:coverage` – creates coverage artifacts for CI.
Install browsers with `npx playwright install chromium` ahead of capture or integration runs.

## Coding Style & Naming Conventions
Write ECMAScript-module TypeScript with two-space indentation, single quotes, and explicit exports. Favor descriptive kebab-case file names (e.g., `deterministic.ts`) and keep CLI commands, flags, and snapshot helpers near their modules. Prefer async/await for Playwright flows, route I/O through utilities such as `src/utils/logger.ts`, and let ESLint/Prettier be the final arbiter before you commit.

## Testing Guidelines
Place Jest specs under `__tests__/**` with `*.spec.ts` or `*.test.ts` suffixes. Mock Playwright for unit speed; keep `test:integration` for real-browser flows and store artifacts in `tmp/`. Target coverage parity for new modules and add visual baselines whenever you alter capture determinism so regressions can be detected automatically.

## Commit & Pull Request Guidelines
Keep commit subjects short and imperative (history currently uses lowercase, e.g., `initial commit`) and use bodies for rationale plus validation notes. Each PR should summarize behavioral impact, link the relevant SPEC section, list the commands run, and attach CLI output or diff images whenever visuals change. Reference issues and double-check that bulky Playwright artifacts stay out of the diff.

## Security & Configuration Tips
Use Node.js ≥20 as enforced in `package.json`. Keep API keys out of Git; prefer `.env` entries consumed via future `src/config` helpers. When targeting third-party pages, block analytics via CLI flags to avoid leaking data, and document any host permissions or mock setups in your PR description.
