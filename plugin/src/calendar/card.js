// A task as the calendar draws it: gold difficulty stars (the #⭐ tag look from tasks-minimal), the text, its
// stickers; a row in a day (`entry`), a card in the bottom panel (`taskCard`), and their hover buttons.
import { T } from "./data.js";

export function makeCards(ctx, actions, drag, swipe) {
  const { areaIcons, difficulties } = ctx.config;
  const area  = t => T(t).area;
  const label = t => `${areaIcons[area(t)] ?? ""} ${T(t).text}`.trim();
  const stickers = t => T(t).stickers.map(name => app.metadataCache.getFirstLinkpathDest(name, t.path))
    .filter(Boolean).map(file => app.vault.getResourcePath(file));

  // small panel under the stars: one row per difficulty and "none"; the choice rewrites the tag (with undo)
  const difficultyPicker = (anchor, t) => {
    document.querySelector(".winx-cal-picker")?.remove();
    const box = document.body.createEl("div", { cls: "winx-cal-picker" });
    const r = anchor.getBoundingClientRect();
    Object.assign(box.style, { left: `${Math.min(r.left, innerWidth - 170)}px`, top: `${r.bottom + 4}px` });
    for (const { label, tag } of [...difficulties, { label: "☆ none", tag: null }])
      box.createEl("button", { text: label }).onclick = async () => { box.remove(); await actions.setDifficulty(t, tag); };
    const close = e => { if (!box.contains(e.target)) { box.remove(); document.removeEventListener("pointerdown", close, true); } };
    setTimeout(() => document.addEventListener("pointerdown", close, true));
  };
  // a click on the stars (a pale ☆ when there are none) opens the difficulty picker
  const taskText = (el, t, withIcon = true) => {
    const star  = T(t).difficulty;
    const stars = star ? el.createEl("span", { cls: "tag", attr: { "data-tag-name": star } }) : el.createEl("span", { cls: "winx-cal-nostar", text: "☆" });
    stars.title = "difficulty";
    stars.onclick = e => { e.stopPropagation(); difficultyPicker(stars, t); };
    el.appendText(` ${withIcon ? label(t) : T(t).text} `);
    for (const src of stickers(t)) el.createEl("img", { cls: "winx-cal-sticker", attr: { src, alt: "" } });
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
      await actions.remove(t);
    };
  };
  // ⭐ (phone only, CSS), round ⏭ (🔁 only), ✏️ (the task window, then the Tasks edit dialog) and 🗑
  const taskButtons = (parent, t, card, star = true) => {
    if (star) {
      const diff = parent.createEl("button", { text: "⭐", cls: "winx-cal-diffbtn", attr: { title: "difficulty", "aria-label": "difficulty" } });
      diff.onclick = () => difficultyPicker(diff, t);
    }
    if (actions.canSkip(t)) parent.createEl("button", { text: "⏭", attr: { title: "skip this time", "aria-label": "skip this time" } }).onclick = () => { card.remove(); actions.skip(t); };
    parent.createEl("button", { text: "✏️", attr: { title: "edit: difficulty, area, time, sticker, then text and dates", "aria-label": "edit task" } }).onclick = () => actions.edit(t);
    trashButton(parent, t, card);
  };

  // a task in a day; the area shows as a colored stripe on the left (colors and legend in the styles / the header).
  // Week view: a checkbox like the Kanban's; ticking goes through the Tasks plugin (🔁 gets its next copy), with undo.
  // A tick waits 2 s (struck through, a gold shimmer) before it's written: unticking in time leaves the file alone.
  // The tick sound comes from installSounds (it listens to every .task-list-item-checkbox)
  const entry = (parent, { t, kind }, compact) => {
    const el = parent.createEl("div", { cls: `winx-cal-task ${kind}`, attr: area(t) ? { "data-area": area(t).slice(6) } : {} });
    let box = null;
    if (!compact && ctx.TASKS && kind !== "ghost") {
      box = el.createEl("input", { type: "checkbox", cls: "task-list-item-checkbox", attr: { "aria-label": "done" } });
      box.checked = box.disabled = kind === "done";
      let timer = null;
      box.onchange = () => {
        el.classList.toggle("ticking", box.checked);
        clearTimeout(timer);
        if (box.checked) timer = setTimeout(() => {
          box.disabled = true; el.classList.add("done"); el.querySelector(".winx-board-btns")?.remove();
          actions.tick(t);
        }, 2000);
      };
    }
    if (kind === "ghost") el.appendText("🔁 ");
    taskText(el, t, false);
    if (compact) el.title = label(t);
    if (kind !== "ghost") drag.draggable(el, t);
    // open tasks in the week view: the hover buttons, and the swipes on the phone
    if (!compact && kind === "open") {
      taskButtons(el.createEl("div", { cls: "winx-board-btns" }), t, el);   // CSS: fades in on hover on desktop
      if (box) swipe(el, t, () => { if (!box.checked) box.click(); });
    }
    return el;
  };

  // a card in the bottom panel: draggable onto the days, its text, a meta line, and the hover buttons
  // (⭐ ✏️ 🗑, plus `extra`); a pool card: `extra`, ✏️ and 🗑, and a swipe right adds it to today
  const taskCard = (parent, t, fillMeta, extra) => {
    const card = parent.createEl("div", { cls: "winx-board-card", attr: { draggable: "true" } });
    drag.draggable(card, t);
    taskText(card.createEl("div", { cls: "winx-board-text" }), t, false);
    fillMeta(card.createEl("div", { cls: "winx-board-meta" }));
    const btns = card.createEl("div", { cls: "winx-board-btns" });
    extra?.(btns);
    if (t.pool) {
      btns.createEl("button", { text: "✏️", attr: { title: "edit: difficulty, area, time, sticker, then text", "aria-label": "edit task" } }).onclick = () => actions.edit(t);
      trashButton(btns, t, card);
      swipe(card, t, () => actions.fromPool(t, ctx.today, false));
      return card;
    }
    taskButtons(btns, t, card);
    if (ctx.TASKS) swipe(card, t, () => { card.remove(); actions.tick(t); });
    return card;
  };

  return { area, label, taskText, taskButtons, entry, taskCard };
}
