function isBasicCodePoint(codePoint) {
  return codePoint === 0x09 || codePoint === 0x0a || codePoint === 0x0d || (codePoint >= 0x20 && codePoint <= 0x7e);
}

export { isBasicCodePoint };

export function dedupeCodepoints(text = '') {
  const seen = new Set();
  let output = '';

  for (const char of String(text)) {
    if (seen.has(char)) continue;
    seen.add(char);
    output += char;
  }

  return output;
}

export function splitBasicAndNonBasicText(text = '') {
  let basicText = '';
  let nonBasicText = '';

  for (const char of String(text)) {
    const codePoint = char.codePointAt(0) ?? 0;
    if (isBasicCodePoint(codePoint)) {
      basicText += char;
      continue;
    }

    if (codePoint < 0x20 || codePoint === 0x7f) {
      continue;
    }

    nonBasicText += char;
  }

  return {
    basicText: dedupeCodepoints(basicText),
    nonBasicText: dedupeCodepoints(nonBasicText),
  };
}

export function splitBasicAndSiteText(text = '') {
  const { basicText, nonBasicText } = splitBasicAndNonBasicText(text);
  return {
    basicText,
    siteText: nonBasicText,
  };
}
