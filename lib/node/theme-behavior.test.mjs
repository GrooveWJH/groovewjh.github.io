import assert from 'node:assert/strict';
import test from 'node:test';
import { installSystemThemeSync } from '../../assets/core/behavior/theme.js';
import { createThemeContext, withMockedGlobals } from './test-helpers/theme-behavior-test-helpers.mjs';

test('installSystemThemeSync stages color-scheme commits behind the visual theme transition', async () => {
  await withMockedGlobals(
    () => createThemeContext(),
    async (context) => {
      installSystemThemeSync();

      assert.equal(context.root.getAttribute('data-theme'), null);
      assert.equal(context.root.getAttribute('data-color-scheme'), 'light');
      assert.equal(context.root.style.backgroundColor, '');
      assert.equal(context.getThemeColorOverrideMeta(), null);
      assert.deepEqual(context.writes, []);

      context.sidebarButtons.dark.dispatch('click');

      assert.equal(context.transitionArmedDuringThemeMutation(), true);
      assert.equal(context.root.getAttribute('data-theme'), 'gray-90');
      assert.equal(context.root.getAttribute('data-color-scheme'), 'light');
      assert.equal(context.root.style.backgroundColor, '#262626');
      assert.equal(context.htmlClassList.contains('theme-system-transition'), true);
      assert.equal(context.getThemeColorOverrideMeta()?.getAttribute('content'), '#262626');
      assert.deepEqual(context.writes, ['dark']);

      const darkTimerId = context.latestTimerId();
      assert.equal(context.timers.get(darkTimerId)?.delay, 500);

      context.runTimer(darkTimerId);
      assert.equal(context.root.getAttribute('data-color-scheme'), 'dark');
      assert.equal(context.htmlClassList.contains('theme-system-transition'), false);

      context.desktopButtons.auto.dispatch('click');

      assert.equal(context.root.getAttribute('data-theme'), null);
      assert.equal(context.root.getAttribute('data-color-scheme'), 'dark');
      assert.equal(context.root.style.backgroundColor, '');
      assert.equal(context.htmlClassList.contains('theme-system-transition'), true);
      assert.equal(context.getThemeColorOverrideMeta(), null);
      assert.deepEqual(context.writes, ['dark', 'auto']);

      const autoTimerId = context.latestTimerId();
      assert.equal(context.timers.get(autoTimerId)?.delay, 500);

      context.runTimer(autoTimerId);
      assert.equal(context.root.getAttribute('data-color-scheme'), 'light');
      assert.equal(context.htmlClassList.contains('theme-system-transition'), false);
    },
  );
});

test('installSystemThemeSync animates auto-mode system changes without changing explicit preferences', async () => {
  await withMockedGlobals(
    () => createThemeContext(),
    async (context) => {
      installSystemThemeSync();

      const changeHandler = context.changeHandlerRef();
      assert.equal(typeof changeHandler, 'function');

      context.setDarkModeMatches(true);
      changeHandler({ matches: true });

      assert.equal(context.root.getAttribute('data-theme'), null);
      assert.equal(context.root.getAttribute('data-color-scheme'), 'light');
      assert.equal(context.htmlClassList.contains('theme-system-transition'), true);

      const timerId = context.latestTimerId();
      assert.equal(context.timers.get(timerId)?.delay, 500);
      context.runTimer(timerId);

      assert.equal(context.root.getAttribute('data-color-scheme'), 'dark');
      assert.equal(context.htmlClassList.contains('theme-system-transition'), false);
      assert.deepEqual(context.writes, []);

      context.sidebarButtons.light.dispatch('click');
      assert.equal(context.root.getAttribute('data-theme'), 'gray-10');

      const explicitLightTimerId = context.latestTimerId();
      context.runTimer(explicitLightTimerId);
      assert.equal(context.root.getAttribute('data-color-scheme'), 'light');

      const timerCountBeforeExplicitSystemChange = context.timers.size;
      changeHandler({ matches: false });
      assert.equal(context.timers.size, timerCountBeforeExplicitSystemChange);
    },
  );
});

test('installSystemThemeSync skips staged transitions when reduced motion is requested', async () => {
  await withMockedGlobals(
    () => createThemeContext({ storedPreference: 'light', legacyListener: true }),
    async (context) => {
      context.setReducedMotionMatches(true);
      installSystemThemeSync();

      assert.equal(context.root.getAttribute('data-theme'), 'gray-10');
      assert.equal(context.root.getAttribute('data-color-scheme'), 'light');
      assert.equal(context.htmlClassList.contains('theme-system-transition'), false);

      context.desktopButtons.dark.dispatch('click');

      assert.equal(context.root.getAttribute('data-theme'), 'gray-90');
      assert.equal(context.root.getAttribute('data-color-scheme'), 'dark');
      assert.equal(context.root.style.backgroundColor, '#262626');
      assert.equal(context.htmlClassList.contains('theme-system-transition'), false);
      assert.equal(context.timers.size, 0);
      assert.deepEqual(context.writes, ['dark']);

      const changeHandler = context.changeHandlerRef();
      assert.equal(typeof changeHandler, 'function');
      changeHandler({ matches: false });
      assert.equal(context.htmlClassList.contains('theme-system-transition'), false);
    },
  );
});
