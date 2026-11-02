// The notes Winx makes (a command each, "Winx: New …"): the window's rows and the note's data.
//   form() → { rows, values, required } for Form.ask; note(values, today) → { props, title, sections } for Note
const pairs = list => list.map(([label, value]) => ({ label, value }));
const titleOnly = () => ({ rows: [{ name: "Title", key: "title", text: "title" }], values: {}, required: ["title"] });

// watch / read / game: a Collections note, its type or genre, status and rating 1–10 (the _index.base shows stars)
const item = ({ type, icon, steps, types, statuses, ...rest }) => ({
  ...rest,
  form: () => ({
    rows: [
      { name: "Title", key: "title", text: "title" },
      types ? { name: "Type", key: "media_type", options: types } : { name: "Genre", key: "genre", text: "optional" },
      { name: "Status", key: "status", options: statuses },
      { name: "Rating", key: "rating", options: Array.from({ length: 10 }, (_, i) => ({ label: String(i + 1), value: i + 1 })) },
    ],
    values: { status: statuses[0].value },
    required: ["title", "status", ...(types ? ["media_type"] : [])],
  }),
  note: (v, today) => ({
    props: {
      type, title: v.title,
      ...(types ? { media_type: v.media_type, status: v.status } : { status: v.status, genre: v.genre }),
      rating: v.rating, ...(type === "game" ? { hours: null } : {}), created: today, tags: null,
    },
    title: `${icon} ${v.title}`,
    sections: { Notes: "", Progress: steps.map(s => `- [ ] ${s}`).join("\n") },
  }),
});

export const KINDS = {
  watch: item({
    type: "watch", id: "new-watch-item", name: "New watch item", folder: "03 Resources/Collections/Watchlist", icon: "🎬", steps: ["Start", "Watch", "Finish"],
    types: pairs([["Movie", "movie"], ["Cartoon", "cartoon"], ["Animated series", "animated_series"], ["TV Show", "tv"], ["Anime", "anime"], ["Documentary", "doc"], ["Other", "other"]]),
    statuses: pairs([["to watch", "to_watch"], ["watching", "watching"], ["completed", "completed"], ["dropped", "dropped"]]),
  }),
  read: item({
    type: "read", id: "new-read-item", name: "New read item", folder: "03 Resources/Collections/Readlist", icon: "📖", steps: ["Start", "Read", "Finish"],
    types: pairs([["Fanfiction", "fanfiction"], ["Fiction", "fiction"], ["Manga", "manga"], ["Scientific pop", "scientific_pop"], ["IT", "it"]]),
    statuses: pairs([["to read", "to_read"], ["reading", "reading"], ["completed", "completed"], ["dropped", "dropped"]]),
  }),
  game: item({
    type: "game", id: "new-game-item", name: "New game", folder: "03 Resources/Collections/Gamelist", icon: "🎮", steps: ["Start", "Play", "Complete"],
    statuses: pairs([["to play", "to_play"], ["playing", "playing"], ["completed", "completed"], ["paused", "paused"], ["dropped", "dropped"]]),
  }),
  recipe: {
    id: "new-recipe", name: "New recipe", folder: "03 Resources/Collections/Recipes", form: titleOnly,
    note: v => ({
      props: { type: "recipe", name: v.title, tags: [], source: null, time: null, difficulty: null, rating: null },
      title: v.title,
      sections: { Ingredients: "", Steps: "", Notes: "", Variations: "" },
    }),
  },
  // the folder can be set as "workTasks" in the plugin's data.json
  work: {
    id: "new-work-task", name: "New work task", folder: "01 Projects/Work/tasks", setting: "workTasks", form: titleOnly,
    note: (v, today) => ({
      props: { status: "active", created: today, asana: null },
      title: v.title,
      sections: {
        "Зачем": "<!-- 1–3 строки: ссылка на Asana, что нужно или что сломано -->",
        "Сделать": "- [ ] ",
        "Лог": "<!-- всё свободное: созвоны, находки, решения, команды. Новое сверху, с датой. Код — в блоках ``` -->",
        "Проверка": "<!-- как убедиться, что работает: шаги, ссылки, тест-чек-лист -->",
      },
    }),
  },
};

// a daily note (the dashboard's ✦ Open makes it): the day's date, "Monday, November 2" as the title
export const daily = (date, title) => ({ props: { date }, title, sections: { "📝 Notes": "", "🎯 XP Log": "-" } });
