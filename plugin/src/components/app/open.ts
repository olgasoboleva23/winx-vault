import { ItemView, type WorkspaceLeaf } from "obsidian";
import { app } from "#/helpers/app.js";
import { WINX_VIEW, WinxView } from "./view.ts";

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
  if (page && leaf.view instanceof WinxView) await leaf.view.go(page, params);
  return leaf;
}

// the Winx tab in front, if it is one
export const activeWinx = () => app.workspace.getActiveViewOfType(WinxView);

// is a Winx tab the one in front?
export const inWinx = () => activeWinx() !== null;

// The old Winx tabs (winx-dashboard, winx-calendar) come back from a saved layout as a Winx tab on
// their page, with their state. For one release, then they go with their registerView.
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
      void this.leaf.setViewState({ type: WINX_VIEW, state: { page, [page]: s ?? {} } });
    });
  }
}
