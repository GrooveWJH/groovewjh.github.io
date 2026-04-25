import assert from 'node:assert/strict';
import test from 'node:test';
import { encodePublicPath, normalizePublicUrl, toAbsoluteUrl, toPublicPath, toPublicUrl } from './public-path.mjs';

test('encodePublicPath percent-encodes reserved characters per path segment', () => {
  assert.equal(encodePublicPath('/posts/articles/learn_color#1/'), '/posts/articles/learn_color%231/');
  assert.equal(
    encodePublicPath('/posts/articles/100% real?/img/a b.jpg'),
    '/posts/articles/100%25%20real%3F/img/a%20b.jpg',
  );
});

test('public path helpers preserve path shape while normalizing encoded output', () => {
  assert.equal(
    toPublicPath('posts/articles/learn_color#1/img/cover.jpg'),
    '/posts/articles/learn_color%231/img/cover.jpg',
  );
  assert.equal(toPublicUrl('posts/articles/learn_color#1'), '/posts/articles/learn_color%231/');
  assert.equal(
    toAbsoluteUrl('https://groovewjh.github.io', '/posts/articles/learn_color#1/img/cover.jpg'),
    'https://groovewjh.github.io/posts/articles/learn_color%231/img/cover.jpg',
  );
  assert.equal(
    normalizePublicUrl('https://groovewjh.github.io/posts/articles/learn_color#1/img/cover.jpg'),
    'https://groovewjh.github.io/posts/articles/learn_color%231/img/cover.jpg',
  );
});
