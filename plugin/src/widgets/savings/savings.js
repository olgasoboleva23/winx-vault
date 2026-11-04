// Savings: a jar per note in the Savings folder (a goal: its picture, saved so far, a ✦ stamp per deposit). On a
// payday "put in N" until the deposit is in; with a price the picture fills with colour from the bottom and, past
// halfway, "saved" turns into "left".
import { bem, html } from "../../core/html.js";
import { Widget } from "../widget.js";
import { dm, todayYmd, weekday } from "../../core/dates.js";
import { edit } from "../../core/files.js";
import { Button } from "../../uikit/button.js";
import { Empty } from "../../uikit/empty.js";
import { money } from "../../core/format.js";
import { SavingsJar } from "./savingsJar.js";
import { Form } from "../../uikit/form.ts";

const FOLDER = "00 System/Data/Savings";
const DAYS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const day = d => `${DAYS[weekday(d)]} ${dm(d)}`;

export class Savings extends Widget {
  on = {
    deposit: async (e, el) => {
      const props = this.app.metadataCache.getCache(el.dataset.path)?.frontmatter ?? {};
      // no per_payday: "your part", so ask how much
      const sum = props.per_payday ?? (await Form.ask(this.app, "✦ Deposit",
        [{ name: "Sum", key: "sum", text: "how much", number: true }],
        { values: { sum: null }, required: ["sum"], submit: "Put in" }))?.sum;
      if (sum > 0) await edit(el.dataset.path, c => new SavingsJar(c, props).deposit(todayYmd(), sum));
    },
  };
  async data() {
    const today = todayYmd();
    const files = (this.app.vault.getFolderByPath(FOLDER)?.children ?? []).filter(f => f.extension === "md");
    const jars = await Promise.all(files.map(async f => {
      const props = this.app.metadataCache.getFileCache(f)?.frontmatter ?? {};
      const jar = new SavingsJar(await this.app.vault.cachedRead(f), props);
      const img = props.image && this.app.metadataCache.getFirstLinkpathDest(String(props.image), f.path);
      return { path: f.path, name: props.goal ?? f.basename, img: img && this.app.vault.getResourcePath(img),
        ...shown(jar, today) };
    }));
    return { jars };
  }
  jar(j) {
    return html`<div class="winx-jar">
      <div class="winx-jar__goal">
        <div class="winx-jar__pic">${j.img ? html`
          <img class="winx-jar__img" src="${j.img}" alt="">
          <img class="winx-jar__img winx-jar__img--grey" src="${j.img}" alt="" style="${j.greyed}">`
          : ""}</div>
        <div>
          <div class="winx-jar__name">✦ ${j.name}</div>
          <div class="winx-jar__big">${j.big}</div>
          <div class="winx-jar__note">${j.note}</div>
        </div>
      </div>
      ${j.fill !== null ? html`<div class="winx-jar__bar">
        <i class="winx-jar__fill" style="width: ${j.fill}%"></i>
      </div>` : ""}
      <div class="winx-jar__stamps">${j.stamps.map(on =>
        html`<span class="${bem("winx-jar__stamp", { on })}">✦</span>`)}</div>
      ${j.due ? html`<div class="winx-jar__due">
        <span>${j.due.when}: <b class="winx-jar__due-sum">put in ${j.due.sum}</b></span>
        ${new Button({ text: "✓ done", kind: "pill", action: "deposit", data: { path: j.path } })}
      </div>` : ""}
      <div class="winx-jar__next">next payday: ${j.next}</div>
    </div>`;
  }
  view({ jars }) {
    if (!jars.length) return new Empty({ text: `A goal: a note in ${FOLDER}` });
    return html`<div class="winx-savings">${jars.map(j => this.jar(j))}</div>`;
  }
}

// a jar as the card shows it: the picture greyed above what's saved, past halfway "left" instead
// of "saved", a ✦ stamp per deposit (rows of 8, one free), the payday's "put in" until it's in
function shown(jar, today) {
  const pct = jar.pct, count = jar.deposits.length, due = jar.due(today);
  const grey = pct === null ? 100 : Math.max(0, 100 - pct);
  return {
    greyed: `clip-path: inset(0 0 ${100 - grey}% 0)`,
    big: pct !== null && pct >= 50 ? `left ${money(jar.left)}` : money(jar.saved),
    note: pct === null
      ? `saved · ${count} deposit${count === 1 ? "" : "s"}`
      : `${pct}% of ${money(jar.price)}`,
    fill: pct === null ? null : Math.min(100, pct),
    stamps: Array.from({ length: Math.max(8, Math.ceil((count + 1) / 8) * 8) }, (_, i) =>
      i < count),
    due: due && {
      when: due.payday === today ? "payday today" : `payday ${day(due.payday)}`,
      sum: due.sum ? money(due.sum) : "your part",
    },
    next: jar.next(today, 2).map(day).join(" · "),
  };
}

