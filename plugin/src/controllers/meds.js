// A medication course's block (components/pages/meds, a note made by "Winx: New
// medication course"): the course from the block's own lines (its table), the medicines' names
// from the note's legend (a two-cell row: | КОД | name |, on a card or not), today's doses; a mark
// or a note's text written into the note's table; the course edited (the ✎ by the card's title,
// the command): the window again with the course's values, the note rebuilt with its marks kept.
import { Notice } from "obsidian";
import { app } from "#/helpers/app.js";
import { edit } from "#/helpers/files.js";
import { todayYmd } from "#/helpers/dates.js";
import { carry, courseData, rebuild, tick } from "#/models/course.js";
import { KINDS, codeOf, nameOf } from "#/models/kinds.js";
import { Note } from "#/models/note.js";
import { Form } from "#/components/uikit/Form/index.ts";

const props = path => {
  const file = app.vault.getFileByPath(path);

  return file && app.metadataCache.getFileCache(file)?.frontmatter;
};

// the medicines' names by code, from the note's `meds` property
const names = fm => Object.fromEntries((fm?.meds ?? []).map(g => [codeOf(g.name), nameOf(g.name)]));

export async function loadMeds({ source, sourcePath }) {
  return courseData(source, names(props(sourcePath)), todayYmd());
}

export const tickMeds = (path, date, col, mark) => edit(path, t => tick(t, date, col, mark));

export async function editCourse(path, ask = (...a) => Form.ask(app, ...a)) {
  const file = app.vault.getFileByPath(path), fm = props(path);

  if (fm?.type !== "meds" || !Array.isArray(fm.meds)) {
    return void new Notice("✦ Not a medication course (no medicines in its properties)");
  }

  const old = await app.vault.read(file);
  const { rows, required } = KINDS.meds.form();
  const values = { meds: fm.meds.map(g => ({ ...g })), start: fm.start, notes: fm.notes ?? "" };
  const v = await ask("✦ Edit medication course", rows, { values, required, submit: "Save" });

  if (!v) return;
  const fresh = new Note(KINDS.meds.note(v, todayYmd())).text;

  await app.vault.modify(file, rebuild(old, carry(old, fresh)));
}
