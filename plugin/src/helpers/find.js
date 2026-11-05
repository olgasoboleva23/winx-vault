// The search windows' filter (tested by tests/logic.test.mjs).
// the choices ({ name }) with every word of `query`; the typed name as a new item when no choice is
// called that
export function findChoices(choices, query) {
  const q = query.trim(), words = q.toLowerCase().split(/\s+/);
  const found = choices.filter(c => words.every(w => c.name.toLowerCase().includes(w)));

  const named = found.some(c => c.name.toLowerCase() === q.toLowerCase());

  return !q || named ? found : [...found, { name: q, isNew: true }];
}
