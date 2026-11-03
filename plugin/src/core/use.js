// Composables: a piece of behaviour — its listeners and their removal — added to any Obsidian component, a tab
// (ItemView) or a widget (MarkdownRenderChild). They listen through the component's registerDomEvent /
// registerEvent / registerInterval, so Obsidian drops it all when the component unloads.
import { Keymap, debounce } from "obsidian";
import { todayYmd } from "./dates.js";
import { dataview } from "./plugins.js";

// The element whose data-action an event runs, or null: a click on a button (or anything else that isn't a field
// or a form), a field's change when the field itself has the action (not its form's), a form's submit.
export function actionOf(type, target, root) {
  const el = target.closest?.("[data-action]");
  if (!el || !root.contains(el)) return null;
  if (type === "click") {
    return el.matches("input, select, textarea, form") || target.closest("input, select, textarea") ? null : el;
  }
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

// fn() a moment (delay ms) after Dataview re-indexes a file that watched(path) says yes to (no watched: any file);
// with `note`, also when that note changes (Obsidian's own event, before Dataview has it)
/**
 * @param {any} c @param {() => void} fn
 * @param {{ watched?: (path: string) => boolean, note?: string, delay?: number }} [options]
 */
export function useDataviewChanges(c, fn, options = {}) {
  const { watched = null, note = null, delay = 1000 } = options;
  const later = debounce(fn, delay, true);
  c.register(() => later.cancel());
  c.registerEvent(c.app.metadataCache.on("dataview:metadata-change", (_type, file) => {
    if (!watched || watched(file?.path ?? "")) later();
  }));
  if (note) c.registerEvent(c.app.metadataCache.on("changed", f => f.path === note && later()));
}

// fn() each time Dataview's index is built (a cold start: Dataview reads the vault after the tabs and notes open)
export const useIndexReady = (c, fn) => c.registerEvent(c.app.metadataCache.on("dataview:index-ready", fn));

// fn() once Dataview's index is there: now (or now when Dataview is off: fn shows what's missing), else when it's
// built; only the first time (Dataview builds it again when it reloads)
export function useWhenIndexed(c, fn) {
  const api = dataview();
  if (!api || api.index?.initialized) return void fn();
  let done = false;
  useIndexReady(c, () => { if (!done) { done = true; fn(); } });
}

// fn() when the window is back: shown again or focused (timers in a window in the background run late)
export function useWindowBack(c, fn) {
  c.registerDomEvent(document, "visibilitychange", () => document.hidden || fn());
  c.registerDomEvent(window, "focus", fn);
}

// fn() when the dashboard tab's date changes, for a block `el` drawn in a dated tab
export const useTabDate = (c, el, fn) =>
  c.registerEvent(c.app.workspace.on("winx:date", () => el.closest("[data-date]") && fn()));

// fn() a moment after leaving a field in `el`, so a click on the widget's own button (which takes the focus) lands
// first
export function useLeaveField(c, el, fn, delay = 500) {
  const left = debounce(fn, delay, true);
  c.register(() => left.cancel());
  c.registerDomEvent(el, "focusout", left);
}

// [[links]] in `el` open their note, as in a note (Cmd/Ctrl: a new tab)
export function useNoteLinks(c, el, isMod = Keymap.isModEvent) {
  c.registerDomEvent(el, "click", e => {
    const link = e.target.closest?.("a.internal-link[data-href]");
    if (link) { e.preventDefault(); void c.app.workspace.openLinkText(link.dataset.href, "", isMod(e)); }
  });
}
