// The one-off move from the old emoji notes to the id format: Master.md's lines become
// `- [s] tN [field:: …]`, Winx's part of each task (tags, sticker, name) a record of tasks.json,
// Pool.md's lines records with pool: true: migrate() pure (tested), migrateTasks() the command.
// The old emoji parsing lives here only.
import { Notice } from "obsidian";
import { app } from "#/helpers/app.js";
import { GOALS, MASTER, MASTER_OLD, POOL, POOL_OLD, TASK_RECORDS } from "#/helpers/paths.js";

const DATE = "\\d{4}-\\d{2}-\\d{2}";
// the old date emojis and their Dataview fields, in the order the new line writes them
const DATES = { "🛫": "start", "⏳": "scheduled", "📅": "due", "➕": "created", "✅": "completion",
  "❌": "cancelled" };
// every emoji that starts a field: a 🔁 rule runs up to the next one
const STOPS = "📅⏳✅❌🛫➕⏫🔼🔽🔺⏬🆔⛔🏁";
const RULE = new RegExp(`🔁\\s*([^${STOPS}]*)`, "u");
const TASK = /^(\s*)- \[(.)\]\s*(.*)$/, POOL_LINE = /^\s*- (?!\[.\])(.*)$/;

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

  return {
    name: words, difficulty: tag("#⭐")?.replace(/^#⭐+/u, "") ?? null,
    area: tag("#area/")?.slice(6) ?? null, daytime: tag("#time/")?.slice(6) ?? null,
    goal: tag("#goal/")?.slice(6) ?? null,
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
    const m = line.match(POOL_LINE);

    if (m) see(parse(m[1]), true);
  }

  const records = {};

  for (const t of tasks.values()) {
    const r = recordOf(t.parts);

    records[t.id] = { ...r, after: owner[r.after] ?? null, ...t.pool ? { pool: true } : {} };
  }

  return { master, records };
}

// Goals.md: a goal's old "tag:: #goal/x" line becomes "key:: x" (a task's record names it so)
export const migrateGoals = text => text.replace(/^(\s*)tag::[ \t]*#goal\/(\S+)/gm, "$1key:: $2");

// The one-off move to the id format (the Migrate tasks command): not when tasks.json or an old
// copy is there, or Master.md is missing. The old notes kept as copies (Master.md is not renamed:
// a rename would rewrite links to it), then tasks.json, then Master.md rewritten last (a failed
// write before it leaves the old Master.md as it was), Goals.md's tags made keys, then Pool.md
// to the trash. Master.md or Pool.md changed meanwhile: it stops before the first write, or
// before the rewrite.
export async function migrateTasks() {
  const { vault, fileManager } = app;
  const master = vault.getFileByPath(MASTER), pool = vault.getFileByPath(POOL);
  const there = [TASK_RECORDS, MASTER_OLD, POOL_OLD].find(p => vault.getFileByPath(p));

  if (there) return void new Notice(`✦ ${there} exists`);
  if (!master) return void new Notice(`✦ ${MASTER} not found`);
  try {
    const masterText = await vault.read(master), poolText = pool ? await vault.read(pool) : "";
    const { master: next, records } = migrate(masterText, poolText);
    // Master.md or Pool.md changed since they were read (a sync, Tasks): migrating would lose it
    const changed = async () => await vault.read(master) !== masterText ? "Master.md"
      : (pool ? await vault.read(pool) : "") !== poolText ? "Pool.md" : "";
    let was = await changed();
    const stopped = () => `✦ migration stopped: ${was} changed while migrating`;

    if (was) return void new Notice(`${stopped()} — run it again`);
    await vault.create(MASTER_OLD, masterText);
    if (pool) await vault.create(POOL_OLD, poolText);
    await vault.create(TASK_RECORDS, JSON.stringify(records, null, 2));
    was = await changed();
    if (was)
      return void new Notice(`${stopped()} — delete tasks.json and the (old) copies, run it again`);

    await vault.modify(master, next);
    const goals = vault.getFileByPath(`${GOALS}.md`);

    if (goals) await vault.process(goals, migrateGoals);
    if (pool) await fileManager.trashFile(pool);
    const n = Object.keys(records).length;

    new Notice(`✦ ${n} tasks migrated: switch Tasks → Task format → Dataview`);
  } catch (e) {
    new Notice(`✦ migration stopped: ${e.message} — your old notes are in Master (old).md`);
  }
}
