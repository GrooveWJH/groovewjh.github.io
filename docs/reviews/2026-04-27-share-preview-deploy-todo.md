# Share Preview Deploy TODO

## Goal

- Publish the share preview tool at [https://groovewjh.github.io/tools/share-preview/](https://groovewjh.github.io/tools/share-preview/)
- Remove the old `__tools/share-preview` deployment contract
- Keep the tool as a deployed site utility page with `noindex, nofollow`

## Code Changes Checklist

- [ ] Change the stable output directory from `tools/share-preview`
- [ ] Remove any leftover `__tools/share-preview` output when preview is regenerated
- [ ] Reuse a single preview-path constant across build code and tests
- [ ] Add `<meta name="robots" content="noindex, nofollow">` to the preview `index.html`
- [ ] Add a dedicated attach script that writes preview into an existing `_site/`
- [ ] Update GitHub Pages workflow to run release build first, then attach preview, then upload `_site/`
- [ ] Update local and production documentation to point to `/tools/share-preview/`

## Local Verification Checklist

- [ ] Run `npm run share:preview`
- [ ] Run `npx http-server _site -a 127.0.0.1 -p 5500 -c-1`
- [ ] Open [http://127.0.0.1:5500/tools/share-preview/](http://127.0.0.1:5500/tools/share-preview/)
- [ ] Confirm the page loads without redirecting to `__tools`
- [ ] Confirm `Export PNG`, `Square Canvas`, smart colors, QR, and Custom mode still work
- [ ] View source and confirm `noindex, nofollow` is present
- [ ] Confirm `_site/__tools/share-preview/` does not exist after regeneration

## Test Checklist

- [ ] Run `node --test lib/share-preview/tests/cache-busting.test.mjs`
- [ ] Run `node --test lib/share-preview/tests/integration/preview-manifest.case.mjs lib/share-preview/tests/integration/preview-script.case.mjs`
- [ ] Run `npm run check:maxline:share`
- [ ] Run `npm test`

## Merge And Deploy Checklist

- [ ] Review `git diff` for the preview path, workflow, tests, and docs changes
- [ ] Commit the work on the current branch
- [ ] Checkout `main`
- [ ] Pull the latest `main`
- [ ] Merge the working branch into `main`
- [ ] Push `main` to origin
- [ ] Run `gh run list --workflow deploy.yml --limit 5`
- [ ] Run `gh run watch --workflow deploy.yml`

## Production Acceptance Checklist

- [ ] Open [https://groovewjh.github.io/tools/share-preview/](https://groovewjh.github.io/tools/share-preview/)
- [ ] Confirm the deployed page returns the current preview UI
- [ ] Confirm page source includes `noindex, nofollow`
- [ ] Confirm `https://groovewjh.github.io/__tools/share-preview/` is no longer the supported entry
- [ ] Confirm preview cards still render article cover, metadata panel, QR, and export correctly

## Rollback And Triage

- [ ] If the workflow fails before upload, inspect the `Build site` and `Attach share preview` logs first
- [ ] If the deployed page 404s, inspect the uploaded artifact layout and confirm `_site/tools/share-preview/index.html` exists
- [ ] If the preview loads stale assets, inspect `version.json` and the runtime versioned asset paths
- [ ] If rollback is needed, revert the preview-path and workflow changes together, then redeploy `main`
