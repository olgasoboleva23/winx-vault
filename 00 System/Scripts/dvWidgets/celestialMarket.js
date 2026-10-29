const FILE_PATH = "00 System/Data/Celestial Market.md";
const page = dv.page("00 System/Data/Celestial Market");
if (!page) { dv.paragraph("Market file not found."); return; }

const H = (app.__winxHelpers ??= eval(await app.vault.adapter.read("00 System/Scripts/dvWidgets/helpers.js")));
const L = (app.__winxGoalsLib ??= eval(await app.vault.adapter.read("00 System/Scripts/dvWidgets/goalsLib.js")));
const { marketCategories } = await H.loadConfig();

const today = H.today();
const items = page.file.tasks.where(t => !t.completed).array();
const mkt   = H.marketState(dv);
const soon  = L.supplyStats(mkt.history, today).filter(s => s.due && !mkt.open.has(s.name)).map(s => s.name);
const cats  = [...marketCategories, { label: "✦ Other", tag: "#other" }];
const catOf = t => t.tags?.find(tag => cats.some(c => c.tag === tag)) ?? "#other";

// Mark one line bought: let the sparkle play first, then write (the write re-renders the widget).
const buy = async (t, row) => {
  if (row.classList.contains("bought")) return;
  row.classList.add("bought");
  await new Promise(r => setTimeout(r, 650));
  const file = app.vault.getAbstractFileByPath(FILE_PATH);
  await app.vault.process(file, c => {
    const lines = c.split("\n");
    if (lines[t.line] !== undefined) lines[t.line] = L.markBought(lines[t.line], today);
    return lines.join("\n");
  });
};

const root = dv.container.createEl("div", { cls: "winx-celestial-market" });
const list = root.createEl("div", { cls: "market-list" });
if (!items.length) list.createEl("div", { text: "✨ Merchant inventory cleared", cls: "market-empty" });

for (const cat of cats) {
  const group = items.filter(t => catOf(t) === cat.tag);
  if (!group.length) continue;
  const head = list.createEl("div", { cls: "market-group-header" });
  head.createEl("span", { text: cat.label });
  head.createEl("span", { text: String(group.length), cls: "market-count" });
  for (const t of group) {
    const row = list.createEl("div", { cls: "market-item" });
    row.createEl("span", { text: t.text.replace(/#[\w/]+/g, "").trim(), cls: "market-text" });
    const btn = row.createEl("button", { cls: "market-buy", attr: { "aria-label": "bought", title: "bought" } });
    btn.onclick = () => buy(t, row);
  }
}

if (soon.length) root.createEl("div", { text: `⏳ running low soon: ${soon.join(", ")}`, cls: "market-soon" });

const foot = root.createEl("div", { cls: "market-footer" });
foot.createEl("span", { text: `${items.length} item${items.length === 1 ? "" : "s"} left` });
const link = (text, path) => {
  const a = foot.createEl("span", { text, cls: "market-open" });
  a.onclick = () => app.workspace.openLinkText(path, "", false);
};
link("✦ open market", "00 System/Data/Celestial Market");
link("✦ supplies", "00 System/Data/Supplies");
