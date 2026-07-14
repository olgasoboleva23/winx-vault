const date = dv.current().date?.toFormat("yyyy-MM-dd");
if (!date) return;

const NOTES_FOLDER  = "02 Areas/Personal/Daily Notes";
const TEMPLATE_PATH = "00 System/Templates/Daily Note.md";

const btn = dv.container.createEl("button", { text: "✦ Open" });
btn.className = "winx-open-note-btn";
btn.onclick = async () => {
  const notePath = `${NOTES_FOLDER}/${date}`;
  if (app.metadataCache.getFirstLinkpathDest(notePath, "")) {
    app.workspace.openLinkText(notePath, "", false);
    return;
  }

  // Note doesn't exist yet — create it from the daily template,
  // same engine as the command-palette flow.
  const templater = app.plugins.plugins["templater-obsidian"]?.templater;
  const template  = app.vault.getAbstractFileByPath(TEMPLATE_PATH);
  const folder    = app.vault.getAbstractFileByPath(NOTES_FOLDER);
  if (!templater || !template || !folder) {
    new Notice("✦ Can't create daily note: Templater plugin, template or notes folder missing");
    return;
  }
  await templater.create_new_note_from_template(template, folder, date, true);
};
