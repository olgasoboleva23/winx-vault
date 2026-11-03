// "✦ Open": the daily note of the page's date; made if it's missing (notes/kinds.js daily).
import { Platform } from "obsidian";
import { Button } from "../uikit/button.js";
import { Widget } from "./widget.js";
import { ymd } from "../core/dates.js";
import { dailyFolder } from "../core/paths.js";
import { Note } from "../notes/note.js";
import { daily } from "../notes/kinds.js";


export class DailyNote extends Widget {
  on = {
    open: async () => {
      const date = ymd(this.dv.current()?.date), folder = dailyFolder(this.app);
      const path = folder ? `${folder}/${date}` : date;
      if (this.app.metadataCache.getFirstLinkpathDest(path, "")) {
        return this.app.workspace.openLinkText(path, "", false);
      }
      if (folder && !this.app.vault.getFolderByPath(folder)) await this.app.vault.createFolder(folder);
      const text = new Note(daily(date, window.moment(date).format("dddd, MMMM D"))).text;
      await this.app.workspace.getLeaf(false).openFile(await this.app.vault.create(`${path}.md`, text));
    },
  };
  async data() { return { date: ymd(this.dv.current()?.date) }; }
  // on the phone only the ✦ (the word didn't fit next to the date row)
  view({ date }) {
    if (!date) return { html: "" };
    const text = Platform.isMobile ? "✦" : "✦ Open";
    return new Button({ text, title: "open the day's note", action: "open", kind: "pill" });
  }
}
