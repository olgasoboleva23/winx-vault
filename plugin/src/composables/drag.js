// The calendar's drag and drop: a task (data-drag) onto a day's zone, a chip of the drop bar, or
// the panel (data-drop; "" = no date); in its own day (--source: no 📅 zone there, ✓ a strip at
// the bottom), onto another open task of its group, before or after it (by the half it's over).
// Returns { on }: true from a dragstart until the next touch, so a drag's finger moves don't count
// as a swipe (swipe.js).
import { AudioEngine } from "../helpers/sounds.js";
import { canReorder, findTask } from "../models/calendarData.js";

export function useDrag(view) {
  const el = view.contentEl, drag = { on: false };
  const sounds = {
    move: new AudioEngine("00 System/Assets/winx music/snd_scroll_menu.wav"),
    gem: new AudioEngine("00 System/Assets/winx music/snd_pickup_gem01.wav"),
  };
  let dragged = null, source = null, targets = new Map(), mark = null;
  const zone = e => e.target.closest?.("[data-drop]") ?? null;
  const SOURCE = ".winx-cal__day, .winx-cal__cell";
  // the open task the pointer is over in the source day, and whether it's over its lower half
  const target = e => {
    const row = e.target.closest?.("[data-task]");
    const r = row && targets.has(row) && row.getBoundingClientRect();

    return r ? { row, after: e.clientY > r.top + r.height / 2 } : null;
  };

  const unmark = () => {
    mark?.classList.remove("winx-cal__task--drop-before", "winx-cal__task--drop-after");
    mark = null;
  };

  view.registerDomEvent(el, "dragstart", e => {
    const src = e.target.closest?.("[data-drag]") ?? null;

    if (!src || !view.ctx?.model) return;
    dragged = view.taskOf(src);
    drag.on = true;
    source = src.closest(SOURCE);
    source?.classList.add(`${source.classList[0]}--source`);
    targets = new Map();
    for (const row of source?.querySelectorAll(".winx-cal__task--open[data-task]") ?? []) {
      const t = findTask(row.dataset.task, view.ctx.model.all);

      if (t && dragged && canReorder(dragged, t)) targets.set(row, t);
    }

    e.dataTransfer?.setData("text/plain", "");
    // later: zones covering the card at dragstart cancel the drag
    window.setTimeout(() => view.ctx?.root?.classList.add("winx-cal--dragging"));
  });
  view.registerDomEvent(el, "dragend", () => {
    view.ctx?.root?.classList.remove("winx-cal--dragging");
    source?.classList.remove(`${source.classList[0]}--source`);
    unmark();
  });
  view.registerDomEvent(el, "dragover", e => {
    const z = zone(e), to = !z && target(e);

    if (z) { e.preventDefault(); z.classList.add(`${z.classList[0]}--over`); }

    if (to?.row !== mark) unmark();
    if (!to) return;
    e.preventDefault();
    mark = to.row;
    mark.classList.toggle("winx-cal__task--drop-before", !to.after);
    mark.classList.toggle("winx-cal__task--drop-after", to.after);
  });
  view.registerDomEvent(el, "dragleave", e => {
    const z = zone(e);

    z?.classList.remove(`${z.classList[0]}--over`);
  });
  view.registerDomEvent(el, "drop", async e => {
    const z = zone(e), to = !z && target(e);

    if (to && dragged) {
      e.preventDefault(); e.stopPropagation(); unmark();
      const t = dragged;
      dragged = null;
      void sounds.move.play({ gain: 0.25 });
      return view.actions.reorder(t, targets.get(to.row), to.after);
    }

    if (!z) return;
    e.preventDefault(); e.stopPropagation();
    z.classList.remove(`${z.classList[0]}--over`);
    if (!dragged) return;
    const t = dragged, done = z.dataset.done === "1";
    dragged = null;
    void (done ? sounds.gem : sounds.move).play({ gain: 0.25 });
    await view.actions.place(t, z.dataset.drop || null, done);
  });
  return drag;
}
