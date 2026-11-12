// A JSON file of records by id ({ id: record }): `records` is the loaded copy (file order), the
// writes go through editJson, so nothing is lost between read and write.
// edit: the whole object through fn (null: nothing written); true when it was written.
// update: one record through fn (null: nothing written); false when the id isn't there.
// add: a record under a new id made inside the write from the file's keys.
import { editJson } from "./files.js";
import { nextId } from "./ids.js";

export function collection(path) {
  const edit = async fn => {
    let written = false;

    await editJson(path, all => {
      const next = fn(all);

      written = next !== null;
      return next;
    });
    return written;
  };

  return {
    path,
    records: new Map(),
    load(json) { this.records = new Map(Object.entries(json)); },
    edit,
    update: (id, fn) => edit(all => {
      if (!all[id]) return null;
      const rec = fn(all[id]);

      return rec === null ? null : { ...all, [id]: rec };
    }),
    async add(rec, prefix) {
      let id = "";

      await edit(all => {
        id = nextId(prefix, Object.keys(all));
        return { ...all, [id]: rec };
      });
      return id;
    },
  };
}
