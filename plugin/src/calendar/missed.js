// "Missed?" between the header and the days, only while today is on screen: open tasks whose day has passed.
// ✓ marks one done on that day (through the Tasks plugin, so a 🔁 task still gets its next copy, moved back with it
// for "when done"), ☀️ moves it to today. Rows drag onto the days like any task. Nothing when nothing is missed.
import { H } from "../lib/helpers.js";
import { T, dm } from "./data.js";

export function drawMissed(ctx, actions, drag, cards, swipe) {
  if (!ctx.days.includes(ctx.today) || !ctx.missed.length) return [];
  const SND = { done: new H.AudioEngine("00 System/Assets/winx music/snd_pickup_gem02.wav"), today: new H.AudioEngine("00 System/Assets/star.wav") };
  const box = ctx.root.createEl("div", { cls: "winx-yesterday" });
  box.createEl("div", { cls: "winx-yesterday-head", text: "Missed?" });
  for (const t of ctx.missed) {
    const row = box.createEl("div", { cls: "winx-yesterday-row" });
    drag.draggable(row, t);
    const text = row.createEl("span");
    if (cards.area(t)) row.dataset.area = cards.area(t).slice(6);
    if (T(t).isRecurring) text.appendText("🔁 ");
    cards.taskText(text, t, false);
    cards.taskButtons(row.createEl("div", { cls: "winx-board-btns" }), t, row, false);   // ⏭ ✏️ 🗑, on hover
    row.createEl("em", { text: dm(T(t).date) });
    const act = async (snd, write) => {
      row.remove();
      if (!box.querySelector(".winx-yesterday-row")) box.remove();
      if (!H.isMuted()) snd.play({ gain: 0.25 });
      await write(t);
    };
    let doneBtn = null;
    if (ctx.TASKS) (doneBtn = row.createEl("button", { text: "✓", attr: { title: `done on ${T(t).date}` } })).onclick = () => act(SND.done, actions.doneOnItsDay);
    row.createEl("button", { text: "☀️", attr: { title: "move to today" } }).onclick = () => act(SND.today, actions.toToday);
    swipe(row, t, () => doneBtn?.click());   // its ✓: done on that day
  }
  return [box];
}
