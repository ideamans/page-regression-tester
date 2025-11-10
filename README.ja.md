# Page Regression Tester

決定論的キャプチャによるWebページのビジュアルリグレッションテストツール

[English](./README.md) | 日本語

## 特徴

- **決定論的ページキャプチャ**: アニメーション無効化、時刻・ランダム値の固定、外部リソースのブロック
- **複数の比較メソッド**: Pixel（ピクセル単位）、SSIM（構造類似性）の2つの比較手法
- **構造スナップショット**: DOM構造とスタイルをキャプチャし、レイアウトの変化を検出
- **CLIツール**: 使いやすいコマンドラインインターフェース
- **Docker対応**: 再現可能な環境で一貫した結果を保証
- **CI/CD統合**: 自動テストワークフロー向けに設計

## インストール

```bash
npm install -g page-regression-tester
```

または、プロジェクトローカルにインストール：

```bash
npm install --save-dev page-regression-tester
```

Playwrightブラウザのインストール：

```bash
npx playwright install chromium
```

## 使い方

### Captureコマンド

決定論的な動作でWebページのスクリーンショットをキャプチャします：

```bash
page-regression-tester capture <url> [options]
```

#### 基本的な例

```bash
# シンプルなスクリーンショット
page-regression-tester capture https://example.com --output ./screenshots/baseline.png

# 構造スナップショット付き
page-regression-tester capture https://example.com \
  --output ./screenshots/baseline.png

# 高度なオプション
page-regression-tester capture https://example.com \
  --output ./screenshots/homepage.png \
  --viewport 1920x1080 \
  --dpr 2 \
  --wait-selector '[data-testid="hero"]' \
  --mask '[data-testid="carousel"]' \
  --mock-time "2025-01-01T00:00:00Z" \
  --block-urls "**/analytics/**,**/ads/**"
```

#### Captureオプション

| オプション | 説明 | デフォルト |
|--------|-------------|---------|
| `-o, --output <path>` | 出力ファイルパス | `./tmp/capture.png` |
| `--preset <type>` | デバイスプリセット（desktop\|mobile） | - |
| `--viewport <size>` | ビューポートサイズ（WIDTHxHEIGHT） | `1440x900` |
| `--dpr <number>` | デバイスピクセル比 | `2` |
| `--wait-until <state>` | 待機状態（load\|domcontentloaded\|networkidle） | `networkidle` |
| `--wait-selector <selectors>` | 待機するセレクタ（カンマ区切り） | - |
| `--wait-timeout <ms>` | 待機タイムアウト（ミリ秒） | `30000` |
| `--mask <selectors>` | マスクするセレクタ（カンマ区切り） | - |
| `--keep-animations` | アニメーションを保持（決定論的キャプチャでは無効化がデフォルト） | - |
| `--mock-time <time>` | 時刻をISO 8601タイムスタンプに固定 | - |
| `--mock-seed <number>` | Math.random()のランダムシード | `42` |
| `--block-urls <patterns>` | URLパターンをブロック（カンマ区切り） | - |
| `--inject-css <path>` | カスタムCSSファイルを注入 | - |
| `--inject-js <path>` | カスタムJavaScriptファイルを注入 | - |
| `--browser <type>` | ブラウザタイプ（chromium\|firefox\|webkit） | `chromium` |
| `--headful` | ブラウザをヘッドフルモードで実行 | - |
| `--disable-snapshot` | 構造スナップショットJSON出力を無効化 | デフォルトで有効 |
| `--snapshot-selectors <selectors>` | 構造スナップショット用セレクタ（カンマ区切り） | `header,nav,[data-testid]` |

### Compareコマンド

2つのスクリーンショットを比較し、差分画像を生成します：

```bash
page-regression-tester compare <baseline> <current> [options]
```

#### 基本的な例

