const POEM_KIND = "poem";
const ARTICLE_KIND = "article";

const setButtonState = (buttons, activeKind) => {
  for (const button of buttons) {
    const kind = button.dataset.homeFilter;
    const isActive = kind === activeKind;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  }
};

const applyHomeFilter = (kind) => {
  const cards = document.querySelectorAll(".posts-grid .post-card[data-post-kind]");
  const emptyHint = document.querySelector(".homepage-filter-empty");
  let visibleCount = 0;

  for (const card of cards) {
    const cardKind = card.dataset.postKind;
    const shouldShow = cardKind === kind;
    card.classList.toggle("is-filter-hidden", !shouldShow);
    card.hidden = !shouldShow;
    if (shouldShow) {
      visibleCount += 1;
    }
  }

  if (emptyHint) {
    emptyHint.hidden = visibleCount !== 0;
    emptyHint.textContent = kind === POEM_KIND ? "暂无诗歌" : "暂无文章";
  }
};

export const installHomeFilter = () => {
  const buttons = Array.from(document.querySelectorAll(".homepage-filter-button[data-home-filter]"));
  if (buttons.length === 0) {
    return;
  }

  let activeKind = ARTICLE_KIND;
  setButtonState(buttons, activeKind);
  applyHomeFilter(activeKind);

  for (const button of buttons) {
    button.addEventListener("click", () => {
      const nextKind = button.dataset.homeFilter === POEM_KIND ? POEM_KIND : ARTICLE_KIND;
      if (nextKind === activeKind) {
        return;
      }
      activeKind = nextKind;
      setButtonState(buttons, activeKind);
      applyHomeFilter(activeKind);
    });
  }
};
