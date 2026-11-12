// The one-off move of the medication courses from their notes (type: meds, a ```winx meds table)
// to Medication/courses.json: a record per note, checked cell by cell against the table it came
// from before anything is written; the notes kept as "<name> (old).md", Medication.md made (the
// page), the old Base trashed. parseCourse / courseFromNote / checkCourse / migrateMedsNotes pure
// (tested), migrateMeds() the command. The old table format lives here only.
import { Notice } from "obsidian";
import { app } from "#/helpers/app.js";
import { collection } from "#/helpers/collection.js";
import { todayYmd } from "#/helpers/dates.js";
import { nextId } from "#/helpers/ids.js";
import { COURSES, MEDICATION, MEDICATION_BASE } from "#/helpers/paths.js";
import { TIMES, codeOf, courseData } from "#/models/course.js";

// the old table (a course note's ```winx meds block): its columns (a code and its time of day)
// and a row per day (its marks, its note)
const cells = line => line.split("|").slice(1, -1).map(c => c.trim());

export function parseCourse(text) {
  const lines = text.split("\n").filter(l => l.trim().startsWith("|"));
  const head = lines.length ? cells(lines[0]).slice(1, -1) : [];
  const columns = head.map(h => {
    const time = Object.keys(TIMES).find(t => t && h.endsWith(t)) ?? "";

    return { code: time ? h.slice(0, -time.length) : h, time };
  });
  const rows = lines.map(cells).filter(c => /^\d{4}-\d\d-\d\d$/.test(c[0])).map(c => ({
    date: c[0], marks: c.slice(1, columns.length + 1), note: c[columns.length + 1] ?? "",
  }));

  return { columns, rows };
}

const MEDICATION_TEXT = "---\ncssclasses:\n  - dashboard\n---\n\n```winx\nmeds\n```\n";

// the table's rows by date, each a { key: cell } and its note
const table = text => {
  const { columns, rows } = parseCourse(text);

  return rows.map(r => ({
    date: r.date, note: r.note,
    cells: Object.fromEntries(columns.map((c, i) => [c.code + c.time, r.marks[i] ?? ""])),
  }));
};

export function courseFromNote(text, fm) {
  const marks = {}, dayNotes = {};

  for (const r of table(text)) {
    const day = Object.fromEntries(Object.entries(r.cells)
      .filter(([, m]) => m === "✅" || m === "❌"));

    if (Object.keys(day).length) marks[r.date] = day;
    if (r.note) dayNotes[r.date] = r.note;
  }

  return {
    start: String(fm.start),
    meds: (fm.meds ?? []).map(g => ({ ...g, code: g.code ?? codeOf(g.name) })),
    notes: fm.notes ?? "", marks, dayNotes,
  };
}

// throws at the first row date or cell (by key, the note too) where the record's course isn't
// the old table
export function checkCourse(text, rec, today) {
  if (!rec.meds.length) throw new Error("no medicines");
  if (!/^\d{4}-\d\d-\d\d$/.test(rec.start)) throw new Error(`start ${rec.start} isn't a date`);
  const old = table(text), now = courseData(rec, today);
  const show = v => v || "—";

  for (let i = 0; i < Math.max(old.length, now.rows.length); i++) {
    const o = old[i], n = now.rows[i];

    if (o?.date !== n?.date)
      throw new Error(`${n?.date ?? o.date} date: ${show(o?.date)} ≠ ${show(n?.date)}`);
    const cells = Object.fromEntries(now.columns.map((c, col) => [c.key, n.marks[col]]));

    for (const key of new Set([...Object.keys(o.cells), ...Object.keys(cells)])) {
      if (o.cells[key] !== cells[key])
        throw new Error(`${n.date} ${key}: ${show(o.cells[key])} ≠ ${show(cells[key])}`);
    }

    if (o.note !== n.note) throw new Error(`${n.date} note: ${show(o.note)} ≠ ${show(n.note)}`);
  }
}

const codes = rec => rec.meds.map(m => m.code).join(",");

// the records with the notes' courses added (a course already there, same start and codes in
// order, skipped: its path in `skipped`), each checked first: the first one off throws
export function migrateMedsNotes(notes, existing, today) {
  const records = { ...existing }, added = [], skipped = [], marks = { done: 0, skipped: 0 };
  let dayNotes = 0;

  for (const { path, text, fm } of notes) {
    const rec = courseFromNote(text, fm);

    if (Object.values(records).some(r => r.start === rec.start && codes(r) === codes(rec))) {
      skipped.push(path);
      continue;
    }

    try {
      checkCourse(text, rec, today);
    } catch (e) {
      throw new Error(`${path}: ${e.message}`);
    }

    records[nextId("c", Object.keys(records))] = rec;
    added.push(path);
    for (const m of Object.values(rec.marks).flatMap(Object.values))
      m === "✅" ? marks.done++ : marks.skipped++;
    dayNotes += Object.keys(rec.dayNotes).length;
  }

  return { records, added, skipped, marks, dayNotes };
}

// Explicit command only: every course note (not an "(old)" one) checked inside the one write of
// courses.json, so a note off, a courses.json that isn't JSON or an "(old)" name taken writes
// nothing; then the notes renamed, the page made, the Base trashed. Twice: nothing to migrate.
export async function migrateMeds() {
  const { vault, metadataCache, fileManager } = app;
  const files = vault.getMarkdownFiles().filter(f => !f.basename.endsWith(" (old)")
    && metadataCache.getFileCache(f)?.frontmatter?.type === "meds");

  if (!files.length) return void new Notice("✦ no medication course to migrate");
  const name = path => path.split("/").pop();
  const oldPath = f => f.path.replace(/\.md$/, " (old).md");

  try {
    const taken = files.map(oldPath).find(p => vault.getAbstractFileByPath(p));

    if (taken) throw new Error(`${name(taken)} already exists`);
    const notes = await Promise.all(files.map(async f => ({
      path: f.path, text: await vault.read(f), fm: metadataCache.getFileCache(f).frontmatter,
    })));
    let result;

    await collection(COURSES)
      .edit(all => (result = migrateMedsNotes(notes, all, todayYmd())).records);
    for (const f of files) await fileManager.renameFile(f, oldPath(f));

    if (!vault.getFileByPath(MEDICATION)) await vault.create(MEDICATION, MEDICATION_TEXT);
    const base = vault.getFileByPath(MEDICATION_BASE);

    if (base) await fileManager.trashFile(base);
    const { added, skipped, marks, dayNotes } = result;
    const already = skipped.length
      ? `; skipped, already in courses.json: ${skipped.map(name).join(", ")}` : "";

    new Notice(`✦ ${added.length} course(s) migrated: ${marks.done} ✅, ${marks.skipped} ❌, `
      + `${dayNotes} day notes; old notes: ${files.map(f => name(oldPath(f))).join(", ")}`
      + already);
  } catch (e) {
    new Notice(`✦ migration stopped: ${e.message}`);
  }
}
