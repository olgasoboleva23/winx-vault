// Phone tasks: left reveals their buttons, further left arms the primary action; right closes.
// Keep vertical scrolling native, and keep horizontal touches out of Obsidian's sidebar gesture.
import { reactive } from "vue";

const OPEN = 32, COMMIT = 160;

export function useSwipe(view, key, primary, when = () => true) {
  const swipe = reactive({ kind: null, progress: 0 });
  let s = null;
  const reset = open => Object.assign(swipe, { kind: open ? "open" : null, progress: 0 });
  const cancel = () => {
    if (s) reset(s.open);
    s = null;
  };

  const run = () => {
    const t = when() && view.task(key());

    reset(false);
    if (t) primary(t);
  };

  const start = e => {
    if (!when() || !document.body.classList.contains("is-mobile")) return;
    e.stopPropagation();
    if (e.touches.length !== 1) return cancel();
    if (e.target.closest("button, input, a")) return;
    view.drag.on = false;
    s = { x: e.touches[0].clientX, y: e.touches[0].clientY, axis: null,
      open: !!swipe.kind, dx: 0 };
  };

  const move = e => {
    if (!s) return;
    if (e.touches.length !== 1 || view.drag.on || !when()) return cancel();
    const dx = e.touches[0].clientX - s.x, dy = e.touches[0].clientY - s.y;

    if (!s.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 12)
      s.axis = Math.abs(dx) > 1.5 * Math.abs(dy) ? "x" : "y";
    if (s.axis !== "x") return;
    e.stopPropagation();
    s.dx = dx;
    swipe.progress = Math.min(1, Math.max(0, -dx / COMMIT));
    swipe.kind = dx <= -COMMIT ? "ready"
      : dx <= -OPEN || (s.open && dx < OPEN) ? "open" : null;
  };

  const end = e => {
    if (!s) return;
    const { axis, open, dx } = s;
    const commit = swipe.kind === "ready" && !view.drag.on;

    s = null;
    if (axis !== "x") return reset(open);
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();   // don't also tap a button exposed under the finger
    reset(dx <= -OPEN || (open && dx < OPEN));
    if (commit) run();
  };

  return { swipe, start, move, end, cancel, run };
}
