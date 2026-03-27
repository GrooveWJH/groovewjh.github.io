import { installThemeSwitch } from './behavior/theme.js';
import { installPostNavSwitch } from './behavior/post-nav.js';
import { installPostCardClick } from './behavior/post-card-click.js';
import { installHomeFilter } from './behavior/home-filter.js';

const installCodeRenderingIfNeeded = async () => {
  if (!document.querySelector('article code')) {
    return;
  }

  const { installCodeRendering } = await import('./behavior/render-code.js');
  await installCodeRendering();
};

const installCoreBehaviors = () => {
  installThemeSwitch();
  installPostNavSwitch();
  installPostCardClick();
  installHomeFilter();
  void installCodeRenderingIfNeeded();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installCoreBehaviors, { once: true });
} else {
  installCoreBehaviors();
}
