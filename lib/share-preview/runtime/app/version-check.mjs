function buildBypassUrl(url) {
  const nextUrl = new URL(url, window.location.href);
  nextUrl.searchParams.set('_previewVersionCheck', String(Date.now()));
  return nextUrl.href;
}

async function fetchLatestPreviewVersion(root) {
  const versionUrl = root?.dataset?.previewVersionUrl || './version.json';
  const response = await fetch(buildBypassUrl(versionUrl), { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load preview version metadata: ${response.status} ${response.statusText}`);
  }
  const payload = await response.json();
  return String(payload?.version || '').trim();
}

function reloadIntoLatestVersion(nextVersion) {
  if (!nextVersion) {
    return;
  }
  const url = new URL(window.location.href);
  url.searchParams.set('previewVersion', nextVersion);
  window.location.replace(url.toString());
}

export function startPreviewVersionGuard(root) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  let checking = false;
  const currentVersion = String(root?.dataset?.previewVersion || '').trim();

  async function checkForUpdates() {
    if (checking) {
      return;
    }
    checking = true;
    try {
      const latestVersion = await fetchLatestPreviewVersion(root);
      if (latestVersion && currentVersion && latestVersion !== currentVersion) {
        reloadIntoLatestVersion(latestVersion);
      }
    } catch (error) {
      console.error(error);
    } finally {
      checking = false;
    }
  }

  const intervalId = window.setInterval(checkForUpdates, 4000);
  window.addEventListener('focus', checkForUpdates);
  document.addEventListener('visibilitychange', checkForUpdates);

  return () => {
    window.clearInterval(intervalId);
    window.removeEventListener('focus', checkForUpdates);
    document.removeEventListener('visibilitychange', checkForUpdates);
  };
}
