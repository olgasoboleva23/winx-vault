// "Missed?": open tasks whose day (⏳, else 📅) has passed. ✓ marks one done on that day
// (toggled by the Tasks plugin, so a 🔁 task still gets its next copy, moved back with it for "when done"),
// ☀️ moves it to today. Shows nothing when nothing is missed.
// The calendar embeds it with render("yesterday", dv, { parent, drag, text }): drawn into `parent`, rows draggable onto its days,
// each row's text drawn by `text(el, t)` (the calendar's look: stars, sticker, area color).
import { H } from "../lib/helpers.js";
import { L } from "../lib/goalsLib.js";
import { Task } from "../lib/task.js";

export default async function (dv, input) {
  const { areaIcons } = await H.loadConfig();
  const SND = { done: new H.AudioEngine("00 System/Assets/winx music/snd_pickup_gem02.wav"), today: new H.AudioEngine("00 System/Assets/star.wav") };

  const today = H.today();
  const T     = t => (t.winxTask ??= Task.of(t));   // a Dataview task's Task, made once
  const day   = t => T(t).date;
  const items = dv.pages('"02 Areas/Personal/Tasks"').file.tasks
    .where(t => T(t).isOpen && day(t) && day(t) < today).array()
    .sort((a, b) => day(b).localeCompare(day(a)));   // most recent first
  if (!items.length) return;

  const label = t => `${areaIcons[T(t).area] ?? ""} ${T(t).text}`.trim();
  const tasks = app.plugins.plugins["obsidian-tasks-plugin"]?.apiV1;
  const doneOn = d => line => Task.backdateDone(tasks.executeToggleTaskDoneCommand(line, ""), d, today);

  const box = (input?.parent ?? dv.container).createEl("div", { cls: "winx-yesterday" });
  box.createEl("div", { cls: "winx-yesterday-head", text: "Missed?" });
  for (const t of items) {
    const row = box.createEl("div", { cls: "winx-yesterday-row" });
    input?.drag?.(row, t);
    if (input?.text) input.text(row.createEl("span"), t); else row.createEl("span", { text: label(t) });
    row.createEl("em", { text: `${day(t).slice(8)}.${day(t).slice(5, 7)}` });
    const act = async (snd, fn) => {
      row.remove();
      if (!box.querySelector(".winx-yesterday-row")) box.remove();
      if (!H.isMuted()) snd.play({ gain: 0.25 });
      await H.editTaskLine(t, fn, Task);
    };
    if (tasks) row.createEl("button", { text: "✓", attr: { title: `done on ${day(t)}` } }).onclick = () => act(SND.done, doneOn(day(t)));
    row.createEl("button", { text: "☀️", attr: { title: "move to today" } }).onclick = () => act(SND.today, line => new Task(line).setDue(today));
  }
}
