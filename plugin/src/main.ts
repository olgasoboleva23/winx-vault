import { Plugin } from "obsidian";

// The Winx plugin: widgets for the notes' dataviewjs blocks (window.winx.render), the task window and the
// commands, and the styles (styles.css, built from styles/*.scss).
type Widget = (dv: unknown, input?: unknown) => Promise<void> | void;
const widgets: Record<string, Widget> = {};

export default class WinxPlugin extends Plugin {
  async onload() {
    (window as any).winx = {
      // a note's block: await winx.render("weight", dv, input)
      render: async (name: string, dv: any, input?: unknown) => {
        const widget = widgets[name];
        if (!widget) return dv.el("div", `winx: no widget "${name}"`);
        await widget(dv, input);
      },
    };
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
  onunload() { delete (window as any).winx; }
}
