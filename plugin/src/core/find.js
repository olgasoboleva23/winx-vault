// The search windows' filter (tested by tests/logic.test.mjs).
// the choices ({ name }) with every word of `query`; the typed name as a new item when no choice is called that
export function findChoices(choices, query) {
  const q = query.trim(), words = q.toLowerCase().split(/\s+/);
  const found = choices.filter(c => words.every(w => c.name.toLowerCase().includes(w)));
  return !q || found.some(c => c.name.toLowerCase() === q.toLowerCase()) ? found : [...found, { name: q, isNew: true }];
}
