/**
 * Deterministic browser behaviors
 * Makes the page predictable by disabling animations, fixing time/random, etc.
 */

/**
 * CSS to disable all animations and transitions
 */
export const DISABLE_ANIMATIONS_CSS = `
  *, *::before, *::after {
    animation: none !important;
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition: none !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    caret-color: transparent !important;
  }
  html {
    scroll-behavior: auto !important;
  }
  @media (prefers-reduced-motion: no-preference) {
    :root {
      --force-no-motion: 1;
    }
  }
`

/**
 * Generate script to fix Date and Math.random
 */
export function generateMockTimeScript(fixedTime: string, seed: number = 42): string {
  return `
    (() => {
      // Fix Date
      const fixedTimestamp = new Date('${fixedTime}').valueOf();
      const OriginalDate = Date;

      window.Date = class extends OriginalDate {
        constructor(...args) {
          if (args.length === 0) {
            super(fixedTimestamp);
          } else {
            super(...args);
          }
        }

        static now() {
          return fixedTimestamp;
        }
      };

      // Copy static methods
      Object.setPrototypeOf(window.Date, OriginalDate);
      Object.setPrototypeOf(window.Date.prototype, OriginalDate.prototype);

      // Fix Math.random with seeded PRNG (Linear Congruential Generator)
      let seed = ${seed};
      Math.random = function() {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
      };

      // Fix Performance.now
      const performanceStart = fixedTimestamp;
      if (window.performance && window.performance.now) {
        const originalNow = performance.now.bind(performance);
        let offset = 0;
        performance.now = function() {
          return offset;
        };
      }
    })();
  `
}

/**
 * Script to disable autoplay features and freeze video/audio elements
 */
export const DISABLE_AUTOPLAY_SCRIPT = `
  (() => {
    // Global flag for applications to check
    window.__E2E_DISABLE_AUTOPLAY__ = true;

    // Disable video/audio autoplay and freeze at time 0
    HTMLMediaElement.prototype.play = function() {
      this.pause();
      this.currentTime = 0; // Fix at first frame
      return Promise.resolve();
    };

    // Prevent autoplay attribute from being set
    Object.defineProperty(HTMLMediaElement.prototype, 'autoplay', {
      get() { return false; },
      set() {}
    });

    // Prevent loop attribute
    Object.defineProperty(HTMLMediaElement.prototype, 'loop', {
      get() { return false; },
      set() {}
    });

    // Override load method to pause immediately
    const originalLoad = HTMLMediaElement.prototype.load;
    HTMLMediaElement.prototype.load = function() {
      originalLoad.call(this);
      this.pause();
      this.currentTime = 0;
    };

    // Stub setInterval/setTimeout to prevent auto-advancing carousels
    const intervals = new Set();
    const timeouts = new Set();

    const originalSetInterval = window.setInterval;
    const originalSetTimeout = window.setTimeout;
    const originalClearInterval = window.clearInterval;
    const originalClearTimeout = window.clearTimeout;

    window.setInterval = function(...args) {
      const id = originalSetInterval.apply(this, args);
      intervals.add(id);
      return id;
    };

    window.setTimeout = function(...args) {
      const id = originalSetTimeout.apply(this, args);
      timeouts.add(id);
      return id;
    };

    window.clearInterval = function(id) {
      intervals.delete(id);
      return originalClearInterval(id);
    };

    window.clearTimeout = function(id) {
      timeouts.delete(id);
      return originalClearTimeout(id);
    };

    // Clear all intervals after page load and freeze all media elements
    window.addEventListener('load', () => {
      setTimeout(() => {
        intervals.forEach(id => originalClearInterval(id));
        intervals.clear();

        // Freeze all existing media elements
        document.querySelectorAll('video, audio').forEach(media => {
          media.pause();
          media.currentTime = 0;
        });
      }, 100);
    });
  })();
`

/**
 * Script to fix IntersectionObserver (make all elements visible)
 */
export const FIX_INTERSECTION_OBSERVER_SCRIPT = `
  (() => {
    window.IntersectionObserver = class IntersectionObserver {
      constructor(callback) {
        this.callback = callback;
      }

      observe(element) {
        // Immediately trigger as visible
        setTimeout(() => {
          this.callback([{
            target: element,
            isIntersecting: true,
            intersectionRatio: 1.0,
            boundingClientRect: element.getBoundingClientRect(),
            intersectionRect: element.getBoundingClientRect(),
            rootBounds: null,
            time: Date.now()
          }], this);
        }, 0);
      }

      unobserve() {}
      disconnect() {}
      takeRecords() { return []; }
    };
  })();
`

/**
 * Script to disable scroll-related behaviors
 */
export const DISABLE_SCROLL_SCRIPT = `
  (() => {
    const noop = () => {};
    window.scrollTo = noop;
    window.scroll = noop;
    Element.prototype.scrollIntoView = function() {};
    Element.prototype.scrollTo = function() {};
    Element.prototype.scroll = function() {};
  })();
`

/**
 * Script to disable Web Animations API
 */
export const DISABLE_WEB_ANIMATIONS_SCRIPT = `
  (() => {
    Element.prototype.animate = function() {
      return {
        cancel: () => {},
        finish: () => {},
        pause: () => {},
        play: () => {},
        reverse: () => {},
        playbackRate: 0,
        playState: 'finished',
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false
      };
    };

    if (document.getAnimations) {
      document.getAnimations = () => [];
    }

    if (Element.prototype.getAnimations) {
      Element.prototype.getAnimations = () => [];
    }
  })();
`

/**
 * Combine all deterministic scripts
 */
export function getAllDeterministicScripts(mockTime?: string, seed: number = 42): string {
  const scripts = [DISABLE_AUTOPLAY_SCRIPT, FIX_INTERSECTION_OBSERVER_SCRIPT, DISABLE_SCROLL_SCRIPT, DISABLE_WEB_ANIMATIONS_SCRIPT]

  if (mockTime) {
    scripts.unshift(generateMockTimeScript(mockTime, seed))
  }

  return scripts.join('\n\n')
}
