// "✦ Open": the daily note of the page's date; made if it's missing (notes/kinds.js daily).
import { Platform } from "obsidian";
import { Button } from "../uikit/button.js";
import { Widget } from "./widget.js";
import { ymd } from "../core/dates.js";
import { Note } from "../notes/note.js";
import { daily } from "../notes/kinds.js";

const NOTES_FOLDER  = "02 Areas/Personal/Daily Notes";

export class DailyNote extends Widget {
  on = {
    open: async () => {
      const date = ymd(this.dv.current()?.date), path = `${NOTES_FOLDER}/${date}`;
      if (this.app.metadataCache.getFirstLinkpathDest(path, "")) return this.app.workspace.openLinkText(path, "", false);
      if (!this.app.vault.getFolderByPath(NOTES_FOLDER)) await this.app.vault.createFolder(NOTES_FOLDER);
      const text = new Note(daily(date, window.moment(date).format("dddd, MMMM D"))).text;
      await this.app.workspace.getLeaf(false).openFile(await this.app.vault.create(`${path}.md`, text));
    },
  };
  async data() { return { date: ymd(this.dv.current()?.date) }; }
  // on the phone only the ✦ (the word didn't fit next to the date row)
  view({ date }) { return date ? new Button({ text: Platform.isMobile ? "✦" : "✦ Open", title: "open the day's note", action: "open", kind: "pill" }) : { html: "" }; }
}
