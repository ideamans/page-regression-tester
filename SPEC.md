# Page Regression Tester - 仕様書

## 概要

動的要素を含むWebページのファーストビューに対するビジュアル回帰テストツール。
決定論的なページ状態を作り出し、複数の比較手法で視覚的な変更を検出する。

## 設計方針

CONCEPT.mdで示された「決定論化」と「比較粒度の使い分け」を軸とし、以下の戦略を採用：

1. **決定論化の徹底**
   - アニメーション・トランジションの停止
   - 時間・乱数の固定
   - フォントの固定
   - 外部リソース（API、広告、解析タグ）のモック/ブロック
   - 待機条件の明示化

2. **多段階比較アプローチ**
   - ピクセル比較（厳密）
   - 構造比較（DOM/計測スナップショット）
   - レイアウト指標比較（位置・サイズ）
   - 知覚的差分（SSIM等）

3. **実務的な運用性**
   - Docker環境での再現性確保
   - CI/CD統合を考慮した設計
   - ベースライン管理とレビューフロー

## アーキテクチャ

### 技術スタック

**言語・ランタイム:**
- TypeScript 5.0+ / Node.js 20+
- CLIフレームワーク: Commander.js
- パッケージマネージャ: npm / yarn / pnpm

**主要ライブラリ:**
- **ブラウザ自動化:** Playwright / Playwright Test
- **画像処理:**
  - Sharp (高速画像処理)
  - pixelmatch (ピクセル差分検出)
  - ssim.js または image-ssim (SSIM計算)
- **設定管理:** js-yaml (YAML解析)
- **CLI:** Commander.js (コマンドライン引数解析)
- **レポート生成:** Handlebars または EJS (HTMLテンプレート)
- **ログ出力:** chalk (カラー出力), ora (スピナー表示)

**出力フォーマット:**
- スクリーンショット: PNG
- 差分画像: PNG（ヒートマップ/サイドバイサイド/オーバーレイ）
- 構造スナップショット: JSON
- レポート: HTML + JSON

### プロジェクト構造

```
page-regression-tester/
├── src/
│   ├── cli/                    # CLI エントリポイント
│   │   ├── index.ts            # メインCLI
│   │   ├── capture.ts          # captureコマンド
│   │   ├── compare.ts          # compareコマンド
│   │   └── workflow.ts         # workflowコマンド
│   ├── capture/                # キャプチャモジュール
│   │   ├── browser.ts          # ブラウザ起動・制御
│   │   ├── deterministic.ts   # 決定論化処理
│   │   ├── snapshot.ts         # 構造スナップショット取得
│   │   └── types.ts            # 型定義
│   ├── compare/                # 比較モジュール
│   │   ├── pixel.ts            # ピクセル比較
│   │   ├── ssim.ts             # SSIM比較
│   │   ├── layout.ts           # レイアウト比較
│   │   ├── structure.ts        # 構造比較
│   │   ├── diff-image.ts       # 差分画像生成
│   │   └── types.ts            # 型定義
│   ├── report/                 # レポート生成
│   │   ├── html.ts             # HTMLレポート
│   │   ├── json.ts             # JSON結果
│   │   └── templates/          # HTMLテンプレート
│   ├── config/                 # 設定管理
│   │   ├── loader.ts           # YAML/JSON読込
│   │   ├── schema.ts           # 設定スキーマ定義
│   │   └── types.ts            # 型定義
│   └── utils/                  # ユーティリティ
│       ├── logger.ts           # ロギング
│       ├── file.ts             # ファイル操作
│       └── validator.ts        # バリデーション
├── templates/                  # HTMLテンプレート
│   ├── report.hbs              # レポートテンプレート
│   └── diff.hbs                # 差分詳細テンプレート
├── tests/                      # テストコード
│   ├── unit/                   # ユニットテスト
│   └── integration/            # 統合テスト
├── bin/
│   └── cli.js                  # CLI実行ファイル
├── package.json
├── tsconfig.json
├── .npmrc
├── Dockerfile
└── README.md
```

## コマンド構成

### 1. `capture` サブコマンド - スクリーンショット取得

