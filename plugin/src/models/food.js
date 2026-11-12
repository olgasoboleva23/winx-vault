// The food journal (pure; tests/food.test.mjs). food.json: the marks ({ tag, icon, name }: a tag
// kept once made, so a mark renamed keeps its foods), the training task's id and the foods by id
// ({ name, marks: [tag] }). log.json: a day by date, { eaten: [food id], note }; a day with
// nothing eaten and no note isn't kept. The week's rows for the food page: what was eaten with
// its marks' icons, the marks counted, each free journal's level after its lag (a rash shows the
// next day), the medication courses on that day, the note.
import { addDays } from "#/helpers/dates.js";
import { nextId } from "#/helpers/ids.js";

export const DEFAULT_MARKS = [
  { tag: "m1", icon: "🍫", name: "какао" },
  { tag: "m2", icon: "🥛", name: "молоко" },
  { tag: "m3", icon: "🥛↓", name: "безлактозное молоко" },
];

export const foodList = data =>
  Object.entries(data.foods ?? {}).map(([id, f]) => ({ id, name: f.name, marks: f.marks }));

export const marksOf = data => data.marks ?? DEFAULT_MARKS;

export const newFoodId = data => nextId("f", Object.keys(data.foods ?? {}));

// the food set in place (its id's) or added at the end
export const withFood = (data, { id, name, marks }) =>
  ({ ...data, foods: { ...data.foods, [id]: { name: name.trim(), marks } } });

export const withMarks = (data, marks) => ({ ...data, marks });

export const withTask = (data, id) => ({ ...data, task: id });

export const eaten = (log, date) => log[date]?.eaten ?? [];

export const dayNote = (log, date) => log[date]?.note ?? "";

// the log with the day set; an empty one dropped
function withDay(log, date, day) {
  if (day.eaten.length || day.note) return { ...log, [date]: day };
  const rest = { ...log };

  delete rest[date];
  return rest;
}

export const withEaten = (log, date, id) =>
  withDay(log, date, { eaten: [...eaten(log, date), id], note: dayNote(log, date) });

// the day's n-th eaten taken off (out of range: the log as it was)
export function withoutEaten(log, date, n) {
  const list = eaten(log, date);

  if (n < 0 || n >= list.length) return log;
  return withDay(log, date, { eaten: list.filter((_, i) => i !== n), note: dayNote(log, date) });
}

export const withNote = (log, date, text) =>
  withDay(log, date, { eaten: eaten(log, date), note: text.trim() });

// journals: [{ path, name, lag, entries: Map date → { level, reasons } }]; courses: [{ id, name,
// start, days, meds: [{ code, name, days }], taken: Map date → the codes with a ✅ that day }]
// task: { id, name, days: Set of the dates it was done } or null: each row then says `trained`
// log: log.json's object
export function foodWeek({ foods, marks, log, journals, courses, days, task = null }) {
  const byId = new Map(foods.map(f => [f.id, f]));
  const icon = new Map(marks.map(m => [m.tag, m.icon]));

  return days.map(date => {
    const items = eaten(log, date).map(id => byId.get(id) ?? { id, name: id, marks: [] })
      .map(f => ({ id: f.id, name: f.name, icons: f.marks.map(m => icon.get(m) ?? "").join("") }));
    const all = eaten(log, date).flatMap(id => byId.get(id)?.marks ?? []);

    return {
      date, items, note: dayNote(log, date), ...(task && { trained: task.days.has(date) }),
      counts: Object.fromEntries(marks.map(m => [m.tag, all.filter(t => t === m.tag).length])),
      journals: journals.map(j => {
        const on = addDays(date, j.lag), e = j.entries.get(on);

        return { name: j.name, level: e?.level ?? null, reasons: e?.reasons ?? [], on };
      }),
      // a course on that day, its medicines still on then (each its own days)
      courses: courses.filter(c => c.start <= date && date < addDays(c.start, c.days)).map(c => ({
        id: c.id, name: c.name,
        meds: (c.meds ?? []).filter(m => date < addDays(c.start, m.days))
          .map(m => ({ code: m.code, name: m.name, taken: !!c.taken?.get(date)?.has(m.code) })),
      })),
    };
  });
}
