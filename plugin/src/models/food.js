// The food journal (pure; tests/food.test.mjs). Foods.md: a food per line, "- f12 каша с 4 ч #m1"
// (its id, its name, its marks' tags), the marks themselves in its `marks` property ({ tag, icon,
// name }: a tag kept once made, so a mark renamed keeps its foods). Log.md: what was eaten, a line
// each, "- 2026-11-09 f12", and a day's note, "- 2026-11-09 note: …". The week's rows for the food
// page: what was eaten with its marks' icons, the marks counted, each free journal's level after
// its lag (a rash shows the next day), the medication courses on that day, the note.
import { addDays } from "#/helpers/dates.js";

export const DEFAULT_MARKS = [
  { tag: "m1", icon: "🍫", name: "какао" },
  { tag: "m2", icon: "🥛", name: "молоко" },
  { tag: "m3", icon: "🥛↓", name: "безлактозное молоко" },
];

const FOOD = /^- (f\d+) (.+?)((?: #m\d+)*)$/;
const EATEN = /^- (\d{4}-\d{2}-\d{2}) (f\d+)$/, NOTE = /^- (\d{4}-\d{2}-\d{2}) note: (.*)$/;
const lines = text => text.replace(/\s+$/, "").split("\n").filter((l, i, a) => a.length > 1 || l);
const joined = list => list.join("\n") + "\n";

export class Foods {
  constructor(text) { this.text = text; }
  get list() {
    return lines(this.text).map(l => l.match(FOOD)).filter(Boolean)
      .map(m => ({ id: m[1], name: m[2], marks: m[3].split(" #").filter(Boolean) }));
  }
  get nextId() { return `f${Math.max(0, ...this.list.map(f => Number(f.id.slice(1)))) + 1}`; }
  // the text with the food's line: replaced (its id's), or a new one at the end
  set({ id, name, marks }) {
    const line = `- ${id} ${name.trim()}${marks.map(m => ` #${m}`).join("")}`;
    const all = lines(this.text), i = all.findIndex(l => l.match(FOOD)?.[1] === id);

    if (i >= 0) all[i] = line; else all.push(line);
    return joined(all);
  }
}

export class FoodLog {
  constructor(text) { this.text = text; }
  eaten(date) {
    return lines(this.text).map(l => l.match(EATEN)).filter(m => m?.[1] === date).map(m => m[2]);
  }
  note(date) {
    return lines(this.text).map(l => l.match(NOTE)).find(m => m?.[1] === date)?.[2] ?? "";
  }
  add(date, id) { return joined([...lines(this.text), `- ${date} ${id}`]); }
  // the day's n-th eaten line taken off
  remove(date, n) {
    let seen = -1;

    return joined(lines(this.text).filter(l => l.match(EATEN)?.[1] !== date || ++seen !== n));
  }
  // the day's note set (its line replaced, or added at the end), an empty one taken off
  setNote(date, text) {
    const all = lines(this.text), i = all.findIndex(l => l.match(NOTE)?.[1] === date);
    const line = `- ${date} note: ${text.trim()}`;

    if (!text.trim()) return i < 0 ? this.text : joined(all.filter((_, j) => j !== i));
    if (i >= 0) all[i] = line; else all.push(line);
    return joined(all);
  }
}

// journals: [{ path, name, lag, entries: Map date → { level, reasons } }]; courses: [{ path, name,
// start, days, meds: [{ code, name, days }], taken: Map date → the codes with a ✅ that day }]
// task: { id, name, days: Set of the dates it was done } or null: each row then says `trained`
export function foodWeek({ foods, marks, log, journals, courses, days, task = null }) {
  const byId = new Map(foods.map(f => [f.id, f]));
  const icon = new Map(marks.map(m => [m.tag, m.icon]));

  return days.map(date => {
    const items = log.eaten(date).map(id => byId.get(id) ?? { id, name: id, marks: [] })
      .map(f => ({ id: f.id, name: f.name, icons: f.marks.map(m => icon.get(m) ?? "").join("") }));
    const all = log.eaten(date).flatMap(id => byId.get(id)?.marks ?? []);

    return {
      date, items, note: log.note(date), ...(task && { trained: task.days.has(date) }),
      counts: Object.fromEntries(marks.map(m => [m.tag, all.filter(t => t === m.tag).length])),
      journals: journals.map(j => {
        const on = addDays(date, j.lag), e = j.entries.get(on);

        return { name: j.name, level: e?.level ?? null, reasons: e?.reasons ?? [], on };
      }),
      // a course on that day, its medicines still on then (each its own days)
      courses: courses.filter(c => c.start <= date && date < addDays(c.start, c.days)).map(c => ({
        path: c.path, name: c.name,
        meds: (c.meds ?? []).filter(m => date < addDays(c.start, m.days))
          .map(m => ({ code: m.code, name: m.name, taken: !!c.taken?.get(date)?.has(m.code) })),
      })),
    };
  });
}