#### 概要
指定URLのファーストビューをキャプチャし、決定論的な状態で保存する。

#### 使用例

```bash
# 基本的な使い方
page-regression-tester capture https://example.com -o ./baseline/

# 詳細オプション指定
page-regression-tester capture https://example.com \
  --output ./baseline/example.png \
  --viewport 1440x900 \
  --wait-until networkidle \
  --wait-selector '[data-testid="hero"]' \
  --config ./config.yaml \
  --disable-animations \
  --mock-time "2025-01-01T00:00:00Z" \
  --block-urls "**/analytics/**,**/ads/**"
```

#### オプション

| オプション | 説明 | デフォルト |
|----------|------|----------|
| `-o, --output` | 出力ファイルパス | `./screenshots/capture-{timestamp}.png` |
| `--viewport` | ビューポートサイズ (WIDTHxHEIGHT) | `1440x900` |
| `--dpr` | デバイスピクセル比 | `2` |
| `--clip` | クリップ領域 (X,Y,WIDTH,HEIGHT) | ファーストビュー全体 |
| `--wait-until` | 待機条件 (load/domcontentloaded/networkidle) | `networkidle` |
| `--wait-selector` | 追加待機セレクタ（カンマ区切りで複数指定可） | なし |
| `--wait-timeout` | 最大待機時間（ミリ秒） | `30000` |
| `--mask` | マスク領域セレクタ（カンマ区切り） | なし |
| `--disable-animations` | アニメーション・トランジション停止 | `true` |
| `--mock-time` | 固定する時刻 (ISO 8601) | なし |
| `--mock-seed` | 乱数シード | `42` |
| `--block-urls` | ブロックするURLパターン（カンマ区切り） | なし |
| `--inject-css` | 追加CSSファイルパス | なし |
| `--inject-js` | 追加JavaScriptファイルパス | なし |
| `--config` | 設定ファイルパス (YAML/JSON) | `./config.yaml` |
| `--browser` | ブラウザ種類 (chromium/firefox/webkit) | `chromium` |
| `--headless` | ヘッドレスモード | `true` |
| `--save-snapshot` | 構造スナップショットも保存 | `false` |
| `--snapshot-selectors` | 構造スナップショット対象セレクタ | `header,nav,[data-testid]` |

#### 決定論化の実装

1. **アニメーション停止**
   ```css
   *, *::before, *::after {
     animation: none !important;
     transition: none !important;
     caret-color: transparent !important;
   }
   html { scroll-behavior: auto !important; }
   ```

2. **時刻・乱数固定**
   ```javascript
   // Date.now() 固定
   const fixedTime = new Date('2025-01-01T00:00:00Z').valueOf();
   Date = class extends Date { ... };

   // Math.random() シード固定
   Math.random = () => seededRandom();
   ```

3. **フォント待機**
   ```javascript
   if (document.fonts) {
     await document.fonts.ready;
   }
   ```

4. **外部リソースブロック**
   - `--block-urls` で指定したパターンをブロック
   - デフォルトで analytics、ads、tracking を推奨ブロック

#### 出力

**スクリーンショット:**
- `{output}` - PNG画像

**構造スナップショット（`--save-snapshot` 指定時）:**
- `{output}.snapshot.json` - 以下の情報を含むJSON
  ```json
  {
    "url": "https://example.com",
    "viewport": { "width": 1440, "height": 900, "dpr": 2 },
    "timestamp": "2025-01-01T00:00:00Z",
    "elements": [
      {
        "selector": "[data-testid=\"hero\"]",
        "tag": "DIV",
        "role": "banner",
        "text": "Welcome to...",
        "rect": { "x": 0, "y": 100, "width": 1440, "height": 600 },
        "styles": {
          "display": "flex",
          "position": "relative",
          "fontSize": "16px",
          "lineHeight": "1.5",
          "color": "rgb(0, 0, 0)",
          "margin": "0 0 0 0",
          "padding": "20px 40px 20px 40px"
        }
      }
    ]
  }
  ```

### 2. `compare` サブコマンド - 画像比較

#### 概要
2つのスクリーンショットを比較し、差分を可視化・定量化する。

