const SYSTEM_THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)';
const REDUCED_MOTION_MEDIA_QUERY = '(prefers-reduced-motion: reduce)';
const THEME_PREFERENCE_STORAGE_KEY = 'typ-blog-theme-preference';
const THEME_SYSTEM_TRANSITION_CLASS = 'theme-system-transition';
const THEME_COLOR_SCHEME_ATTR = 'data-color-scheme';
const THEME_SYSTEM_TRANSITION_DURATION_MS = 500;
const THEME_TOGGLE_GROUP_SELECTOR = '[data-theme-toggle-group]';
const THEME_TOGGLE_BUTTON_SELECTOR = '[data-theme-toggle-button]';
const THEME_COLOR_OVERRIDE_SELECTOR = 'meta[name="theme-color"][data-theme-color-override="true"]';
const THEME_TOGGLE_BOUND_ATTR = 'data-theme-toggle-bound';
const THEME_PREFERENCES = ['light', 'dark', 'auto'];
const THEME_ROOT_THEME_BY_PREFERENCE = {
  light: 'gray-10',
  dark: 'gray-90',
};
const THEME_BACKGROUND_COLOR_BY_PREFERENCE = {
  light: '#f4f4f4',
  dark: '#262626',
};

let activeTransitionTimer = null;
let currentThemePreference = 'auto';
let systemThemeMediaQuery = null;
let reducedMotionMediaQuery = null;

const getResolvedColorScheme = (preference) => {
  if (preference === 'dark') {
    return 'dark';
  }

  if (preference === 'light') {
    return 'light';
  }

  return systemThemeMediaQuery?.matches ? 'dark' : 'light';
};

const syncRootColorScheme = (colorScheme) => {
  const root = document.documentElement;
  if (!root) {
    return;
  }

  root.setAttribute(THEME_COLOR_SCHEME_ATTR, colorScheme);
};

const clearThemeSystemTransition = () => {
  const root = document.documentElement;
  if (!root) {
    return;
  }

  if (activeTransitionTimer !== null) {
    clearTimeout(activeTransitionTimer);
    activeTransitionTimer = null;
  }

  root.classList.remove(THEME_SYSTEM_TRANSITION_CLASS);
};

const getThemeTransitionDurationMs = () => {
  if (reducedMotionMediaQuery?.matches) {
    return 0;
  }

  return THEME_SYSTEM_TRANSITION_DURATION_MS;
};

const armThemeSystemTransition = () => {
  const root = document.documentElement;
  if (!root) {
    return 0;
  }

  clearThemeSystemTransition();

  const durationMs = getThemeTransitionDurationMs();
  if (durationMs <= 0) {
    return 0;
  }

  root.classList.add(THEME_SYSTEM_TRANSITION_CLASS);
  if (typeof window.getComputedStyle === 'function') {
    window.getComputedStyle(root).getPropertyValue('background-color');
  }

  return durationMs;
};

const scheduleThemeSystemTransitionCleanup = (durationMs, onComplete) => {
  if (durationMs <= 0) {
    onComplete();
    return;
  }

  activeTransitionTimer = setTimeout(() => {
    onComplete();
    clearThemeSystemTransition();
  }, durationMs);
};

const bindMediaQueryChange = (mediaQuery, handler) => {
  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handler);
    return true;
  }

  if (typeof mediaQuery.addListener === 'function') {
    mediaQuery.addListener(handler);
    return true;
  }

  return false;
};

const normalizeThemePreference = (value) => {
  return THEME_PREFERENCES.includes(value) ? value : 'auto';
};

const getStoredThemePreference = () => {
  try {
    return normalizeThemePreference(localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY));
  } catch {
    return 'auto';
  }
};

const saveThemePreference = (preference) => {
  try {
    localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, preference);
  } catch {}
};

const syncRootTheme = (preference) => {
  const root = document.documentElement;
  if (!root) {
    return;
  }

  const explicitTheme = THEME_ROOT_THEME_BY_PREFERENCE[preference];
  if (explicitTheme) {
    root.setAttribute('data-theme', explicitTheme);
    root.style.backgroundColor = THEME_BACKGROUND_COLOR_BY_PREFERENCE[preference];
    return;
  }

  root.removeAttribute('data-theme');
  root.style.backgroundColor = '';
};

const getThemeColorOverrideMeta = () => {
  if (typeof document.querySelector === 'function') {
    return document.querySelector(THEME_COLOR_OVERRIDE_SELECTOR);
  }

  if (typeof document.head?.querySelector === 'function') {
    return document.head.querySelector(THEME_COLOR_OVERRIDE_SELECTOR);
  }

  return null;
};

const ensureThemeColorOverrideMeta = () => {
  const existingMeta = getThemeColorOverrideMeta();
  if (existingMeta) {
    return existingMeta;
  }

  if (!document.head?.appendChild || typeof document.createElement !== 'function') {
    return null;
  }

  const meta = document.createElement('meta');
  meta.setAttribute('name', 'theme-color');
  meta.setAttribute('data-theme-color-override', 'true');
  document.head.appendChild(meta);
  return meta;
};

