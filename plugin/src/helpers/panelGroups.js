// The panel's cards grouped by area, shared by its tabs
import { T } from "#/models/calendarData.js";
import { taskStore, stageTasks } from "#/store/tasks.js";

export const SHOWN = 8;   // No date: the first 8 until "show all"

// a group card's title, as on the Life Areas chart
export function areaTitle({ areaIcons, areaMap }, g) {
  const name = areaMap[g] ?? g ?? "other";

  return `${areaIcons[g] ?? "✦"} ${name[0].toUpperCase()}${name.slice(1)}`;
}

// `items` as group cards, one per run of the same area: { key, title, cards }
export function byArea(items, card, config) {
  const runs = [];

  for (const t of items) {
    const a = T(t).area;

    if (!runs.length || runs.at(-1).a !== a) runs.push({ a, items: [] });
    runs.at(-1).items.push(t);
  }

  return runs.map((r, i) =>
    ({ key: `${i}|${r.a}`, title: areaTitle(config, r.a), cards: r.items.map(card) }));
}

// the projects with open tasks (a Done one too: its undated tasks show nowhere else), each with
// its stages' open tasks (a stage with none is left out), and how many that is, in file order:
// [{ key, title, stages: [{ name, entries }], open }]
export function openProjects() {
  return [...taskStore.projects].map(([key, p]) => {
    const stages = (p.stages ?? [])
      .map(s => ({ name: s.name, entries: stageTasks(s).filter(e => !e.done) }))
      .filter(s => s.entries.length);

    return { key, title: p.name, stages, open: stages.reduce((n, s) => n + s.entries.length, 0) };
  }).filter(p => p.stages.length);
}
