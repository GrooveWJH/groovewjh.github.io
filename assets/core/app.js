import { installHomeFilter } from './behavior/home-filter.js';
import { installPostCardClick } from './behavior/post-card-click.js';
import { installPostNavSwitch } from './behavior/post-nav.js';
import { installScrollbarChrome } from './behavior/scrollbar.js';
import { installSystemThemeSync } from './behavior/theme.js';

const runBehavior = (name, install) => {
  try {
    install();
  } catch (error) {
    console.error(`[core] failed to initialize ${name}`, error);
  }
};

const installCodeRenderingIfNeeded = async () => {
  if (!document.querySelector('article code')) {
    return;
  }

  const { installCodeRendering } = await import('./behavior/render-code.js');
  await installCodeRendering();
};

const installCoreBehaviors = () => {
  runBehavior('system-theme-sync', installSystemThemeSync);
  runBehavior('scrollbar-chrome', installScrollbarChrome);
  runBehavior('post-nav', installPostNavSwitch);
  runBehavior('post-card-click', installPostCardClick);
  runBehavior('home-filter', installHomeFilter);
  void installCodeRenderingIfNeeded().catch((error) => {
    console.error('[core] failed to initialize render-code', error);
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installCoreBehaviors, { once: true });
} else {
  installCoreBehaviors();
}