```bash
# シンプルな比較（ピクセルベース）
page-regression-tester compare baseline.png current.png

# SSIM比較を含む
page-regression-tester compare baseline.png current.png \
  --method pixel,ssim \
  --output ./diff/

# SSIMのみの比較（構造類似性）
page-regression-tester compare baseline.png current.png \
  --method ssim \
  --output ./diff/

# 複数の差分スタイル
page-regression-tester compare baseline.png current.png \
  --diff-style sidebyside \
  --output ./diff/
```

#### Compareオプション

| オプション | 説明 | デフォルト |
|--------|-------------|---------|
| `-o, --output <dir>` | 差分画像とレポートの出力ディレクトリ | `./tmp/diff/` |
| `--method <methods>` | 比較メソッド（カンマ区切り: pixel,ssim） | `pixel` |
| `--threshold <number>` | 差分閾値（0.0-1.0、最小許容値15%） | `0.002` |
| `--diff-style <style>` | 差分画像スタイル（heatmap\|sidebyside\|overlay\|blend） | `heatmap` |
| `--ignore-regions <regions>` | 無視する領域（X,Y,W,H セミコロン区切り） | - |
| `--include-antialiasing` | アンチエイリアシングを差分検出に含める | デフォルトで無視 |
| `--color-threshold <number>` | 色差分閾値（0-255） | `10` |
#### 比較メソッド

**pixel** - pixelmatchアルゴリズムを使用したピクセル単位の比較
- 正確なピクセル差分を検出
- ビジュアルリグレッションの検出に最適
- ヒートマップ差分画像を生成
- 色閾値とアンチエイリアシング検出が設定可能

**ssim** - 構造類似性指標（SSIM）
- 輝度、コントラスト、構造に基づく知覚類似性メトリック
- ピクセル比較よりも人間の視覚認識に近い
- 0.0（完全に異なる）から1.0（同一）のスコアを返す
- 微細なレンダリング差異に対して感度が低い
- 差分画像は生成しない（数値スコアのみ）

#### 閾値の動作

すべての比較メソッド（pixel、SSIM）には**デフォルトで15%の許容値**が適用されます：

- **指定した閾値 < 15%**: ツールは最小許容値として15%を使用します
- **指定した閾値 ≥ 15%**: ツールは指定した閾値を使用します
- **全体スコア**: 類似度が85%以上（差分 ≤ 15%）の場合、比較は合格となります

この設計は、決定論的キャプチャにおいても避けられない微細な差異（動的コンテンツ、ブラウザレンダリングの変動など）に対応しつつ、必要に応じてより厳密な閾値を設定できるようにしています。

**例：**
```bash
# 15%の許容値を使用（0.002 < 0.15のため）
page-regression-tester compare baseline.png current.png --threshold 0.002

# 20%の許容値を使用（0.20 > 0.15のため）
page-regression-tester compare baseline.png current.png --threshold 0.20
```

#### 出力ファイル

- `diff-heatmap.png` - 差分を示すヒートマップ
- `diff-sidebyside.png` - サイドバイサイド比較（リクエスト時）
- `diff-overlay.png` - オーバーレイ比較（リクエスト時）
- `diff-blend.png` - ブレンド比較（リクエスト時）
- `result.json` - 詳細な比較結果
- `result.txt` - テキストレポート

## 決定論的機能

このツールは、Webページを決定論的（再現可能）にするための様々な技術を実装しています：

### 1. アニメーション & トランジション

- すべてのCSSアニメーションとトランジションを無効化
- requestAnimationFrameループを停止
- Web Animations APIを無効化
- `prefers-reduced-motion`を設定

### 2. 時刻 & ランダム性

- `Date.now()`を特定のタイムスタンプに固定
- `Math.random()`を固定値でシード
- `Performance.now()`を凍結

### 3. 外部リソース

- アナリティクス、広告、トラッキングスクリプトをブロック
- APIレスポンスをモック
- ビデオ/オーディオの自動再生を無効化
- 動的コンテンツをブロックまたはモック

### 4. フォント

- すべてのフォントの読み込みを待機
- 一貫したフォントレンダリングを使用

### 5. 遅延読み込み

