import { Platform, Plugin } from "obsidian";
import { CalendarView, VIEW_TYPE } from "./components/pages/calendar/view.ts";
import { DashboardView, DASHBOARD_VIEW } from "./components/pages/dashboard/view.ts";
import { registerCommands } from "./commands/commands.ts";
import { drawBlock } from "./controllers/blocks.js";
import { useNotify } from "./composables/notify.js";
import { setApp } from "./helpers/app.js";
import { installSounds } from "./helpers/sounds.js";

// The Winx plugin: the ```winx blocks (widgets), the calendar tab, the task window and the
// commands, and the styles (styles.css, built from src/styles/main.scss and the components'
// index.scss).

export default class WinxPlugin extends Plugin {
  async onload() {
    setApp(this.app);
    installSounds(this);
    registerCommands(this);
    // a ```winx block in a note: a widget by name (controllers/blocks.js)
    this.registerMarkdownCodeBlockProcessor("winx", drawBlock);
    // the calendar: its own tab; the command opens it, or goes to the one already open.
    // The ✨ ribbon icon opens Winx: the dashboard and the calendar as two pinned tabs (or goes back
    // to them)
    this.registerView(VIEW_TYPE, leaf => new CalendarView(leaf));
    this.registerView(DASHBOARD_VIEW, leaf => new DashboardView(leaf));
    this.addCommand({
      id: "open-calendar", name: "Open calendar", callback: () => this.open(VIEW_TYPE),
    });
    this.addCommand({
      id: "open-dashboard", name: "Open dashboard", callback: () => this.open(DASHBOARD_VIEW),
    });
    this.addRibbonIcon("sparkles", "Winx", () => this.openWinx());
    this.addCommand({   // after a rebuild: load the new main.js without restarting Obsidian
      id: "reload",
      name: "Reload",
      callback: async () => {
        const plugins = (this.app as any).plugins;
        await plugins.disablePlugin(this.manifest.id);
        await plugins.enablePlugin(this.manifest.id);
      },
    });
    // the phone has no status bar: "✦ syncing" (the star spinning) at the top while Remotely Save
    // syncs
    if (Platform.isMobile) {
      // hidden even before the styles load
      const badge = document.body.createDiv({
        cls: "winx-syncing", attr: { style: "display: none" },
      });
      badge.createSpan({ cls: "winx-syncing__star", text: "✦" });
      badge.appendText("syncing");
      this.register(() => badge.remove());
      const syncing = () => (this.app as any).plugins.plugins["remotely-save"]?.isSyncing;
      this.registerInterval(window.setInterval(() => {
        badge.style.display = syncing() ? "flex" : "none";
      }, 500));
    }

    // desktop: today's reminders; a click opens the calendar
    useNotify(this, () => this.open(VIEW_TYPE));
  }
  // a Winx tab, pinned: the one already open, or a new one
  async open(type: string, reveal = true) {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(type)[0];

    if (!leaf) {
      leaf = workspace.getLeaf("tab");
      await leaf.setViewState({ type, active: reveal });
      leaf.setPinned(true);
    }

    if (reveal) void workspace.revealLeaf(leaf);
    return leaf;
  }
  // ✨: back to the Winx tab used last, or both tabs opened (the dashboard shown)
  async openWinx() {
    const { workspace } = this.app;
    const open = [DASHBOARD_VIEW, VIEW_TYPE].flatMap(t => workspace.getLeavesOfType(t));

    if (open.length)
      return workspace.revealLeaf(
        open.sort((a: any, b: any) => (b.activeTime ?? 0) - (a.activeTime ?? 0))[0],
      );
    const dash = await this.open(DASHBOARD_VIEW, false);
    await this.open(VIEW_TYPE, false);
    void workspace.revealLeaf(dash);
  }
}
