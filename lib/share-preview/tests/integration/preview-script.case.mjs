import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import test from 'node:test';
import { createProjectTempDir } from '../../../foundation/temp-dir.mjs';

const ROOT_DIR = '/Users/groove/Project/code/Toolkit/groove-typst-blog';

function createTempDir(prefix) {
  return createProjectTempDir(ROOT_DIR, prefix);
}

function buildSiteTemp({ shareOrigin = 'local' } = {}) {
  const outDirPath = createTempDir('.tmp-share-preview-site-');
  const outDirName = relative(ROOT_DIR, outDirPath);
  const cacheRootPath = createTempDir('.tmp-share-preview-cache-');
  const cacheRootName = relative(ROOT_DIR, cacheRootPath);
  const result = spawnSync(
    'node',
    ['lib/node/build-html.mjs', '--out', outDirName, '--cache-root', cacheRootName, '--share-origin', shareOrigin],
    {
      cwd: ROOT_DIR,
      encoding: 'utf8',
    },
  );

  return {
    outDirName,
    outDirPath,
    cacheRootPath,
    result,
  };
}

function extractPreviewAssetPath(indexHtml, pattern, label) {
  const matched = indexHtml.match(pattern)?.[1];
  assert.ok(matched, `Expected preview index to include ${label}`);
  return matched;
}

