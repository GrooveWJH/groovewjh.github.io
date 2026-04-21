import { codeToHtml } from 'https://esm.sh/shiki@3.0.0';

const fallbackCopyText = (text) => {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  textarea.style.left = '-9999px';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);

  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }

  document.body.removeChild(textarea);
  return copied;
};

const copyText = async (text) => {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {}
  }

  return fallbackCopyText(text);
};

const CARBON_REACTIVE_THEME = {
  name: 'carbon-reactive',
  type: 'light',
  colors: {
    'editor.background': 'var(--layer1)',
    'editor.foreground': 'var(--text-primary)',
  },
  tokenColors: [
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: 'var(--code-token-comment)' } },
    { scope: ['keyword', 'storage', 'storage.type'], settings: { foreground: 'var(--code-token-keyword)' } },
    {
      scope: ['keyword.control', 'keyword.control.flow'],
      settings: { foreground: 'var(--code-token-keyword-control)' },
    },
    { scope: ['keyword.operator', 'keyword.other.unit'], settings: { foreground: 'var(--code-token-operator)' } },
    {
      scope: ['variable', 'variable.other.readwrite', 'identifier'],
      settings: { foreground: 'var(--code-token-variable)' },
    },
    {
      scope: ['entity.name.type', 'support.type', 'entity.name.class'],
      settings: { foreground: 'var(--code-token-type)' },
    },
    { scope: ['entity.other.attribute-name'], settings: { foreground: 'var(--code-token-attribute)' } },
    { scope: ['entity.name.tag'], settings: { foreground: 'var(--code-token-tag)' } },
    { scope: ['constant.numeric'], settings: { foreground: 'var(--code-token-number)' } },
    {
      scope: ['constant.language', 'constant.language.boolean', 'constant.language.null'],
      settings: { foreground: 'var(--code-token-constant)' },
    },
    { scope: ['string'], settings: { foreground: 'var(--code-token-string)' } },
    { scope: ['string.regexp', 'regexp'], settings: { foreground: 'var(--code-token-regexp)' } },
    { scope: ['constant.character.escape'], settings: { foreground: 'var(--code-token-escape)' } },
    { scope: ['entity.name.function', 'support.function'], settings: { foreground: 'var(--code-token-function)' } },
    {
      scope: ['punctuation', 'meta.brace', 'meta.delimiter'],
      settings: { foreground: 'var(--code-token-punctuation)' },
    },
    { scope: ['markup.heading'], settings: { foreground: 'var(--code-token-heading)' } },
    { scope: ['markup.quote'], settings: { foreground: 'var(--code-token-quote)' } },
    { scope: ['markup.underline.link', 'string.other.link'], settings: { foreground: 'var(--code-token-link)' } },
    { scope: ['invalid', 'invalid.illegal'], settings: { foreground: 'var(--code-token-invalid)' } },
    { scope: ['meta', 'meta.annotation'], settings: { foreground: 'var(--code-token-meta)' } },
  ],
};

export const installCodeRendering = async () => {
  let codeBlocks = document.querySelectorAll('code');
  if (codeBlocks.length === 0) {
    return;
  }

  await Promise.all(
    Array.from(codeBlocks).map(async (codeBlock) => {
      let language = 'plaintext';
      codeBlock.classList.forEach((cls) => {
        if (cls.startsWith('language-')) {
          language = cls.replace('language-', '');
        }
      });

      const pre = codeBlock.parentElement;
      if (!pre?.matches('pre')) {
        if (codeBlock.querySelector('.shiki-inline')) return;
        codeBlock.innerHTML = await codeToHtml(codeBlock.textContent, {
          lang: language,
          theme: CARBON_REACTIVE_THEME,
          structure: 'inline',
        });
        codeBlock.classList.add('shiki-inline');
        return;
      }

      if (pre.querySelector('.shiki')) return;
      pre.outerHTML = await codeToHtml(codeBlock.textContent, {
        lang: language,
        theme: CARBON_REACTIVE_THEME,
      });
    }),
  );

  codeBlocks = document.querySelectorAll('pre > code');

  codeBlocks.forEach((codeBlock) => {
    const pre = codeBlock.parentElement;

    const clone = codeBlock.cloneNode(true);
    const brs = clone.querySelectorAll('br');
    brs.forEach((br) => {
      br.replaceWith('\n');
    });

    const text = clone.textContent;
    const cleanText = text.replace(/\n$/, '');
    const lineCount = cleanText.split(/\r\n|\r|\n/).length;

    if (!pre.querySelector('.has-line-numbers')) {
      if (lineCount <= 1) {
        pre.classList.add('single-line');
      } else {
        const rows = document.createElement('span');
        rows.className = 'line-numbers-rows';

        for (let i = 1; i <= lineCount; i += 1) {
          const span = document.createElement('span');
          span.textContent = i;
          rows.appendChild(span);
        }

        pre.prepend(rows);
      }

      pre.classList.add('has-line-numbers');
    }

    if (pre.querySelector('.copy-button')) return;

    const copyButton = document.createElement('button');
    copyButton.className = 'copy-button';
    copyButton.type = 'button';
    copyButton.setAttribute('aria-label', '复制代码');

    copyButton.addEventListener('click', async () => {
      const copied = await copyText(cleanText);
      if (copied) {
        copyButton.classList.add('copied');
        setTimeout(() => copyButton.classList.remove('copied'), 1000);
      } else {
        copyButton.classList.add('error');
        setTimeout(() => copyButton.classList.remove('error'), 1000);
      }
    });

    pre.style.position = 'relative';
    pre.appendChild(copyButton);
  });
};
