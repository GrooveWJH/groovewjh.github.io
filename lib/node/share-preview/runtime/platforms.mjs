function collapseWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export const PLATFORM_ORDER = [
  "imessagePlus",
];

const PLATFORM_LABELS = {
  imessagePlus: "iMessage+",
};

export function buildPlatformDescriptors({ description, imageUrl, imagePath, qrUrl }) {
  const hasDescription = Boolean(collapseWhitespace(description));
  const hasImage = Boolean(collapseWhitespace(imageUrl || imagePath));
  const hasQr = Boolean(collapseWhitespace(qrUrl));

  return {
    imessagePlus: {
      key: "imessagePlus",
      label: PLATFORM_LABELS.imessagePlus,
      displayDescription: hasDescription,
      exportable: true,
      exportOnly: true,
      hasImage,
      hasQr,
      note: hasDescription
        ? "iMessage+ 是导出专用模板：延续 iMessage 气质，但固定补上 description。"
        : "iMessage+ 是导出专用模板：当前页面没有 description，因此会保留更简洁的标题卡片。",
    },
  };
}

export function getPlatformLabel(platformKey) {
  return PLATFORM_LABELS[platformKey] || platformKey;
}
