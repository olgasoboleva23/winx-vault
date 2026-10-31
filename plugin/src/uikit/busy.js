// The ✦ pill of a Winx tab: a write to a note the tab shows dims it (class busy on el()) and spins the ✦ until
// it's drawn again; 5 s at most.
import { html } from "../core/html.js";

export const busyPill = (attrs = "") => html`<div class="winx-cal-busy"${attrs}><div class="winx-cal-busy-pill" title="saving…"><span>✦</span></div></div>`;

export function dimOnWrite(view, watched, el) {
  let timer = 0;
  view.registerEvent(view.app.vault.on("modify", f => {
    const target = watched(f.path) && el();
    if (!target) return;
    target.classList.add("busy");
    window.clearTimeout(timer);
    timer = window.setTimeout(() => target.classList.remove("busy"), 5000);
  }));
}