#### 使用例

```bash
# 基本的な比較
page-regression-tester compare baseline.png current.png

# 詳細オプション指定
page-regression-tester compare baseline.png current.png \
  --output ./diff/ \
  --method pixel,ssim,layout \
  --threshold 0.002 \
  --diff-style heatmap \
  --ignore-regions "0,0,100,50;1340,0,100,50" \
  --config ./config.yaml
```

#### オプション

| オプション | 説明 | デフォルト |
|----------|------|----------|
| `-o, --output` | 差分画像/レポート出力ディレクトリ | `./diff/` |
| `--method` | 比較手法（カンマ区切り: pixel/ssim/layout/structure） | `pixel,ssim` |
| `--threshold` | 差分許容閾値 (0.0-1.0) | `0.002` (0.2%) |
| `--diff-style` | 差分画像スタイル (heatmap/sidebyside/overlay/blend) | `heatmap` |
| `--ignore-regions` | 無視する領域 (X,Y,W,H; で複数指定) | なし |
| `--ignore-antialiasing` | アンチエイリアス差分を無視 | `true` |
| `--color-threshold` | 色差分の閾値 (0-255) | `10` |
| `--output-format` | 出力フォーマット (png/jpg/webp) | `png` |
| `--report` | HTMLレポート生成 | `true` |
| `--json` | JSON形式でも結果出力 | `true` |
| `--config` | 設定ファイルパス | `./config.yaml` |
| `--baseline-snapshot` | ベースライン構造スナップショットJSON | 自動検出 |
| `--current-snapshot` | 比較対象構造スナップショットJSON | 自動検出 |

#### 比較手法

##### 1. Pixel比較（ピクセル単位）

**アルゴリズム:**
- 各ピクセルのRGB値を比較
- 差分が `--color-threshold` を超えたら「差分あり」としてカウント
- アンチエイリアス検出（周囲8ピクセルとの色差を判定）

**出力指標:**
- `pixelDiffCount`: 差分ピクセル数
- `pixelDiffRatio`: 差分ピクセル比率 (0.0-1.0)
- `maxColorDiff`: 最大色差分値 (0-255)

**差分画像:**
- Heatmap: 差分の大きさを色で表現（青→緑→黄→赤）
- Sidebyside: 左右に並べて表示
- Overlay: 半透明重ね合わせ
- Blend: 差分部分のみハイライト

##### 2. SSIM比較（知覚的類似度）

**アルゴリズム:**
- Structural Similarity Index (SSIM) を計算
- 輝度・コントラスト・構造の3要素で評価
- ウィンドウサイズ: 11x11ピクセル

**出力指標:**
- `ssimScore`: SSIM値 (0.0-1.0、1.0が完全一致)
- `ssimDiffRatio`: 1.0 - SSIM (差分として表現)

**判定:**
- `ssimScore >= (1.0 - threshold)` なら類似とみなす

##### 3. Layout比較（レイアウト指標）

**前提:**
- 構造スナップショットJSON（`.snapshot.json`）が必要
- `--save-snapshot` でキャプチャ時に生成

**アルゴリズム:**
- **視覚的に重要な要素のみを対象**: 64x64ピクセル以上のサイズで表示されている要素を抽出
- 要素のバウンディングボックス（x, y, width, height）を比較
- XPathまたはCSSセレクタで要素を一意に識別
- 位置ずれ量（ピクセル）と面積変化率を計算
- 要素の過不足（追加/削除/移動）を検出

**出力指標:**
- `layoutDiffs`: 要素ごとの差分配列
  ```json
  [
    {
      "xpath": "/html/body/div[1]/section[1]",
      "selector": "[data-testid=\"hero\"]",
      "status": "moved",
      "baselineRect": { "x": 0, "y": 100, "width": 1440, "height": 600 },
      "currentRect": { "x": 0, "y": 105, "width": 1440, "height": 610 },
      "positionDiff": { "dx": 0, "dy": 5 },
      "sizeDiff": { "dw": 0, "dh": 10 },
      "totalShift": 5.0
    },
    {
      "xpath": "/html/body/div[2]/nav[1]",
      "selector": "nav.main-nav",
      "status": "added",
      "currentRect": { "x": 0, "y": 0, "width": 1440, "height": 80 }
    },
    {
      "xpath": "/html/body/div[1]/aside[1]",
      "selector": "aside.sidebar",
      "status": "removed",
      "baselineRect": { "x": 1200, "y": 200, "width": 240, "height": 800 }
    }
  ]
  ```