const syncThemeColorOverride = (preference) => {
  const color = THEME_BACKGROUND_COLOR_BY_PREFERENCE[preference];
  const meta = getThemeColorOverrideMeta();

  if (!color) {
    if (meta?.parentElement?.removeChild) {
      meta.parentElement.removeChild(meta);
    }
    return;
  }

  const ensuredMeta = meta || ensureThemeColorOverrideMeta();
  if (!ensuredMeta) {
    return;
  }

  ensuredMeta.setAttribute('content', color);
};

const syncThemeToggleState = (preference) => {
  const buttons =
    typeof document.querySelectorAll === 'function' ? document.querySelectorAll(THEME_TOGGLE_BUTTON_SELECTOR) : [];

  for (const button of buttons) {
    const isActive = button.dataset.themePreference === preference;
    button.setAttribute('aria-checked', isActive ? 'true' : 'false');
    button.setAttribute('tabindex', isActive ? '0' : '-1');
    button.classList.toggle('is-active', isActive);
  }
};

const applyThemePreference = (preference, { withTransition = false, persist = false } = {}) => {
  currentThemePreference = normalizeThemePreference(preference);
  const resolvedColorScheme = getResolvedColorScheme(currentThemePreference);
  const transitionDurationMs = withTransition ? armThemeSystemTransition() : 0;

  syncRootTheme(currentThemePreference);
  syncThemeColorOverride(currentThemePreference);
  syncThemeToggleState(currentThemePreference);
  if (transitionDurationMs > 0) {
    scheduleThemeSystemTransitionCleanup(transitionDurationMs, () => {
      syncRootColorScheme(resolvedColorScheme);
    });
  } else {
    clearThemeSystemTransition();
    syncRootColorScheme(resolvedColorScheme);
  }

  if (persist) {
    saveThemePreference(currentThemePreference);
  }
};

const focusGroupButton = (group, preference) => {
  if (!group || typeof group.querySelectorAll !== 'function') {
    return;
  }

  const buttons = group.querySelectorAll(THEME_TOGGLE_BUTTON_SELECTOR);
  const nextButton = Array.from(buttons).find((button) => button.dataset.themePreference === preference);
  nextButton?.focus?.();
};

const stepThemePreference = (preference, direction) => {
  const currentIndex = THEME_PREFERENCES.indexOf(preference);
  const startIndex = currentIndex === -1 ? THEME_PREFERENCES.indexOf('auto') : currentIndex;
  const nextIndex = (startIndex + direction + THEME_PREFERENCES.length) % THEME_PREFERENCES.length;
  return THEME_PREFERENCES[nextIndex];
};

const installThemeToggleButton = (button) => {
  if (button.hasAttribute(THEME_TOGGLE_BOUND_ATTR)) {
    return;
  }

  button.setAttribute(THEME_TOGGLE_BOUND_ATTR, 'true');

  button.addEventListener('click', (event) => {
    applyThemePreference(event.currentTarget.dataset.themePreference, {
      withTransition: true,
      persist: true,
    });
  });

  button.addEventListener('keydown', (event) => {
    const currentPreference = event.currentTarget.dataset.themePreference;
    const group = event.currentTarget.closest(THEME_TOGGLE_GROUP_SELECTOR);

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      const nextPreference = stepThemePreference(currentPreference, 1);
      applyThemePreference(nextPreference, { withTransition: true, persist: true });
      focusGroupButton(group, nextPreference);
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      const nextPreference = stepThemePreference(currentPreference, -1);
      applyThemePreference(nextPreference, { withTransition: true, persist: true });
      focusGroupButton(group, nextPreference);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      applyThemePreference(THEME_PREFERENCES[0], { withTransition: true, persist: true });
      focusGroupButton(group, THEME_PREFERENCES[0]);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      const lastPreference = THEME_PREFERENCES[THEME_PREFERENCES.length - 1];
      applyThemePreference(lastPreference, { withTransition: true, persist: true });
      focusGroupButton(group, lastPreference);
    }
  });
};

export const installSystemThemeSync = () => {
  const buttons =
    typeof document.querySelectorAll === 'function' ? document.querySelectorAll(THEME_TOGGLE_BUTTON_SELECTOR) : [];
  for (const button of buttons) {
    installThemeToggleButton(button);
  }

  if (typeof window.matchMedia !== 'function') {
    applyThemePreference(getStoredThemePreference());
    return;
  }

  systemThemeMediaQuery = window.matchMedia(SYSTEM_THEME_MEDIA_QUERY);
  reducedMotionMediaQuery = window.matchMedia(REDUCED_MOTION_MEDIA_QUERY);

  applyThemePreference(getStoredThemePreference());

  bindMediaQueryChange(systemThemeMediaQuery, () => {
    if (currentThemePreference !== 'auto') {
      return;
    }

    applyThemePreference('auto', { withTransition: true });
  });
};
