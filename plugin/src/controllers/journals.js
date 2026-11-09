// The free journals (a note each in JOURNALS: "- YYYY-MM-DD level reason, reason" lines; its name
// the file's, its `reasons` and `lag` properties): read for the weight card and the food page.
import { app } from "#/helpers/app.js";
import { BodyLog } from "#/models/bodyLog.js";
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
