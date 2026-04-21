import assert from 'node:assert/strict';
import test from 'node:test';

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
  };
};

const withMockedGlobals = async (setup, run) => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;

  const context = setup();
  globalThis.document = context.document;
  globalThis.window = context.window;
  globalThis.setTimeout = context.setTimeout;
  globalThis.clearTimeout = context.clearTimeout;

  try {
    await run(context);
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
};

test('installScrollbarChrome adds a temporary active class while the root document is scrolling', async () => {
  const { installScrollbarChrome } = await import('../../assets/core/behavior/scrollbar.js');

  await withMockedGlobals(
    () => {
      const htmlClassList = createClassList();
      const listeners = new Map();
      let timeoutId = 0;
      const timers = new Map();

      return {
        document: {
          documentElement: {
            classList: htmlClassList,
          },
        },
        window: {
          addEventListener(eventName, handler, options) {
            listeners.set(eventName, { handler, options });
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
        listeners,
        timers,
        latestTimerId: () => timeoutId,
        htmlClassList,
        runTimer(id) {
          const timer = timers.get(id);
          assert.ok(timer);
          timer.callback();
        },
      };
    },
    async (context) => {
      installScrollbarChrome();

      const scrollListener = context.listeners.get('scroll');
      assert.equal(typeof scrollListener?.handler, 'function');
      assert.equal(scrollListener?.options?.passive, true);

      scrollListener.handler();
      assert.equal(context.htmlClassList.contains('scrollbar-active'), true);

      const firstTimerId = context.latestTimerId();
      assert.equal(context.timers.get(firstTimerId)?.delay, 720);

      scrollListener.handler();
      const secondTimerId = context.latestTimerId();
      assert.notEqual(secondTimerId, firstTimerId);
      assert.equal(context.timers.has(firstTimerId), false);

      context.runTimer(secondTimerId);
      assert.equal(context.htmlClassList.contains('scrollbar-active'), false);
    },
  );
});