- `addedElements`: 追加された要素数
- `removedElements`: 削除された要素数
- `movedElements`: 移動した要素数
- `maxShift`: 最大位置ずれ量（ピクセル）
- `layoutDiffRatio`: レイアウト差分比率（正規化）

**要素識別:**
- XPathによる一意識別をメインとする
- CSSセレクタは補助的に使用（data-testid、id、classなど）
- 要素のテキスト内容も識別の補助に使用

**サイズフィルタリング:**
- 64x64ピクセル未満の要素は無視（小さなアイコン、ボタンなどのノイズを除外）
- `visibility: hidden` や `display: none` の要素は無視
- ビューポート外の要素も記録（スクロール考慮）

##### 4. Structure比較（構造・スタイル）

**前提:**
- 構造スナップショットJSON（`.snapshot.json`）が必要

**アルゴリズム:**
- DOMツリー構造（tag, role, testid）の一致確認
- 計算済みスタイルの主要プロパティを比較（fontSize, color, display, position等）

**出力指標:**
- `structureDiffs`: 構造差分配列
  ```json
  [
    {
      "selector": "[data-testid=\"cta\"]",
      "type": "style",
      "property": "fontSize",
      "baseline": "16px",
      "current": "18px"
    },
    {
      "selector": "header nav",
      "type": "missing",
      "message": "Element not found in current"
    }
  ]
  ```
- `structureDiffCount`: 構造差分数

#### 出力

**差分画像:**
- `{output}/diff.png` - メイン差分画像（`--diff-style` で指定したスタイル）
- `{output}/diff-heatmap.png` - ヒートマップ（`--method` に pixel 含む場合）
- `{output}/diff-sidebyside.png` - サイドバイサイド（オプション）

**レポート:**
- `{output}/report.html` - HTMLレポート
  - サムネイル表示（ベースライン/現在/差分）
  - 各比較手法の指標一覧
  - 判定結果（PASS/FAIL）
  - 構造・レイアウト差分の詳細テーブル

**JSON出力:**
- `{output}/result.json`
  ```json
  {
    "baseline": "baseline.png",
    "current": "current.png",
    "timestamp": "2025-01-01T12:00:00Z",
    "methods": ["pixel", "ssim", "layout", "structure"],
    "threshold": 0.002,
    "results": {
      "pixel": {
        "pixelDiffCount": 1234,
        "pixelDiffRatio": 0.0015,
        "maxColorDiff": 45,
        "pass": true
      },
      "ssim": {
        "ssimScore": 0.9985,
        "ssimDiffRatio": 0.0015,
        "pass": true
      },
      "layout": {
        "maxShift": 5.0,
        "layoutDiffRatio": 0.0008,
        "layoutDiffs": [...],
        "pass": true
      },
      "structure": {
        "structureDiffCount": 2,
        "structureDiffs": [...],
        "pass": true
      }
    },
    "overallPass": true
  }
  ```

**終了コード:**
- `0`: すべての比較手法でPASS
- `1`: 1つ以上の比較手法でFAIL
- `2`: エラー（ファイル読込失敗等）

### 3. `workflow` サブコマンド - 統合ワークフロー

#### 概要
capture → compare を一連の流れで実行し、回帰テストワークフローを自動化する。

#### 使用例

```bash
# 初回ベースライン作成
page-regression-tester workflow https://example.com \
  --mode baseline \
  --output ./test-results/example/

# 回帰テスト実行
page-regression-tester workflow https://example.com \
  --mode test \
  --baseline ./test-results/example/baseline.png \
  --output ./test-results/example/

# 複数URL一括テスト（設定ファイル使用）
page-regression-tester workflow --config ./workflow-config.yaml
```

#### オプション

