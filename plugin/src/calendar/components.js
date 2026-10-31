// A task as the calendar draws it. Each component gets `task`: what the view knows about one task (its key in
// the view's map, area, difficulty, text, label with the area's icon, sticker image urls, pool, canSkip).
// Elements carry the key: data-task (which task), data-drag (draggable), data-swipeable (swipes on the phone);
// buttons and the stars carry data-action, handled by the calendar view.
// No whitespace between inline elements: the markup must lay out as the old createEl calls did.
import { html } from "../core/html.js";
import { Component } from "../uikit/component.js";
import { Button } from "../uikit/button.js";

// the difficulty stars (in the area's colour), the text, its stickers; the difficulty is changed in the task window (✏️)
export class TaskText extends Component {
  view({ task, withIcon = false }) {
    const stars = task.difficulty ? html`<span class="tag" data-tag-name="${task.difficulty}" title="difficulty"></span>` : "";
    return html`${stars} ${withIcon ? task.label : task.text} ${task.stickers.map(src => html`<img class="winx-cal-sticker" src="${src}" alt="">`)}`;
  }
}

// ⏭ (a dated 🔁 one), ✏️ (the task window, then the Tasks dialog), 🗑 (click twice)
export class TaskButtons extends Component {
  view({ task, editTitle = "edit: difficulty, area, time, sticker, then text and dates" }) {
    return html`${task.canSkip ? new Button({ icon: "⏭", title: "skip this time", action: "skip" }) : ""}${new Button({ icon: "✏️", title: editTitle, action: "edit" })}${new Button({ icon: "🗑", title: "delete task", action: "remove", cls: "winx-board-del" })}`;
  }
}

// a task in a day: kind open | ghost (a 🔁 repeat to come) | done. The week view has a checkbox (tick: the Tasks
// plugin is there) and, for an open one, the hover buttons and swipes; the month view only the text (title: label)
export class TaskRow extends Component {
  view({ task, kind, compact, tick }) {
    const box = !compact && tick && kind !== "ghost";
    const live = !compact && kind === "open";
    const attrs = html`${task.area ? html` data-area="${task.area}"` : ""} data-task="${task.key}"${kind !== "ghost" ? html` draggable="true" data-drag="${task.key}"` : ""}${live && box ? html` data-swipeable="${task.key}"` : ""}${compact ? html` title="${task.label}"` : ""}`;
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
    return html`<div class="winx-board-card${cls ? " " + cls : ""}"${task.area ? html` data-area="${task.area}"` : ""} draggable="true" data-task="${task.key}" data-drag="${task.key}" data-swipeable="${task.key}"><div class="winx-board-text">${new TaskText({ task })}</div><div class="winx-board-meta">${meta}</div><div class="winx-board-btns">${extra}${btns}</div></div>`;
  }
}
