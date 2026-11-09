// The free journals (a note each in JOURNALS: "- YYYY-MM-DD level reason, reason" lines; its name
// the file's, its `reasons` and `lag` properties): read for the weight card and the food page;
// made, deleted and today's level and reasons written from the weight card.
import { app } from "#/helpers/app.js";
import { BodyLog } from "#/models/bodyLog.js";
import { KINDS } from "#/models/kinds.js";
import { createNote } from "#/controllers/notes.js";
import { Form } from "#/components/uikit/Form/index.ts";
import { edit } from "#/helpers/files.js";
import { todayYmd } from "#/helpers/dates.js";
import { JOURNALS } from "#/helpers/paths.js";

// [{ path, name, reasons, lag, entries: Map date → { date, level, reasons } }], by name
export async function readJournals() {
  const notes = (app.vault.getFolderByPath(JOURNALS)?.children ?? [])
    .filter(f => f.extension === "md").sort((a, b) => a.basename.localeCompare(b.basename));

  return Promise.all(notes.map(async f => {
    const props = app.metadataCache.getCache(f.path)?.frontmatter ?? {};
    const file = app.vault.getFileByPath(f.path);
    const text = file ? await app.vault.cachedRead(file) : "";

    return {
      path: f.path, name: String(props.name ?? f.basename),
      reasons: (props.reasons ?? []).map(String),
      lag: Number(props.lag) || 0,   // the days after a meal its level is looked at (the food page)
      entries: new Map(new BodyLog(text).entries.map(e => [e.date, e])),
    };
  }));
}

// ＋ a new free journal in its window (Winx: New journal's); its path, null when closed
export async function addJournal() {
  const { rows, values, required } = KINDS.journal.form();
  const v = await Form.ask(app, "✦ New journal", rows, { values, required, submit: "Create" });

  return v ? (await createNote(KINDS.journal, v, KINDS.journal.folder)).path : null;
}

// 🗑 a journal: asked first, then into the trash (Obsidian's, as set: recoverable)
export async function deleteJournal(path, name) {
  const yes = await Form.ask(app, `✦ Delete the journal «${name}»?`, [], { submit: "Delete" });
  const file = yes && app.vault.getFileByPath(path);

  if (file) await app.fileManager.trashFile(file);
}

export const logBody = (path, level, reasons) =>
  edit(path, c => new BodyLog(c).set(todayYmd(), level, reasons));
