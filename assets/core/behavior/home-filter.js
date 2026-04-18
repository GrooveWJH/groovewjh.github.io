const ARTICLE_KIND = "article";
const POEM_KIND = "poem";
const STORAGE_KEY_PREFIX = "typ-blog-home-page";
const HOME_HISTORY_MARK = "typ-blog-home-filter-state";
const ROUTE_SHELL_SELECTOR = "[data-home-route-shell]";
const FILTER_SELECTOR = ".homepage-filter[data-home-route-kind][data-home-route-page]";
const LIST_SHELL_SELECTOR = "[data-home-list-shell]";
const FILTER_LINK_SELECTOR = ".homepage-filter-button[data-home-filter]";
const PAGINATION_LINK_SELECTOR = ".pagination-nav a[href]";
const HOME_ROUTE_PATTERNS = [
  { pattern: /^\/$/, kind: ARTICLE_KIND, page: 1 },
  { pattern: /^\/page\/(\d+)\/$/, kind: ARTICLE_KIND },
  { pattern: /^\/poems\/$/, kind: POEM_KIND, page: 1 },
  { pattern: /^\/poems\/page\/(\d+)\/$/, kind: POEM_KIND },
];

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

const normalizePathname = (pathname) => {
  let normalized = String(pathname || "/").trim();
  if (normalized.length === 0) {
    return "/";
  }
  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }
  normalized = normalized.replace(/\/{2,}/g, "/");
  if (normalized !== "/" && !normalized.endsWith("/")) {
    normalized += "/";
  }
  return normalized;
};

const parseStateFromPathname = (pathname) => {
  const normalized = normalizePathname(pathname);
  for (const route of HOME_ROUTE_PATTERNS) {
    const matched = normalized.match(route.pattern);
    if (!matched) {
      continue;
    }
    const page = route.page ? route.page : readPositiveInt(matched[1], 1);
    return {
      kind: normalizeKind(route.kind),
      page: readPositiveInt(page, 1),
    };
  }
  return null;
};

const parseStateFromHref = (href) => {
  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) {
      return null;
    }
    return parseStateFromPathname(url.pathname);
  } catch {
    return null;
  }
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

const stateKey = (kind, page) => `${normalizeKind(kind)}:${readPositiveInt(page, 1)}`;

const readStateFromFilter = (filter) => {
  const kind = normalizeKind(filter.dataset.homeRouteKind);
  const totalArticlePages = readPositiveInt(filter.dataset.homeTotalArticlePages, 1);
  const totalPoemPages = readPositiveInt(filter.dataset.homeTotalPoemPages, 1);
  const maxPages = kind === POEM_KIND ? totalPoemPages : totalArticlePages;
  const page = clampPage(readPositiveInt(filter.dataset.homeRoutePage, 1), maxPages);
  return {
    kind,
    page,
    totalArticlePages,
    totalPoemPages,
  };
};

const createSnapshotFromDocument = (doc) => {
  const filter = doc.querySelector(FILTER_SELECTOR);
  const routeShell = doc.querySelector(ROUTE_SHELL_SELECTOR);
  const listShell = doc.querySelector(LIST_SHELL_SELECTOR);
  const shell = routeShell || listShell;
  if (!filter || !shell) {
    return null;
  }

  const state = readStateFromFilter(filter);
  return {
    ...state,
    shellHtml: shell.outerHTML,
  };
};

const parseSnapshotFromHtml = (htmlText) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, "text/html");
  return createSnapshotFromDocument(doc);
};

const cloneShellFromSnapshot = (snapshot) => {
  const template = document.createElement("template");
  template.innerHTML = snapshot.shellHtml.trim();
  const node = template.content.firstElementChild;
  return node || null;
};

const updateRouteHeading = (kind) => {
  const heading = document.querySelector(".homepage-route-title");
  if (!heading) {
    return;
  }
  heading.textContent = kind === POEM_KIND ? "诗歌列表" : "文章列表";
};

const buildHistoryEntry = (kind, page) => {
  const normalizedKind = normalizeKind(kind);
  const normalizedPage = readPositiveInt(page, 1);
  return {
    payload: {
    [HOME_HISTORY_MARK]: true,
      kind: normalizedKind,
      page: normalizedPage,
    },
    url: buildHomeHref(normalizedKind, normalizedPage),
  };
};

const writeHistoryState = (kind, page, mode = "push") => {
  const entry = buildHistoryEntry(kind, page);
  if (mode === "replace") {
    history.replaceState(entry.payload, "", entry.url);
  } else {
    history.pushState(entry.payload, "", entry.url);
  }
};

export const __test__ = {
  buildHistoryEntry,
  createSnapshotFromDocument,
};

