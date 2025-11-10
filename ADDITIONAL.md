追加の決定論化アイデア

  1. ビデオ・オーディオ要素の制御

  // <video> や <audio> 要素を固定フレーム/時間で停止
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function() {
      this.pause();
      this.currentTime = 0; // 固定位置
      return Promise.resolve();
    };

    // autoplayを無効化
    Object.defineProperty(HTMLMediaElement.prototype, 'autoplay', {
      get() { return false; },
      set() {}
    });
  });

  2. Canvas要素の安定化

  // Canvas描画でrequestAnimationFrameやランダム要素を使う場合
  await page.addInitScript(() => {
    const contexts = new WeakMap();
    const CanvasRenderingContext2D = window.CanvasRenderingContext2D;

    // ランダムな描画パターンを固定シードで再現
    // または特定フレームで描画を凍結
    let frameCount = 0;
    const originalRAF = window.requestAnimationFrame;
    window.requestAnimationFrame = (callback) => {
      if (frameCount++ >= 10) { // 10フレーム後に停止
        return 0;
      }
      return originalRAF(callback);
    };
  });

  3. スクロール位置の固定

  // ページロード後のスクロールイベントや自動スクロールを防止
  await page.addInitScript(() => {
    window.scrollTo = () => {};
    window.scroll = () => {};
    Element.prototype.scrollIntoView = function() {};
    Element.prototype.scrollTo = function() {};

    // Smooth scrollを強制的に無効化
    document.documentElement.style.scrollBehavior = 'auto';
  });

  4. IntersectionObserver / ResizeObserver の制御

  // Lazy loadingや遅延表示の動作を決定論的に
  await page.addInitScript(() => {
    // すべての要素を「見えている」状態にする
    window.IntersectionObserver = class {
      constructor(callback) {
        this.callback = callback;
      }
      observe(element) {
        // 即座にコールバック実行（全要素が可視状態）
        this.callback([{
          target: element,
          isIntersecting: true,
          intersectionRatio: 1.0,
          boundingClientRect: element.getBoundingClientRect(),
          intersectionRect: element.getBoundingClientRect(),
          rootBounds: null,
          time: 0
        }], this);
      }
      unobserve() {}
      disconnect() {}
    };

    // ResizeObserverも固定化（初回のみ発火）
    window.ResizeObserver = class {
      constructor(callback) {
        this.callback = callback;
        this.observed = new Set();
      }
      observe(element) {
        if (!this.observed.has(element)) {
          this.observed.add(element);
          setTimeout(() => {
            this.callback([{
              target: element,
              contentRect: element.getBoundingClientRect()
            }], this);
          }, 0);
        }
      }
      unobserve() {}
      disconnect() {}
    };
  });

  5. WebGL / WebGPU のコンテキスト固定

  // WebGLアニメーションを固定フレームで停止
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      const ctx = getContext.call(this, type, ...args);
      if (type.includes('webgl')) {
        // アニメーションループを1フレームで停止
        let drawn = false;
        const originalClear = ctx.clear;
        ctx.clear = function(...args) {
          if (drawn) return; // 2回目以降の描画を防止
          drawn = true;
          return originalClear.apply(this, args);
        };
      }
      return ctx;
    };
  });

  6. CSS カスタムプロパティ（CSS変数）の固定

  // CSS変数で動的にテーマを変えている場合
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--theme-color', '#3b82f6');
    document.documentElement.style.setProperty('--animation-duration', '0s');
  });

  7. Web Animations API の無効化

  await page.addInitScript(() => {
    // Element.animate() を無効化
    Element.prototype.animate = function() {
      return {
        cancel: () => {},
        finish: () => {},
        pause: () => {},
        play: () => {},
        reverse: () => {},
        playbackRate: 0,
        playState: 'finished'
      };
    };

    // document.getAnimations() を空にする
    Document.prototype.getAnimations = () => [];
  });

  8. Service Worker の無効化

  // Service Workerのキャッシュやプッシュ通知を防止
  await context.addInitScript(() => {
    delete navigator.serviceWorker;
  });

  9. Geolocation / Sensors API の固定

  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 35.6762, longitude: 139.6503 }); // 東京

  await page.addInitScript(() => {
    // DeviceMotion/Orientationを固定
    window.DeviceMotionEvent = undefined;
    window.DeviceOrientationEvent = undefined;
  });

  10. プリフェッチ/プリロードの制御

  // <link rel="prefetch"> などの非同期読み込みを制御
  await page.route('**/*', (route) => {
    const request = route.request();
    // prefetchやpreloadのリクエストをブロック
    if (request.resourceType() === 'prefetch' ||
        request.headers()['purpose'] === 'prefetch') {
      route.abort();
    } else {
      route.continue();
    }
  });

  11. Notification / Permission API の固定

  await page.addInitScript(() => {
    Notification.permission = 'denied';
    Notification.requestPermission = () => Promise.resolve('denied');

    // その他のPermission APIも固定
    navigator.permissions.query = () => Promise.resolve({ state: 'denied' });
  });

  12. Battery / Network Information API の固定

  await page.addInitScript(() => {
    // Battery API
    navigator.getBattery = () => Promise.resolve({
      level: 1.0,
      charging: true,
      chargingTime: 0,
      dischargingTime: Infinity
    });

    // Network Information API
    Object.defineProperty(navigator, 'connection', {
      value: {
        effectiveType: '4g',
        downlink: 10,
        rtt: 50,
        saveData: false
      }
    });
  });

  13. クッキー/LocalStorage/SessionStorage の固定

  // テスト前にストレージをクリア＆固定値を設定
  await context.addCookies([
    { name: 'test-mode', value: 'true', domain: 'example.com', path: '/' }
  ]);

  await page.addInitScript(() => {
    // LocalStorageを固定値で初期化
    localStorage.clear();
    localStorage.setItem('theme', 'light');
    localStorage.setItem('user-preference', 'default');

    sessionStorage.clear();
  });

  14. iframe内の決定論化

  // iframeの内容も同様に決定論化
  page.on('frameattached', async (frame) => {
    await frame.addInitScript(() => {
      // 同じ決定論化スクリプトを注入
      const fixed = new Date('2025-01-01T00:00:00Z').valueOf();
      Date.now = () => fixed;
    });
  });

  15. 画像の完全ロード待機

  // すべての画像が完全にロードされるまで待機
  await page.evaluate(async () => {
    const images = Array.from(document.images);
    await Promise.all(
      images
        .filter(img => !img.complete)
        .map(img => new Promise(resolve => {
          img.onload = img.onerror = resolve;
        }))
    );
  });

  16. CSS Grid / Flexbox のサブピクセルレンダリング対策

  /* サブピクセルのずれを防ぐ */
  * {
    image-rendering: -webkit-optimize-contrast !important;
    image-rendering: crisp-edges !important;
  }

  /* グリッド/フレックスの丸め誤差対策 */
  .grid, .flex {
    width: 1440px !important; /* 固定幅 */
  }

  17. Mutation Observer の制御

  await page.addInitScript(() => {
    // DOMの動的変更を検知して記録（デバッグ用）
    const originalObserve = MutationObserver.prototype.observe;
    MutationObserver.prototype.observe = function(target, options) {
      // テストモードでは変更を検知しても何もしない
      if (window.__E2E_FREEZE_DOM__) {
        return;
      }
      return originalObserve.call(this, target, options);
    };
  });

  18. ブラウザAPI のフィンガープリント固定

  await page.addInitScript(() => {
    // User-Agent, Platform, Languageなどを固定
    Object.defineProperty(navigator, 'platform', { value: 'Linux x86_64' });
    Object.defineProperty(navigator, 'hardwareConcurrency', { value: 8 });
    Object.defineProperty(navigator, 'deviceMemory', { value: 8 });

    // Screen解像度を固定
    Object.defineProperty(screen, 'width', { value: 1920 });
    Object.defineProperty(screen, 'height', { value: 1080 });
    Object.defineProperty(screen, 'availWidth', { value: 1920 });
    Object.defineProperty(screen, 'availHeight', { value: 1080 });
  });

  これらのアイデアをSPEC.mdに追加しましょうか？特に重要なものを選んで決定論化セクションに統合することもできます。