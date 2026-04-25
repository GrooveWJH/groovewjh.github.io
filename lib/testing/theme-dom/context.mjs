import assert from 'node:assert/strict';

import {
  createClassList,
  createMockNode,
  createThemeMetaQuery,
  createToggleGroup,
  THEME_COLOR_OVERRIDE_SELECTOR,
} from './mock-dom.mjs';

export function createThemeContext({ storedPreference = null, legacyListener = false } = {}) {
  const desktopGroup = createToggleGroup('desktop');
  const sidebarGroup = createToggleGroup('sidebar');
  const htmlClassList = createClassList();
  const rootAttributes = new Map();
  const timers = new Map();
  const writes = [];
  let timeoutId = 0;
  let changeHandler = null;
  let darkModeMatches = false;
  let reducedMotionMatches = false;
  let transitionArmedDuringThemeMutation = false;

  const root = {
    classList: htmlClassList,
    dataset: {},
    style: {},
    setAttribute(name, value) {
      const text = String(value);
      if (name === 'data-theme' && htmlClassList.contains('theme-system-transition')) {
        transitionArmedDuringThemeMutation = true;
      }
      rootAttributes.set(name, text);
      if (name === 'data-theme') {
        this.dataset.theme = text;
      }
    },
    getAttribute(name) {
      return rootAttributes.has(name) ? rootAttributes.get(name) : null;
    },
    hasAttribute(name) {
      return rootAttributes.has(name);
    },
    removeAttribute(name) {
      if (name === 'data-theme' && htmlClassList.contains('theme-system-transition')) {
        transitionArmedDuringThemeMutation = true;
      }
      rootAttributes.delete(name);
      if (name === 'data-theme') {
        delete this.dataset.theme;
      }
    },
  };

  const head = createMockNode('head');
  const queryThemeColorOverrideMeta = createThemeMetaQuery(head);
  head.querySelector = (selector) => {
    if (selector === THEME_COLOR_OVERRIDE_SELECTOR) {
      return queryThemeColorOverrideMeta();
    }

    return null;
  };

  const document = {
    documentElement: root,
    head,
    createElement(tagName) {
      return createMockNode(tagName);
    },
    querySelectorAll(selector) {
      if (selector === '[data-theme-toggle-group]') {
        return [desktopGroup.group, sidebarGroup.group];
      }

      if (selector === '[data-theme-toggle-button]') {
        return [...Object.values(desktopGroup.buttons), ...Object.values(sidebarGroup.buttons)];
      }

      return [];
    },
    querySelector(selector) {
      if (selector === THEME_COLOR_OVERRIDE_SELECTOR) {
        return queryThemeColorOverrideMeta();
      }

      return null;
    },
  };

  const mediaQuery = legacyListener
    ? {
        addListener(handler) {
          changeHandler = handler;
        },
      }
    : {
        addEventListener(eventName, handler) {
          assert.equal(eventName, 'change');
          changeHandler = handler;
        },
      };

  return {
    document,
    window: {
      getComputedStyle() {
        return {
          getPropertyValue() {
            return '';
          },
        };
      },
      matchMedia(query) {
        if (query === '(prefers-color-scheme: dark)') {
          return Object.defineProperty(
            {
              ...mediaQuery,
            },
            'matches',
            {
              get() {
                return darkModeMatches;
              },
            },
          );
        }

        if (query === '(prefers-reduced-motion: reduce)') {
          return Object.defineProperty(
            {
              addEventListener() {},
              addListener() {},
            },
            'matches',
            {
              get() {
                return reducedMotionMatches;
              },
            },
          );
        }

        assert.fail(`Unexpected media query: ${query}`);
      },
    },
    setTimeout(callback, delay) {
      timeoutId += 1;
      timers.set(timeoutId, { callback, delay });
      return timeoutId;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    localStorage: {
      getItem(key) {
        assert.equal(key, 'typ-blog-theme-preference');
        return storedPreference;
      },
      setItem(key, value) {
        assert.equal(key, 'typ-blog-theme-preference');
        writes.push(String(value));
        storedPreference = String(value);
      },
      removeItem(key) {
        assert.equal(key, 'typ-blog-theme-preference');
        storedPreference = null;
      },
    },
    desktopButtons: desktopGroup.buttons,
    sidebarButtons: sidebarGroup.buttons,
    getThemeColorOverrideMeta: queryThemeColorOverrideMeta,
    changeHandlerRef: () => changeHandler,
    htmlClassList,
    timers,
    writes,
    root,
    transitionArmedDuringThemeMutation: () => transitionArmedDuringThemeMutation,
    latestTimerId: () => timeoutId,
    setDarkModeMatches(value) {
      darkModeMatches = Boolean(value);
    },
    setReducedMotionMatches(value) {
      reducedMotionMatches = Boolean(value);
    },
    runTimer(id) {
      const timer = timers.get(id);
      assert.ok(timer);
      timer.callback();
    },
  };
}
