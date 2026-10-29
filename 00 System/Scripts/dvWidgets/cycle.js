const L = (app.__winxGoalsLib ??= eval(await app.vault.adapter.read("00 System/Scripts/dvWidgets/goalsLib.js")));
const H = (app.__winxHelpers ??= eval(await app.vault.adapter.read("00 System/Scripts/dvWidgets/helpers.js")));

const CYCLE_PATH = "02 Areas/Health & Body/Cycle.md";
const selected   = H.ymd(H.pageDay(dv));
const page       = dv.page(CYCLE_PATH);
const root       = dv.container.createEl("div", { cls: "winx-cycle" });
let info         = null;

if (!page) {
  root.createEl("div", { text: `Create ${CYCLE_PATH}` });
} else {
  const pick   = key => page.file.lists.map(i => i.text.match(new RegExp(`${key}::\\s*(\\d{4}-\\d{2}-\\d{2})`))?.[1]).where(Boolean).array();
  info = L.cycleInfo(pick("start"), selected, page.period ?? 8, pick("end"));
  if (!info) {
    root.createEl("div", { text: "no data yet" });
  } else {
    root.createEl("div", { text: `day ${info.day}`, cls: `winx-cycle-day${info.isPeriod ? " period" : ""}` });
    const [, mm, dd] = info.nextStart.split("-");
    const when = info.daysUntil >= 0 ? `in ${info.daysUntil} d` : `${-info.daysUntil} d late`;
    root.createEl("div", { text: `next ~${dd}.${mm}, ${when}`, cls: "winx-cycle-next" });
  }
}

const btns    = root.createEl("div", { cls: "winx-cycle-btns" });
const ending  = info?.isPeriod && !info.ended;
const btn     = btns.createEl("button", { text: ending ? "ended today" : "started today", cls: "winx-open-note-btn" });
const edit    = btns.createEl("button", { text: "dates", cls: "winx-open-note-btn" });
edit.onclick  = () => app.workspace.openLinkText(CYCLE_PATH, "", false);
btn.onclick   = async () => {
  const line = `- ${ending ? "end" : "start"}:: ${selected}`;
  const file = app.vault.getAbstractFileByPath(CYCLE_PATH);
  if (!file) {
    await app.vault.createFolder(CYCLE_PATH.split("/").slice(0, -1).join("/")).catch(() => {});
    await app.vault.create(CYCLE_PATH, `period:: 8\n\n${line}\n`);
  } else {
    await app.vault.process(file, c => c.split("\n").includes(line) ? c : `${c.replace(/\s+$/, "")}\n${line}\n`);
  }
};
