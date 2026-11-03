import { html } from "../../core/html.js";
import { Button } from "../../uikit/button.js";
import { TaskButtons, TaskText } from "../components.js";
import { T } from "../data.js";
import { dm } from "../../core/dates.js";
import { AudioEngine } from "../../core/sounds.js";
import { PART, Part } from "./part.js";

// ── "Missed?": open tasks whose day has passed, only while today is on screen ──
export class Missed extends Part {
  sounds = {
    done: new AudioEngine("00 System/Assets/winx music/snd_pickup_gem02.wav"),
    today: new AudioEngine("00 System/Assets/star.wav"),
  };
  on = {
    missedDone: (e, el) => this.act(el, this.sounds.done, t => this.view.actions.doneOnItsDay(t)),
    missedToday: (e, el) => this.act(el, this.sounds.today, t => this.view.actions.toToday(t)),
  };
  async act(el, sound, write) {
    const row = el.closest(".winx-missed__row"), box = row.parentElement, t = this.view.taskOf(row);
    if (!t) return;
    row.remove();
    if (!box.querySelector(".winx-missed__row")) box.remove();
    sound.play({ gain: 0.25 });
    await write(t);
  }
  render() {
    const { days, today, model: { missed } } = this.ctx;
    if (!days.includes(today) || !missed.length) return html``;
    const row = t => {
      const task = this.view.info(t);
      const area = task.area ? html` data-area="${task.area}"` : "";
      const keys = html`data-task="${task.key}" draggable="true" data-drag="${task.key}" data-swipeable="${task.key}"`;
      return html`<div class="winx-missed__row"${area} ${keys}>
        <span class="winx-missed__text">${T(t).isRecurring ? "🔁 " : ""}${new TaskText({ task })}</span>
        <div class="winx-task-btns">${new TaskButtons({ task })}</div>
        <em class="winx-missed__date">${dm(T(t).date)}</em>
        ${this.ctx.TASKS ? new Button({ icon: "✓", title: `done on ${T(t).date}`, action: "missedDone" }) : ""}
        ${new Button({ icon: "☀️", title: "move to today", action: "missedToday" })}
      </div>`;
    };
    return html`<div class="winx-missed"${PART("missed")}>
      <div class="winx-missed__head">Missed?</div>
      ${missed.map(row)}
    </div>`;
  }
}
