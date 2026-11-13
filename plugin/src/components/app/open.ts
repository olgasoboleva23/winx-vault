import { ItemView, Keymap, type WorkspaceLeaf } from "obsidian";
import { app } from "#/helpers/app.js";
import { pageOf, WINX_VIEW } from "./pages.ts";
import type { WinxView } from "./view.ts";

// Opening Winx: ✨, the command and the reminders go to the Winx tab used last, or open one
// (pinned) on the dashboard; `newTab`: another one, not pinned. With a page: that page in it.
export async function openWinx(page?: string, params = {}, newTab = false) {
  const { workspace } = app;
  const newest = (a: any, b: any) => (b.activeTime ?? 0) - (a.activeTime ?? 0);
  let leaf: WorkspaceLeaf | undefined = newTab
    ? undefined : workspace.getLeavesOfType(WINX_VIEW).sort(newest)[0];

  if (!leaf) {
    // a fresh tab opens on its page in one call: no dashboard step to go Back to
    leaf = workspace.getLeaf("tab");
    const state = page ? { page, [page]: params } : undefined;

    await leaf.setViewState({ type: WINX_VIEW, active: true, state });
    if (!newTab) leaf.setPinned(true);
    await workspace.revealLeaf(leaf);
    return leaf;
  }

  await workspace.revealLeaf(leaf);   // loads a tab still deferred since the start
  if (page) await (leaf.view as WinxView).go(page, params);
  return leaf;
}

// the Winx tab in front, if it is one
export const activeWinx = (): WinxView | null => {
  const view = app.workspace.getActiveViewOfType(ItemView);

  return view?.getViewType() === WINX_VIEW ? view as WinxView : null;
};

// is a Winx tab the one in front?
export const inWinx = () => activeWinx() !== null;

// A link to a note: a Winx page's note (Finance, Shop, Supplies, Food) switches the page of the
// Winx tab in front, in place (Cmd/Ctrl: in a new Winx tab); any other note opens as a note
// does, in a new tab from a Winx tab, so that one stays where it is. `href` may be a short link
// ("Finance").
export function openNote(href: string, sourcePath: string, e?: MouseEvent | null,
  tab: WinxView | null = activeWinx()) {
  const path = app.metadataCache.getFirstLinkpathDest(href, sourcePath)?.path;
  const page = path ? pageOf(path) : null;

  if (tab && page) return void tab.go(page, {}, e);
  return void app.workspace.openLinkText(href, sourcePath, Keymap.isModEvent(e) || tab !== null);
}

// The old Winx tabs (winx-dashboard, winx-calendar, winx-projects) come back from a saved layout
// as a Winx tab on their page, with their state. For one release, then they go with their
// registerView.
export class OldWinxView extends ItemView {
  private type: string;
  private page: string;
  private timer = 0;

  constructor(leaf: WorkspaceLeaf, type: string, page: string) {
    super(leaf);
    this.type = type;
    this.page = page;
  }
  getViewType() { return this.type; }
  getDisplayText() { return "Winx"; }
  async onClose() { window.clearTimeout(this.timer); }

  // Obsidian calls it on every open (`{}` without a saved state). Moved a moment later: the leaf
  // ignores a setViewState while it is still busy with this one
  async setState(s: unknown) {
    const { page } = this;

    this.timer = window.setTimeout(() => {
      if (this.leaf.view !== this) return;   // closed or already something else
      // `popstate` (not in the typings, but read by Obsidian's setViewState): no Back step for
      // the old view this one replaces
      void this.leaf.setViewState({ type: WINX_VIEW, state: { page, [page]: s ?? {} },
        popstate: true } as any);
    });
  }
}
