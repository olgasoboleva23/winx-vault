import { ItemView, Keymap, type WorkspaceLeaf } from "obsidian";
import { app } from "#/helpers/app.js";
import { pageOf, WINX_VIEW } from "./pages.js";
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