test('share-card-preview script emits preview page and manifest for an existing build', () => {
  const built = buildSiteTemp({ shareOrigin: 'local' });

  assert.equal(
    built.result.status,
    0,
    `Expected build to succeed.\nstdout:\n${built.result.stdout}\nstderr:\n${built.result.stderr}`,
  );

  const result = spawnSync(
    'node',
    ['scripts/share-card-preview.mjs', '--no-build', '--out', built.outDirName, '--page', 'posts/articles/prelude/'],
    {
      cwd: ROOT_DIR,
      encoding: 'utf8',
    },
  );

  assert.equal(
    result.status,
    0,
    `Expected share preview script to succeed.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );

  const previewIndexPath = join(built.outDirPath, '__tools', 'share-preview', 'index.html');
  assert.ok(existsSync(previewIndexPath), 'Expected preview index page to exist');

  const previewIndexHtml = readFileSync(previewIndexPath, 'utf8');
  const manifestPath = join(
    built.outDirPath,
    '__tools',
    'share-preview',
    extractPreviewAssetPath(previewIndexHtml, /data-manifest-url="([^"]+)"/, 'versioned manifest url').replace(
      /^\.\//,
      '',
    ),
  );
  const runtimeStylesPath = join(
    built.outDirPath,
    '__tools',
    'share-preview',
    extractPreviewAssetPath(
      previewIndexHtml,
      /<link rel="stylesheet" href="([^"]+)">/,
      'versioned runtime stylesheet',
    ).replace(/^\.\//, ''),
  );
  const appPath = join(
    built.outDirPath,
    '__tools',
    'share-preview',
    extractPreviewAssetPath(
      previewIndexHtml,
      /<script type="module" src="([^"]+)"><\/script>/,
      'versioned runtime app',
    ).replace(/^\.\//, ''),
  );
  const colorThiefVendorPath = join(
    built.outDirPath,
    '__tools',
    'share-preview',
    extractPreviewAssetPath(
      previewIndexHtml,
      /<script src="([^"]*color-thief\.global\.js)"><\/script>/,
      'versioned ColorThief runtime',
    ).replace(/^\.\//, ''),
  );
  const qrVendorPath = join(
    built.outDirPath,
    '__tools',
    'share-preview',
    extractPreviewAssetPath(
      previewIndexHtml,
      /<script src="([^"]*qrcode-generator\.min\.js)"><\/script>/,
      'versioned QRCode runtime',
    ).replace(/^\.\//, ''),
  );
  const runtimeRootDir = dirname(appPath);
  const squircleVendorPath = join(runtimeRootDir, 'vendor', 'figma-squircle.mjs');
  const rendererPath = join(runtimeRootDir, 'renderers', 'index.mjs');
  const imessageRendererPath = join(runtimeRootDir, 'renderers', 'imessage.mjs');
  const configPath = join(runtimeRootDir, 'config.mjs');
  const qrHelperPath = join(runtimeRootDir, 'qr-code.mjs');
  const iconsRuntimePath = join(runtimeRootDir, 'ui', 'icons.mjs');
  const slackRendererPath = join(runtimeRootDir, 'renderers', 'slack.mjs');
  const xRendererPath = join(runtimeRootDir, 'renderers', 'x.mjs');
  const discordRendererPath = join(runtimeRootDir, 'renderers', 'discord.mjs');
  const exportHelperPath = join(runtimeRootDir, 'export', 'png.mjs');

  assert.ok(existsSync(manifestPath), 'Expected preview manifest to exist');
  assert.ok(existsSync(appPath), 'Expected runtime app module to exist');
  assert.ok(existsSync(runtimeStylesPath), 'Expected runtime styles to exist');
  assert.ok(existsSync(rendererPath), 'Expected renderer module to exist');
  assert.ok(existsSync(imessageRendererPath), 'Expected iMessage renderer module to exist');
  assert.ok(existsSync(configPath), 'Expected preview runtime config module to exist');
  assert.ok(existsSync(qrHelperPath), 'Expected QR helper module to exist');
  assert.ok(existsSync(iconsRuntimePath), 'Expected preview icon runtime module to exist');
  assert.equal(existsSync(slackRendererPath), false, 'Expected Slack renderer module to be removed');
  assert.equal(existsSync(xRendererPath), false, 'Expected X renderer module to be removed');
  assert.equal(existsSync(discordRendererPath), false, 'Expected Discord renderer module to be removed');
  assert.ok(existsSync(exportHelperPath), 'Expected export helper module to exist');
  assert.ok(existsSync(colorThiefVendorPath), 'Expected ColorThief vendor runtime to exist');
  assert.ok(existsSync(qrVendorPath), 'Expected QRCode vendor runtime to exist');
  assert.ok(existsSync(squircleVendorPath), 'Expected figma-squircle vendor runtime to exist');

  const imessageRendererSource = readFileSync(imessageRendererPath, 'utf8');
  const runtimeConfigSource = readFileSync(configPath, 'utf8');
  const qrHelperSource = readFileSync(qrHelperPath, 'utf8');
  const iconsRuntimeSource = readFileSync(iconsRuntimePath, 'utf8');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const preludeEntry = manifest.pages.find((page) => page.pagePath === '/posts/articles/prelude/');

  rmSync(built.outDirPath, { recursive: true, force: true });
  rmSync(built.cacheRootPath, { recursive: true, force: true });

  assert.match(previewIndexHtml, /data-default-page="posts\/articles\/prelude\/"/);
  assert.match(previewIndexHtml, /data-manifest-url="\.\/manifest\.[^"]+\.json"/);
  assert.match(previewIndexHtml, /<script src="\.\/runtime\/[^"]+\/vendor\/color-thief\.global\.js"><\/script>/);
  assert.match(previewIndexHtml, /carbon-preview-shell/);
  assert.match(previewIndexHtml, /carbon-preview-header/);
  assert.match(previewIndexHtml, /carbon-preview-rail/);
  assert.match(previewIndexHtml, /carbon-preview-desk/);
  assert.match(previewIndexHtml, /carbon-preview-stage-column/);
  assert.match(previewIndexHtml, /carbon-preview-inspector/);
  assert.match(previewIndexHtml, /<title>分享预览工作台<\/title>/);
  assert.match(previewIndexHtml, />分享预览</);
  assert.match(previewIndexHtml, />文章检索</);
  assert.match(previewIndexHtml, /placeholder="搜索标题或路径"/);
  assert.match(previewIndexHtml, />检查面板</);
  assert.match(previewIndexHtml, />页面检查</);
  assert.match(previewIndexHtml, />打开页面</);
  assert.match(previewIndexHtml, />导出 PNG</);
  assert.match(previewIndexHtml, /id="display-options-host"/);
  assert.match(previewIndexHtml, /id="review-view"/);
  assert.match(previewIndexHtml, /id="inspector-tabs"/);
  assert.doesNotMatch(previewIndexHtml, /carbon-preview-bottom-sheet/);
  assert.match(previewIndexHtml, /qrcode-generator\.min\.js/);
  assert.match(runtimeConfigSource, /DEFAULT_SHARE_CARD_EXPORT_OPTIONS/);
  assert.match(imessageRendererSource, /data-part="imessage-metadata-panel"/);
  assert.match(imessageRendererSource, /backgroundColor/);
  assert.match(imessageRendererSource, /renderQrOverlay/);
  assert.match(imessageRendererSource, /from '\.\.\/vendor\/figma-squircle\.mjs'/);
  assert.doesNotMatch(imessageRendererSource, /from 'figma-squircle'/);
  assert.match(qrHelperSource, /data-part="imessage-qr-overlay"/);
  assert.doesNotMatch(iconsRuntimeSource, /node:module/);
  assert.doesNotMatch(iconsRuntimeSource, /createRequire/);
  assert.doesNotMatch(iconsRuntimeSource, /require\('@carbon\/icons/);
  assert.ok(manifest.pages.length > 0, 'Expected preview manifest to include article pages');
  assert.deepEqual(manifest.platforms, ['imessagePlus']);
  assert.ok(
    manifest.pages.every((page) => page.pagePath.startsWith('/posts/articles/')),
    'Expected preview manifest to only include posts/articles pages',
  );
  assert.ok(preludeEntry, 'Expected prelude entry to exist in preview manifest');
  assert.equal(preludeEntry.shareTitle, '｢Prelude——美好祝愿的开始｣ · Groove Blog');
  assert.equal(preludeEntry.imageUrl, 'http://127.0.0.1:5500/posts/articles/prelude/img/cover.jpeg');
  assert.equal(preludeEntry.canonicalUrl, 'https://groovewjh.github.io/posts/articles/prelude/');
  assert.equal(preludeEntry.qrUrl, 'https://groovewjh.github.io/posts/articles/prelude/');
  assert.ok(preludeEntry.imageWidth > 0);
  assert.ok(preludeEntry.imageHeight > 0);
  assert.deepEqual(Object.keys(preludeEntry.platforms), ['imessagePlus']);
  assert.equal(preludeEntry.platforms.imessagePlus.displayDescription, true);
  assert.equal(preludeEntry.platforms.imessagePlus.hasQr, true);
});