| オプション | 説明 | デフォルト |
|----------|------|----------|
| `--mode` | 実行モード (baseline/test) | `test` |
| `--baseline` | ベースライン画像パス（testモード時） | `{output}/baseline.png` |
| `--output` | 出力ディレクトリ | `./test-results/` |
| `--config` | ワークフロー設定ファイル（YAML） | なし |
| その他 | `capture` と `compare` の全オプション利用可 | - |

#### ワークフロー設定ファイル例

```yaml
# workflow-config.yaml
workflow:
  mode: test
  output: ./test-results/

# 共通キャプチャ設定
capture:
  viewport: 1440x900
  dpr: 2
  disable_animations: true
  mock_time: "2025-01-01T00:00:00Z"
  wait_until: networkidle
  block_urls:
    - "**/analytics/**"
    - "**/ads/**"
    - "**/*.woff2?optimize=true"  # CDNフォント最適化パラメータを除外
  save_snapshot: true

# 共通比較設定
compare:
  method:
    - pixel
    - ssim
    - layout
  threshold: 0.002
  diff_style: heatmap
  report: true

# テスト対象URL一覧
targets:
  - name: homepage
    url: https://example.com
    wait_selector: '[data-testid="hero"]'
    mask: '[data-testid="carousel"]'

  - name: product-page
    url: https://example.com/products/item-123
    viewport: 1920x1080
    wait_selector: '[data-testid="product-image"]'
    ignore_regions: "0,0,300,100"  # ヘッダー広告領域

  - name: mobile-homepage
    url: https://example.com
    viewport: 375x667
    dpr: 3
    wait_selector: '[data-testid="mobile-menu"]'
```

#### 実行フロー

1. **Baselineモード:**
   - 各URLをキャプチャ
   - `{output}/{name}/baseline.png` に保存
   - 構造スナップショットも保存

2. **Testモード:**
   - 各URLをキャプチャ → `{output}/{name}/current.png`
   - ベースラインと比較
   - 差分画像・レポート生成
   - 最終結果サマリー出力

**サマリー出力例:**
```
========================================
Visual Regression Test Summary
========================================
Total: 3 tests
Passed: 2 tests
Failed: 1 test

Details:
  ✓ homepage (all methods passed)
  ✓ mobile-homepage (all methods passed)
  ✗ product-page (pixel: FAIL, ssim: PASS)
    - Pixel diff ratio: 0.0035 (threshold: 0.002)
    - See report: ./test-results/product-page/report.html

Overall: FAILED
========================================
```

## 設定ファイル形式

### config.yaml

```yaml
# グローバル設定
global:
  browser: chromium
  headless: true
  timeout: 30000

# キャプチャデフォルト設定
capture:
  viewport: 1440x900
  dpr: 2
  disable_animations: true
  mock_time: "2025-01-01T00:00:00Z"
  mock_seed: 42
  wait_until: networkidle
  block_urls:
    - "**/analytics/**"
    - "**/ads/**"
    - "**/tracking/**"
  save_snapshot: true
  snapshot_selectors:
    - header
    - nav
    - '[data-testid]'
    - '[role="banner"]'
    - '[role="main"]'

# 比較デフォルト設定
compare:
  method:
    - pixel
    - ssim
  threshold: 0.002
  diff_style: heatmap
  ignore_antialiasing: true
  color_threshold: 10
  report: true
  json: true

# Docker環境設定（将来拡張用）
docker:
  image: mcr.microsoft.com/playwright:v1.40.0-focal
  fonts:
    - path: /usr/share/fonts/truetype/noto
      source: google-noto-fonts
```

## Docker対応

### 環境固定の重要性

フォント・レンダリングエンジンの差異による誤検知を防ぐため、Docker環境での実行を推奨。

### Dockerfile例

```dockerfile
FROM mcr.microsoft.com/playwright:v1.40.0-focal

# Node.js 20 インストール（必要に応じて）
# または既にPlaywrightイメージに含まれているバージョンを使用

# Google Notoフォントインストール（多言語対応）
RUN apt-get update && apt-get install -y \
    fonts-noto-cjk \
    fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

# アプリケーションディレクトリ作成
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存パッケージインストール
RUN npm ci --production

# アプリケーションコードをコピー
COPY dist/ ./dist/
COPY bin/ ./bin/
COPY templates/ ./templates/

# CLIをグローバルにリンク
RUN npm link

WORKDIR /workspace
ENTRYPOINT ["page-regression-tester"]
```

