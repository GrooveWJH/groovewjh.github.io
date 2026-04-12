const BASIC_CODEPOINT_PATTERN = /[\u0009\u000A\u000D\u0020-\u007E]/;

export function dedupeCodepoints(text = "") {
  const seen = new Set();
  let output = "";

  for (const char of String(text)) {
    if (seen.has(char)) continue;
    seen.add(char);
    output += char;
  }

  return output;
}

export function splitBasicAndSiteText(text = "") {
  let basicText = "";
  let siteText = "";

  for (const char of String(text)) {
    if (BASIC_CODEPOINT_PATTERN.test(char)) {
      basicText += char;
      continue;
    }

    const codePoint = char.codePointAt(0) ?? 0;
    if (codePoint < 0x20 || codePoint === 0x7F) {
      continue;
    }

    siteText += char;
  }

  return {
    basicText: dedupeCodepoints(basicText),
    siteText: dedupeCodepoints(siteText),
  };
}
