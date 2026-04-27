import { renderCanvasToggle, renderDisplayOptions } from './render-controls.mjs';

function updateCheckbox(input, checked, disabled = false) {
  if (!input) return;
  input.checked = Boolean(checked);
  input.disabled = Boolean(disabled);
}

function updateOutputText(node, value) {
  if (node) node.textContent = value;
}

function syncDisplayOption(host, key, available, checked) {
  const input = host.querySelector(`[data-display-option="${key}"]`);
  if (!input) return;
  updateCheckbox(input, available && checked, !available);
  input.closest('.carbon-preview-segment')?.classList.toggle('is-disabled', !available);
}

export function syncCanvasToggleHost(host, squareCanvas) {
  if (!host?.querySelector) {
    host.innerHTML = renderCanvasToggle(squareCanvas);
    return;
  }
  const input = host.querySelector('#square-canvas-toggle');
  if (!input) {
    host.innerHTML = renderCanvasToggle(squareCanvas);
    return;
  }
  input.checked = Boolean(squareCanvas);
}

export function syncDisplayOptionsHost(host, entry, displayOptions, cornerSize, edgeFeatherEnabled, edgeFeatherSize) {
  const markup = renderDisplayOptions(entry, displayOptions, cornerSize, edgeFeatherEnabled, edgeFeatherSize);
  if (!host?.querySelector) {
    host.innerHTML = markup;
    return;
  }
  if (!host.querySelector('[data-corner-size-input]') || !host.querySelector('[data-edge-feather-toggle]')) {
    host.innerHTML = markup;
    return;
  }

  syncDisplayOption(host, 'description', Boolean(entry?.descriptionText || entry?.description), displayOptions?.description);
  syncDisplayOption(host, 'url', Boolean(entry?.canonicalUrl || entry?.pagePath || entry?.siteName), displayOptions?.url);
  syncDisplayOption(host, 'date', Boolean(entry?.publishedTime), displayOptions?.date);
  syncDisplayOption(host, 'qr', Boolean(entry?.qrUrl), displayOptions?.qr);
  updateCheckbox(host.querySelector('[data-display-option="brackets"]'), displayOptions?.brackets);

  const safeCornerSize = Number.isFinite(Number(cornerSize)) ? String(Number(cornerSize)) : '0';
  const cornerInput = host.querySelector('[data-corner-size-input]');
  if (cornerInput) cornerInput.value = safeCornerSize;
  updateOutputText(host.querySelector('output[for="corner-size-input"]'), safeCornerSize);

  updateCheckbox(host.querySelector('[data-edge-feather-toggle]'), edgeFeatherEnabled);
  const safeFeatherSize = Number.isFinite(Number(edgeFeatherSize)) ? Number(edgeFeatherSize) : 0;
  const featherInput = host.querySelector('[data-edge-feather-size-input]');
  if (featherInput) {
    featherInput.value = String(safeFeatherSize);
    featherInput.disabled = !edgeFeatherEnabled;
  }
  updateOutputText(host.querySelector('output[for="edge-feather-size-input"]'), safeFeatherSize.toFixed(1));
}