### 使用例

```bash
# Docker環境でキャプチャ
docker run --rm -v $(pwd)/results:/app/results \
  page-regression-tester:latest \
  capture https://example.com -o /app/results/baseline.png

# Docker環境で比較
docker run --rm -v $(pwd)/results:/app/results \
  page-regression-tester:latest \
  compare /app/results/baseline.png /app/results/current.png
```

## CI/CD統合

### GitHub Actions例

```yaml
name: Visual Regression Test

on: [pull_request]

jobs:
  visual-test:
    runs-on: ubuntu-latest
    container:
      image: page-regression-tester:latest

    steps:
      - uses: actions/checkout@v3

      - name: Run visual regression tests
        run: |
          page-regression-tester workflow \
            --config ./visual-tests/config.yaml \
            --mode test \
            --output ./test-results/

      - name: Upload diff images
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: visual-diffs
          path: ./test-results/**/diff*.png

      - name: Upload reports
        uses: actions/upload-artifact@v3
        with:
          name: visual-reports
          path: ./test-results/**/report.html

      - name: Comment PR with results
        if: failure()
        uses: actions/github-script@v6
        with:
          script: |
            // 差分画像をPRコメントに投稿するスクリプト
```

## 拡張性

### 将来の拡張候補

1. **比較手法追加:**
   - Perceptual Hash (pHash, dHash)
   - Layout Shift Score (Web Vitals CLS相当)
   - A11yツリー比較

2. **UI機能:**
   - Webダッシュボード（差分レビューUI）
   - ベースライン承認フロー
   - 履歴管理（Git連携）

3. **高度な決定論化:**
   - Service Workerモック
   - WebSocketスタブ
   - IndexedDB/LocalStorage固定値注入

4. **パフォーマンス最適化:**
   - 並列キャプチャ
   - インクリメンタル比較（変更部分のみ）
   - キャッシュ機構

## ベストプラクティス

### 推奨ワークフロー

1. **初回セットアップ:**
   ```bash
   # 設定ファイル作成
   page-regression-tester init --output ./visual-tests/

   # ベースライン作成
   page-regression-tester workflow \
     --config ./visual-tests/config.yaml \
     --mode baseline
   ```

2. **開発中のテスト:**
   ```bash
   # ローカルで差分確認
   page-regression-tester workflow \
     --config ./visual-tests/config.yaml \
     --mode test
   ```

3. **CIでの運用:**
   - PRごとに自動実行
   - 差分発生時はアーティファクトとして画像保存
   - レビュアーが差分を確認し、意図的変更ならベースライン更新

4. **ベースライン更新:**
   ```bash
   # 新しいベースラインを作成
   page-regression-tester workflow \
     --config ./visual-tests/config.yaml \
     --mode baseline

   # Gitにコミット
   git add visual-tests/results/**/baseline.png
   git commit -m "Update visual regression baselines"
   ```

### マスク・無視領域の選定

**マスクすべき要素:**
- カルーセル/スライダー（自動再生が完全に止められない場合）
- 広告枠（外部コンテンツ）
- リアルタイム更新要素（株価、天気など）
- ランダム推奨コンテンツ

**無視すべき差分:**
- サブピクセルレンダリング差異（`--ignore-antialiasing`）
- 微小な色差（`--color-threshold` 調整）
- 非クリティカル領域（フッター等は閾値緩和）

## トラブルシューティング

### よくある問題と対策

**1. フォント差分による誤検知**
- **原因:** OS/環境によるフォントレンダリング差異
- **対策:** Docker環境使用、Webフォント事前ロード、`font-display: optional` 設定

**2. アニメーションが止まらない**
- **原因:** CSS以外のアニメーション（Canvas、WebGL）
- **対策:** テストフラグ `__E2E_DISABLE_AUTOPLAY__` で停止、JSインジェクション

