// The notes Winx makes (a command each, "Winx: New …"): the window's rows and the note's data.
//   form() → { rows, values, required } for Form.ask; note(values, today) → { props, body?,
//   sections } for Note (a note's name is its file's: no title property, no # heading)

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
