const ARTICLE_KIND = "article";
const POEM_KIND = "poem";
const STORAGE_KEY_PREFIX = "typ-blog-home-page";

const normalizeKind = (value) => value === POEM_KIND ? POEM_KIND : ARTICLE_KIND;

const readPositiveInt = (value, fallback = 1) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
};

const clampPage = (page, totalPages) => {
  const max = Math.max(1, readPositiveInt(totalPages, 1));
  return Math.min(Math.max(1, readPositiveInt(page, 1)), max);
};

const buildHomeHref = (kind, page) => {
  const normalizedKind = normalizeKind(kind);
  const normalizedPage = Math.max(1, readPositiveInt(page, 1));
  if (normalizedKind === POEM_KIND) {
    return normalizedPage === 1 ? "/poems/" : `/poems/page/${normalizedPage}/`;
  }
  return normalizedPage === 1 ? "/" : `/page/${normalizedPage}/`;
};

const readStoredPage = (kind) => {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}:${normalizeKind(kind)}`);
    return readPositiveInt(raw, 1);
  } catch {
    return 1;
  }
};

const storePage = (kind, page) => {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}:${normalizeKind(kind)}`, String(Math.max(1, readPositiveInt(page, 1))));
  } catch {
  }
};

export const installHomeFilter = () => {
  const filter = document.querySelector(".homepage-filter[data-home-route-kind][data-home-route-page]");
  if (!filter) {
    return;
  }

  const currentKind = normalizeKind(filter.dataset.homeRouteKind);
  const totalArticlePages = readPositiveInt(filter.dataset.homeTotalArticlePages, 1);
  const totalPoemPages = readPositiveInt(filter.dataset.homeTotalPoemPages, 1);
  const currentPage = clampPage(
    readPositiveInt(filter.dataset.homeRoutePage, 1),
    currentKind === POEM_KIND ? totalPoemPages : totalArticlePages,
  );

  storePage(currentKind, currentPage);

  const links = Array.from(filter.querySelectorAll(".homepage-filter-button[data-home-filter]"));
  for (const link of links) {
    const kind = normalizeKind(link.dataset.homeFilter);
    const totalPages = kind === POEM_KIND ? totalPoemPages : totalArticlePages;
    const rememberedPage = clampPage(readStoredPage(kind), totalPages);
    const targetPage = kind === currentKind ? currentPage : rememberedPage;
    link.href = buildHomeHref(kind, targetPage);
  }
};
