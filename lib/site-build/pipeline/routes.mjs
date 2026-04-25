export function slugify(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}\-_.~]/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildSlugMap(values, label) {
  const uniqueValues = Array.from(new Set(values.map((value) => String(value).trim()).filter(Boolean)));
  uniqueValues.sort((a, b) => a.localeCompare(b));

  const slugToValues = new Map();
  const valueToSlug = {};

  for (const value of uniqueValues) {
    const slug = slugify(value);
    const previous = slugToValues.get(slug) || [];
    previous.push(value);
    slugToValues.set(slug, previous);
    valueToSlug[value] = slug;
  }

  const collisions = [];
  for (const [slug, grouped] of slugToValues.entries()) {
    if (grouped.length > 1) {
      collisions.push({ slug, values: grouped });
    }
  }

  if (collisions.length > 0) {
    const lines = collisions.map((item) => `slug "${item.slug}" <- ${item.values.join(' | ')}`);
    throw new Error(`Slug conflict detected in ${label}:\n${lines.join('\n')}`);
  }

  return valueToSlug;
}

export function assertRouteTokenUsage(relTypPath) {
  const tagCount = (relTypPath.match(/\[tag\]/g) || []).length;
  const categoryCount = (relTypPath.match(/\[category\]/g) || []).length;

  if (tagCount > 1) {
    throw new Error(`Route token [tag] must appear at most once: ${relTypPath}`);
  }

  if (categoryCount > 1) {
    throw new Error(`Route token [category] must appear at most once: ${relTypPath}`);
  }

  if (tagCount > 0 && categoryCount > 0) {
    throw new Error(`Route template cannot include both [tag] and [category]: ${relTypPath}`);
  }

  return {
    hasTag: tagCount === 1,
    hasCategory: categoryCount === 1,
  };
}