**3. タイミング依存の不安定性**
- **原因:** 非同期処理の完了タイミングがばらつく
- **対策:** `--wait-selector` で明示的待機、複数条件AND待機

**4. 外部リソースの変動**
- **原因:** API、CDN、広告の内容変化
- **対策:** `--block-urls` でブロック、APIモック、マスク適用

## パフォーマンス目安

**1キャプチャあたりの所要時間:**
- シンプルなページ: 3-5秒
- 複雑なSPA: 10-15秒
- 重いページ: 20-30秒

**比較処理:**
- Pixel/SSIM比較（1440x900@2x）: 100-300ms
- Layout/Structure比較: 50-100ms
- レポート生成: 200-500ms

**推奨スペック:**
- CPU: 4コア以上
- メモリ: 8GB以上（並列実行時は16GB推奨）
- ストレージ: SSD推奨

## ライセンス・依存関係

**使用予定のライブラリ:**
- **Playwright** (Apache 2.0) - ブラウザ自動化
- **Sharp** (Apache 2.0) - 画像処理
- **pixelmatch** (ISC) - ピクセル差分検出
- **ssim.js** (MIT) または **image-ssim** (MIT) - SSIM計算
- **Commander.js** (MIT) - CLIフレームワーク
- **js-yaml** (MIT) - YAML解析
- **Handlebars** (MIT) - テンプレートエンジン
- **chalk** (MIT) - ターミナルカラー出力
- **ora** (MIT) - スピナー表示

**ライセンス:**
- このツール自体: MIT

## 開発環境セットアップ

### 必要な環境

- Node.js 20.x 以上
- npm 10.x 以上（または yarn / pnpm）
- Playwrightブラウザ（自動インストール）

### 初期セットアップ

```bash
# リポジトリクローン
git clone https://github.com/your-org/page-regression-tester.git
cd page-regression-tester

# 依存パッケージインストール
npm install

# Playwrightブラウザインストール
npx playwright install chromium

# TypeScriptビルド
npm run build

# グローバルリンク（ローカル開発用）
npm link

# 動作確認
page-regression-tester --version
```

### 開発コマンド

```bash
# TypeScript監視ビルド
npm run dev

# リント
npm run lint

# フォーマット
npm run format

# ユニットテスト
npm test

# 統合テスト
npm run test:integration

# カバレッジ
npm run test:coverage

# ビルド（プロダクション）
npm run build

# パッケージング
npm pack
```

### package.json例

```json
{
  "name": "page-regression-tester",
  "version": "0.1.0",
  "description": "Visual regression testing tool for web pages with deterministic capture",
  "main": "dist/index.js",
  "bin": {
    "page-regression-tester": "bin/cli.js"
  },
  "scripts": {
    "dev": "tsc --watch",
    "build": "tsc",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write 'src/**/*.ts'",
    "test": "jest",
    "test:integration": "jest --config jest.integration.config.js",
    "test:coverage": "jest --coverage",
    "prepublishOnly": "npm run build"
  },
  "keywords": [
    "visual-regression",
    "screenshot",
    "testing",
    "playwright",
    "image-diff"
  ],
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {
    "@playwright/test": "^1.40.0",
    "chalk": "^5.3.0",
    "commander": "^11.1.0",
    "handlebars": "^4.7.8",
    "js-yaml": "^4.1.0",
    "ora": "^7.0.1",
    "pixelmatch": "^5.3.0",
    "playwright": "^1.40.0",
    "sharp": "^0.33.0",
    "ssim.js": "^3.5.0"
  },
  "devDependencies": {
    "@types/jest": "^29.5.11",
    "@types/js-yaml": "^4.0.9",
    "@types/node": "^20.10.5",
    "@types/pixelmatch": "^5.2.6",
    "@typescript-eslint/eslint-plugin": "^6.15.0",
    "@typescript-eslint/parser": "^6.15.0",
    "eslint": "^8.56.0",
    "jest": "^29.7.0",
    "prettier": "^3.1.1",
    "ts-jest": "^29.1.1",
    "typescript": "^5.3.3"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

### tsconfig.json例

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```
