// The calendar's drag and drop. A row (a day's task, a Missed row, a panel card: useDragSource) is
// dragged onto a day's zone, a chip of the drop bar or the panel (useDropZone; no day = no date),
// or, in its own day, onto another open task of its group, before or after it by the half it's
// over (useReorder). The tab's state (dragState, view.drag): the task and the day it's dragged
// from, so that day shows as the source (no 📅 zone there, ✓ a strip at the bottom); `active`
// once the tab shows its zones (a tick later: zones covering the row at dragstart cancel the
// drag); `on` from a dragstart until the next touch, so a drag's finger moves don't count as a
// swipe (swipe.js).
import { computed, reactive } from "vue";
import { AudioEngine } from "#/helpers/sounds.js";
import { SOUNDS } from "#/helpers/paths.js";
import { canReorder } from "#/models/calendarData.js";

const move = new AudioEngine(`${SOUNDS}/snd_scroll_menu.wav`);
const gem = new AudioEngine(`${SOUNDS}/snd_pickup_gem01.wav`);

export const dragState = () => reactive({ task: null, day: null, active: false, on: false });

// what a drop takes: the dragged task, once
function take(view, e) {
  e.preventDefault();
  e.stopPropagation();
  const t = view.drag.task;

  view.drag.task = null;
  return t;
}

// a row's dragstart / dragend; key: the task's, day: the one the row is in (a card: none)
export function useDragSource(view, key, day = () => null) {
  const { drag } = view;

  return {
    start(e) {
      Object.assign(drag, { task: view.task(key()), day: day(), on: true });
      e.dataTransfer?.setData("text/plain", "");
      window.setTimeout(() => { drag.active = true; });
    },
    end() { Object.assign(drag, { task: null, day: null, active: false }); },
  };
}

// a drop target: `over` while the dragged task is above it; a drop places the task on `day`
// (none: no date), done or open
export function useDropZone(view, day = () => null, done = false) {
  const zone = reactive({ over: false });

  zone.enter = e => { e.preventDefault(); zone.over = true; };

  zone.leave = () => { zone.over = false; };

  zone.drop = async e => {
    zone.over = false;
    const t = take(view, e);

    if (!t) return;
    void (done ? gem : move).play({ gain: 0.25 });
    await view.actions.place(t, day(), done);
  };

  return zone;
}

// an open task of a day as a reorder target (key: its own, day: its day, none: never): `mark`
// (before | after) while the dragged task of its group is over it, by the half it's over
export function useReorder(view, key, day) {
  const { drag } = view;
  const row = reactive({ mark: null });
  const onto = computed(() =>
    !!drag.task && !!day() && drag.day === day() && canReorder(drag.task, view.task(key())));
  const half = e => {
    const r = e.currentTarget.getBoundingClientRect();

    return e.clientY > r.top + r.height / 2 ? "after" : "before";
  };

  row.over = e => {
    if (!onto.value) return;
    e.preventDefault();
    row.mark = half(e);
  };

  row.leave = () => { row.mark = null; };

  row.drop = e => {
    if (!onto.value) return;
    row.mark = null;
    const t = take(view, e), after = half(e) === "after";

    void move.play({ gain: 0.25 });
    return view.actions.reorder(t, view.task(key()), after, day());
  };

  return row;
}
