// The notes Winx makes (a command each, "Winx: New …"): the window's rows and the note's data.
//   form() → { rows, values, required } for Form.ask; note(values, today) → { props, body?,
//   sections, file? } for Note (a note's name is its file's: no title property, no # heading;
//   `file` names it when the window has no title: a course's medicines)
import { addDays } from "#/helpers/dates.js";

const pairs = list => list.map(([label, value]) => ({ label, value }));
const titleOnly = () => ({
  rows: [{ name: "Title", key: "title", text: "title" }], values: {}, required: ["title"],
});

// watch / read / game: a Collections note, its type or genre, status and rating 1–10 (the
// _index.base shows stars)
const item = ({ type, steps, types, statuses, ...rest }) => ({
  ...rest,
  form: () => ({
    rows: [
      { name: "Title", key: "title", text: "title" },
      types
        ? { name: "Type", key: "media_type", options: types }
        : { name: "Genre", key: "genre", text: "optional" },
      { name: "Status", key: "status", options: statuses },
      {
        name: "Rating", key: "rating",
        options: Array.from({ length: 10 }, (_, i) => ({ label: String(i + 1), value: i + 1 })),
      },
    ],
    values: { status: statuses[0].value },
    required: ["title", "status", ...(types ? ["media_type"] : [])],
  }),
  note: (v, today) => ({
    props: {
      type,
      ...(types
        ? { media_type: v.media_type, status: v.status }
        : { status: v.status, genre: v.genre }),
      rating: v.rating, ...(type === "game" ? { hours: null } : {}), created: today, tags: null,
    },
    sections: { Notes: "", Progress: steps.map(s => `- [ ] ${s}`).join("\n") },
  }),
});

// the medicines of a course, typed on one line: "Мастодинон 30 капель утро вечер; Аевит 1 таблетка;
// Новопассит 2 таблетки на ночь" → [{ name, dose, times: ["☀️", "🌙"], code: "МД" }]. The name:
// the words before the first number (all of them without one); the times: утро / morning ☀️,
// вечер / ночь / evening / night 🌙 at the end (none: once a day); the code: its first two letters
const TIMES = { утро: "☀️", утром: "☀️", morning: "☀️", вечер: "🌙", вечером: "🌙", ночь: "🌙",
  evening: "🌙", night: "🌙" };

export function parseMeds(line) {
  return line.split(";").map(s => s.trim()).filter(Boolean).map(s => {
    const words = s.split(/[\s,]+/), times = [];

    while (words.length && TIMES[words.at(-1).toLowerCase()]) times.unshift(TIMES[words.pop()]);
    if (times.length && words.at(-1) === "на") words.pop();   // "на ночь"
    const at = words.findIndex(w => /^\d/.test(w)), split = at < 0 ? words.length : at;
    const name = words.slice(0, split).join(" ");

    const dose = words.slice(split).join(" ");

    return { name, dose, times, code: name.slice(0, 2).toUpperCase() };
  });
}

// the course as a note: its medicines and doses, the columns' legend, a day per row to tick
const course = (v, today) => {
  const meds = parseMeds(v.meds), start = v.start?.trim() || today, days = Number(v.days) || 90;
  const when = m => ({ "☀️": "утро", "🌙": "на ночь" })[m.times[0]];
  const dose = m => [m.dose, m.times.length > 1 ? "утро и вечер" : m.times.length ? when(m) : ""]
    .filter(Boolean).join(", ");
  const columns = meds.flatMap(m => m.times.length ? m.times.map(t => m.code + t) : [m.code]);
  const row = cells => `| ${cells.join(" | ")} |`;
  const table = [
    row(["Дата", ...columns, "Заметки"]),
    row(["---", ...columns.map(() => ":-:"), "---"]),
    ...Array.from({ length: days }, (_, i) =>
      row([addDays(start, i), ...columns.map(() => "☐"), ""])),
  ];

  return {
    props: { type: "meds", start, days },
    file: meds.map(m => m.name).join(", "),
    body: [
      ...meds.map(m => `- ${m.name}${dose(m) ? ` — ${dose(m)}` : ""}`),
      "",
      row(["Код", "Препарат"]), row(["---", "---"]),
      ...meds.map(m => row([m.code, m.name])),
      row(["☀️", "утро"]), row(["🌙", "вечер / на ночь"]),
      "",
      ...table,
    ].join("\n"),
  };
};

