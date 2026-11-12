import { Platform, Plugin } from "obsidian";
import { WINX_VIEW, WinxView } from "./components/app/view.ts";
import { OldWinxView, openWinx } from "./components/app/open.ts";
import { registerCommands } from "./commands/commands.ts";
import { drawBlock } from "./controllers/blocks.js";
import { useNotify } from "./composables/notify.js";
import { redrawNotes } from "./helpers/plugins.js";
import { setApp } from "./helpers/app.js";
import { installSounds } from "./helpers/sounds.js";
import { useTaskStore } from "./store/tasks.js";

// The Winx plugin: the ```winx blocks (widgets), the Winx tab, the task window and the
// commands, and the styles (styles.css, built from src/styles/main.scss and the components'
// index.scss).

export default class WinxPlugin extends Plugin {
  async onload() {
    setApp(this.app);
    useTaskStore(this);   // the tasks, read by the plugin itself (store/tasks.js)
    installSounds(this);
    registerCommands(this);
    // a ```winx block in a note: a widget by name (controllers/blocks.js)
    this.registerMarkdownCodeBlockProcessor("winx", drawBlock);
    // the Winx tab (its pages: components/app/pages.ts); ✨ and the command go to the one used
    // last, or open it, pinned, on the dashboard
    this.registerView(WINX_VIEW, leaf => new WinxView(leaf));
    // the old tabs, from a layout saved before: a Winx tab on their page
    for (const page of ["dashboard", "calendar", "projects"])
      this.registerView(`winx-${page}`, leaf => new OldWinxView(leaf, `winx-${page}`, page));
    this.addCommand({ id: "open", name: "Open", callback: () => openWinx() });
    this.addRibbonIcon("sparkles", "Winx", () => openWinx());
    this.addCommand({   // after a rebuild: load the new main.js without restarting Obsidian
      id: "reload",
      name: "Reload",
      callback: async () => {
        const plugins = (this.app as any).plugins;
        await plugins.disablePlugin(this.manifest.id);
        await plugins.enablePlugin(this.manifest.id);
        redrawNotes();   // the widgets already drawn were unmounted with the old code
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

    // desktop: today's reminders; a click opens the calendar in the Winx tab
    useNotify(this, () => openWinx("calendar"));
  }
}
