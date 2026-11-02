import { FuzzySuggestModal, Notice, Platform, Plugin } from "obsidian";
import { Task } from "../tasks/task.js";
import { KINDS } from "../notes/kinds.js";
import { Note, notePath } from "../notes/note.js";
import { mirrorMobileConfig } from "../services/mobileConfig.js";
import { Form } from "../uikit/form.ts";
import { todayYmd } from "../core/dates.js";
import { taskWindow } from "../tasks/taskEdit.js";
import { pickTask } from "../tasks/taskSearch.js";
import { addMarketItem } from "../widgets/market/marketSearch.js";
import { logPurchase } from "../widgets/shop/wallet.js";
import { appendLine, edit } from "../core/files.js";
import { tasksApi } from "../core/plugins.js";

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
    const api = tasksApi();
    if (!api) return void new Notice("✦ the Tasks plugin is off — task not saved");
    // ➕ shows how long it waits on the board
    const result = await api.editTaskLineModal(`- [ ] ${[pick.difficulty, pick.area, pick.time, found.name].filter(Boolean).join(" ")}  ➕ ${todayYmd()}`);
    if (!result) return;
    const line = new Task(result).setSticker(pick.sticker);   // after the text typed in the Tasks modal
    // a pool line (no checkbox, no dates) goes to the end of Pool.md, made on first use; a task to the top of Master.md
    if (pick.pool) {
      const poolLine = new Task(line).poolLine;
      return void await appendLine(POOL, poolLine, { header: "Tasks to pick when it's time: drag one from the calendar's Pool tab onto a day.\n\n" });
    }
    if (!app.vault.getFileByPath(MASTER)) return void new Notice(`✦ ${MASTER} not found — task not saved`);
    await edit(MASTER, (c: string) => line + "\n" + c);
  });

  // a watch / read / game / recipe / work task note (notes/kinds.js), in its folder, opened in a new tab
  for (const kind of Object.values(KINDS) as any[]) {
    add(kind.id, kind.name, async () => {
      const { rows, values, required } = kind.form();
      const v = await Form.ask(app, `✦ ${kind.name}`, rows, { values, required, submit: "Create" });
      if (!v) return;
      const dir = (kind.setting && (await plugin.loadData())?.[kind.setting]) || kind.folder;
      const path = notePath(dir, v.title, (p: string) => !!app.vault.getAbstractFileByPath(p));
      if (!app.vault.getFolderByPath(dir)) await app.vault.createFolder(dir);
      await app.workspace.getLeaf("tab").openFile(await app.vault.create(path, new Note(kind.note(v, todayYmd())).text));
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

  // the phone: the synced obsidian-mobile/ copied into the real config folder .obsidian-mobile (then restart)
  if (Platform.isMobile) add("update-mobile-config", "Update mobile config", mirrorMobileConfig);

  // Alt+T: every Winx command in one list to pick from
  plugin.addCommand({
    id: "menu", name: "Menu", hotkeys: [{ modifiers: ["Alt"], key: "t" }],
    callback: () => new WinxMenu(app).open(),
  });
}

class WinxMenu extends FuzzySuggestModal<any> {
  getItems() { return (this.app as any).commands.listCommands().filter((c: any) => c.id.startsWith("winx:") && c.id !== "winx:menu"); }
  getItemText(c: any) { return c.name.replace(/^Winx: /, ""); }
  onChooseItem(c: any) { (this.app as any).commands.executeCommandById(c.id); }
}
