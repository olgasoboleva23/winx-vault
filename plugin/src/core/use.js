// Composables: a piece of behaviour — its listeners and their removal — added to any Obsidian component, a tab
// (ItemView) or a widget (MarkdownRenderChild). They listen through the component's registerDomEvent /
// registerEvent / registerInterval, so Obsidian drops it all when the component unloads.
import { todayYmd } from "./dates.js";

// The element whose data-action an event runs, or null: a click on a button (or anything else that isn't a field
// or a form), a field's change when the field itself has the action (not its form's), a form's submit.
export function actionOf(type, target, root) {
  const el = target.closest?.("[data-action]");
  if (!el || !root.contains(el)) return null;
  if (type === "click") return el.matches("input, select, textarea, form") || target.closest("input, select, textarea") ? null : el;
  if (type === "change") return el === target ? el : null;
  if (type === "submit") return el.matches("form") ? el : null;
  return null;
}

// an event on an element with data-action="name" inside `el` runs find(name, element)'s handler (e, element)
export function useActions(c, el, find, types = ["click", "change"]) {
  const act = e => {
    const target = actionOf(e.type, e.target, el);
    const fn = target && find(target.dataset.action, target);
    if (!fn) return;
    if (e.type === "submit") e.preventDefault();
    fn(e, target);
  };
  for (const type of types) c.registerDomEvent(el, type, act);
}

// redraw(): drawn now when shown, else once it shows (a leaf or the layout changes) — catchUp() asks again
export function useRedraw(c, isShown, draw) {
  let stale = false;
  const redraw = () => { if (isShown()) { stale = false; draw(); } else stale = true; };
  const catchUp = () => { if (stale) redraw(); };
  c.registerEvent(c.app.workspace.on("active-leaf-change", catchUp));
  c.registerEvent(c.app.workspace.on("layout-change", catchUp));   // a sidebar or split shown
  return { redraw, catchUp };
}

// fn(day) when the date changes (checked every minute)
export function useNewDay(c, fn) {
  let day = todayYmd();
  c.registerInterval(window.setInterval(() => { const now = todayYmd(); if (now !== day) fn(day = now); }, 60_000));
}

// a write to a file watched(path) adds `cls` to el() (the tab's --busy: dimmed, the ✦ pill spinning) until the tab
// draws again and takes it off; 5 s at most
export function useBusy(c, watched, el, cls) {
  let timer = 0;
  c.registerEvent(c.app.vault.on("modify", f => {
    const target = watched(f.path) && el();
    if (!target) return;
    target.classList.add(cls);
    window.clearTimeout(timer);
    timer = window.setTimeout(() => target.classList.remove(cls), 5000);
  }));
}
