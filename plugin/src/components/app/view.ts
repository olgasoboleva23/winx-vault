import { ItemView, Keymap, Platform, type ViewStateResult } from "obsidian";
import { reactive, watch } from "vue";
import { useVueApp } from "#/composables/vueApp.ts";
import { isStep, readState, saved, withParams } from "#/store/router.js";
import { pages, type PageDef } from "./pages.ts";
import WinxApp from "./WinxApp/index.vue";

// The Winx tab: one tab, its pages (pages.ts) shown one at a time under the shell's pill (the
// phone's bottom bar). Its state (the page shown, each page's own) is saved with the layout; a
// page switch is a step in Obsidian's back / forward, a week inside the calendar is not. A kept
// page switched away is hidden, not unloaded, so coming back is instant.
export const WINX_VIEW = "winx";

type Page = ReturnType<PageDef["make"]>;

const fresh = readState(undefined);

export class WinxView extends ItemView {
  navigation = true;   // Obsidian records a history step only for a navigation view
  // the saved state, plus the calendar's unsaved area and picked day
  state = reactive({
    ...fresh,
    calendar: { ...fresh.calendar, area: null as string | null, picked: null as string | null },
  });
  private made = new Map<string, { page: Page, el: HTMLElement }>();
  private shown: string | null = null;
  private pagesEl: HTMLElement | null = null;

  constructor(leaf: ItemView["leaf"]) {
    super(leaf);
    const json = () => JSON.stringify(saved(this.state));

    this.register(watch(json, () => this.app.workspace.requestSaveLayout()));
  }
  getViewType() { return WINX_VIEW; }
  getDisplayText() { return pages[this.state.page]?.title ?? "Winx"; }
  getIcon() { return "sparkles"; }

  getState() { return saved(this.state); }
  async setState(s: unknown, result: ViewStateResult) {
    const next = readState(s);

    if (this.shown) result.history = isStep(this.state, next);
    for (const [k, v] of Object.entries(next)) {
      const own = (this.state as any)[k];

      if (typeof v === "object" && v) Object.assign(own, v);
      else (this.state as any)[k] = v;
    }

    await super.setState(s, result);
    this.show(next.page);
  }

  // to a page (params: its own state merged in); Cmd/Ctrl-click: in a new Winx tab, a copy of this
  // one's state
  async go(page: string, params = {}, e?: MouseEvent | null) {
    const state = withParams(saved(this.state), page, params);

    if (Keymap.isModEvent(e)) {
      const leaf = this.app.workspace.getLeaf("tab");

      await leaf.setViewState({ type: WINX_VIEW, state, active: true });
    } else {
      await this.leaf.setViewState({ type: WINX_VIEW, state });
    }
  }

  async onOpen() {
    const phone = Platform.isMobile;

    this.contentEl.addClasses(["winx-app", "dashboard", ...(phone ? ["winx-app--phone"] : [])]);
    this.pagesEl = this.contentEl.createDiv({ cls: "winx-app__pages" });
    const nav = this.contentEl.createDiv({ cls: "winx-app__nav" });

    useVueApp(this, nav, WinxApp, { provide: { winx: this } });
  }
  onResize() { this.current()?.page.catchUp?.(); }
  async onClose() {
    for (const { page } of this.made.values()) this.removeChild(page);
    this.made.clear();
    this.shown = null;
    this.contentEl.empty();
  }

  private current() { return this.shown ? this.made.get(this.shown) : undefined; }

  // the page `key` shown: the one before hidden (kept) or unloaded; made the first time
  private show(key: string) {
    if (key === this.shown || !this.pagesEl) return;

    const old = this.current();

    if (old && pages[this.shown!].keep) old.el.hide();
    else if (old) {
      this.removeChild(old.page);
      old.el.remove();
      this.made.delete(this.shown!);
    }

    let now = this.made.get(key);

    if (now) now.el.show();
    else {
      const el = this.pagesEl.createDiv({ cls: "winx-app__page" });

      now = { el, page: this.addChild(pages[key].make(this, el)) };
      this.made.set(key, now);
    }

    this.shown = key;
    this.app.workspace.trigger("winx:page");
    (this.leaf as any).updateHeader?.();
  }
}
