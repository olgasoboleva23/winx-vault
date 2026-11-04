// Weight: line chart of the last 30 days, the last value, change vs a week ago, a field to log today's weight,
// a button to the list. With a body log note (LOG_PATH: its `name` and `reasons` are the vault's own), a toggle
// switches the card to that log: a level 0–3 and the reasons for today, bars for 30 days (the reasons in the
// tooltip) over the cycle's period days.
import { html } from "../../core/html.js";
import { Missing } from "../../uikit/empty.js";
import { NoteLink } from "../../uikit/noteLink.js";
import { AddForm } from "../../uikit/addForm.js";
import { Button } from "../../uikit/button.js";
import { Widget } from "../widget.js";
import { addDays, dm, todayYmd } from "../../core/dates.js";
import { edit } from "../../core/files.js";
import { WeightLog } from "./weightLog.js";
import { amount } from "../../core/format.js";
import { BodyLog } from "./bodyLog.js";
import { cycleLog } from "./cycle.js";
import { chartColor } from "../../core/chart.js";

const PATH = "00 System/Data/Weight.md";
const LOG_PATH = "00 System/Data/Body log.md";
const DAYS = 30;

export class Weight extends Widget {
  mode = "weight";   // or "log"
  on = {
    save: async (e, form) => {
      const box = form.querySelector("input[name=kg]");
      const kg = amount(box.value);
      if (!kg || kg <= 0) return;
      await edit(PATH, c => new WeightLog(c).set(todayYmd(), kg));
      box.value = "";
    },
    mode: (e, el) => { this.mode = el.dataset.mode; this.draw(); },
    // a level: one of 0–3 on; a reason: any number on
    level: (e, el) => el.parentElement.querySelectorAll("[data-action=level]")
      .forEach(b => b.classList.toggle("winx-btn--on", b === el)),
    reason: (e, el) => el.classList.toggle("winx-btn--on"),
    logSave: async (e, el) => {
      const box = el.closest(".winx-weight__log");
      const level = box.querySelector("[data-action=level].winx-btn--on")?.dataset.level;
      if (level === undefined) return;
      const reasons = [...box.querySelectorAll("[data-action=reason].winx-btn--on")].map(b => b.dataset.reason);
      await edit(LOG_PATH, c => new BodyLog(c).set(todayYmd(), Number(level), reasons));
    },
  };
  async data() {
    const today = todayYmd(), days = Array.from({ length: DAYS }, (_, i) => addDays(today, i - DAYS + 1));
    const logFile = this.app.vault.getAbstractFileByPath(LOG_PATH);
    const log = logFile && {
      ...(this.app.metadataCache.getFileCache(logFile)?.frontmatter ?? {}),
      entries: new BodyLog(await this.app.vault.cachedRead(logFile)).entries,
    };
    if (this.mode === "log" && log) {
      const byDay = new Map(log.entries.map(e => [e.date, e])), cycle = cycleLog(this.dv);
      return {
        log, days, logName: String(log.name ?? "log"), reasons: (log.reasons ?? []).map(String),
        now: byDay.get(today) ?? null,   // today's entry
        entries: days.map(d => byDay.get(d) ?? null),
        period: days.map(d => !!cycle?.on(d)?.isPeriod),
      };
    }
    const file = this.app.vault.getAbstractFileByPath(PATH);
    if (!file) return { missing: true, log, logName: log && String(log.name ?? "log") };
    const ws = new WeightLog(await this.app.vault.cachedRead(file)).entries;
    const last = ws.at(-1);
    const ref = last && [...ws].reverse().find(w => w.date <= addDays(last.date, -7));
    const byDay = new Map(ws.map(w => [w.date, w.kg]));
    const delta = ref ? +(last.kg - ref.kg).toFixed(1) : null;
    return {
      log, logName: log && String(log.name ?? "log"), last, days,
      vals: days.map(d => byDay.get(d) ?? null),
      change: delta === null ? null : `${delta > 0 ? "+" : ""}${delta}`,   // vs a week ago
    };
  }
  // a toggle button: the weight / log modes, the log's levels and reasons
  toggle(text, on, action, data) { return new Button({ text, kind: "toggle", on, action, data }); }
  view(d) {
    const mode = (text, m) => this.toggle(text, this.mode === m, "mode", { mode: m });
    return html`<div class="winx-weight">
      ${d.log ? html`<div class="winx-weight__modes">
        ${mode("⚖️ weight", "weight")}
        ${mode(d.logName, "log")}
      </div>` : ""}
      ${this.mode === "log" && d.log ? this.logView(d) : this.weightView(d)}
    </div>`;
  }
  weightView({ missing, last, change }) {
    if (missing) return new Missing({ path: PATH });
    const input = { name: "kg", type: "number", step: "0.1", inputmode: "decimal", placeholder: "today, kg" };
    return html`<div class="winx-weight__head">${last
        ? html`<span class="winx-weight__now">${last.kg} kg</span>
          ${change !== null
            ? html`<span class="winx-weight__delta">${change} vs week ago</span>`
            : ""}`
        : html`<span class="winx-weight__delta">no entries yet</span>`}</div>
      ${new AddForm({ action: "save", input, submit: "Save" })}
      ${new NoteLink({ text: "✦ list", path: PATH, cls: "winx-weight__list" })}`;
  }
  logView({ now, reasons }) {
    return html`<div class="winx-weight__log">
        <div class="winx-weight__log-row">
          ${[0, 1, 2, 3].map(n => this.toggle(String(n), now?.level === n, "level", { level: n }))}
        </div>
        <div class="winx-weight__log-row">
          ${reasons.map(r => this.toggle(r, !!now?.reasons.includes(r), "reason", { reason: r }))}
        </div>
        ${new Button({ text: now ? "Update today" : "Save today", kind: "pill", action: "logSave" })}
      </div>
      ${new NoteLink({ text: "✦ list", path: LOG_PATH, cls: "winx-weight__list" })}`;
  }
  // the chart between the form and the list button
  async after(root, d) {
    const box = root.querySelector(".winx-weight"), list = box?.querySelector(".winx-weight__list");
    if (!box || d.missing) return;
    if (this.mode === "log" && d.log) {
      const pink = chartColor("--winx-pink-deep"), shade = chartColor("--winx-purple", 0.18);
      this.keep(await window.renderChart({
        type: "bar",
        data: { labels: d.days.map(dm), datasets: [
          {
            label: "level", data: d.entries.map(e => e?.level ?? null),
            backgroundColor: pink, borderRadius: 4, order: 1,
          },
          {
            label: "period", data: d.period.map(p => p ? 3 : null), backgroundColor: shade,
            barPercentage: 1, categoryPercentage: 1, grouped: false, order: 2,
          },
        ] },
        options: {
          plugins: { legend: { display: false }, tooltip: {
            filter: i => i.datasetIndex === 0,
            callbacks: { label: i => {
              const e = d.entries[i.dataIndex];
              return e ? `${e.level}${e.reasons.length ? " · " + e.reasons.join(", ") : ""}` : "";
            } },
          } },
          scales: { y: { min: 0, max: 3, ticks: { stepSize: 1 } } },
        },
      }, box));
    } else {
      const seen = d.vals?.filter(v => v !== null) ?? [];
      if (!seen.length) return;
      this.keep(await window.renderChart({
        type: "line",
        data: { labels: d.days.map(dm), datasets: [{
          label: "⚖️ Weight", data: d.vals, spanGaps: true, tension: 0.3,
          borderColor: chartColor("--winx-pink-deep"), backgroundColor: chartColor("--winx-pink-deep", 0.3),
        }] },
        options: {
          plugins: { legend: { display: false } },
          scales: { y: { suggestedMin: Math.min(...seen) - 0.5, suggestedMax: Math.max(...seen) + 0.5 } },
        },
      }, box));
    }
    box.append(list);   // the chart went last: the button back under it
  }
}
