const filePath = "00 System/Data/Celestial Market.md";
const file = dv.page("00 System/Data/Celestial Market");
if (!file) {
  dv.paragraph("Market file not found.");
  return;
}

const H = (app.__winxHelpers ??= eval(await app.vault.adapter.read("00 System/Scripts/dvWidgets/helpers.js")));
const { marketCategories } = await H.loadConfig();
const categoryMap = Object.fromEntries(marketCategories.map((c) => [c.tag, c]));

const items = file.file.tasks.where((t) => !t.completed).array();

const grouped = {};
items.forEach((t) => {
  const tag = t.tags?.find((tag) => categoryMap[tag]) ?? "#other";
  if (!grouped[tag]) grouped[tag] = [];
  grouped[tag].push(t);
});

const renderGroups = () =>
  Object.entries(grouped)
    .map(([tag, tasks]) => {
      const cat = categoryMap[tag] ?? {
        label: "✦ Other",
      };
      const taskItems = tasks
        .map((t) => {
          const cleanText = t.text.replace(/#\w+/g, "").trim();
          return `
      <div class="market-item">
        <span class="market-icon">✦</span>
        <span class="market-text">${cleanText}</span>
      </div>`;
        })
        .join("");

      return `
    <div class="market-group">
      <div class="market-group-header">
        ${cat.label}
      </div>
      ${taskItems}
    </div>`;
    })
    .join("");

dv.container.innerHTML = `
  <div class="winx-celestial-market">
    <div class="market-list">
      ${items.length ? renderGroups() : '<div class="market-empty">✨ Merchant inventory cleared</div>'}
    </div>
    <div class="market-footer">
      ${items.length} item${items.length === 1 ? "" : "s"} left
      <span class="market-open" data-action="open">✦ open market</span>
    </div>
  </div>`;

dv.container
  .querySelector("[data-action='open']")
  ?.addEventListener("click", () => {
    app.workspace.openLinkText("00 System/Data/Celestial Market", "", false);
  });
