// A store: a tab's state in one place (Pinia's idea, without Vue). set(patch) changes it, saves it when a `saved`
// key changed (the calendar: with the workspace layout) and calls each watcher of the changed keys, once per set.
// The parts don't call each other: each watches the keys it shows.
export function createStore(state, { save = () => {}, saved = Object.keys(state) } = {}) {
  const watchers = [];
  return {
    state,
    set(patch) {
      const changed = Object.keys(patch).filter(k => !Object.is(state[k], patch[k]));
      if (!changed.length) return;
      Object.assign(state, patch);
      if (changed.some(k => saved.includes(k))) save(state);
      for (const w of watchers) if (w.keys.some(k => changed.includes(k))) w.fn(changed);
    },
    watch(keys, fn) { watchers.push({ keys, fn }); },
  };
}
