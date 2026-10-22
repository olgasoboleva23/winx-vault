const L = (app.__winxGoalsLib ??= eval(await app.vault.adapter.read("00 System/Scripts/dvWidgets/goalsLib.js")));

const CYCLE_PATH = "02 Areas/Health & Body/Cycle.md";
const selected   = (dv.current().date ?? dv.date("today")).toFormat("yyyy-MM-dd");
const page       = dv.page(CYCLE_PATH);
const root       = dv.container.createEl("div", { cls: "winx-cycle" });

if (!page) {
  root.createEl("div", { text: `Создай ${CYCLE_PATH}` });
} else {
  const starts = page.file.lists.map(i => i.text.match(/start::\s*(\d{4}-\d{2}-\d{2})/)?.[1]).where(Boolean).array();
  const info   = L.cycleInfo(starts, selected, page.period ?? 8);
  if (!info) {
    root.createEl("div", { text: "нет данных" });
  } else {
    root.createEl("div", { text: `день ${info.day}`, cls: `winx-cycle-day${info.isPeriod ? " period" : ""}` });
    const [, mm, dd] = info.nextStart.split("-");
    const when = info.daysUntil >= 0 ? `через ${info.daysUntil} дн.` : `задержка ${-info.daysUntil} дн.`;
    root.createEl("div", { text: `следующие ~${dd}.${mm}, ${when}`, cls: "winx-cycle-next" });
  }
}

const btn = root.createEl("button", { text: "началось сегодня", cls: "winx-open-note-btn" });
btn.onclick = async () => {
  const line = `- start:: ${selected}`;
  const file = app.vault.getAbstractFileByPath(CYCLE_PATH);
  if (!file) {
    await app.vault.createFolder(CYCLE_PATH.split("/").slice(0, -1).join("/")).catch(() => {});
    await app.vault.create(CYCLE_PATH, `period:: 8\n\n${line}\n`);
  } else {
    await app.vault.process(file, c => c.split("\n").includes(line) ? c : `${c.replace(/\s+$/, "")}\n${line}\n`);
  }
};
