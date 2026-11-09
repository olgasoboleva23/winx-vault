// The one-off move from the old emoji notes to the id format: Master.md's lines become
// `- [s] tN [field:: …]`, Winx's part of each task (tags, sticker, name) a record of tasks.json,
// Pool.md's lines records with pool: true. Pure (the Migrate tasks command writes the result).
// The old emoji parsing lives here only.
const DATE = "\\d{4}-\\d{2}-\\d{2}";
// the old date emojis and their Dataview fields, in the order the new line writes them
const DATES = { "🛫": "start", "⏳": "scheduled", "📅": "due", "➕": "created", "✅": "completion",
  "❌": "cancelled" };
// every emoji that starts a field: a 🔁 rule runs up to the next one
const STOPS = "📅⏳✅❌🛫➕⏫🔼🔽🔺⏬🆔⛔🏁";
const RULE = new RegExp(`🔁\\s*([^${STOPS}]*)`, "u");
const TASK = /^(\s*)- \[(.)\]\s*(.*)$/, POOL = /^\s*- (?!\[.\])(.*)$/;

// an old line's parts: its fields (repeat, dates), tags, first sticker and words
function parse(rest) {
  const text = rest.replace(/\uFE0F/g, "");
  const fields = { repeat: text.match(RULE)?.[1].trim() || null };

  for (const [emoji, key] of Object.entries(DATES))
    fields[key] = text.match(new RegExp(`${emoji}\\s*(${DATE})`, "u"))?.[1] ?? null;

  const words = text.replace(RULE, "")
    .replace(new RegExp(`[${Object.keys(DATES).join("")}]\\s*(${DATE})?`, "gu"), "")
    .replace(/[🆔⛔]\s*\S+/gu, "").replace(/[⏫🔼🔽🔺⏬🏁]/gu, "")
    .replace(/!\[\[[^\]]*\]\]/g, "").replace(/#\S+/g, "").replace(/\s+/g, " ").trim();

  return {
    fields, words, tags: text.match(/#\S+/g) ?? [],
    sticker: text.match(/!\[\[([^\]|]+)/)?.[1] ?? null,
    date: [fields.completion, fields.due, fields.created].filter(Boolean).sort().pop() ?? "",
  };
}

// a record from a copy's parts (after: the #after/id/x tag, resolved once every task is known)
function recordOf({ words, tags, sticker }) {
  const tag = prefix => tags.find(t => t.startsWith(prefix)) ?? null;
  const goal = tag("#goal/");

  return {
    name: words, difficulty: tag("#⭐"), area: tag("#area/"), time: tag("#time/")?.slice(6) ?? null,
    goal, tags: [...new Set(tags.filter(t => t !== goal && !/^#(⭐|area\/|time\/|id\/|after\/)/u
      .test(t)))],
    sticker, after: tag("#after/id/")?.slice(10) ?? null,
  };
}

// Master.md's and Pool.md's old text → { master: the new Master.md, records: tasks.json's object }.
// Ids t1, t2… in first-seen order (Master.md from the top, then Pool.md); copies with the same
// words (case and spaces aside) share one; the record comes from the latest copy (by done / due /
// created; a tie keeps the first).
export function migrate(masterText, poolText) {
  const tasks = new Map(), owner = {};
  const see = (parts, pool) => {
    if (!parts.words) return null;
    const key = parts.words.toLowerCase();
    let t = tasks.get(key);

    if (!t) tasks.set(key, t = { id: `t${tasks.size + 1}`, parts, pool: false });
    else if (parts.date > t.parts.date) t.parts = parts;
    t.pool ||= pool;
    for (const tag of parts.tags) if (tag.startsWith("#id/")) owner[tag.slice(4)] ??= t.id;
    return t.id;
  };

  const master = masterText.split("\n").map(line => {
    const m = line.match(TASK);
    const parts = m && parse(m[3]), id = parts && see(parts, false);

    if (!id) return line;
    const fields = Object.entries(parts.fields).filter(([, v]) => v)
      .map(([k, v]) => ` [${k}:: ${v}]`).join("");

    return `${m[1]}- [${m[2]}] ${id}${fields}`;
  }).join("\n");

  for (const line of poolText.split("\n")) {
    const m = line.match(POOL);

    if (m) see(parse(m[1]), true);
  }

  const records = {};

  for (const t of tasks.values()) {
    const r = recordOf(t.parts);

    records[t.id] = { ...r, after: owner[r.after] ?? null, ...t.pool ? { pool: true } : {} };
  }

  return { master, records };
}
