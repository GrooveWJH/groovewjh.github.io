const SCROLLBAR_ACTIVE_CLASS = 'scrollbar-active';
const SCROLLBAR_IDLE_DELAY_MS = 720;

let activeScrollbarTimer = null;

const restartScrollbarActiveState = () => {
  const root = document.documentElement;
  if (!root) {
    return;
  }

  if (activeScrollbarTimer !== null) {
    clearTimeout(activeScrollbarTimer);
  }

  root.classList.add(SCROLLBAR_ACTIVE_CLASS);
  activeScrollbarTimer = setTimeout(() => {
    root.classList.remove(SCROLLBAR_ACTIVE_CLASS);
    activeScrollbarTimer = null;
  }, SCROLLBAR_IDLE_DELAY_MS);
};

export const installScrollbarChrome = () => {
  if (typeof window.addEventListener !== 'function') {
    return;
  }

  window.addEventListener('scroll', restartScrollbarActiveState, { passive: true });
};
