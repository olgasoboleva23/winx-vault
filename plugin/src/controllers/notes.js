// The writes of new notes: a watch / read / game / recipe / work task note (models/kinds.js) from
// its window's values, in its folder (made when missing).
import { todayYmd } from "#/helpers/dates.js";
import { Note, notePath } from "#/models/note.js";
import { app } from "#/helpers/app.js";

// the note's file, named by the title typed (else by the note's `file`: a course's medicines);
// " 1", " 2"… when taken
export async function createNote(kind, values, dir) {
  const data = kind.note(values, todayYmd()), note = new Note(data);
  const path = notePath(dir, values.title || data.file, p => !!app.vault.getAbstractFileByPath(p));

  if (!app.vault.getFolderByPath(dir)) await app.vault.createFolder(dir);
  return app.vault.create(path, note.text);
}
