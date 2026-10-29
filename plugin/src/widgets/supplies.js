import { H } from "../lib/helpers.js";
import { L } from "../lib/goalsLib.js";

export default async function (dv, input) {
  const { marketCategories } = await H.loadConfig();

  const today = H.today();
  const { history, open } = H.marketState(dv);
  const stats = L.supplyStats(history, today);
  const root  = dv.container.createEl("div", { cls: "winx-supplies" });

  if (!stats.length) root.createEl("div", { text: "Nothing bought twice yet" });

  const cats = [...marketCategories, { label: "✦ Other", tag: "#other" }];
  for (const cat of cats) {
    const items = stats.filter(s => (cats.some(c => c.tag === s.tag) ? s.tag : "#other") === cat.tag);
    if (!items.length) continue;
    root.createEl("div", { text: cat.label, cls: "market-group-header" });
    for (const s of items) {
      const row = root.createEl("div", { cls: `winx-supply${s.due ? " due" : ""}` });
      row.createEl("span", { text: s.name, cls: "winx-supply-name" });
      const listed = open.has(s.name);
      const info = listed ? "on the shopping list ✦"
        : s.avg ? `${s.since} of ~${s.avg} days${s.due ? " ⏳" : ""}`
        : `bought ${s.buys} times`;
      row.createEl("span", { text: info, cls: "winx-supply-info" });
      if (!listed) {
        const b = row.createEl("button", { text: "running low", cls: "winx-open-note-btn" });
        b.onclick = async () => { await H.addToMarket(s.name, s.tag); new Notice(`✦ ${s.name} → Celestial Market`); };
      }
    }
  }
}
