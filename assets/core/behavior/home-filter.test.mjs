import test from 'node:test';
import assert from 'node:assert/strict';

import { __test__ } from './home-filter.js';

test('home filter history entries use the route URL for poem pages', () => {
  const entry = __test__.buildHistoryEntry('poem', 1);

  assert.deepEqual(entry.payload, {
    'typ-blog-home-filter-state': true,
    kind: 'poem',
    page: 1,
  });
  assert.equal(entry.url, '/poems/');
});

test('home filter history entries use paginated article URLs', () => {
  const entry = __test__.buildHistoryEntry('article', 3);

  assert.deepEqual(entry.payload, {
    'typ-blog-home-filter-state': true,
    kind: 'article',
    page: 3,
  });
  assert.equal(entry.url, '/page/3/');
});

test('home snapshot prefers replacing the entire route shell when available', () => {
  const filter = {
    dataset: {
      homeRouteKind: 'poem',
      homeRoutePage: '2',
      homeTotalArticlePages: '3',
      homeTotalPoemPages: '2',
    },
  };
  const routeShell = { outerHTML: '<div data-home-route-shell="true"><h2>诗歌列表</h2></div>' };
  const listShell = { outerHTML: '<div data-home-list-shell="true"></div>' };
  const doc = {
    querySelector(selector) {
      if (selector === '[data-home-route-shell]') {
        return routeShell;
      }
      if (selector === '.homepage-filter[data-home-route-kind][data-home-route-page]') {
        return filter;
      }
      if (selector === '[data-home-list-shell]') {
        return listShell;
      }
      return null;
    },
  };

  const snapshot = __test__.createSnapshotFromDocument(doc);

  assert.equal(snapshot.kind, 'poem');
  assert.equal(snapshot.page, 2);
  assert.equal(snapshot.shellHtml, routeShell.outerHTML);
});
