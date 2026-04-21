import assert from 'node:assert/strict';

const THEME_COLOR_OVERRIDE_SELECTOR = 'meta[name="theme-color"][data-theme-color-override="true"]';

const createClassList = () => {
  const classes = new Set();
  return {
    add(value) {
      classes.add(value);
    },
    remove(value) {
      classes.delete(value);
    },
    contains(value) {
      return classes.has(value);
    },
    toggle(value, force) {
      if (force === undefined) {
        if (classes.has(value)) {
          classes.delete(value);
          return false;
        }

        classes.add(value);
        return true;
      }

      if (force) {
        classes.add(value);
        return true;
      }

      classes.delete(value);
      return false;
    },
  };
};

const createMockNode = (tagName = 'div') => {
  const attributes = new Map();
  const dataset = {};
  const classList = createClassList();

  return {
    tagName: String(tagName).toUpperCase(),
    attributes,
    dataset,
    classList,
    children: [],
    parentElement: null,
    style: {},
    textContent: '',
    appendChild(child) {
      child.parentElement = this;
      this.children.push(child);
      return child;
    },
    removeChild(child) {
      this.children = this.children.filter((candidate) => candidate !== child);
      child.parentElement = null;
      return child;
    },
    setAttribute(name, value) {
      const text = String(value);
      attributes.set(name, text);

      if (name.startsWith('data-')) {
        const datasetKey = name.slice(5).replace(/-([a-z])/g, (_, character) => character.toUpperCase());
        dataset[datasetKey] = text;
      }
    },
    getAttribute(name) {
      return attributes.has(name) ? attributes.get(name) : null;
    },
    hasAttribute(name) {
      return attributes.has(name);
    },
    removeAttribute(name) {
      attributes.delete(name);
      if (name.startsWith('data-')) {
        const datasetKey = name.slice(5).replace(/-([a-z])/g, (_, character) => character.toUpperCase());
        delete dataset[datasetKey];
      }
    },
  };
};

const createMockButton = (preference) => {
  const button = createMockNode('button');
  const listeners = new Map();

  button.setAttribute('type', 'button');
  button.setAttribute('role', 'radio');
  button.setAttribute('data-theme-toggle-button', '');
  button.setAttribute('data-theme-preference', preference);
  button.addEventListener = (eventName, handler) => {
    listeners.set(eventName, handler);
  };
  button.dispatch = (eventName, event = {}) => {
    const handler = listeners.get(eventName);
    assert.ok(handler, `Expected ${eventName} listener on ${preference} button.`);
    handler({
      currentTarget: button,
      key: event.key,
      preventDefault() {},
      ...event,
    });
  };
  button.closest = (selector) => {
    if (selector === '[data-theme-toggle-group]') {
      return button.parentElement;
    }

    return null;
  };

  return button;
};

const createToggleGroup = (groupName) => {
  const group = createMockNode('div');
  group.setAttribute('data-theme-toggle-group', groupName);
  group.setAttribute('role', 'radiogroup');
  group.setAttribute('aria-label', '主题模式');

  const buttons = {
    light: createMockButton('light'),
    dark: createMockButton('dark'),
    auto: createMockButton('auto'),
  };

  for (const button of Object.values(buttons)) {
    group.appendChild(button);
  }

  group.querySelectorAll = (selector) => {
    if (selector === '[data-theme-toggle-button]') {
      return Object.values(buttons);
    }

    return [];
  };

  return { group, buttons };
};

const createThemeMetaQuery = (head) => () =>
  head.children.find(
    (child) =>
      child.tagName === 'META' &&
      child.getAttribute('name') === 'theme-color' &&
      child.getAttribute('data-theme-color-override') === 'true',
  ) || null;

export const withMockedGlobals = async (setup, run) => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const originalLocalStorage = globalThis.localStorage;

  const context = setup();
  globalThis.document = context.document;
  globalThis.window = context.window;
  globalThis.setTimeout = context.setTimeout;
  globalThis.clearTimeout = context.clearTimeout;
  globalThis.localStorage = context.localStorage;

  try {
    await run(context);
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
    globalThis.localStorage = originalLocalStorage;
  }
};

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
