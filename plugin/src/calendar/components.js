// A task as the calendar draws it. Each component gets `task`: what the view knows about one task (its key in
// the view's map, area, difficulty, text, label with the area's icon, sticker image urls, pool, canSkip).
// Elements carry the key: data-task (which task), data-drag (draggable), data-swipe (swipes on the phone);
// buttons and the stars carry data-action, handled by the calendar view.
// No whitespace between inline elements: the markup must lay out as the old createEl calls did.
import { html } from "../ui/html.js";
import { Button, Component } from "../ui/component.js";

// gold difficulty stars (a pale ☆ when there are none; a click opens the picker), the text, its stickers
export class TaskText extends Component {
  view({ task, withIcon = false }) {
    const stars = task.difficulty
      ? html`<span class="tag" data-tag-name="${task.difficulty}" title="difficulty" data-action="difficulty"></span>`
      : html`<span class="winx-cal-nostar" title="difficulty" data-action="difficulty">☆</span>`;
    return html`${stars} ${withIcon ? task.label : task.text} ${task.stickers.map(src => html`<img class="winx-cal-sticker" src="${src}" alt="">`)}`;
  }
}

// ⭐ (phone only, CSS), ⏭ (a dated 🔁 one), ✏️ (the task window, then the Tasks dialog), 🗑 (click twice)
export class TaskButtons extends Component {
  view({ task, star = true, editTitle = "edit: difficulty, area, time, sticker, then text and dates" }) {
    return html`${star ? new Button({ icon: "⭐", title: "difficulty", action: "difficulty", cls: "winx-cal-diffbtn" }) : ""}${task.canSkip ? new Button({ icon: "⏭", title: "skip this time", action: "skip" }) : ""}${new Button({ icon: "✏️", title: editTitle, action: "edit" })}${new Button({ icon: "🗑", title: "delete task", action: "remove", cls: "winx-board-del" })}`;
  }
}

// a task in a day: kind open | ghost (a 🔁 repeat to come) | done. The week view has a checkbox (tick: the Tasks
// plugin is there) and, for an open one, the hover buttons and swipes; the month view only the text (title: label)
export class TaskRow extends Component {
  view({ task, kind, compact, tick }) {
    const box = !compact && tick && kind !== "ghost";
    const live = !compact && kind === "open";
    const attrs = html`${task.area ? html` data-area="${task.area}"` : ""} data-task="${task.key}"${kind !== "ghost" ? html` draggable="true" data-drag="${task.key}"` : ""}${live && box ? html` data-swipe="${task.key}"` : ""}${compact ? html` title="${task.label}"` : ""}`;
    const check = kind === "done"
      ? html`<input type="checkbox" class="task-list-item-checkbox" aria-label="done" checked disabled>`
      : html`<input type="checkbox" class="task-list-item-checkbox" aria-label="done" data-action="tick">`;
    return html`<div class="winx-cal-task ${kind}"${attrs}>${box ? check : ""}${kind === "ghost" ? "🔁 " : ""}${new TaskText({ task })}${live ? html`<div class="winx-board-btns">${new TaskButtons({ task })}</div>` : ""}</div>`;
  }
}

// a card in the bottom panel: its text, a meta line (text or markup), and the hover buttons: `extra` first, then
// ⭐ ⏭ ✏️ 🗑 — or ✏️ 🗑 for a pool item
export class TaskCard extends Component {
  view({ task, meta, extra = "", cls = "" }) {
    const btns = task.pool
      ? html`${new Button({ icon: "✏️", title: "edit: difficulty, area, time, sticker, then text", action: "edit" })}${new Button({ icon: "🗑", title: "delete task", action: "remove", cls: "winx-board-del" })}`
      : new TaskButtons({ task });
    return html`<div class="winx-board-card${cls ? " " + cls : ""}" draggable="true" data-task="${task.key}" data-drag="${task.key}" data-swipe="${task.key}"><div class="winx-board-text">${new TaskText({ task })}</div><div class="winx-board-meta">${meta}</div><div class="winx-board-btns">${extra}${btns}</div></div>`;
  }
}
