// A body log: "- YYYY-MM-DD 2 reason, reason" lines, a level 0–3 and the reasons picked that day
// (tested by tests/entities.test.mjs).
const ENTRY = /^- (\d{4}-\d{2}-\d{2}) ([0-3])(?: (.+))?$/;

export class BodyLog {
  constructor(text) { this.text = text; }
  // { date, level, reasons } by date
  get entries() {
    return this.text.split("\n").map(l => l.trim().match(ENTRY)).filter(Boolean)
      .map(m => ({ date: m[1], level: Number(m[2]), reasons: m[3] ? m[3].split(",").map(r => r.trim()).filter(Boolean) : [] }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
  // the text with a day's entry: that day's line replaced, or a new one at the end
  set(date, level, reasons) {
    const line = `- ${date} ${level}${reasons.length ? " " + reasons.join(", ") : ""}`;
    const lines = this.text.replace(/\s+$/, "").split("\n").filter((l, i, a) => !(a.length === 1 && l === ""));
    const i = lines.findIndex(l => l.trim().match(ENTRY)?.[1] === date);
    if (i >= 0) lines[i] = line; else lines.push(line);
    return lines.join("\n") + "\n";
  }
}
