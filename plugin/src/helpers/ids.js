// New ids (pure: no Obsidian, no files).
// nextId: prefix + (the biggest N among the ids that look like prefix<N>, else 0) + 1; other
//   keys are skipped.
export function nextId(prefix, ids) {
  const re = new RegExp(`^${prefix}(\\d+)$`);
  const nums = [...ids].map(id => re.exec(id ?? "")?.[1]).filter(Boolean).map(Number);

  return `${prefix}${Math.max(0, ...nums) + 1}`;
}
