// One line of the Celestial Market: "- [ ] green tea #food", bought "- [x] … ✅ date"
// (tested by tests/entities.test.mjs).
export class MarketItem {
  constructor(line, rec = null) { this.line = line; this.rec = rec; }
  static of(t) { return new MarketItem(`- [${t.status}] ${t.text}`, t.rec ?? null); }
  get isBought() { return /^\s*- \[x\]/i.test(this.line); }
  get id() { return this.line.match(/^\s*- \[.\] (m\d+)(?=\s|$)/)?.[1] ?? null; }
  get isOpen() { return /^\s*- \[ \]/.test(this.line); }
  get doneOn() {
    return this.line.match(/\[completion:: (\d{4}-\d{2}-\d{2})\]/)?.[1]
      ?? this.line.match(/✅\s*(\d{4}-\d{2}-\d{2})/u)?.[1] ?? null;
  }
  get key() { return this.id ?? this.name.trim().toLowerCase(); }
  // the words, as the list shows them: no checkbox, tags, date or Dataview fields
  get name() {
    if (this.rec) return this.rec.name;
    return this.line.replace(/^\s*- \[.\]\s*/, "").replace(/#[\w/]+/g, "")
      .replace(/\[\w+:: [^\]]*\]/g, "").replace(/[✅📅⏳🛫➕🔁].*$/u, "").trim();
  }
  // its category: the first tag that isn't nested
  get tag() {
    if (this.rec) return this.rec.tag;
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
