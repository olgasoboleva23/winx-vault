// The phone's swipes: a row right = done (a day's row: its checkbox; a Missed row: its ✓; a panel card: ticked, a
// pool card: added to today), left = skip a 🔁 task / take an open one's date off. Only a mostly-sideways swipe
// counts, so scrolling still works (touch-action: pan-y in the styles); a swipe stops its touches at the row, so
// Obsidian doesn't take a sideways one for opening a sidebar. `drag.on` (drag.js): a drag, not a swipe.
import { T, findTask } from "./data.js";

export function useSwipe(view, drag) {
  const el = view.contentEl;
  const swipes = new WeakMap();   // row → { x0, y0, dx, on }
  const row = e =>
    document.body.classList.contains("is-mobile") ? e.target.closest?.("[data-swipeable]") ?? null : null;
  const left = t => view.actions.canSkip(t) ? () => view.actions.skip(t)
    : T(t).date ? () => view.actions.unplan(t)
    : null;
  const right = (r, t) => {
    if (r.matches(".winx-missed__row")) return r.querySelector('[data-action="missedDone"]')?.click();
    if (r.matches(".winx-cal__task")) {
      const box = r.querySelector('input[data-action="tick"]');
      if (box && !box.checked) box.click();
      return;
    }
    if (t.pool) return view.actions.fromPool(t, view.ctx.today, false);
    if (view.ctx.TASKS) { r.remove(); view.actions.tick(t); }
  };
  view.registerDomEvent(el, "touchstart", e => {
    const r = row(e); if (!r) return;
    drag.on = false;
    e.stopPropagation();
    swipes.set(r, { x0: e.touches[0].clientX, y0: e.touches[0].clientY, dx: 0, on: false });
  }, { passive: true });
  view.registerDomEvent(el, "touchmove", e => {
    const r = row(e), s = r && swipes.get(r); if (!r || !s) return;
    const t = findTask(r.dataset.task, view.ctx?.model.all ?? []), back = t && left(t);
    const mx = e.touches[0].clientX - s.x0, my = e.touches[0].clientY - s.y0;
    if (!s.on && Math.abs(mx) > 12 && Math.abs(mx) > 1.5 * Math.abs(my)) s.on = true;
    if (s.on) e.stopPropagation();
    if (drag.on || !s.on || (mx < 0 && !back)) return;
    s.dx = mx;
    r.setCssProps({ "--winx-swipe": `${mx}px` });
    r.dataset.swipe = mx > 0 ? "done" : view.actions.canSkip(t) ? "skip" : "nodate";
  }, { passive: true });
  view.registerDomEvent(el, "touchend", e => {
    const r = row(e), s = r && swipes.get(r); if (!r || !s) return;
    r.setCssProps({ "--winx-swipe": "" }); delete r.dataset.swipe;
    if (drag.on || !s.on || Math.abs(s.dx) <= 80) return;
    const t = view.taskOf(r);
    if (!t) return;
    if (s.dx > 80) right(r, t); else left(t)?.();
  });
}
