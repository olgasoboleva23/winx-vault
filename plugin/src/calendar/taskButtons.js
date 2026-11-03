// The task's own buttons, the same in every part (✏️ 🗑 ⏭ ✓): handlers by data-action for the calendar's useActions.
export function taskButtons(view) {
  const ticks = new WeakMap();   // a ticked row → its write, 2 s later
  return {
    edit: (e, el) => { const t = view.taskOf(el); if (t) view.actions.edit(t); },
    skip: (e, el) => {
      const t = view.taskOf(el);
      if (!t) return;
      el.closest("[data-task]")?.remove();
      view.actions.skip(t);
    },
    // 🗑: the first click arms it for 3 s, the second removes the task's line (with undo)
    remove: async (e, el) => {
      if (!el.classList.contains("winx-task-btns__del--armed")) {
        el.classList.add("winx-task-btns__del--armed"); el.textContent = "✓?"; el.title = "Click again to delete";
        window.setTimeout(() => {
          el.classList.remove("winx-task-btns__del--armed"); el.textContent = "🗑"; el.title = "Delete task";
        }, 3000);
        return;
      }
      const t = view.taskOf(el);
      if (!t) return;
      el.closest("[data-task]")?.remove();
      await view.actions.remove(t);
    },
    // a tick waits 2 s (struck through, a gold shimmer) before it's written: unticking in time leaves the file alone.
    // The sound comes from installSounds (it listens to every .task-list-item-checkbox)
    tick: (e, box) => {
      // the task as it is now: written 2 s later even if the calendar redraws meanwhile
      const row = box.closest(".winx-cal__task"), t = view.taskOf(row);
      row.classList.toggle("winx-cal__task--ticking", box.checked);
      window.clearTimeout(ticks.get(row));
      if (box.checked && t) ticks.set(row, window.setTimeout(() => {
        box.disabled = true; row.classList.add("winx-cal__task--done"); row.querySelector(".winx-task-btns")?.remove();
        view.actions.tick(t);
      }, 2000));
    },
  };
}