export const KINDS = {
  watch: item({
    type: "watch", id: "new-watch-item", name: "New watch item",
    folder: "03 Resources/Collections/Watchlist",
    steps: ["Start", "Watch", "Finish"],
    types: pairs([
      ["Movie", "movie"], ["Movie series", "movie_series"], ["Cartoon", "cartoon"],
      ["Animated series", "animated_series"], ["TV Show", "tv"],
      ["Anime", "anime"], ["Documentary", "doc"], ["Other", "other"],
    ]),
    statuses: pairs([
      ["to watch", "to_watch"], ["watching", "watching"], ["completed", "completed"],
      ["dropped", "dropped"],
    ]),
  }),
  read: item({
    type: "read", id: "new-read-item", name: "New read item",
    folder: "03 Resources/Collections/Readlist",
    steps: ["Start", "Read", "Finish"],
    types: pairs([
      ["Fanfiction", "fanfiction"], ["Fiction", "fiction"], ["Manga", "manga"],
      ["Scientific pop", "scientific_pop"], ["IT", "it"],
    ]),
    statuses: pairs([
      ["to read", "to_read"], ["reading", "reading"], ["completed", "completed"],
      ["dropped", "dropped"],
    ]),
  }),
  game: item({
    type: "game", id: "new-game-item", name: "New game",
    folder: "03 Resources/Collections/Gamelist",
    steps: ["Start", "Play", "Complete"],
    statuses: pairs([
      ["to play", "to_play"], ["playing", "playing"], ["completed", "completed"],
      ["paused", "paused"], ["dropped", "dropped"],
    ]),
  }),
  recipe: {
    id: "new-recipe", name: "New recipe", folder: "03 Resources/Collections/Recipes",
    form: titleOnly,
    note: v => ({
      props: { type: "recipe", tags: [], source: null, time: null, difficulty: null, rating: null },
      sections: { Ingredients: "", Steps: "", Notes: "", Variations: "" },
    }),
  },
  // a course of medicines: a day per row to tick (the folder: "meds" in the plugin's data.json)
  meds: {
    id: "new-meds", name: "New medication course", folder: "02 Areas/Health/Medication",
    setting: "meds",
    form: () => ({
      rows: [
        {
          name: "Medicines", key: "meds",
          text: "Мастодинон 30 капель утро вечер; Аевит 1 таблетка; Новопассит 2 таблетки на ночь",
        },
        { name: "Start", key: "start", text: "YYYY-MM-DD (empty: today)" },
        { name: "Days", key: "days", text: "90", number: true },
      ],
      values: {}, required: ["meds"],
    }),
    note: course,
  },
  // the folder can be set as "workTasks" in the plugin's data.json
  work: {
    id: "new-work-task", name: "New work task", folder: "01 Projects/Work/tasks",
    setting: "workTasks", form: titleOnly,
    note: (v, today) => ({
      props: { status: "active", created: today, asana: null },
      sections: {
        "Зачем": "<!-- 1–3 строки: ссылка на Asana, что нужно или что сломано -->",
        "Сделать": "- [ ] ",
        "Лог": "<!-- всё свободное: созвоны, находки, решения, команды. Новое сверху, с датой. "
          + "Код — в блоках ``` -->",
        "Проверка": "<!-- как убедиться, что работает: шаги, ссылки, тест-чек-лист -->",
      },
    }),
  },
};

// a daily note (the dashboard's ✦ Open makes it): the day's date, "Monday, November 2" as the title
export const daily = (date, title) => ({
  props: { date }, title, sections: { "📝 Notes": "", "🎯 XP Log": "-" },
});
