const isTextSelectionActive = () => {
  const selection = window.getSelection();
  return Boolean(selection && !selection.isCollapsed && selection.toString().trim().length > 0);
};

let installed = false;

export const installPostCardClick = () => {
  if (installed) {
    return;
  }
  installed = true;

  document.addEventListener('click', (event) => {
    const card = event.target.closest('.posts-grid .post-card[data-post-url]');
    if (!card) {
      return;
    }
    if (isTextSelectionActive()) {
      return;
    }

    const interactiveTarget = event.target.closest('a, button, input, select, textarea, [role="button"]');
    if (interactiveTarget && card.contains(interactiveTarget)) {
      return;
    }

    const url = card.getAttribute('data-post-url');
    if (!url) {
      return;
    }

    window.location.href = url;
  });
};
