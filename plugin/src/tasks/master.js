// Where a new task is written: one place for the New task command and the calendar's pool drop.
// addTask: the line on top of Master.md (false when Master.md is missing: nothing written).
// addPoolLine: a pool line (no checkbox, no dates) at the end of Pool.md, made on first use.
import { app } from "../core/app.js";
import { appendLine, edit } from "../core/files.js";
import { MASTER, POOL } from "../core/paths.js";

export async function addTask(line) {
  if (!app.vault.getFileByPath(MASTER)) return false;
  await edit(MASTER, c => line + "\n" + c);
  return true;
}

export const addPoolLine = line =>
  appendLine(POOL, line, {
    header: "Tasks to pick when it's time: drag one from the calendar's Pool tab onto a day.\n\n",
  });
