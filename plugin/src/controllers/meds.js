// The medication courses (courses.json, a record by id: models/course.js) and their page
// (components/pages/meds): the courses for the tabs and each one's table, notes and doses; a mark
// or a day's note written; a course made or edited in its window ("Winx: New / Edit medication
// course", the ✎ on its card); which course, when several (a picker).
import { Notice } from "obsidian";
import { app } from "#/helpers/app.js";
import { readJson } from "#/helpers/files.js";
import { collection } from "#/helpers/collection.js";
import { todayYmd } from "#/helpers/dates.js";
import { COURSES, MEDICATION } from "#/helpers/paths.js";
import {
  courseData, courseForm, courseList, courseOf, edited, formValues, intake, withDayNote, withMark,
} from "#/models/course.js";
import { Form } from "#/components/uikit/Form/index.ts";
import { Search } from "#/components/uikit/Search/index.ts";

export const courses = collection(COURSES);

const by = (json, fn) => Object.fromEntries(Object.entries(json).map(([id, r]) => [id, fn(r)]));

export async function loadMeds() {
  const json = await readJson(COURSES, {}), today = todayYmd();

  return {
    list: courseList(json, today), data: by(json, r => courseData(r, today)),
    notes: by(json, r => r.notes), intake: by(json, r => intake(r.meds)),
  };
}

export const tickMeds = (id, date, key, mark) =>
  courses.update(id, r => withMark(r, date, key, mark));

export const setDayNote = (id, date, text) => courses.update(id, r => withDayNote(r, date, text));

const formAsk = (...a) => Form.ask(app, ...a);

// the window, then the course saved; the Medication page opened in a new tab. The new id, null
// when closed.
export async function newCourse(ask = formAsk) {
  const { rows, values, required } = courseForm();
  const v = await ask("✦ New medication course", rows, { values, required, submit: "Create" });

  if (!v) return null;
  const id = await courses.add(courseOf(v, todayYmd()), "c");
  const page = app.vault.getFileByPath(MEDICATION);

  if (page) await app.workspace.getLeaf("tab").openFile(page);
  return id;
}

// the window with the course's values; a mark written meanwhile stays, newer course properties
// aren't overwritten by this window's old values
export async function editCourse(id, ask = formAsk) {
  const rec = (await readJson(COURSES, {}))[id];
  const gone = () => void new Notice("✦ that course is gone");

  if (!rec) return gone();
  const { rows, required } = courseForm();
  const values = formValues(rec), before = JSON.stringify(values);
  const v = await ask("✦ Edit medication course", rows,
    { values, required, submit: "Save" });

  if (!v) return;
  let changed = false;
  const saved = await courses.update(id, r => {
    changed = JSON.stringify(formValues(r)) !== before;
    return changed ? null : edited(r, v);
  });

  if (changed) new Notice("✦ the course changed meanwhile: open its window again");
  else if (!saved) gone();
}

const searchPick = list => Search.pick(
  app, "Which course…",
  q => list.filter(c => c.label.toLowerCase().includes(q.trim().toLowerCase())),
  (c, el) => void el.createDiv({ text: c.label }),
).then(c => c?.id ?? null);

// the course to edit from Cmd+P: the only one, or one picked (running first)
export async function pickCourse(pick = searchPick) {
  const list = courseList(await readJson(COURSES, {}), todayYmd());

  if (!list.length) {
    new Notice("✦ no medication course yet");
    return null;
  }

  return list.length === 1 ? list[0].id : pick(list);
}
