// The ✦ pill of a Winx tab: a write to a note the tab shows dims it (class `cls` on el(), the tab's --busy) and spins the ✦ until
// it's drawn again; 5 s at most.
import { html } from "../core/html.js";

export const busyPill = (attrs = "") => html`<div class="winx-busy"${attrs}><div class="winx-busy__pill" title="saving…"><span>✦</span></div></div>`;

export function dimOnWrite(view, watched, el, cls) {
  let timer = 0;
  view.registerEvent(view.app.vault.on("modify", f => {
    const target = watched(f.path) && el();
    if (!target) return;
    target.classList.add(cls);
    window.clearTimeout(timer);
    timer = window.setTimeout(() => target.classList.remove(cls), 5000);
  }));
}
