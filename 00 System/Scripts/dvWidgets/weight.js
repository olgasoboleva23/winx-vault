// Weight: line chart of the last 30 days (same look as the old mood chart),
// last value, change vs a week ago, a button to the list.
// dv.view("…/weight", { input: true }) also shows a field to log today's weight (mobile page).
const H = (app.__winxHelpers ??= eval(await app.vault.adapter.read("00 System/Scripts/dvWidgets/helpers.js")));
const L = (app.__winxGoalsLib ??= eval(await app.vault.adapter.read("00 System/Scripts/dvWidgets/goalsLib.js")));

const PATH  = "02 Areas/Appearance/Weight.md";
const DAYS  = 30;
const file  = app.vault.getAbstractFileByPath(PATH);
if (!file) { dv.el("div", `Create ${PATH}`); return; }

const today = window.moment().format("YYYY-MM-DD");
const ws    = L.parseWeights(await app.vault.cachedRead(file));
const root  = dv.container.createEl("div", { cls: "winx-weight" });

// last value and change vs about a week ago
const last = ws.at(-1);
const head = root.createEl("div", { cls: "winx-weight-head" });
if (last) {
  head.createEl("span", { text: `${last.kg} kg`, cls: "winx-weight-now" });
  const ref = [...ws].reverse().find(w => w.date <= L.addDays(last.date, -7));
  if (ref) {
    const d = +(last.kg - ref.kg).toFixed(1);
    head.createEl("span", { text: `${d > 0 ? "+" : ""}${d} vs week ago`, cls: "winx-weight-delta" });
  }
} else head.createEl("span", { text: "no entries yet", cls: "winx-weight-delta" });

if (input?.input) {
  const form = root.createEl("form", { cls: "winx-weight-add" });
  const box  = form.createEl("input", { attr: { type: "number", step: "0.1", inputmode: "decimal", placeholder: "today, kg" } });
  form.createEl("button", { text: "Save", attr: { type: "submit" } });
  form.onsubmit = async e => {
    e.preventDefault();
    const kg = Number(String(box.value).replace(",", "."));
    if (!kg || kg <= 0) return;
    await app.vault.process(file, c => L.upsertWeight(c, today, kg));
    box.value = "";
  };
}

// chart: one point per logged day, gaps bridged by the line
const days = Array.from({ length: DAYS }, (_, i) => L.addDays(today, i - DAYS + 1));
const byDay = new Map(ws.map(w => [w.date, w.kg]));
const vals  = days.map(d => byDay.get(d) ?? null);
const seen  = vals.filter(v => v !== null);
if (seen.length) {
  window.renderChart({
    type: "line",
    data: {
      labels: days.map(d => `${d.slice(8, 10)}.${d.slice(5, 7)}`),
      datasets: [{
        label: "⚖️ Weight",
        data: vals,
        spanGaps: true,
        borderColor: H.chartColor("--winx-pink-deep"),
        backgroundColor: H.chartColor("--winx-pink-deep", 0.3),
        tension: 0.3,
      }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { suggestedMin: Math.min(...seen) - 0.5, suggestedMax: Math.max(...seen) + 0.5 } },
    },
  }, root);
}

const list = root.createEl("button", { text: "✦ list", cls: "winx-open-note-btn winx-weight-list" });
list.onclick = () => app.workspace.openLinkText(PATH, "", false);
