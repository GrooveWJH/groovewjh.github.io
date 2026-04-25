import assert from 'node:assert/strict';

export const THEME_COLOR_OVERRIDE_SELECTOR = 'meta[name="theme-color"][data-theme-color-override="true"]';

export function createClassList() {
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
}

export function createMockNode(tagName = 'div') {
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
}

function createMockButton(preference) {
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
}

export function createToggleGroup(groupName) {
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
}

export function createThemeMetaQuery(head) {
  return () =>
    head.children.find(
      (child) =>
        child.tagName === 'META' &&
        child.getAttribute('name') === 'theme-color' &&
        child.getAttribute('data-theme-color-override') === 'true',
    ) || null;
}
