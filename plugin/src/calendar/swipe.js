// Phone: swipe a row right = `right` (done), left = skip a 🔁 task / take an open one's date off (to No date).
// Only a mostly-sideways swipe counts, so scrolling the page still works (touch-action: pan-y in the styles).
import { T } from "./data.js";

export function makeSwipe(actions) {
  return (el, t, right) => {
    if (!document.body.classList.contains("is-mobile")) return;
    const left = actions.canSkip(t) ? () => actions.skip(t) : T(t).date ? () => actions.unplan(t) : null;
    let x0 = 0, y0 = 0, dx = 0, on = false;
    el.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; on = false; }, { passive: true });
    el.addEventListener("touchmove", e => {
      const mx = e.touches[0].clientX - x0, my = e.touches[0].clientY - y0;
      if (!on && Math.abs(mx) > 12 && Math.abs(mx) > 1.5 * Math.abs(my)) on = true;
      if (!on || (mx < 0 && !left)) return;
      dx = mx; el.style.transform = `translateX(${dx}px)`; el.dataset.swipe = dx > 0 ? "done" : actions.canSkip(t) ? "skip" : "nodate";
    }, { passive: true });
    el.addEventListener("touchend", () => {
      el.style.transform = ""; delete el.dataset.swipe;
      if (on && dx > 80) right(); else if (on && dx < -80) left?.();
    });
  };
}
