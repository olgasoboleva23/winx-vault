// The ✦ pill of a Winx tab, shown by the tab's --busy (core/use.js: useBusy)
import { html } from "../core/html.js";

export const busyPill = (attrs = "") => html`<div class="winx-busy"${attrs}><div class="winx-busy__pill" title="saving…"><span class="winx-busy__star">✦</span></div></div>`;
