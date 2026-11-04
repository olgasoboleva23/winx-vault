// One line of the Celestial Market: "- [ ] green tea #food", bought "- [x] … ✅ date"
// (tested by tests/entities.test.mjs).
export class MarketItem {
  constructor(line) { this.line = line; }
  static of(t) { return new MarketItem(`- [${t.status}] ${t.text}`); }   // a Dataview task
  get isBought() { return /^\s*- \[x\]/i.test(this.line); }
  // the words, as the list shows them: no checkbox, tags or date fields
  get name() {
    return this.line.replace(/^\s*- \[.\]\s*/, "").replace(/#[\w/]+/g, "")
      .replace(/[✅📅⏳🛫➕🔁].*$/u, "").trim();
  }
  // its category: the first tag that isn't nested
  get tag() {
    return (this.line.match(/#[^\s#]+/gu) ?? []).find(tag => !tag.includes("/")) ?? "#other";
  }
  // bought on `date`, the way the Tasks plugin marks it; a line that isn't open comes back as it is
  bought(date) {
    if (!/^\s*- \[ \]/.test(this.line)) return this.line;

    return `${this.line.replace("- [ ]", "- [x]").trimEnd()} ✅ ${date}`;
  }
  // back on the list: open, without its ✅ date
  unbought() {
    if (!this.isBought) return this.line;
    return this.line.replace(/- \[x\]/i, "- [ ]")
      .replace(/\s*✅\s*\d{4}-\d{2}-\d{2}/u, "").trimEnd();
  }
}