export const installHomeFilter = () => {
  const filter = document.querySelector(FILTER_SELECTOR);
  const initialShell = document.querySelector(ROUTE_SHELL_SELECTOR) || document.querySelector(LIST_SHELL_SELECTOR);
  if (!filter) {
    return;
  }
  if (!initialShell) {
    return;
  }

  const cache = new Map();
  let currentState = readStateFromFilter(filter);
  let activeRequest = null;

  cache.set(stateKey(currentState.kind, currentState.page), {
    ...currentState,
    shellHtml: initialShell.outerHTML,
  });

  const updateFilterUi = (snapshot) => {
    const currentFilter = document.querySelector(FILTER_SELECTOR);
    if (!currentFilter) {
      return;
    }
    currentFilter.dataset.homeRouteKind = snapshot.kind;
    currentFilter.dataset.homeRoutePage = String(snapshot.page);
    currentFilter.dataset.homeTotalArticlePages = String(snapshot.totalArticlePages);
    currentFilter.dataset.homeTotalPoemPages = String(snapshot.totalPoemPages);

    const links = Array.from(currentFilter.querySelectorAll(FILTER_LINK_SELECTOR));
    for (const link of links) {
      const kind = normalizeKind(link.dataset.homeFilter);
      const totalPages = kind === POEM_KIND ? snapshot.totalPoemPages : snapshot.totalArticlePages;
      const rememberedPage = clampPage(readStoredPage(kind), totalPages);
      const targetPage = kind === snapshot.kind ? snapshot.page : rememberedPage;
      const active = kind === snapshot.kind;

      link.href = buildHomeHref(kind, targetPage);
      link.classList.toggle("is-active", active);
      if (active) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    }
  };

  const replaceRouteShell = (snapshot) => {
    const currentShell = document.querySelector(ROUTE_SHELL_SELECTOR) || document.querySelector(LIST_SHELL_SELECTOR);
    const nextShell = cloneShellFromSnapshot(snapshot);
    if (!currentShell || !nextShell) {
      return false;
    }
    currentShell.replaceWith(nextShell);
    return true;
  };

  const applySnapshot = (snapshot) => {
    const replaced = replaceRouteShell(snapshot);
    if (!replaced) {
      return false;
    }
    currentState = {
      kind: snapshot.kind,
      page: snapshot.page,
      totalArticlePages: snapshot.totalArticlePages,
      totalPoemPages: snapshot.totalPoemPages,
    };
    updateFilterUi(snapshot);
    updateRouteHeading(snapshot.kind);
    storePage(snapshot.kind, snapshot.page);
    return true;
  };

  const fetchSnapshot = async (state) => {
    const href = buildHomeHref(state.kind, state.page);
    const key = stateKey(state.kind, state.page);
    const cached = cache.get(key);
    if (cached) {
      return cached;
    }

    if (activeRequest) {
      activeRequest.abort();
    }
    const controller = new AbortController();
    activeRequest = controller;
    try {
      const response = await fetch(href, {
        credentials: "same-origin",
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`request failed: ${response.status}`);
      }
      const htmlText = await response.text();
      const snapshot = parseSnapshotFromHtml(htmlText);
      if (!snapshot) {
        throw new Error("home snapshot parse failed");
      }
      cache.set(key, snapshot);
      return snapshot;
    } finally {
      if (activeRequest === controller) {
        activeRequest = null;
      }
    }
  };

  const moveToState = async (state, historyMode = "push") => {
    const kind = normalizeKind(state.kind);
    const totalPages = kind === POEM_KIND ? currentState.totalPoemPages : currentState.totalArticlePages;
    const page = clampPage(state.page, totalPages);
    if (kind === currentState.kind && page === currentState.page) {
      return;
    }

    try {
      const snapshot = await fetchSnapshot({ kind, page });
      if (!applySnapshot(snapshot)) {
        window.location.href = buildHomeHref(kind, page);
        return;
      }
      if (historyMode !== "none") {
        writeHistoryState(snapshot.kind, snapshot.page, historyMode);
      }
    } catch (error) {
      window.location.href = buildHomeHref(kind, page);
      console.error("[core] home-filter fallback navigation", error);
    }
  };

  writeHistoryState(currentState.kind, currentState.page, "replace");
  updateFilterUi({
    ...currentState,
    shellHtml: initialShell.outerHTML,
  });
  storePage(currentState.kind, currentState.page);

  const rememberPage = clampPage(
    readStoredPage(currentState.kind),
    currentState.kind === POEM_KIND ? currentState.totalPoemPages : currentState.totalArticlePages,
  );
  if (currentState.page === 1 && rememberPage > 1) {
    void moveToState({ kind: currentState.kind, page: rememberPage }, "replace");
  }

  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    const anchor = event.target.closest("a[href]");
    if (!anchor) {
      return;
    }

    const inFilter = Boolean(anchor.closest(FILTER_SELECTOR) && anchor.matches(FILTER_LINK_SELECTOR));
    const inPagination = Boolean(anchor.closest(LIST_SHELL_SELECTOR) && anchor.matches(PAGINATION_LINK_SELECTOR));
    if (!inFilter && !inPagination) {
      return;
    }

    const state = parseStateFromHref(anchor.href);
    if (!state) {
      return;
    }

    event.preventDefault();
    void moveToState(state, "push");
  });

  window.addEventListener("popstate", (event) => {
    const state = event.state;
    if (!state || !state[HOME_HISTORY_MARK]) {
      return;
    }
    const kind = normalizeKind(state.kind);
    const page = readPositiveInt(state.page, 1);
    void moveToState({ kind, page }, "none");
  });
};
