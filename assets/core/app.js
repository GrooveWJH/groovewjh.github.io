import { installThemeSwitch } from './behavior/theme.js';
import { installPostNavSwitch } from './behavior/post-nav.js';
import { installPostCardClick } from './behavior/post-card-click.js';
import { installHomeFilter } from './behavior/home-filter.js';

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
  runBehavior('theme-switch', installThemeSwitch);
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
