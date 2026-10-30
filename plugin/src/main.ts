import { Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { CalendarView, VIEW_TYPE } from "./calendar/view.ts";
import { L } from "./lib/goalsLib.js";
import { Task } from "./lib/task.js";
import { H } from "./lib/helpers.js";
import { registerCommands } from "./commands.ts";
import { blocks, drawBlock } from "./widgets/blocks.js";
import { Widget } from "./widgets/widget.js";
import { html } from "./ui/html.js";

// The Winx plugin: the ```winx blocks (widgets), the calendar tab, the task window and the commands, and the
// styles (styles.css, built from styles/*.scss).

const DASHBOARD = "Dashboard.md";

export default class WinxPlugin extends Plugin {
  async onload() {
    (window as any).winx = {
      // the shared code, for 00 System/Scripts/notify.js (Templater's startup script)
      L, Task, H,
      // the widget classes, to try one from the console: winx.blocks.x = class extends winx.Widget { … }
      blocks, Widget, html,
    };
    H.watchCaches((emitter: any, name: string, cb: any) => this.registerEvent(emitter.on(name, cb)));
    H.installSounds(this);
    registerCommands(this);
    // a ```winx block in a note: a widget class by name (widgets/blocks.js)
    this.registerMarkdownCodeBlockProcessor("winx", drawBlock);
    // the calendar: its own tab; the command opens it, or goes to the one already open.
    // The ✨ ribbon icon opens Winx: the dashboard note and the calendar as two pinned tabs (or goes back to them)
    this.registerView(VIEW_TYPE, leaf => new CalendarView(leaf));
    this.addCommand({ id: "open-calendar", name: "Open calendar", callback: () => this.openCalendar() });
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
    console.log("winx loaded");
  }
  async openCalendar() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) { leaf = workspace.getLeaf("tab"); await leaf.setViewState({ type: VIEW_TYPE, active: true }); leaf.setPinned(true); }
    workspace.revealLeaf(leaf);
  }
  // ponytail: the dashboard is the note Dashboard.md until it becomes a tab of its own
  async openWinx() {
    const { workspace, vault } = this.app;
    const isDashboard = (l: WorkspaceLeaf) => (l.view as any).file?.path === DASHBOARD;
    const open = [...workspace.getLeavesOfType(VIEW_TYPE), ...workspace.getLeavesOfType("markdown").filter(isDashboard)];
    if (open.length) {   // the Winx tab used last
      workspace.revealLeaf(open.sort((a: any, b: any) => (b.activeTime ?? 0) - (a.activeTime ?? 0))[0]);
      return;
    }
    const file = vault.getAbstractFileByPath(DASHBOARD);
    if (!(file instanceof TFile)) return this.openCalendar();
    const dash = workspace.getLeaf("tab");
    await dash.openFile(file);
    dash.setPinned(true);
    const cal = workspace.getLeaf("tab");
    await cal.setViewState({ type: VIEW_TYPE });
    cal.setPinned(true);
    workspace.revealLeaf(dash);
  }
  onunload() { delete (window as any).winx; }
}
