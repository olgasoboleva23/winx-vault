import { ItemView, Keymap, Notice, type ViewStateResult } from "obsidian";
import { reactive, watch } from "vue";
import { useVueApp } from "#/composables/vueApp.ts";
import { isStep, readState, saved, withParams } from "#/store/router.js";
import { pages, WINX_VIEW } from "./pages.ts";
import Winx from "./index.vue";

export { WINX_VIEW } from "./pages.ts";

export class WinxView extends ItemView {
  navigation = true;   // Obsidian records a history step only for a navigation view
  // the saved state, plus the calendar's unsaved area and picked day; a new one per tab
  state = (s => reactive({
    ...s, calendar: { ...s.calendar, area: null as string | null, picked: null as string | null },
  }))(readState(undefined));
  private closed = false;
  private mounted: ReturnType<typeof useVueApp> | null = null;

  constructor(leaf: ItemView["leaf"]) {
    super(leaf);
    const json = () => JSON.stringify(saved(this.state));

    this.register(watch(json, () => this.app.workspace.requestSaveLayout()));
  }
  getViewType() { return WINX_VIEW; }
  getDisplayText() { return pages[this.state.page as keyof typeof pages]?.title ?? "Winx"; }
  getIcon() { return "sparkles"; }

  getState() { return saved(this.state); }
  async setState(s: unknown, result: ViewStateResult) {
    const next = readState(s);

    if (this.mounted) result.history = isStep(this.state, next);
    for (const [k, v] of Object.entries(next)) {
      const own = (this.state as any)[k];

      if (typeof v === "object" && v) Object.assign(own, v);
      else (this.state as any)[k] = v;
    }

    await super.setState(s, result);
    if (this.closed) return;
    this.mounted ??= useVueApp(this, this.contentEl, Winx, {
      provide: { winx: this },
      onError: error => {
        console.error(error);
        new Notice(`${this.getDisplayText()}: couldn't draw: ${error.message}`);
      },
    });
    (this.leaf as any).updateHeader?.();
  }

  // to a page (params: its own state merged in); Cmd/Ctrl-click: in a new Winx tab, a copy of this
  // one's state
  async go(page: string, params = {}, e?: MouseEvent | null) {
    const state = withParams(this.state, page, params);

    if (Keymap.isModEvent(e)) {
      const leaf = this.app.workspace.getLeaf("tab");

      await leaf.setViewState({ type: WINX_VIEW, state, active: true });
    } else {
      await this.leaf.setViewState({ type: WINX_VIEW, state });
    }
  }

  async onOpen() {
    this.closed = false;
    this.contentEl.addClass("winx-host");
  }
  onResize() { this.app.workspace.trigger("winx:page"); }
  async onClose() {
    this.closed = true;
    this.mounted?.unmount();
    this.mounted = null;
  }
}
