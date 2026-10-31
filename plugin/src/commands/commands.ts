import { Notice, Plugin } from "obsidian";
import { Task } from "../tasks/task.js";
import { KINDS, itemForm, itemNote, itemPath, fillTemplate } from "./items.js";
import { Form } from "../uikit/form.ts";
import { todayYmd } from "../core/dates.js";
import { taskWindow } from "../tasks/taskEdit.js";
import { pickTask } from "../tasks/taskSearch.js";
import { addMarketItem } from "../widgets/market/marketSearch.js";
import { logPurchase } from "../widgets/shop/wallet.js";
import { appendLine, edit } from "../core/files.js";

const MASTER = "02 Areas/Personal/Tasks/Master.md";
const POOL   = "02 Areas/Personal/Tasks/Pool.md";

// The commands in Cmd+P ("Winx: …"); each one window, then saved.
export function registerCommands(plugin: Plugin) {
  const { app } = plugin;
  const add = (id: string, name: string, run: () => Promise<void>) => plugin.addCommand({ id, name, callback: run });

  // a past task (its difficulty, area, time and sticker come along) or a new one: then difficulty, area, time of day,
  // sticker (or "to pool") in one window; then the Tasks modal for the text and dates
  add("new-task", "New task", async () => {
    const found = await pickTask();
    if (!found) return;
    const ready = !found.isNew && found.picks.difficulty && found.picks.area;
    const pick = ready ? found.picks : await taskWindow(found.picks ?? {}, true);
    if (!pick) return;
    const tasksApi = (app as any).plugins.plugins["obsidian-tasks-plugin"]?.apiV1;
    if (!tasksApi) return void new Notice("✦ the Tasks plugin is off — task not saved");
    // ➕ shows how long it waits on the board
    const result = await tasksApi.editTaskLineModal(`- [ ] ${[pick.difficulty, pick.area, pick.time, found.name].filter(Boolean).join(" ")}  ➕ ${todayYmd()}`);
    if (!result) return;
    const line = new Task(result).setSticker(pick.sticker);   // after the text typed in the Tasks modal
    // a pool line (no checkbox, no dates) goes to the end of Pool.md, made on first use; a task to the top of Master.md
    if (pick.pool) {
      const poolLine = new Task(line).poolLine;
      return void await appendLine(POOL, poolLine, { header: "Tasks to pick when it's time: drag one from the calendar's Pool tab onto a day.\n\n" });
    }
    if (!app.vault.getFileByPath(MASTER)) return void new Notice(`✦ ${MASTER} not found — task not saved`);
    await edit(MASTER, c => line + "\n" + c);
  });

  // a watch / read / game note in its Collections folder, opened in a new tab
  for (const [kind, name] of [["watch", "New watch item"], ["read", "New read item"], ["game", "New game"]] as const) {
    add(`new-${kind}-item`, name, async () => {
      const { rows, values, required } = itemForm(kind);
      const v = await Form.ask(app, KINDS[kind].title, rows, { values, required, submit: "Create" });
      if (!v) return;
      const path = itemPath(KINDS[kind].folder, v.title, (p: string) => !!app.vault.getAbstractFileByPath(p));
      if (!app.vault.getFolderByPath(KINDS[kind].folder)) await app.vault.createFolder(KINDS[kind].folder);
      await app.workspace.getLeaf("tab").openFile(await app.vault.create(path, itemNote(kind, v, todayYmd())));
    });
  }

  // a note from a template in 00 System/Templates, in its folder, opened in a new tab (what QuickAdd did);
  // the work tasks' folder can be set as "workTasks" in the plugin's data.json
  for (const [id, name, template, folder] of [
    ["new-recipe", "New recipe", "recipe.md", "03 Resources/Collections/Recipes"],
    ["new-work-task", "New work task", "task.md", ""],
  ]) {
    add(id, name, async () => {
      const dir = folder || (await plugin.loadData())?.workTasks || "01 Projects/Work/tasks";
      const file = app.vault.getFileByPath(`00 System/Templates/${template}`);
      if (!file) return void new Notice(`✦ 00 System/Templates/${template} not found`);
      const v = await Form.ask(app, `✦ ${name}`, [{ name: "Title", key: "title", text: "title" }], { required: ["title"], submit: "Create" });
      if (!v) return;
      const path = itemPath(dir, v.title, (p: string) => !!app.vault.getAbstractFileByPath(p));
      if (!app.vault.getFolderByPath(dir)) await app.vault.createFolder(dir);
      const text = fillTemplate(await app.vault.read(file), path.split("/").pop()!.slice(0, -3), todayYmd());
      await app.workspace.getLeaf("tab").openFile(await app.vault.create(path, text));
    });
  }

  // a purchase, logged to Purchases.md (the wallet's spent)
  add("buy-reward", "Buy reward", async () => {
    const v = await Form.ask(app, "✦ Buy reward", [
      { name: "Name", key: "name", text: "what you bought" },
      { name: "Cost", key: "cost", text: "coins", number: true },
    ], { required: ["name", "cost"], submit: "Buy" });
    if (v) await logPurchase(v.name, v.cost);
  });

  // a shopping item in the Celestial Market: one bought before, or a new one with its category
  add("new-market-item", "New market item", addMarketItem);
}
