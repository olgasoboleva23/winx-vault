const date = dv.current().date?.toFormat("yyyy-MM-dd");
if (!date) return;

const btn = dv.container.createEl("button", { text: "✦ Open" });
btn.className = "winx-open-note-btn";
btn.onclick = () => app.workspace.openLinkText(`02 Areas/Personal/Daily Notes/${date}`, "", false);
