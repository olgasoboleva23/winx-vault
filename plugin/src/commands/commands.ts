import { FuzzySuggestModal, Notice, Platform, Plugin } from "obsidian";
import { KINDS } from "#/models/kinds.js";
import { mirrorMobileConfig } from "#/controllers/mobileConfig.js";
import { Form } from "#/components/uikit/Form/index.ts";
import { newTask } from "#/controllers/tasks.js";
import { migrateMarket } from "#/migrations/market.js";
import { migrateTasks } from "#/migrations/tasks.js";
import { openSettings } from "#/controllers/settings.js";
import { addMarketItem } from "#/controllers/widgets/market.js";
import { logPurchase } from "#/controllers/widgets/shop.js";
import { createNote } from "#/controllers/notes.js";
import { editCourse, newCourse, pickCourse } from "#/controllers/meds.js";
import { askNewProject } from "#/controllers/projects.js";


// The commands in Cmd+P ("Winx: …"); each one window, then saved.
export function registerCommands(plugin: Plugin) {
  const { app } = plugin;
  const add = (id: string, name: string, run: () => Promise<void>) =>
    plugin.addCommand({ id, name, callback: run });

  // a past task (its difficulty, area, time and sticker come along) or a new one: then difficulty,
  // area, time of day, sticker (or "to pool") in one window; then the Tasks modal for the text and
  // dates
  add("new-task", "New task", async () => void await newTask());

  // a watch / read / game / recipe / work task note (models/kinds.js), in its folder, opened in a
  // new tab
  for (const kind of Object.values(KINDS) as any[]) {
    add(kind.id, kind.name, async () => {
      const { rows, values, required } = kind.form();
      const v = await Form.ask(app, `✦ ${kind.name}`, rows, { values, required, submit: "Create" });

      if (!v) return;
      const dir = (kind.setting && (await plugin.loadData())?.[kind.setting]) || kind.folder;
      const file = await createNote(kind, v, dir);

      await app.workspace.getLeaf("tab").openFile(file);
    });
  }

  // a project: name, description, status, an optional cover; then the Projects tab opens on it
  add("new-project", "New project", async () => void await askNewProject(app));

  // a medication course (courses.json), then the Medication page opens; edited: the only one, or
  // the one picked (the ✎ on its card does the same)
  add("new-meds", "New medication course", async () => void await newCourse());
  add("edit-meds", "Edit medication course", async () => {
    const id = await pickCourse();

    if (id) await editCourse(id);
  });

  // a purchase, logged to Purchases.md (the wallet's spent)
  add("buy-reward", "Buy reward", async () => {
    const v = await Form.ask(app, "✦ Buy reward", [
      { name: "Name", key: "name", text: "what you bought" },
      { name: "Cost", key: "cost", text: "coins", number: true },
    ], { required: ["name", "cost"], submit: "Buy" });

    if (v && !await logPurchase(v.name, v.cost)) new Notice(`✦ Not enough gold for ${v.name}`);
  });

  // a shopping item in the Celestial Market: one bought before, or a new one with its category
  add("new-market-item", "New market item", addMarketItem);

  // the phone: the synced obsidian-mobile/ copied into the real config folder .obsidian-mobile
  // (then restart)
  if (Platform.isMobile) add("update-mobile-config", "Update mobile config", mirrorMobileConfig);

  // ⚙ the numbers and areas (config.json); the dashboard's ✦ Menu opens it through its link
  // obsidian://winx-settings
  add("settings", "Settings", openSettings);
  plugin.registerObsidianProtocolHandler("winx-settings", () => void openSettings());

  // once: the old emoji Master.md and Pool.md to ids, Dataview fields and tasks.json
  add("migrate-tasks", "Migrate tasks", migrateTasks);
  add("migrate-market", "Migrate market", migrateMarket);

  // every Winx command in one list to pick from (Alt+T in this vault's hotkeys.json)
  plugin.addCommand({
    id: "menu", name: "Menu",
    callback: () => new WinxMenu(app).open(),
  });
}

class WinxMenu extends FuzzySuggestModal<any> {
  getItems() {
    return (this.app as any).commands.listCommands()
      .filter((c: any) => c.id.startsWith("winx:") && c.id !== "winx:menu");
  }
  getItemText(c: any) { return c.name.replace(/^Winx: /, ""); }
  onChooseItem(c: any) { (this.app as any).commands.executeCommandById(c.id); }
}
