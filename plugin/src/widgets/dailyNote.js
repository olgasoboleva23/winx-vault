// "✦ Open": the daily note of the page's date; made if it's missing (notes/kinds.js daily). The
// markup: DailyNoteOpen.vue.
import { Platform } from "obsidian";
import { ymd } from "../core/dates.js";
import { dailyFolder } from "../core/paths.js";
import { Note } from "../notes/note.js";
import { daily } from "../notes/kinds.js";

// the page's date (none: nothing shown) and the button's text: on the phone only the ✦ (the word
// didn't fit next to the date row)
export const loadDailyNote = async ({ dv }) =>
  ({ date: ymd(dv.current()?.date), text: Platform.isMobile ? "✦" : "✦ Open" });

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
