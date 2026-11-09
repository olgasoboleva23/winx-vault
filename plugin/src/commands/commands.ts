import { FuzzySuggestModal, Notice, Platform, Plugin } from "obsidian";
import { KINDS } from "#/models/kinds.js";
import { mirrorMobileConfig } from "#/controllers/mobileConfig.js";
import { Form } from "#/components/uikit/Form/index.ts";
import { todayYmd } from "#/helpers/dates.js";
import { saveNewTask } from "#/controllers/tasks.js";
import { migrateTasks } from "#/controllers/taskMigration.js";
import { openSettings } from "#/controllers/settings.js";
import { taskWindow } from "#/components/uikit/TaskWindow/index.js";
import { pickTask } from "#/components/uikit/TaskSearch/index.js";
import { addMarketItem } from "#/controllers/widgets/market.js";
import { logPurchase } from "#/controllers/widgets/shop.js";
import { createNote } from "#/controllers/notes.js";
import { editCourse } from "#/controllers/meds.js";
import { tasksApi } from "#/helpers/plugins.js";
import { MASTER } from "#/helpers/paths.js";
import { Task } from "#/models/task.js";


// The commands in Cmd+P ("Winx: …"); each one window, then saved.
export function registerCommands(plugin: Plugin) {
  const { app } = plugin;
  const add = (id: string, name: string, run: () => Promise<void>) =>
    plugin.addCommand({ id, name, callback: run });

  // a past task (its difficulty, area, time and sticker come along) or a new one: then difficulty,
  // area, time of day, sticker (or "to pool") in one window; then the Tasks modal for the text and
  // dates
  add("new-task", "New task", async () => {
    const found = await pickTask();

    if (!found) return;
    const ready = !found.isNew && found.picks.difficulty && found.picks.area;
    const pick = ready ? found.picks : await taskWindow(found.picks ?? {}, true);

    if (!pick) return;
    const api = tasksApi();

    if (!api) return void new Notice("✦ Tasks plugin is off — task not saved");
    // created shows how long it waits on the board
    const result = await api.editTaskLineModal(Task.created(found.name, todayYmd()).line);

    if (!result) return;
    if (!await saveNewTask(found.name, pick, result, found.id)) {
      new Notice(`✦ ${MASTER} not found — task not saved`);
    }
  });

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

  // the open medication course, its window again (the ✎ on its card does the same)
  add("edit-meds", "Edit medication course", async () => {
    const file = app.workspace.getActiveFile();

    if (!file) return void new Notice("✦ Open a medication course first");
    await editCourse(file.path);
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
