// The writes of the daily note button: the page's date's daily note opened, made first when it's
// missing (notes/kinds.js daily).
import { ymd } from "../core/dates.js";
import { dailyFolder } from "../core/paths.js";
import { Note } from "../models/note.js";
import { daily } from "../notes/kinds.js";

export const dailyNoteActions = ({ dv, app }) => ({
  open: async () => {
    const date = ymd(dv.current()?.date), folder = dailyFolder(app);
    const path = folder ? `${folder}/${date}` : date;

    if (app.metadataCache.getFirstLinkpathDest(path, "")) {
      return app.workspace.openLinkText(path, "", false);
    }

    if (folder && !app.vault.getFolderByPath(folder)) await app.vault.createFolder(folder);
    const text = new Note(daily(date, window.moment(date).format("dddd, MMMM D"))).text;
    await app.workspace.getLeaf(false).openFile(await app.vault.create(`${path}.md`, text));
  },
});
