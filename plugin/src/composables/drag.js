// The calendar's drag and drop: a task (data-drag) onto a day's zone, a chip of the drop bar, or
// the panel (data-drop; "" = no date). Returns { on }: true from a dragstart until the next touch,
// so a drag's finger moves don't count as a swipe (swipe.js).
import { AudioEngine } from "../helpers/sounds.js";

export function useDrag(view) {
  const el = view.contentEl, drag = { on: false };
  const sounds = {
    move: new AudioEngine("00 System/Assets/winx music/snd_scroll_menu.wav"),
    gem: new AudioEngine("00 System/Assets/winx music/snd_pickup_gem01.wav"),
  };
  let dragged = null;
  const zone = e => e.target.closest?.("[data-drop]") ?? null;
  view.registerDomEvent(el, "dragstart", e => {
    const src = e.target.closest?.("[data-drag]") ?? null;

    if (!src || !view.ctx?.model) return;
    dragged = view.taskOf(src);
    drag.on = true;
    e.dataTransfer?.setData("text/plain", "");
    // later: zones covering the card at dragstart cancel the drag
    window.setTimeout(() => view.ctx?.root?.classList.add("winx-cal--dragging"));
  });
  view.registerDomEvent(el, "dragend",
    () => view.ctx?.root?.classList.remove("winx-cal--dragging"));
  view.registerDomEvent(el, "dragover", e => {
    const z = zone(e);

    if (z) { e.preventDefault(); z.classList.add(`${z.classList[0]}--over`); }
  });
  view.registerDomEvent(el, "dragleave", e => {
    const z = zone(e);

    z?.classList.remove(`${z.classList[0]}--over`);
  });
  view.registerDomEvent(el, "drop", async e => {
    const z = zone(e);

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
