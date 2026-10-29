// Dragging tasks onto days. While dragging, the calendar gets .dragging: each day shows white drop zones
// (a future one "📅 date", today and the past "✓" and "📅 date") and a bar of 7 days sticks to the top.
import { H } from "../lib/helpers.js";

export function makeDrag(ctx, actions) {
  let dragged = null;
  const MOVE = new H.AudioEngine("00 System/Assets/winx music/snd_scroll_menu.wav");
  const GEM  = new H.AudioEngine("00 System/Assets/winx music/snd_pickup_gem01.wav");
  // el carries t when dragged
  const draggable = (el, t) => {
    el.draggable = true;
    el.ondragstart = e => { dragged = t; e.dataTransfer?.setData("text/plain", ""); setTimeout(() => ctx.root.classList.add("dragging")); };   // later: zones covering the dragged card at dragstart cancel the drag
    el.ondragend   = () => ctx.root.classList.remove("dragging");
  };
  // a drop on el puts the dragged task on `day` (null: no date), open or done
  const dropOn = (el, day, done = false) => {
    el.ondragover  = e => { e.preventDefault(); el.classList.add("over"); };
    el.ondragleave = () => el.classList.remove("over");
    el.ondrop      = async e => {
      e.preventDefault(); e.stopPropagation();
      el.classList.remove("over");
      if (!dragged) return;
      const t = dragged; dragged = null;
      if (!H.isMuted()) (done ? GEM : MOVE).play({ gain: 0.25 });
      await actions.place(t, day, done);
    };
  };
  const dropTarget = (el, d) => {
    const zones = el.createEl("div", { cls: "winx-cal-zones" });
    if (d <= ctx.today) dropOn(zones.createEl("div", { cls: "winx-cal-zone done", text: "✓" }), d, true);
    dropOn(zones.createEl("div", { cls: "winx-cal-zone plan", text: `📅 ${window.moment(d).format("D MMM")}` }), d, false);
  };
  return { draggable, dropOn, dropTarget };
}
