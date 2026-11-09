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

// the medicines of a course, a group each in the window: the name, the dose ("30 капель"; none:
// the words from the first number of the name), when (morning | both | day | evening | any: once a
// day), the meal (before | after | sleep | any), days
const WHEN = { morning: ["☀️"], both: ["☀️", "🌙"], day: ["🌤"], evening: ["🌙"], any: [] };
const WHEN_TEXT = { "☀️": "☀️ утро", "🌤": "🌤 днём", "🌙": "🌙 на ночь", "": "в любое время" };
const MEAL_TEXT = { before: "перед едой", after: "после еды", sleep: "перед сном" };
const MEALS = [...Object.values(MEAL_TEXT), ""];

// a name as typed may carry the dose ("Мастодинон 30 капель"): the words before its first number
const parts = typed => {
  const words = typed.trim().split(/\s+/), at = words.findIndex(w => /^\d/.test(w));

  return at < 0 ? [words.join(" "), ""] : [words.slice(0, at).join(" "), words.slice(at).join(" ")];
};

export const nameOf = typed => parts(typed)[0];

export const codeOf = typed => nameOf(typed).slice(0, 2).toUpperCase();

// a code per medicine, its column's name, the key its marks follow through an edit: kept once it
// has one (a rename or a new order keeps it), else free letters of its name (Мастодинон МА,
// Магний МГ), else a number
const withCodes = groups => {
  const taken = new Set(groups.map(g => g.code).filter(Boolean));

  return groups.map(g => {
    if (g.code) return g;
    const n = nameOf(g.name).toUpperCase().replace(/[^\p{L}\p{N}]/gu, "");
    const tries = [...n.slice(1)].map(c => n[0] + c)
      .concat(Array.from({ length: 9 }, (_, i) => n.slice(0, 2) + (i + 2)));
    const code = tries.find(c => !taken.has(c)) ?? n.slice(0, 2);

    taken.add(code);
    return { ...g, code };
  });
};

const medicine = g => {
  const [name, dose] = parts(g.name);

  return {
    name, dose: g.dose?.trim() || dose, times: WHEN[g.times] ?? [],
    meal: MEAL_TEXT[g.meal] ?? "", days: Number(g.days) || 90, code: g.code,
  };
};

// the course as a note: the medicines as data in its properties; the day by its anchors (a time
// of day, a meal: what to take then, the doses) and the notes typed, on cards (the page has the
// dashboard's photo behind it; the legend is the block's own), and a day
// per row up to the longest course (a medicine's cells blank after its own days) inside a
// ```winx meds block, which draws it and ticks it (components/pages/meds)
const course = (v, today) => {
  const groups = withCodes(v.meds), meds = groups.map(medicine), start = v.start?.trim() || today;
  const days = Math.max(...meds.map(m => m.days));
  const columns = meds.flatMap(m => (m.times.length ? m.times : [""]).map(t => ({ m, t })));
  const anchors = Object.keys(WHEN_TEXT).flatMap(t => MEALS.map(meal => {
    const take = columns.filter(c => c.t === t && c.m.meal === meal)
      .map(c => [c.m.name, c.m.dose].filter(Boolean).join(" "));

    const label = [WHEN_TEXT[t], meal].filter(Boolean).join(", ");

    return take.length ? `- ${label}: ${take.join(", ")}` : "";
  })).filter(Boolean);
  const row = cells => `| ${cells.join(" | ")} |`;
  const notes = v.notes?.trim() ? v.notes.trim().split("\n") : [];
  const table = [
    row(["Дата", ...columns.map(c => c.m.code + c.t), "Заметки"]),
    row(["---", ...columns.map(() => ":-:"), "---"]),
    ...Array.from({ length: days }, (_, i) =>
      row([addDays(start, i), ...columns.map(c => i < c.m.days ? "☐" : ""), ""])),
  ];

  return {
    props: {
      type: "meds", start, days, cssclasses: ["dashboard"],   // the card look
      // the medicines as typed, to edit the course later (controllers/meds.js)
      meds: groups.map(g => ({
        name: g.name, code: g.code, dose: g.dose ?? "", times: g.times ?? "any",
        meal: g.meal ?? "any", days: Number(g.days) || 90,
      })),
      ...(v.notes?.trim() ? { notes: v.notes.trim() } : {}),
    },
    file: meds.map(m => m.name).join(", "),
    body: [
      "> [!card] Приём",
      ...anchors.map(a => `> ${a}`),
      "",
      ...(notes.length ? ["> [!card] Заметки", ...notes.map(l => `> ${l}`), ""] : []),
      "```winx", "meds", "card: Курс", ...table, "```",
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
  // a course of medicines, a group per medicine (+ adds one): a day per row to tick (the folder:
  // "meds" in the plugin's data.json)
  meds: {
    id: "new-meds", name: "New medication course", folder: "00 System/Data/Medication",
    setting: "meds",
    form: () => ({
      rows: [
        {
          name: "Medicines", key: "meds", required: ["name"],
          list: [
            { name: "Name", key: "name", text: "Мастодинон" },
            { name: "Dose", key: "dose", text: "30 капель" },
            {
              name: "When", key: "times",
              options: pairs([
                ["утром", "morning"], ["утром и вечером", "both"], ["днём", "day"],
                ["вечером", "evening"], ["неважно", "any"],
              ]),
            },
            {
              name: "Meal", key: "meal",
              options: pairs([
                ["перед едой", "before"], ["после еды", "after"], ["перед сном", "sleep"],
                ["неважно", "any"],
              ]),
            },
            { name: "Days", key: "days", text: "90", number: true },
          ],
        },
        { name: "Start", key: "start", text: "YYYY-MM-DD (empty: today)" },
        {
          name: "Notes", key: "notes", text: "доп. информация: от врача, как принимать…",
          lines: true,
        },
      ],
      values: {}, required: ["meds"],
    }),
    note: course,
  },
  // a free journal (the weight card's journals): a level 0–3 a day and its reasons; lag: the days
  // after a meal its level is looked at on the food page (a rash: the next day)
  journal: {
    id: "new-journal", name: "New journal", folder: "00 System/Data/Journals",
    form: () => ({
      rows: [
        { name: "Title", key: "title", text: "Высыпания" },
        {
          name: "Reasons", key: "reasons",
          list: [{ name: "Reason", key: "reason", text: "🍰 сладкое" }],
        },
        { name: "Days after a meal", key: "lag", text: "0", number: true },
      ],
      values: { lag: 0 }, required: ["title"],
    }),
    note: v => ({
      props: {
        type: "journal", lag: Number(v.lag) || 0,
        reasons: (v.reasons ?? []).map(g => g.reason?.trim()).filter(Boolean),
      },
      body: "%% Строки: - YYYY-MM-DD уровень(0–3) причина, причина. Или на дашборде: Weight → "
        + "пилюля журнала. Причины — свойство reasons выше. %%",
    }),
  },
  // the folder can be set as "workTasks" in the plugin's data.json; the file: the next number in
  // the folder, then the title in lower case with underscores ("39_mail_templates")
  work: {
    id: "new-work-task", name: "New work task", folder: "01 Projects/Work/tasks",
    setting: "workTasks", form: titleOnly,
    file: (v, names) => {
      const last = Math.max(0, ...names.map(n => Number(n.match(/^(\d+)_/)?.[1] || 0)));

      return `${last + 1}_${v.title.trim().toLowerCase().replace(/\s+/g, "_")}`;
    },
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
