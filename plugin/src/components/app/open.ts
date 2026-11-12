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
    leaf = workspace.getLeaf("tab");
    await leaf.setViewState({ type: WINX_VIEW, active: true });
    if (!newTab) leaf.setPinned(true);
  }

  await workspace.revealLeaf(leaf);   // loads a tab still deferred since the start
  if (page && leaf.view instanceof WinxView) await leaf.view.go(page, params);
  return leaf;
}

// is a Winx tab the one in front?
export const inWinx = () => app.workspace.getActiveViewOfType(WinxView) !== null;

// The old Winx tabs (winx-dashboard, winx-calendar) come back from a saved layout as a Winx tab on
// their page, with their state. For one release, then they go with their registerView.
export class OldWinxView extends ItemView {
  private type: string;
  private page: string;

  constructor(leaf: WorkspaceLeaf, type: string, page: string) {
    super(leaf);
    this.type = type;
    this.page = page;
  }
  getViewType() { return this.type; }
  getDisplayText() { return "Winx"; }

  // Obsidian calls it on every open (`{}` without a saved state). Moved a moment later: the leaf
  // ignores a setViewState while it is still busy with this one
  async setState(s: unknown) {
    const { page } = this;

    window.setTimeout(() => {
      void this.leaf.setViewState({ type: WINX_VIEW, state: { page, [page]: s ?? {} } });
    });
  }
}
