// Calendar: the week (7 day columns) or the month (grid) around the page's `date`,
// switched by its `view` property (the week/month button in the header). Tasks sit on their 📅 date (an old ⏳ wins if a task still has one),
// done ones on their ✅ date; recurring tasks also show their next repeats faded (🔁),
// projected from the rule. Overdue tasks show on today. Below, three tabs: No date (open one-off tasks
// without a date), Regulars (every 🔁 task: its rule, next date, history; ⏸ pauses one by dropping its dates)
// and Pool (Pool.md: tasks with no schedule, picked when it's time; dragging one onto a day adds a copy there).
// Drag a task (open or done) to a day: a future day moves its 📅 there; today or an earlier day splits
// into "✓ done" (✅ that day) and "📅 move". Dropping on the backlog clears the date.
// `overdue: false` leaves overdue tasks out (a page that lists them elsewhere, e.g. the Missed strip).
// Every 🔁 entry of a day (done, open, the faded repeats) folds into one "🔁 2/5" box; done one-offs are listed
// only when the `showDone` toggle is on, otherwise each day shows just a count with the names in a tooltip.
import { H } from "../lib/helpers.js";
import { L } from "../lib/goalsLib.js";
import { Task } from "../lib/task.js";
import { render } from "./index.js";

export default async function (dv, input) {
  const T = t => (t.winxTask ??= Task.of(t));   // a Dataview task's Task, made once
  const { areaIcons, areaMap, difficulties } = await H.loadConfig();
  H.installSounds();

  const today = H.today();
  const page  = dv.current();
  const pageFile = app.vault.getAbstractFileByPath(page.file.path);
  // read the page's own properties fresh: Dataview doesn't re-run a view when they change,
  // so the view re-renders itself on its page's metadata change (hooked once per container)
  const fm    = app.metadataCache.getFileCache(pageFile)?.frontmatter ?? {};
  const base  = /^\d{4}-\d{2}-\d{2}/.test(fm.date ?? "") ? String(fm.date).slice(0, 10) : today;
  const view  = fm.view === "month" ? "month" : "week";
  const shown = { open: true, overdue: true, done: !!fm.showDone, ghost: true };
  if (!dv.container.winxCalHooked) {
    dv.container.winxCalHooked = true;
    dv.component.registerEvent(app.metadataCache.on("changed", f => {
      if (f.path !== pageFile.path) return;
      dv.container.empty();
      render("calendar", dv);
    }));
    // a write to a task file (any: a tick here, the Tasks dialog, QuickAdd): the calendar dims with a spinning ✦
    // until Dataview redraws it; 5 s at most, in case no redraw comes
    dv.component.registerEvent(app.vault.on("modify", f => {
      if (!f.path.startsWith("02 Areas/Personal/Tasks/")) return;
      const el = dv.container.querySelector(".winx-cal");
      el?.classList.add("busy");
      setTimeout(() => el?.classList.remove("busy"), 5000);
    }));
  }
  const days  = view === "week" ? L.weekOf(base) : L.monthGrid(base);
  const first = days[0], last = days.at(-1);

  const AREA_TAGS = Object.keys(areaIcons);
  const area  = t => T(t).area;
  const icon  = t => areaIcons[area(t)] ?? "";
  const bare  = t => T(t).text;
  const label = t => `${icon(t)} ${bare(t)}`.trim();
  // a task's text as on the Kanban: gold difficulty stars (the #⭐ tag look from winx-tasks-minimal.css), the text, its stickers
  const stickers = t => T(t).stickers.map(name => app.metadataCache.getFirstLinkpathDest(name, t.path))
    .filter(Boolean).map(file => app.vault.getResourcePath(file));
  // a click on the stars (a pale ☆ when there are none) opens the difficulty picker
  // small panel under the stars: one row per difficulty and "none"; the choice rewrites the tag (with undo)
  const difficultyPicker = (anchor, t) => {
    document.querySelector(".winx-cal-picker")?.remove();
    const box = document.body.createEl("div", { cls: "winx-cal-picker" });
    const r = anchor.getBoundingClientRect();
    Object.assign(box.style, { left: `${Math.min(r.left, innerWidth - 170)}px`, top: `${r.bottom + 4}px` });
    for (const { label, tag } of [...difficulties, { label: "☆ none", tag: null }])
      box.createEl("button", { text: label }).onclick = async () => {
        box.remove();
        await H.editTaskLineWithUndo(t, line => new Task(line).setDifficulty(tag), Task, "⭐");
      };
    const close = e => { if (!box.contains(e.target)) { box.remove(); document.removeEventListener("pointerdown", close, true); } };
    setTimeout(() => document.addEventListener("pointerdown", close, true));
  };
  const taskText = (el, t, withIcon = true) => {
    const star  = T(t).difficulty;
    const stars = star ? el.createEl("span", { cls: "tag", attr: { "data-tag-name": star } }) : el.createEl("span", { cls: "winx-cal-nostar", text: "☆" });
    stars.title = "difficulty";
    stars.onclick = e => { e.stopPropagation(); difficultyPicker(stars, t); };
    el.appendText(` ${withIcon ? label(t) : bare(t)} `);
    for (const src of stickers(t)) el.createEl("img", { cls: "winx-cal-sticker", attr: { src, alt: "" } });
  };

  // day → entries { t, kind: open | overdue | ghost | done }; backlog: open tasks with no date
  const byDay = Object.fromEntries(days.map(d => [d, []]));
  const backlog = [];
  const all = dv.pages('"02 Areas/Personal/Tasks"').file.tasks.array();
  for (const t of all) {
    if (T(t).isDone) { const c = T(t).doneOn; if (c) byDay[c]?.push({ t, kind: "done" }); continue; }
    if (!T(t).isOpen) continue;   // skipped, in progress etc.
    const d = T(t).date;
    if (!d) { if (!T(t).isRecurring) backlog.push(t); continue; }   // an undated 🔁 task is a paused regular
    if (d >= today || fm.overdue !== false) byDay[d < today ? today : d]?.push({ t, kind: d < today ? "overdue" : "open" });   // overdue piles up on today
    const rule = T(t).rule;
    if (rule) for (const g of L.projectRepeats(rule, d, last)) if (g > today) byDay[g]?.push({ t, kind: "ghost" });   // future only
  }
  const ORDER = { overdue: 0, open: 1, ghost: 2, done: 3 };
  for (const d of days) byDay[d].sort((a, b) => ORDER[a.kind] - ORDER[b.kind]);

  // a view change (date, week/month, a filter): .busy at once, the redraw follows the page's metadata change
  const setPage = props => { root.classList.add("busy"); return app.fileManager.processFrontMatter(pageFile, f => Object.assign(f, props)); };
  const MOVE = new H.AudioEngine("00 System/Assets/winx music/snd_scroll_menu.wav");
  const GEM  = new H.AudioEngine("00 System/Assets/winx music/snd_pickup_gem01.wav");
  let dragged = null;
  const dropOn = (el, day, done = false) => {
    el.ondragover  = e => { e.preventDefault(); el.classList.add("over"); };
    el.ondragleave = () => el.classList.remove("over");
    el.ondrop      = async e => {
      e.preventDefault(); e.stopPropagation();
      el.classList.remove("over");
      if (!dragged) return;
      const t = dragged; dragged = null;
      if (!H.isMuted()) (done ? GEM : MOVE).play({ gain: 0.25 });
      if (t.pool) return fromPool(t, day, done);
      // an open 🔁 task ticked on a day goes through the Tasks plugin (so it gets its next copy), then back to that day
      const repeat = line => done && TASKS && new Task(line).isOpen && new Task(line).isRecurring;
      await H.editTaskLine(t, line => repeat(line)
        ? Task.backdateDone(TASKS.executeToggleTaskDoneCommand(line, t.path), day, today)
        : new Task(line).place(day, done), Task);
    };
  };
  // while dragging, a day shows white drop zones: the future one "📅 date" box, today and the past "✓" and "📅 date"
  const dropTarget = (el, d) => {
    const zones = el.createEl("div", { cls: "winx-cal-zones" });
    if (d <= today) dropOn(zones.createEl("div", { cls: "winx-cal-zone done", text: "✓" }), d, true);
    dropOn(zones.createEl("div", { cls: "winx-cal-zone plan", text: `📅 ${window.moment(d).format("D MMM")}` }), d, false);
  };
  // ⏭ skip a dated 🔁 task this time: the rule moves on (Tasks makes the next copy), this one stays as cancelled
  // "- [-] … ❌ date", which counts as neither done nor missed. With undo, like every edit here.
  const canSkip = t => TASKS && T(t).isOpen && T(t).isRecurring && !!T(t).date;
  const skip    = t => H.editTaskLineWithUndo(t, line => Task.skipLines(TASKS.executeToggleTaskDoneCommand(line, t.path)), Task, "⏭");
  const tick    = t => H.editTaskLineWithUndo(t, line => TASKS.executeToggleTaskDoneCommand(line, t.path), Task, "✓");
  const unplan  = t => H.editTaskLineWithUndo(t, line => new Task(line).place(null, false), Task, "↩ no date");
  // the pool: its lines (not tasks: no checkbox) as { text, path, line, pool }, each with its Task made from the line.
  // A copy goes to the top of Master.md, like a new task: open on `day` (no date for null), or done that day
  const POOL   = "02 Areas/Personal/Tasks/Pool.md";
  const MASTER = "02 Areas/Personal/Tasks/Master.md";
  const pool = (dv.page(POOL)?.file.lists.array() ?? []).filter(l => !l.task)
    .map(l => { const p = { text: l.text, path: l.path, line: l.line, pool: true }; p.winxTask = new Task(`- ${l.text}`, p); return p; });
  const fromPool = (t, day, done) => app.vault.process(app.vault.getAbstractFileByPath(MASTER),
    c => new Task(Task.fromPool(T(t).line, today)).place(day, done) + "\n" + c);
  // phone: swipe a row right = `right` (done), left = skip a 🔁 task / take an open one's date off (to No date).
  // Only a mostly-sideways swipe counts, so scrolling the page still works (touch-action: pan-y in winx-widgets.css)
  const swipe = (el, t, right) => {
    if (!document.body.classList.contains("is-mobile")) return;
    const left = canSkip(t) ? () => skip(t) : T(t).date ? () => unplan(t) : null;
    let x0 = 0, y0 = 0, dx = 0, on = false;
    el.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; on = false; }, { passive: true });
    el.addEventListener("touchmove", e => {
      const mx = e.touches[0].clientX - x0, my = e.touches[0].clientY - y0;
      if (!on && Math.abs(mx) > 12 && Math.abs(mx) > 1.5 * Math.abs(my)) on = true;
      if (!on || (mx < 0 && !left)) return;
      dx = mx; el.style.transform = `translateX(${dx}px)`; el.dataset.swipe = dx > 0 ? "done" : canSkip(t) ? "skip" : "nodate";
    }, { passive: true });
    el.addEventListener("touchend", () => {
      el.style.transform = ""; delete el.dataset.swipe;
      if (on && dx > 80) right(); else if (on && dx < -80) left?.();
    });
  };
  // 🗑: the first click arms it for 3 s, the second removes the task's line (with undo)
  const trashButton = (parent, t, card) => {
    const del = parent.createEl("button", { text: "🗑", cls: "winx-board-del", attr: { title: "delete task", "aria-label": "delete task" } });
    del.onclick = async () => {
      if (!del.classList.contains("armed")) {
        del.classList.add("armed"); del.textContent = "✓?"; del.title = "click again to delete";
        setTimeout(() => { del.classList.remove("armed"); del.textContent = "🗑"; del.title = "delete task"; }, 3000);
        return;
      }
      card.remove();
      await H.deleteTaskLine(t, Task);
    };
  };
  // round ⏭ (🔁 only), ✏️ button (the task window, then the Tasks edit dialog) and 🗑
  const deleteButton = (parent, t, card, star = true) => {
    if (star) {
      const diff = parent.createEl("button", { text: "⭐", cls: "winx-cal-diffbtn", attr: { title: "difficulty", "aria-label": "difficulty" } });   // phone only (CSS)
      diff.onclick = () => difficultyPicker(diff, t);
    }
    if (canSkip(t)) parent.createEl("button", { text: "⏭", attr: { title: "skip this time", "aria-label": "skip this time" } }).onclick = () => { card.remove(); skip(t); };
    parent.createEl("button", { text: "✏️", attr: { title: "edit: difficulty, area, time, sticker, then text and dates", "aria-label": "edit task" } }).onclick = () => H.editTaskModal(t, Task);
    trashButton(parent, t, card);
  };
  const TASKS = app.plugins.plugins["obsidian-tasks-plugin"]?.apiV1;
  const entry = (parent, { t, kind }, compact) => {
    // the area shows as a colored stripe on the left (colors and legend in winx-widgets.css / the header)
    const el = parent.createEl("div", { cls: `winx-cal-task ${kind}`, attr: area(t) ? { "data-area": area(t).slice(6) } : {} });
    // week view: a checkbox like the Kanban's; ticking goes through the Tasks plugin (🔁 gets its next copy), with undo.
    // A tick waits 2 s (struck through, a gold shimmer) before it's written: unticking in time leaves the file alone.
    // The tick sound comes from installSounds (it listens to every .task-list-item-checkbox)
    let box = null;
    if (!compact && TASKS && kind !== "ghost") {
      box = el.createEl("input", { type: "checkbox", cls: "task-list-item-checkbox", attr: { "aria-label": "done" } });
      box.checked = box.disabled = kind === "done";
      let timer = null;
      box.onchange = () => {
        el.classList.toggle("ticking", box.checked);
        clearTimeout(timer);
        if (box.checked) timer = setTimeout(() => {
          box.disabled = true; el.classList.add("done"); el.querySelector(".winx-board-btns")?.remove();
          tick(t);
        }, 2000);
      };
    }
    if (kind === "ghost") el.appendText("🔁 ");
    taskText(el, t, false);
    if (compact) el.title = label(t);
    if (kind !== "ghost") {
      el.draggable = true;
      el.ondragstart = e => { dragged = t; e.dataTransfer?.setData("text/plain", ""); setTimeout(() => root.classList.add("dragging")); };   // later: zones covering the dragged card at dragstart cancel the drag
      el.ondragend   = () => root.classList.remove("dragging");
    }
    // open tasks in the week view: ✏️ edits, 🗑 deletes
    if (!compact && (kind === "open" || kind === "overdue")) {
      deleteButton(el.createEl("div", { cls: "winx-board-btns" }), t, el);   // CSS: fades in on hover on desktop
      if (box) swipe(el, t, () => { if (!box.checked) box.click(); });
    }
    return el;
  };

  // ── header: ‹ period › ──
  const root = dv.container.createEl("div", { cls: `winx-cal ${view}` });
  // while dragging, a bar of 7 days sticks to the top of the screen, so a task from far down
  // (the backlog) can be dropped on a day without scrolling: the shown week, or in the month view the next 7 days
  const bar = root.createEl("div", { cls: "winx-cal-dropbar" }).createEl("div", { cls: "winx-cal-dropbar-in" });
  // while .busy (a write, until the redraw), a pink pill with a spinning ✦ sticks to the top, like the Kanban's arrow
  root.createEl("div", { cls: "winx-cal-busy" }).createEl("div", { cls: "winx-cal-busy-pill", attr: { title: "saving…" } }).createEl("span", { text: "✦" });
  for (const d of view === "week" ? days : Array.from({ length: 7 }, (_, i) => L.addDays(today, i)))
    dropOn(bar.createEl("div", { cls: "winx-cal-chip" + (d === today ? " today" : ""), text: window.moment(d).format("ddd D") }), d);
  // the page's date, then sounds on/off (the one switch for all winx sounds)
  const top  = root.createEl("div", { cls: "winx-cal-top" });
  const pick = top.createEl("div", { cls: "mb-input-type-date" }).createEl("input", { type: "date", value: base });   // Meta Bind's date look, see winx-widgets.css
  pick.onchange = () => pick.value && setPage({ date: pick.value });
  const mute = top.createEl("button", { text: H.isMuted() ? "🔇" : "🔊", cls: "winx-cal-mute", attr: { title: "sounds on/off", "aria-label": "sounds on/off" } });
  top.createEl("button", { text: "＋ task", cls: "winx-cal-today", attr: { title: "new task (Winx: New task)" } }).onclick = () => app.commands.executeCommandById("winx:new-task");
  mute.onclick = () => { app.saveLocalStorage("winx-mute", H.isMuted() ? null : "1"); mute.textContent = H.isMuted() ? "🔇" : "🔊"; };
  // legend: the areas of the tasks shown, as colored dots, named as on the Life Areas chart
  const legend = top.createEl("div", { cls: "winx-cal-legend" });
  for (const g of AREA_TAGS.filter(g => days.some(d => byDay[d].some(e => shown[e.kind] && area(e.t) === g))))
    legend.createEl("span", { attr: { "data-area": g.slice(6) }, text: areaMap[g] ?? g.slice(6) });
  const nav  = root.createEl("div", { cls: "winx-cal-nav" });
  const step = n => setPage({ date: view === "week" ? L.addDays(base, 7 * n) : L.addMonths(base, n) });
  nav.createEl("button", { text: "‹", attr: { "aria-label": "previous" } }).onclick = () => step(-1);
  const M = d => window.moment(d);
  nav.createEl("span", { cls: "winx-cal-title", text: view === "week"
    ? `${M(first).format("D MMM")} – ${M(last).format("D MMM YYYY")}`
    : M(base).format("MMMM YYYY") });
  nav.createEl("button", { text: "›", attr: { "aria-label": "next" } }).onclick = () => step(1);
  if (!days.includes(today)) nav.createEl("button", { text: "today", cls: "winx-cal-today" }).onclick = () => setPage({ date: today });
  const other = view === "week" ? "month" : "week";
  nav.createEl("button", { text: view, cls: "winx-cal-today", attr: { title: `switch to the ${other} view`, "aria-label": `switch to the ${other} view` } }).onclick = () => setPage({ view: other });
  for (const [key, text] of [["showDone", "✓ done"]])
    nav.createEl("button", { text, cls: "winx-cal-filter" + (fm[key] ? " on" : "") }).onclick = () => setPage({ [key]: !fm[key] });
  // unfold / fold every day's 🔁 box at once (lit while all are open)
  const repeats = nav.createEl("button", { text: "🔁 repeats", cls: "winx-cal-filter", attr: { title: "unfold / fold every day's 🔁 box" } });
  const routineDays = () => days.filter(d => byDay[d].some(e => T(e.t).isRecurring));
  const syncRepeats = () => repeats.classList.toggle("on", routineDays().every(d => unfolded.has(d)));
  repeats.onclick = () => {
    const open = !repeats.classList.contains("on");
    for (const d of routineDays()) open ? unfolded.add(d) : unfolded.delete(d);
    shows.forEach(f => f()); syncRepeats();
  };

  // Missed? (yesterday.js) between the header and the days, only while today is on screen;
  // its rows drag onto the days like any task
  if (days.includes(today)) await render("yesterday", dv, { parent: root, drag: (el, t) => {
    el.draggable = true;
    el.ondragstart = e => { dragged = t; e.dataTransfer?.setData("text/plain", ""); setTimeout(() => root.classList.add("dragging")); };
    el.ondragend   = () => root.classList.remove("dragging");
  }, text: (el, t) => {
    if (area(t)) el.parentElement.dataset.area = area(t).slice(6);
    if (T(t).isRecurring) el.appendText("🔁 ");
    taskText(el, t, false);
    deleteButton(el.parentElement.createEl("div", { cls: "winx-board-btns" }), t, el.parentElement, false);   // ⏭ ✏️ 🗑, on hover
    swipe(el.parentElement, t, () => [...el.parentElement.querySelectorAll("button")].find(b => b.textContent === "✓")?.click());   // its ✓: done on that day
  } });

  // a day's entries: the shown kinds listed, the hidden ones as counts with a tooltip.
  // The day's 🔁 entries (done, open, faded repeats) fold into one pill "🔁 2/5" under the one-offs;
  // a click unfolds them inside the pill's dashed box, grouped by time of day (#time/morning, #time/evening, the rest);
  // unfolded, the pill hides and a click on a group heading or the box's edge folds it back (kept per day until reload)
  const unfolded = app.__winxCalRoutineOpen ??= new Set();
  const shows = [];   // each box's refresh, for the 🔁 repeats button
  const TIMES = [["morning", "🌅 morning"], ["evening", "🌙 evening"], [null, "🔁 other"]];
  const fill = (parent, d, compact) => {
    const routine = byDay[d].filter(e => T(e.t).isRecurring);
    for (const e of byDay[d]) if (shown[e.kind] && !routine.includes(e)) entry(parent, e, compact);
    if (routine.length) {
      const box  = parent.createEl("div", { cls: "winx-cal-routine" });
      const groups = TIMES.map(([tag, name]) => [name, routine.filter(e => T(e.t).time === tag || (!tag && !TIMES.some(([g]) => g && T(e.t).time === g)))])
        .filter(([, es]) => es.length);
      const pill = box.createEl("div", { cls: "winx-cal-routine-pill", attr: { title: routine.map(e => label(e.t)).join("\n") } });
      pill.createEl("span", { text: `🔁 ${routine.filter(e => e.kind === "done").length}/${routine.length}` });
      const list = box.createEl("div", { cls: "winx-cal-routine-list" });
      for (const [name, es] of groups) {
        list.createEl("div", { cls: "winx-cal-routine-time", text: name });
        for (const e of es) entry(list, e, compact);
      }
      const show = () => { box.classList.toggle("open", unfolded.has(d)); list.toggle(unfolded.has(d)); pill.toggle(!unfolded.has(d)); };
      box.onclick = e => {
        if (!e.target.matches(".winx-cal-routine, .winx-cal-routine-pill, .winx-cal-routine-pill *, .winx-cal-routine-time")) return;
        unfolded.has(d) ? unfolded.delete(d) : unfolded.add(d); show(); syncRepeats();
      };
      show(); shows.push(show);
    }
    const marks = [["done", "✓"]].map(([kind, sym]) => [sym, byDay[d].filter(e => e.kind === kind && !shown[kind] && !routine.includes(e))]).filter(([, es]) => es.length);
    if (!marks.length) return;
    const row = parent.createEl("div", { cls: "winx-cal-marks" });
    for (const [sym, es] of marks) row.createEl("span", { text: `${sym}${es.length}`, attr: { title: es.map(e => label(e.t)).join("\n") } });
  };

  if (view === "week") {
    const grid = root.createEl("div", { cls: "winx-cal-week" });
    for (const d of days) {
      const col = grid.createEl("div", { cls: "winx-cal-day" + (d === today ? " today" : "") });
      col.createEl("div", { cls: "winx-cal-head", text: M(d).format("ddd D") });
      fill(col, d, false);
      dropTarget(col, d);
    }
  } else {
    const grid = root.createEl("div", { cls: "winx-cal-month" });
    for (const d of days.slice(0, 7)) grid.createEl("div", { cls: "winx-cal-wd", text: M(d).format("ddd") });
    for (const d of days) {
      const cell = grid.createEl("div", { cls: "winx-cal-cell" + (d === today ? " today" : "") + (d.slice(0, 7) !== base.slice(0, 7) ? " outside" : "") });
      cell.createEl("div", { cls: "winx-cal-num", text: String(+d.slice(8)) });
      fill(cell, d, true);
      cell.onclick = e => { if (e.target === cell || e.target.matches(".winx-cal-num, .winx-cal-marks, .winx-cal-marks *")) setPage({ date: d, view: "week" }); };
      dropTarget(cell, d);
    }
  }

  syncRepeats();

  // ── bottom panel: No date | Regulars | Pool, one translucent card per area, the cards in masonry columns ──
  const AREAS = AREA_TAGS;
  const rank  = t => (i => i < 0 ? AREAS.length : i)(AREAS.indexOf(area(t)));
  const done  = all.map(T).filter(t => t.isDone && t.doneOn);
  const skips = all.map(T).filter(t => t.isSkipped);   // ⏭ skipped (cancelled) lines
  const dm    = d => `${d.slice(8, 10)}.${d.slice(5, 7)}`;
  const ago   = d => window.moment(today).diff(d, "days");
  // a redraw without a write (a tab, a fold): .busy first, painted for a frame, then the redraw replaces it
  const rerender = () => { root.classList.add("busy"); setTimeout(() => { dv.container.empty(); render("calendar", dv); }, 50); };
  const ruleOf   = t => T(t).rule;
  const regulars = all.filter(t => T(t).isOpen && T(t).isRecurring);

  const tab  = (k => ["regulars", "pool"].includes(k) ? k : "nodate")(app.loadLocalStorage("winx-cal-tab"));
  const box  = root.createEl("div", { cls: "winx-cal-backlog winx-board-backlog" });   // board card look, see winx-widgets.css
  const tabs = box.createEl("div", { cls: "winx-cal-tabs" });
  for (const [key, text] of [["nodate", `No date · ${backlog.length}`], ["regulars", `Regulars · ${regulars.length}`], ["pool", `Pool · ${pool.length}`]])
    tabs.createEl("button", { text, cls: "winx-cal-head" + (key === tab ? " on" : "") }).onclick = () => { app.saveLocalStorage("winx-cal-tab", key); rerender(); };
  const list = box.createEl("div", { cls: "winx-cal-backlog-grid" });

  const groupCard = (title) => {
    const g = list.createEl("div", { cls: "winx-cal-groupcard" });
    g.createEl("div", { cls: "winx-cal-group", text: title });
    return g;
  };
  const areaTitle = g => { const name = areaMap[g] ?? (g ? g.slice(6) : "other"); return `${areaIcons[g] ?? "✦"} ${name[0].toUpperCase()}${name.slice(1)}`; };   // as on the Life Areas chart
  // a task card: draggable onto the days, its text, a meta line, and the hover buttons (⭐ ✏️ 🗑, plus `extra`;
  // a pool card: `extra`, ✏️ and 🗑, and a swipe right adds it to today)
  const taskCard = (parent, t, fillMeta, extra) => {
    const card = parent.createEl("div", { cls: "winx-board-card", attr: { draggable: "true" } });
    card.ondragstart = e => { dragged = t; e.dataTransfer?.setData("text/plain", ""); setTimeout(() => root.classList.add("dragging")); };
    card.ondragend   = () => root.classList.remove("dragging");
    taskText(card.createEl("div", { cls: "winx-board-text" }), t, false);
    fillMeta(card.createEl("div", { cls: "winx-board-meta" }));
    const btns = card.createEl("div", { cls: "winx-board-btns" });
    extra?.(btns);
    if (t.pool) {
      btns.createEl("button", { text: "✏️", attr: { title: "edit: difficulty, area, time, sticker, then text", "aria-label": "edit task" } }).onclick = () => H.editTaskModal(t, Task);
      trashButton(btns, t, card);
      swipe(card, t, () => fromPool(t, today, false));
      return card;
    }
    deleteButton(btns, t, card);
    if (TASKS) swipe(card, t, () => { card.remove(); tick(t); });
    return card;
  };
  const history = t => {
    const h = T(t).history(done), s = T(t).history(skips);
    return [h ? `done ${h.count}× · last ${dm(h.last)}` : "never done", s && `skipped ${s.count}×`].filter(Boolean).join(" · ");
  };

  if (tab === "nodate") {
    // longest-waiting first (➕ created)
    backlog.sort((a, b) => rank(a) - rank(b) || (T(a).created ?? "9").localeCompare(T(b).created ?? "9"));
    const SHOWN = 8;
    const cut   = backlog.length > SHOWN && !app.__winxCalBacklogOpen;
    let group, groupEl;
    for (const t of cut ? backlog.slice(0, SHOWN) : backlog) {
      if (!groupEl || area(t) !== group) groupEl = groupCard(areaTitle(group = area(t)));
      taskCard(groupEl, t, m => {
        const h = T(t).history(done);
        m.setText([T(t).created && `waiting ${ago(T(t).created)} d`, h && `done ${h.count}× · last ${dm(h.last)}`].filter(Boolean).join("  ·  "));
      });
    }
    if (backlog.length > SHOWN) box.createEl("button", { text: cut ? `show all ${backlog.length}` : "show less", cls: "winx-cal-more" }).onclick = () => {
      app.__winxCalBacklogOpen = cut; rerender();
    };
  } else if (tab === "pool") {
    // by area, the longest since last done first (never done at the top)
    const last = t => T(t).history(done)?.last ?? "0000";
    pool.sort((a, b) => rank(a) - rank(b) || last(a).localeCompare(last(b)));
    if (!pool.length) list.createEl("div", { cls: "winx-board-meta", text: "Empty: ✦ New task with «To pool» adds one here" });
    let group, groupEl;
    for (const t of pool) {
      if (!groupEl || area(t) !== group) groupEl = groupCard(areaTitle(group = area(t)));
      taskCard(groupEl, t, m => {
        const h = T(t).history(done);
        m.setText(h ? `done ${h.count}× · last ${dm(h.last)} · ${ago(h.last)} d ago` : "never done");
      }, btns => {
        btns.createEl("button", { text: "+📅", attr: { title: "add to today", "aria-label": "add to today" } }).onclick = () => fromPool(t, today, false);
      });
    }
  } else {
    // birthdays (a fixed yearly rule) fold into one card; the rest by area, the most neglected first:
    // the longest overdue, then the longest since last done; paused ones last
    const next  = t => T(t).date;
    const last  = t => T(t).history(done)?.last ?? "0000";
    const late  = t => next(t) && next(t) < today ? ago(next(t)) : -1;
    const bdays = regulars.filter(t => T(t).isBirthday).sort((a, b) => (next(a) ?? "9").localeCompare(next(b) ?? "9"));
    const rest  = regulars.filter(t => !bdays.includes(t))
      .sort((a, b) => rank(a) - rank(b) || !next(a) - !next(b) || late(b) - late(a) || last(a).localeCompare(last(b)));
    const regularMeta = t => m => {
      m.appendText(L.ruleText(ruleOf(t)) + "  ·  ");
      if (next(t)) m.createEl("span", { text: `next ${dm(next(t))}`, cls: next(t) < today ? "winx-cal-late" : "" });
      else m.createEl("span", { text: "⏸ paused" });
      m.appendText("  ·  " + history(t));
    };
    const pauseBtn = t => btns => {
      const paused = !next(t);
      const b = btns.createEl("button", { text: paused ? "▶" : "⏸", attr: { title: paused ? "resume: from today, on the first day its rule allows" : "pause: drop its dates", "aria-label": paused ? "resume" : "pause" } });
      b.onclick = () => {
        b.closest(".winx-board-card")?.toggleClass("paused", !paused); b.disabled = true;   // at once; Dataview redraws a moment later
        H.editTaskLineWithUndo(t, line => paused ? new Task(line).resume(today) : new Task(line).pause(), Task, paused ? "▶" : "⏸");
      };
    };
    let group, groupEl;
    for (const t of rest) {
      if (!groupEl || area(t) !== group) groupEl = groupCard(areaTitle(group = area(t)));
      taskCard(groupEl, t, regularMeta(t), pauseBtn(t)).toggleClass("paused", !next(t));
    }
    if (bdays.length) {
      const g = groupCard(`🎂 Birthdays · ${bdays.length}`);
      g.addClass("dashed");
      const open = app.__winxCalBdaysOpen;
      const head = g.querySelector(".winx-cal-group");
      head.addClass("winx-cal-fold"); head.title = open ? "fold" : "show all";
      head.onclick = () => { app.__winxCalBdaysOpen = !open; rerender(); };
      // folded: the next three, then "+N more"
      for (const t of open ? bdays : bdays.slice(0, 3)) taskCard(g, t, m => m.setText(`yearly · ${dm(next(t))}`));
      if (!open && bdays.length > 3) g.createEl("button", { text: `+${bdays.length - 3} more`, cls: "winx-cal-more" }).onclick = head.onclick;
      if (open) g.createEl("button", { text: "show less", cls: "winx-cal-more" }).onclick = head.onclick;
    }
  }
  dropOn(box, null);
}
