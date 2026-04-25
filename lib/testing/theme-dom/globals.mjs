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
