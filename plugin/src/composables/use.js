// Composables: a piece of behaviour — its listeners and their removal — added to any Obsidian
// component, a tab (ItemView) or a widget's VueHost (composables/vueHost.ts). They listen through
// the component's registerDomEvent / registerEvent / registerInterval, so Obsidian drops it all
// when the component unloads.
import { debounce } from "obsidian";
import { todayYmd } from "#/helpers/dates.js";
import { dataview } from "#/helpers/plugins.js";
import { activeWinx, openNote } from "#/components/app/open.ts";

// redraw(): drawn now when shown, else once it shows (a leaf or the layout changes, the Winx tab
// switches its page) — catchUp() asks again
export function useRedraw(c, isShown, draw) {
  let stale = false;
  const redraw = () => { if (isShown()) { stale = false; draw(); } else stale = true; };

  const catchUp = () => { if (stale) redraw(); };

  c.registerEvent(c.app.workspace.on("active-leaf-change", catchUp));
  c.registerEvent(c.app.workspace.on("layout-change", catchUp));   // a sidebar or split shown
  c.registerEvent(c.app.workspace.on("winx:page", catchUp));   // a kept page shown again
  return { redraw, catchUp };
}

// fn(day) when the date changes (checked every minute)
export function useNewDay(c, fn) {
  let day = todayYmd();
  c.registerInterval(window.setInterval(() => {
    const now = todayYmd();

    if (now !== day) fn(day = now);
  }, 60_000));
}

// a write to a file watched(path) adds `cls` to el() (the dashboard's --busy: dimmed, the ✦ pill
// spinning) until the tab draws again and takes it off; 5 s at most
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

// fn() a moment (delay ms) after Dataview re-indexes a file that watched(path) says yes to (no
// watched: any file); with `note`, also when that note changes (Obsidian's own event, before
// Dataview has it)
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

// fn() each time Dataview's index is built (a cold start: Dataview reads the vault after the tabs
// and notes open)
export const useIndexReady = (c, fn) =>
  c.registerEvent(c.app.metadataCache.on("dataview:index-ready", fn));

// fn() a moment (delay ms) after Obsidian's own event for a file in `paths` (exact paths):
// for the files Dataview doesn't index, like .json
export function useFileChanges(c, fn, paths, delay = 1000) {
  const later = debounce(fn, delay, true);
  c.register(() => later.cancel());

  for (const ev of ["modify", "create", "delete"]) {
    c.registerEvent(c.app.vault.on(ev, f => paths.includes(f.path) && later()));
  }

  c.registerEvent(c.app.vault.on("rename", (f, old) =>
    (paths.includes(f.path) || paths.includes(old)) && later()));
}

// fn() once Dataview's index is there: now (or now when Dataview is off: fn shows what's missing),
// else when it's built; only the first time (Dataview builds it again when it reloads)
export function useWhenIndexed(c, fn) {
  const api = dataview();

  if (!api || api.index?.initialized) return void fn();
  let done = false;
  useIndexReady(c, () => { if (!done) { done = true; fn(); } });
}

// fn() when the dashboard tab's date changes, for a block `el` drawn in a dated tab
export const useTabDate = (c, el, fn) =>
  c.registerEvent(c.app.workspace.on("winx:date", () => el.closest("[data-date]") && fn()));

// [[links]] in `el` open their note, as in a note (Cmd/Ctrl: a new tab). In a Winx tab (winx()
// gives its view) a plain click on a Winx page's note switches the page, any other note opens in
// a new tab: the Winx tab stays where it is
export function useNoteLinks(c, el, winx = activeWinx) {
  c.registerDomEvent(el, "click", e => {
    const link = e.target.closest?.("a.internal-link[data-href]");

    if (!link) return;
    e.preventDefault();
    openNote(link.dataset.href, "", e, winx());
  });
}

// delayed calls by key, owned by `c`: later(key, fn, ms) (the same key again: the old one is
// dropped), cancel(key); all dropped when c unloads (a tab closed, the plugin off)
export function useLater(c) {
  const waiting = new Map();
  const cancel = key => {
    window.clearTimeout(waiting.get(key));
    waiting.delete(key);
  };

  c.register(() => { for (const key of [...waiting.keys()]) cancel(key); });
  const later = (key, fn, ms) => {
    cancel(key);
    waiting.set(key, window.setTimeout(() => {
      waiting.delete(key);
      fn();
    }, ms));
  };

  return { later, cancel };
}
