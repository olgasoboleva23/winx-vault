// "✦ Open": the daily note of the page's date; made from the daily template (through Templater) if it's missing.
import { Notice } from "obsidian";
import { H } from "../lib/helpers.js";
import { Button } from "../ui/component.js";
import { Widget } from "./widget.js";

const NOTES_FOLDER  = "02 Areas/Personal/Daily Notes";
const TEMPLATE_PATH = "00 System/Templates/Daily Note.md";

export class DailyNote extends Widget {
  on = {
    open: async () => {
      const date = H.ymd(this.dv.current()?.date), path = `${NOTES_FOLDER}/${date}`;
      if (this.app.metadataCache.getFirstLinkpathDest(path, "")) return this.app.workspace.openLinkText(path, "", false);
      // not there yet: from the daily template, the same way as the command palette does
      const templater = this.app.plugins.plugins["templater-obsidian"]?.templater;
      const template  = this.app.vault.getAbstractFileByPath(TEMPLATE_PATH);
      const folder    = this.app.vault.getAbstractFileByPath(NOTES_FOLDER);
      if (!templater || !template || !folder) return void new Notice("✦ Can't create daily note: Templater plugin, template or notes folder missing");
      await templater.create_new_note_from_template(template, folder, date, true);
    },
  };
  async data() { return { date: H.ymd(this.dv.current()?.date) }; }
  view({ date }) { return date ? new Button({ text: "✦ Open", action: "open", kind: "pill", cls: "winx-open-note-btn" }) : { html: "" }; }
}
