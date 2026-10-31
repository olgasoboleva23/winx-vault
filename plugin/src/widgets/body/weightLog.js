// The weight log: "- YYYY-MM-DD 70.5" lines in Weight.md, comma decimals accepted (tested by tests/entities.test.mjs).
const WEIGHT_LINE = /^- (\d{4}-\d{2}-\d{2}) (\d+(?:[.,]\d+)?)\s*$/;

export class WeightLog {
  constructor(text) { this.text = text; }
  // { date, kg } by date
  get entries() {
    return this.text.split("\n").map(l => l.trim().match(WEIGHT_LINE)).filter(Boolean)
      .map(m => ({ date: m[1], kg: Number(m[2].replace(",", ".")) })).sort((a, b) => a.date.localeCompare(b.date));
  }
  get last() { return this.entries.at(-1) ?? null; }
  // the text with the weight for a day: that day's line replaced, or a new one at the end
  set(date, kg) {
    const line = `- ${date} ${kg}`;
    const lines = this.text.replace(/\s+$/, "").split("\n").filter((l, i, a) => !(a.length === 1 && l === ""));
    const i = lines.findIndex(l => l.trim().match(WEIGHT_LINE)?.[1] === date);
    if (i >= 0) lines[i] = line; else lines.push(line);
    return lines.join("\n") + "\n";
  }
}
