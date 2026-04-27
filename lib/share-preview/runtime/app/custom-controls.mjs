function readFileAsDataUrl(file) {
  return new Promise((resolvePromise, rejectPromise) => {
    const reader = new FileReader();
    reader.onload = () => resolvePromise(String(reader.result || ''));
    reader.onerror = () => rejectPromise(reader.error || new Error('Failed to read custom cover image'));
    reader.readAsDataURL(file);
  });
}

function readImageDimensions(url) {
  return new Promise((resolvePromise, rejectPromise) => {
    const image = new Image();
    image.onload = () => {
      resolvePromise({
        width: Number(image.naturalWidth || image.width || 0) || null,
        height: Number(image.naturalHeight || image.height || 0) || null,
      });
    };
    image.onerror = () => rejectPromise(new Error('Failed to measure custom cover image'));
    image.src = url;
  });
}

function clearCustomCover(customDraft) {
  customDraft.coverImageHref = '';
  customDraft.coverImageWidth = null;
  customDraft.coverImageHeight = null;
  customDraft.coverImageName = '';
}

export function bindPreviewModeSwitcher(nodes, state, render) {
  nodes.previewModeHost?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-preview-mode]');
    if (!button) {
      return;
    }

    state.activeMode = button.dataset.previewMode || 'library';
    state.activeAuditGroup = null;
    state.activeAuditTarget = null;
    state.exportStatus = 'idle';
    render();
  });
}

export function bindCustomDraftEditor(nodes, state, render) {
  function updateDraftField(input) {
    state.customDraft[input.dataset.customField] = input.value;
    state.exportStatus = 'idle';
    render();
  }

  nodes.railBodyNode?.addEventListener('click', (event) => {
    if (state.activeMode !== 'custom') {
      return;
    }

    const trigger = event.target.closest('[data-custom-cover-trigger], [data-custom-cover-picker]');
    if (trigger && !event.target.closest('[data-custom-cover-clear]')) {
      nodes.railBodyNode.querySelector('[data-custom-cover-input]')?.click();
      return;
    }

    if (!event.target.closest('[data-custom-cover-clear]')) {
      return;
    }

    const input = nodes.railBodyNode.querySelector('[data-custom-cover-input]');
    if (input) {
      input.value = '';
    }
    clearCustomCover(state.customDraft);
    state.exportStatus = 'idle';
    render();
  });

  nodes.railBodyNode?.addEventListener('input', (event) => {
    if (state.activeMode !== 'custom') {
      return;
    }

    const input = event.target.closest('[data-custom-field]');
    if (!input || input.type === 'file') {
      return;
    }

    updateDraftField(input);
  });

  nodes.railBodyNode?.addEventListener('change', async (event) => {
    if (state.activeMode !== 'custom') {
      return;
    }

    const input = event.target.closest('[data-custom-field]');
    if (!input) {
      return;
    }

    if (input.type !== 'file') {
      updateDraftField(input);
      return;
    }

    const [file] = Array.from(input.files || []);
    if (!file) {
      clearCustomCover(state.customDraft);
      state.exportStatus = 'idle';
      render();
      return;
    }

    try {
      const coverImageHref = await readFileAsDataUrl(file);
      const coverImageSize = await readImageDimensions(coverImageHref);
      state.customDraft.coverImageHref = coverImageHref;
      state.customDraft.coverImageWidth = coverImageSize.width;
      state.customDraft.coverImageHeight = coverImageSize.height;
      state.customDraft.coverImageName = String(file.name || '').trim();
      state.exportStatus = 'idle';
      render();
    } catch (error) {
      console.error(error);
      window.alert(error instanceof Error ? error.message : String(error));
    }
  });
}
