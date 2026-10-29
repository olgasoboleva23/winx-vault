// Mobile shopping list: tap a row = bought (moves down, struck out);
// tap a bought row = back on the list. Add field on top.
const FILE_PATH = "00 System/Data/Celestial Market.md";
const page = dv.page("00 System/Data/Celestial Market");
if (!page) { dv.paragraph("Market file not found."); return; }

const H = winx.H;
const L = winx.L;
const { marketCategories } = await H.loadConfig();

const today = H.today();
const cats  = [...marketCategories, { label: "✦ Other", tag: "#other" }];
const catOf = t => t.tags?.find(tag => cats.some(c => c.tag === tag)) ?? "#other";
const name  = H.marketName;
const all   = page.file.tasks.array();
const open  = all.filter(t => !t.completed);
const bought = all.filter(t => t.completed && H.ymd(t.completion) === today);

// Rewrite one line; the change re-renders the widget.
const rewrite = async (t, fn) => {
  const file = app.vault.getAbstractFileByPath(FILE_PATH);
  await app.vault.process(file, c => {
    const lines = c.split("\n");
    if (lines[t.line] !== undefined && lines[t.line].includes(name(t))) lines[t.line] = fn(lines[t.line]);
    return lines.join("\n");
  });
};

const root = dv.container.createEl("div", { cls: "winx-mshop" });

// Add field
const form  = root.createEl("form", { cls: "winx-mshop-add" });
const input = form.createEl("input", { attr: { type: "text", placeholder: "+ add item", enterkeyhint: "done" } });
const sel   = form.createEl("select");
for (const c of cats) sel.createEl("option", { text: c.label, attr: { value: c.tag } });
form.createEl("button", { text: "Add", attr: { type: "submit" } });
form.onsubmit = async e => {
  e.preventDefault();
  const v = input.value.trim();
  if (!v) return;
  await H.addToMarket(v, sel.value);
  input.value = "";
};

const row = (parent, t, isBought) => {
  const r = parent.createEl("button", { cls: `winx-mshop-row${isBought ? " bought" : ""}` });
  r.createEl("span", { text: name(t), cls: "winx-mshop-name" });
  r.createEl("span", { cls: "winx-mshop-mark" });
  r.onclick = async () => {
    r.classList.toggle("bought");          // instant feedback, the file write follows
    await rewrite(t, isBought ? L.unmarkBought : line => L.markBought(line, today));
  };
};

if (!open.length) root.createEl("div", { text: "✨ All bought", cls: "winx-mshop-empty" });
for (const c of cats) {
  const group = open.filter(t => catOf(t) === c.tag);
  if (!group.length) continue;
  const head = root.createEl("div", { cls: "market-group-header" });
  head.createEl("span", { text: c.label });
  head.createEl("span", { text: String(group.length), cls: "market-count" });
  const list = root.createEl("div", { cls: "winx-mshop-list" });
  for (const t of group) row(list, t, false);
}

if (bought.length) {
  root.createEl("div", { text: "bought today", cls: "winx-mshop-sep" });
  const list = root.createEl("div", { cls: "winx-mshop-list" });
  for (const t of bought) row(list, t, true);
}
