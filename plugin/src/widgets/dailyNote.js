// "✦ Open": the daily note of the page's date; made from the daily template if it's missing (the same template
// Obsidian's Daily notes uses: {{date:FORMAT}}).
import { Notice, Platform } from "obsidian";
import { Button } from "../uikit/button.js";
import { Widget } from "./widget.js";
import { ymd } from "../core/dates.js";
import { fillDaily } from "../notes/note.js";

const NOTES_FOLDER  = "02 Areas/Personal/Daily Notes";
const TEMPLATE_PATH = "00 System/Templates/Daily Note.md";

export class DailyNote extends Widget {
  on = {
    open: async () => {
      const date = ymd(this.dv.current()?.date), path = `${NOTES_FOLDER}/${date}`;
      if (this.app.metadataCache.getFirstLinkpathDest(path, "")) return this.app.workspace.openLinkText(path, "", false);
      // not there yet: from the daily template
      const template = this.app.vault.getFileByPath(TEMPLATE_PATH);
      if (!template) return void new Notice(`✦ Can't create the daily note: ${TEMPLATE_PATH} not found`);
      if (!this.app.vault.getFolderByPath(NOTES_FOLDER)) await this.app.vault.createFolder(NOTES_FOLDER);
      const text = fillDaily(await this.app.vault.read(template), f => window.moment(date).format(f ?? "YYYY-MM-DD"), date);
      await this.app.workspace.getLeaf(false).openFile(await this.app.vault.create(`${path}.md`, text));
    },
  };
  async data() { return { date: ymd(this.dv.current()?.date) }; }
  // on the phone only the ✦ (the word didn't fit next to the date row)
  view({ date }) { return date ? new Button({ text: Platform.isMobile ? "✦" : "✦ Open", title: "open the day's note", action: "open", kind: "pill" }) : { html: "" }; }
}
