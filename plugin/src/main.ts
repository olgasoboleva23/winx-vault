import { Plugin } from "obsidian";
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
    // the calendar: its own tab; the command and the ribbon icon open it, or go to the one already open
    this.registerView(VIEW_TYPE, leaf => new CalendarView(leaf));
    this.addCommand({ id: "open-calendar", name: "Open calendar", callback: () => this.openCalendar() });
    this.addRibbonIcon("calendar-days", "Winx calendar", () => this.openCalendar());
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
    if (!leaf) { leaf = workspace.getLeaf("tab"); await leaf.setViewState({ type: VIEW_TYPE, active: true }); }
    workspace.revealLeaf(leaf);
  }
  onunload() { delete (window as any).winx; }
}