- `IntersectionObserver`をスタブ化して即座にトリガー
- キャプチャ前にすべての画像を読み込み

### 6. スクロール & フォーカス

- スムーズスクロールを無効化
- 自動スクロール動作を防止
- テキストカーソルを非表示

詳細な仕様は[SPEC.md](./SPEC.md)、設計思想は[CONCEPT.md](./CONCEPT.md)を参照してください。

## プロジェクト構造

```
page-regression-tester/
├── src/
│   ├── cli/                    # CLIコマンド
│   │   ├── index.ts            # メインCLIエントリポイント
│   │   ├── capture.ts          # Captureコマンド
│   │   └── compare.ts          # Compareコマンド
│   ├── capture/                # Captureモジュール
│   │   ├── index.ts            # キャプチャ実行
│   │   ├── deterministic.ts   # 決定論的スクリプト
│   │   └── snapshot.ts         # 構造スナップショット
│   ├── compare/                # Compareモジュール
│   │   ├── pixel.ts            # ピクセル比較
│   │   ├── ssim.ts             # SSIM比較
│   │   ├── layout.ts           # レイアウト比較
│   │   └── diff-image.ts       # 差分画像生成
│   ├── utils/                  # ユーティリティ
│   │   ├── logger.ts           # ロギング
│   │   ├── file.ts             # ファイル操作
│   │   └── validator.ts        # 入力検証
│   └── types.ts                # TypeScript型定義
├── bin/
│   └── cli.js                  # CLI実行ファイル
├── dist/                       # コンパイル済みJavaScript
└── __tests__/                  # テスト
```

## 開発

### セットアップ

```bash
# 依存関係のインストール
npm install

# Playwrightブラウザのインストール
npx playwright install chromium

# ビルド
npm run build

# ローカル開発用にリンク
npm link
```

### 開発コマンド

```bash
# ウォッチモード
npm run dev

# リント
npm run lint

# フォーマット
npm run format

# テスト
npm test

# カバレッジ付きテスト
npm run test:coverage
```

## テスト

このプロジェクトは包括的なテストカバレッジを備えています：

- **全体カバレッジ**: 97%以上（文、分岐、関数、行）
- **ユニットテスト**: 83テスト
  - ユーティリティモジュール（file、validator、logger、presets）
  - 比較モジュール（pixel、SSIM、layout、diff-image）
  - ヘルパーモジュール（画像生成）

```bash
# すべてのテストを実行
npm test

# カバレッジ付きテストを実行
npm run test:coverage

# 統合テストを実行
npm run test:integration
```

## ロードマップ

### Phase 1: Capture ✅ 完了
- [x] プロジェクトセットアップ
- [x] 基本的な型とユーティリティ
- [x] 決定論的動作を持つCaptureコマンド
- [x] 64x64フィルタ付き構造スナップショット
- [x] XPathベースの要素識別

### Phase 2: Compare ✅ 完了
- [x] Pixel比較（pixelmatch）
- [x] Layout比較（XPathベース）
- [x] 差分画像生成（heatmap/sidebyside/overlay/blend）
- [x] JSONレポート生成
- [x] Compare コマンドCLI

### Phase 3: 高度な機能 🚧 進行中
- [x] SSIM比較
- [ ] Structure比較（DOM/スタイル）
- [ ] HTMLレポート生成
- [ ] Workflowコマンド
- [ ] 設定ファイル対応（YAML/JSON）

### Phase 4: プロダクション対応
- [ ] Docker対応
- [x] テストカバレッジ（97%以上のカバレッジ、83ユニットテスト）
- [ ] CI/CD例
- [ ] ドキュメント改善

## ライセンス

MIT

## リポジトリ

https://github.com/ideamans/page-regression-tester

## 参考資料

- [SPEC.md](./SPEC.md) - 詳細な仕様
- [CONCEPT.md](./CONCEPT.md) - 設計思想とコンセプト
- [Playwright Documentation](https://playwright.dev/)
