// Planning board. Top: "Goals", the recurring goal tasks (not draggable).
// Below: one-off tasks in date columns, then the "No date" backlog as a compact
// grid (first 8, "show all" opens the rest). Drag a card to a column or use its
// buttons (on hover; always shown on the phone) and its ⏳ plan date is rewritten.
// Deadlines (📅) are not touched; recurring tasks are not shown.
// The backlog lists the longest-waiting first (by ➕ created date).
const L = (app.__winxGoalsLib ??= eval(await app.vault.adapter.read("00 System/Scripts/dvWidgets/goalsLib.js")));
const H = (app.__winxHelpers ??= eval(await app.vault.adapter.read("00 System/Scripts/dvWidgets/helpers.js")));
const { areaIcons } = await H.loadConfig();
H.installSounds();
const SND = { today: new H.AudioEngine("00 System/Assets/star.wav"), move: new H.AudioEngine("00 System/Assets/winx music/snd_scroll_menu.wav") };

const today = window.moment().format("YYYY-MM-DD");
const fmt   = d => d?.toFormat("yyyy-MM-dd");
const dm    = d => `${d.slice(8, 10)}.${d.slice(5, 7)}`;
const all   = dv.pages('"02 Areas/Personal/Tasks"').file.tasks.array();
const done  = all.filter(t => t.completed && t.completion).map(t => ({ text: t.text, date: fmt(t.completion) }));
const open  = all.filter(t => !t.completed && !t.text.includes("🔁"));
const icon  = t => areaIcons[t.tags.find(g => areaIcons[g])] ?? "";
const label = t => t.text.replace(/#[^\s]+/g, "").replace(/[📅⏳✅🛫➕]\s*\d{4}-\d{2}-\d{2}/gu, "").replace(/\s+/g, " ").trim();

const COLS = [
  { id: "today",    title: "☀️ Today" },
  { id: "tomorrow", title: "🌙 Tomorrow" },
  { id: "week",     title: "🌸 This week" },
  { id: "later",    title: "✨ Later" },
  { id: "nodate",   title: "💭 No date" },
].filter(c => c.id !== "week" || L.dropDate("week", today));   // no days left this week: hide

const lists = {};   // column id → element the cards live in
// Dataview re-renders only after it re-indexes (seconds), so the card is moved right away
const move = async (t, col, card) => {
  lists[col]?.append(card);
  if (!H.isMuted()) (col === "today" ? SND.today : SND.move).play({ gain: 0.25 });
  const date = L.dropDate(col, today);
  await editLine(t, line => L.setScheduled(line, date));
};

// Rewrite the task's line in its file (null deletes it) — only if the line is still that task
const editLine = (t, fn) => app.vault.process(app.vault.getAbstractFileByPath(t.path), c => {
  const lines = c.split("\n");
  if (L.taskKey(lines[t.line] ?? "") !== L.taskKey(t.text)) return c;
  const next = fn(lines[t.line]);
  next === null ? lines.splice(t.line, 1) : (lines[t.line] = next);
  return lines.join("\n");
});

// ── Goals: fixed recurring tasks with week progress and history ──
const goals = dv.pages('"02 Areas/Personal/Goals"').file.lists.map(i => L.parseGoal(i.text)).where(Boolean).array();
if (goals.length) {
  const week = L.weekOf(today);
  const sec  = dv.container.createEl("div", { cls: "winx-board-goals" });
  const head = sec.createEl("div", { cls: "winx-board-head" });
  head.createEl("span", { text: "✦ Goals" });
  const mute = head.createEl("button", { text: H.isMuted() ? "🔇" : "🔊", cls: "winx-board-mute", attr: { title: "sounds on/off" } });
  mute.onclick = () => { app.saveLocalStorage("winx-mute", H.isMuted() ? null : "1"); mute.textContent = H.isMuted() ? "🔇" : "🔊"; };
  const row = sec.createEl("div", { cls: "winx-board-goal-row" });
  for (const g of goals) {
    const mine  = all.filter(t => t.tags.includes(g.tag));
    const dates = mine.filter(t => t.completed && t.completion).map(t => fmt(t.completion));
    const next  = mine.filter(t => !t.completed && t.due).map(t => fmt(t.due)).sort()[0];
    const card  = row.createEl("div", { cls: "winx-board-card fixed", attr: g.plan ? { title: g.plan } : {} });
    card.createEl("div", { text: `${g.name}  ${L.countDone(dates, week)}/${L.weeklyTarget(g)}`, cls: "winx-board-text" });
    const last = [...dates].sort().at(-1);
    const meta = [next && (next === today ? "today" : `next ${dm(next)}`), dates.length && `done ${dates.length}× · last ${dm(last)}`].filter(Boolean);
    if (meta.length) card.createEl("div", { text: meta.join("  ·  "), cls: "winx-board-meta" });
  }
}

const board   = dv.container.createEl("div", { cls: "winx-board" });
const backlog = dv.container.createEl("div", { cls: "winx-board-backlog" });
const SHOWN   = 8;
let dragged = null, draggedEl = null;

for (const col of COLS) {
  const cards = open.filter(t => L.boardColumn(fmt(t.scheduled) ?? fmt(t.due), today) === col.id);
  if (col.id === "nodate") cards.sort((a, b) => (fmt(a.created) ?? "9").localeCompare(fmt(b.created) ?? "9"));
  const colEl = (col.id === "nodate" ? backlog : board).createEl("div", { cls: "winx-board-col" });
  const head  = colEl.createEl("div", { cls: "winx-board-head" });
  head.createEl("span", { text: col.title });
  head.createEl("span", { text: String(cards.length), cls: "market-count" });

  colEl.ondragover  = e => { e.preventDefault(); colEl.classList.add("over"); };
  colEl.ondragleave = () => colEl.classList.remove("over");
  colEl.ondrop      = async e => {
    e.preventDefault();
    e.stopPropagation();   // keep Obsidian's own file-drop handling out of it
    colEl.classList.remove("over");
    if (dragged && L.boardColumn(fmt(dragged.scheduled) ?? fmt(dragged.due), today) !== col.id) await move(dragged, col.id, draggedEl);
    dragged = null;
  };

  const list = lists[col.id] = col.id === "nodate" ? colEl.createEl("div", { cls: "winx-board-grid" }) : colEl;
  const cut = col.id === "nodate" && cards.length > SHOWN && !app.__winxBacklogOpen;
  for (const t of cut ? cards.slice(0, SHOWN) : cards) {
    const card = list.createEl("div", { cls: "winx-board-card", attr: { draggable: "true" } });
    card.ondragstart = e => { dragged = t; draggedEl = card; card.classList.add("dragging"); e.dataTransfer?.setData("text/plain", ""); };
    card.ondragend   = () => card.classList.remove("dragging");
    card.createEl("div", { text: `${icon(t)} ${label(t)}`.trim(), cls: "winx-board-text" });

    const meta = [];
    const plan = fmt(t.scheduled);
    if (plan && plan < today) meta.push(`moved from ${dm(plan)}`);
    if (t.due) meta.push(`📅 ${dm(fmt(t.due))}`);
    if (col.id === "nodate" && t.created) meta.push(`waiting ${window.moment(today).diff(fmt(t.created), "days")} d`);
    const h = L.history(t.text, done);
    if (h) meta.push(`done ${h.count}× · last ${dm(h.last)}`);
    if (meta.length) card.createEl("div", { text: meta.join("  ·  "), cls: "winx-board-meta" });

    const btns = card.createEl("div", { cls: "winx-board-btns" });   // CSS: fades in on hover on desktop
    for (const [id, icon, tip] of [["today", "☀️", "today"], ["tomorrow", "🌙", "tomorrow"], ["nodate", "💭", "no date"]]) {
      if (id === col.id) continue;
      btns.createEl("button", { text: icon, attr: { title: tip, "aria-label": tip } }).onclick = () => move(t, id, card);
    }
    // delete: first click arms the button for 3 s, second click removes the line from the file
    const del = btns.createEl("button", { text: "🗑", cls: "winx-board-del", attr: { title: "delete task", "aria-label": "delete task" } });
    del.onclick = async () => {
      if (!del.classList.contains("armed")) {
        del.classList.add("armed"); del.textContent = "✓?"; del.title = "click again to delete";
        setTimeout(() => { del.classList.remove("armed"); del.textContent = "🗑"; del.title = "delete task"; }, 3000);
        return;
      }
      card.remove();
      await editLine(t, () => null);
    };
  }
  if (col.id === "nodate" && cards.length > SHOWN) {
    colEl.createEl("button", { text: cut ? `show all ${cards.length}` : "show less", cls: "winx-board-more" }).onclick = () => {
      app.__winxBacklogOpen = cut;
      dv.container.empty();
      dv.view("00 System/Scripts/dvWidgets/board");
    };
  }
}
