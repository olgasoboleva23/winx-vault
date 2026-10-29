import { Notice, Plugin } from "obsidian";
import { Task } from "./lib/task.js";
import { H } from "./lib/helpers.js";
import { KINDS, itemForm, itemNote, itemPath } from "./lib/items.js";
import { Form } from "./ui/form.ts";

const MASTER = "02 Areas/Personal/Tasks/Master.md";
const POOL   = "02 Areas/Personal/Tasks/Pool.md";
const MARKET = "00 System/Data/Celestial Market.md";

// The commands in Cmd+P ("Winx: …"); each one window, then saved.
export function registerCommands(plugin: Plugin) {
  const { app } = plugin;
  const add = (id: string, name: string, run: () => Promise<void>) => plugin.addCommand({ id, name, callback: run });

  // difficulty, area, time of day, sticker (or "to pool") in one window; then the Tasks modal for the text and dates
  add("new-task", "New task", async () => {
    const pick = await H.taskWindow({}, true);
    if (!pick) return;
    const tasksApi = (app as any).plugins.plugins["obsidian-tasks-plugin"]?.apiV1;
    if (!tasksApi) return void new Notice("✦ the Tasks plugin is off — task not saved");
    // ➕ shows how long it waits on the board
    const result = await tasksApi.editTaskLineModal(`- [ ] ${pick.difficulty} ${pick.area}${pick.time ? " " + pick.time : ""}  ➕ ${H.today()}`);
    if (!result) return;
    const line = new Task(result).setSticker(pick.sticker);   // after the text typed in the Tasks modal
    // a pool line (no checkbox, no dates) goes to the end of Pool.md, made on first use; a task to the top of Master.md
    if (pick.pool) {
      const poolLine = new Task(line).poolLine;
      const pool = app.vault.getFileByPath(POOL);
      if (pool) await app.vault.process(pool, c => c.trimEnd() + "\n" + poolLine + "\n");
      else await app.vault.create(POOL, "Tasks to pick when it's time: drag one from the calendar's Pool tab onto a day.\n\n" + poolLine + "\n");
      return;
    }
    const master = app.vault.getFileByPath(MASTER);
    if (!master) return void new Notice(`✦ ${MASTER} not found — task not saved`);
    await app.vault.process(master, c => line + "\n" + c);
  });

  // a watch / read / game note in its Collections folder, opened in a new tab
  for (const [kind, name] of [["watch", "New watch item"], ["read", "New read item"], ["game", "New game"]] as const) {
    add(`new-${kind}-item`, name, async () => {
      const { rows, values, required } = itemForm(kind);
      const v = await Form.ask(app, KINDS[kind].title, rows, { values, required, submit: "Create" });
      if (!v) return;
      const path = itemPath(kind, v.title, (p: string) => !!app.vault.getAbstractFileByPath(p));
      if (!app.vault.getFolderByPath(KINDS[kind].folder)) await app.vault.createFolder(KINDS[kind].folder);
      await app.workspace.getLeaf("tab").openFile(await app.vault.create(path, itemNote(kind, v, H.today())));
    });
  }

  // a purchase, logged to Purchases.md (the wallet's spent)
  add("buy-reward", "Buy reward", async () => {
    const v = await Form.ask(app, "✦ Buy reward", [
      { name: "Name", key: "name", text: "what you bought" },
      { name: "Cost", key: "cost", text: "coins", number: true },
    ], { required: ["name", "cost"], submit: "Buy" });
    if (v) await H.PurchaseLog.append(v.name, v.cost);
  });

  // a shopping item in the Celestial Market, by category
  add("new-market-item", "New market item", async () => {
    const { marketCategories } = await H.loadConfig();
    const v = await Form.ask(app, "✦ New market item", [
      { name: "Category", key: "category", options: marketCategories.map((c: any) => ({ label: c.label, value: c.tag })) },
      { name: "Name", key: "name", text: "item name" },
    ], { required: ["category", "name"], submit: "Add" });
    if (!v) return;
    const market = app.vault.getFileByPath(MARKET);
    if (!market) return void new Notice(`✦ ${MARKET} not found — item not saved`);
    await app.vault.process(market, c => c + `\n- [ ] ${v.name} ${v.category}`);
  });
}
