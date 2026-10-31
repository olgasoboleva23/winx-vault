import { Notice, Plugin } from "obsidian";
import { Task } from "../tasks/task.js";
import { KINDS, itemForm, itemNote, itemPath } from "./items.js";
import { Form } from "../uikit/form.ts";
import config from "../core/config.js";
import { todayYmd } from "../core/dates.js";
import { taskWindow } from "../tasks/taskEdit.js";
import { addToMarket } from "../widgets/market/market.js";
import { logPurchase } from "../widgets/shop/wallet.js";
import { appendLine, edit } from "../core/files.js";

const MASTER = "02 Areas/Personal/Tasks/Master.md";
const POOL   = "02 Areas/Personal/Tasks/Pool.md";

// The commands in Cmd+P ("Winx: …"); each one window, then saved.
export function registerCommands(plugin: Plugin) {
  const { app } = plugin;
  const add = (id: string, name: string, run: () => Promise<void>) => plugin.addCommand({ id, name, callback: run });

  // difficulty, area, time of day, sticker (or "to pool") in one window; then the Tasks modal for the text and dates
  add("new-task", "New task", async () => {
    const pick = await taskWindow({}, true);
    if (!pick) return;
    const tasksApi = (app as any).plugins.plugins["obsidian-tasks-plugin"]?.apiV1;
    if (!tasksApi) return void new Notice("✦ the Tasks plugin is off — task not saved");
    // ➕ shows how long it waits on the board
    const result = await tasksApi.editTaskLineModal(`- [ ] ${pick.difficulty} ${pick.area}${pick.time ? " " + pick.time : ""}  ➕ ${todayYmd()}`);
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
      const path = itemPath(kind, v.title, (p: string) => !!app.vault.getAbstractFileByPath(p));
      if (!app.vault.getFolderByPath(KINDS[kind].folder)) await app.vault.createFolder(KINDS[kind].folder);
      await app.workspace.getLeaf("tab").openFile(await app.vault.create(path, itemNote(kind, v, todayYmd())));
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

  // a shopping item in the Celestial Market, by category
  add("new-market-item", "New market item", async () => {
    const { marketCategories } = config;
    const v = await Form.ask(app, "✦ New market item", [
      { name: "Category", key: "category", options: marketCategories.map((c: any) => ({ label: c.label, value: c.tag })) },
      { name: "Name", key: "name", text: "item name" },
    ], { required: ["category", "name"], submit: "Add" });
    if (!v) return;
    await addToMarket(v.name, v.category);
  });
}
