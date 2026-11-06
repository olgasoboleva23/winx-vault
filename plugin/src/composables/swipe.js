// A row's swipes on the phone (a day's row, a Missed row, a panel card): right = done, the row's
// own way (`right`: its checkbox, its ✓, ticked at once, a pool card added to today), left = skip
// a 🔁 task / take an open one's date off. Only a mostly-sideways swipe counts, so scrolling still
// works (touch-action: pan-y in the styles); a swipe stops its touches at the row, so Obsidian
// doesn't take a sideways one for opening a sidebar. `drag.on` (drag.js): a drag, not a swipe.
// `swipe`: how far the row follows the finger (dx → --winx-swipe) and what letting go does (kind →
// data-swipe: done | skip | nodate).
import { reactive } from "vue";
import { T } from "#/models/calendarData.js";

export function useSwipe(view, key, right, when = () => true) {
  const swipe = reactive({ dx: 0, kind: null });
  // x0, y0: where it started; on: sideways enough; t: the task; back: a left swipe's write
  let s = null;
  const left = t => view.actions.canSkip(t) ? () => view.actions.skip(t)
    : T(t).date ? () => view.actions.unplan(t)
    : null;

  const start = e => {
    if (!when() || !document.body.classList.contains("is-mobile")) return;
    view.drag.on = false;
    e.stopPropagation();
    s = { x0: e.touches[0].clientX, y0: e.touches[0].clientY, on: false };
  };

  const move = e => {
    if (!s) return;
    const mx = e.touches[0].clientX - s.x0, my = e.touches[0].clientY - s.y0;

    if (!s.on && Math.abs(mx) > 12 && Math.abs(mx) > 1.5 * Math.abs(my)) {
      s.on = true;
      s.t = view.task(key());
      s.back = s.t && left(s.t);
    }

    if (!s.on) return;
    e.stopPropagation();
    if (!s.t || view.drag.on || (mx < 0 && !s.back)) return;
    swipe.dx = mx;
    swipe.kind = mx > 0 ? "done" : view.actions.canSkip(s.t) ? "skip" : "nodate";
  };

  const end = () => {
    if (!s) return;
    const { on, t, back } = s, { dx } = swipe;

    s = null;
    Object.assign(swipe, { dx: 0, kind: null });
    if (!on || !t || view.drag.on || Math.abs(dx) <= 80) return;
    if (dx > 0) right(t); else back?.();
  };

  return { swipe, start, move, end };
}
