// Planning board. Top: "Goals", the recurring goal tasks (not draggable).
// Below: one-off tasks in date columns, then the "No date" backlog as a compact
// grid (first 8, "show all" opens the rest). Drag a card to a column or use its
// buttons (on hover; always shown on the phone) and its ⏳ plan date is rewritten.
// Deadlines (📅) are not touched; recurring tasks stay in Routines.
const L = (app.__winxGoalsLib ??= eval(await app.vault.adapter.read("00 System/Scripts/dvWidgets/goalsLib.js")));

const today = window.moment().format("YYYY-MM-DD");
const fmt   = d => d?.toFormat("yyyy-MM-dd");
const dm    = d => `${d.slice(8, 10)}.${d.slice(5, 7)}`;
const all   = dv.pages('"02 Areas/Personal/Tasks"').file.tasks.array();
const done  = all.filter(t => t.completed && t.completion).map(t => ({ text: t.text, date: fmt(t.completion) }));
const open  = all.filter(t => !t.completed && !t.text.includes("🔁"));
const label = t => t.text.replace(/#[^\s]+/g, "").replace(/[📅⏳✅🛫➕]\s*\d{4}-\d{2}-\d{2}/gu, "").replace(/\s+/g, " ").trim();

const COLS = [
  { id: "today",    title: "☀️ Today" },
  { id: "tomorrow", title: "🌙 Tomorrow" },
  { id: "week",     title: "🌸 This week" },
  { id: "later",    title: "✨ Later" },
  { id: "nodate",   title: "💭 No date" },
].filter(c => c.id !== "week" || L.dropDate("week", today));   // no days left this week: hide

const move = async (t, col) => {
  const date = L.dropDate(col, today);
  const file = app.vault.getAbstractFileByPath(t.path);
  await app.vault.process(file, c => {
    const lines = c.split("\n");
    if (L.taskKey(lines[t.line] ?? "") === L.taskKey(t.text)) lines[t.line] = L.setScheduled(lines[t.line], date);
    return lines.join("\n");
  });
};

// ── Goals: fixed recurring tasks with week progress and history ──
const goals = dv.pages('"02 Areas/Personal/Goals"').file.lists.map(i => L.parseGoal(i.text)).where(Boolean).array();
if (goals.length) {
  const week = L.weekOf(today);
  const sec  = dv.container.createEl("div", { cls: "winx-board-goals" });
  sec.createEl("div", { text: "✦ Goals", cls: "winx-board-head" });
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
let dragged = null;

for (const col of COLS) {
  const cards = open.filter(t => L.boardColumn(fmt(t.scheduled) ?? fmt(t.due), today) === col.id);
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
    if (dragged && L.boardColumn(fmt(dragged.scheduled) ?? fmt(dragged.due), today) !== col.id) await move(dragged, col.id);
    dragged = null;
  };

  const list = col.id === "nodate" ? colEl.createEl("div", { cls: "winx-board-grid" }) : colEl;
  const cut = col.id === "nodate" && cards.length > SHOWN && !app.__winxBacklogOpen;
  for (const t of cut ? cards.slice(0, SHOWN) : cards) {
    const card = list.createEl("div", { cls: "winx-board-card", attr: { draggable: "true" } });
    card.ondragstart = e => { dragged = t; card.classList.add("dragging"); e.dataTransfer?.setData("text/plain", ""); };
    card.ondragend   = () => card.classList.remove("dragging");
    card.createEl("div", { text: label(t), cls: "winx-board-text" });

    const meta = [];
    const plan = fmt(t.scheduled);
    if (plan && plan < today) meta.push(`moved from ${dm(plan)}`);
    if (t.due) meta.push(`📅 ${dm(fmt(t.due))}`);
    const h = L.history(t.text, done);
    if (h) meta.push(`done ${h.count}× · last ${dm(h.last)}`);
    if (meta.length) card.createEl("div", { text: meta.join("  ·  "), cls: "winx-board-meta" });

    const btns = card.createEl("div", { cls: "winx-board-btns" });   // CSS: hover-only on desktop
    for (const [id, txt] of [["today", "today"], ["tomorrow", "tmrw"], ["later", "later"], ["nodate", "✕ date"]]) {
      if (id === col.id) continue;
      btns.createEl("button", { text: txt }).onclick = () => move(t, id);
    }
  }
  if (col.id === "nodate" && cards.length > SHOWN) {
    colEl.createEl("button", { text: cut ? `show all ${cards.length}` : "show less", cls: "winx-board-more" }).onclick = () => {
      app.__winxBacklogOpen = cut;
      dv.container.empty();
      dv.view("00 System/Scripts/dvWidgets/board");
    };
  }
}
