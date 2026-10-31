// Savings: a jar per note in the Savings folder (a goal: its picture, saved so far, a ✦ stamp per deposit). On a payday
// "put in N" until the deposit is in; with a price the picture fills with colour from the bottom and, past halfway,
// "saved" turns into "left".
import { html } from "../../core/html.js";
import { Widget } from "../widget.js";
import { dm, todayYmd, weekday } from "../../core/dates.js";
import { edit } from "../../core/files.js";
import { Button } from "../../uikit/button.js";
import { Empty } from "../../uikit/empty.js";
import { money } from "../finance.js";
import { SavingsJar } from "./savingsJar.js";

const FOLDER = "00 System/Data/Savings";
const DAYS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const day = d => `${DAYS[weekday(d)]} ${dm(d)}`;

export class Savings extends Widget {
  on = {
    deposit: async (e, el) => {
      const props = this.app.metadataCache.getCache(el.dataset.path)?.frontmatter ?? {};
      await edit(el.dataset.path, c => new SavingsJar(c, props).deposit(todayYmd()));
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
        saved: jar.saved, count: jar.deposits.length, pct: jar.pct, left: jar.left, price: jar.price,
        due: jar.due(today), next: jar.next(today, 2), today };
    }));
    return { jars };
  }
  view({ jars }) {
    if (!jars.length) return new Empty({ text: `✦ A goal: a note in ${FOLDER}` });
    return html`<div class="winx-savings">${jars.map(j => {
      const slots = Math.max(8, Math.ceil((j.count + 1) / 8) * 8);
      const grey = j.pct === null ? 100 : Math.max(0, 100 - j.pct);
      const pastHalf = j.pct !== null && j.pct >= 50;
      return html`<div class="winx-jar">
        <div class="winx-jar__goal">
          <div class="winx-jar__pic">${j.img ? html`<img class="winx-jar__img" src="${j.img}" alt=""><img class="winx-jar__img winx-jar__img--grey" src="${j.img}" alt="" style="clip-path: inset(0 0 ${100 - grey}% 0)">` : ""}</div>
          <div><div class="winx-jar__name">✦ ${j.name}</div>
            <div class="winx-jar__big">${pastHalf ? `left ${money(j.left)}` : money(j.saved)}</div>
            <div class="winx-jar__note">${j.pct === null ? `saved · ${j.count} deposit${j.count === 1 ? "" : "s"}` : `${j.pct}% of ${money(j.price)}`}</div></div>
        </div>
        ${j.pct !== null ? html`<div class="winx-jar__bar"><i class="winx-jar__fill" style="width: ${Math.min(100, j.pct)}%"></i></div>` : ""}
        <div class="winx-jar__stamps">${Array.from({ length: slots }, (_, i) => html`<span class="winx-jar__stamp${i < j.count ? " winx-jar__stamp--on" : ""}">✦</span>`)}</div>
        ${j.due ? html`<div class="winx-jar__due"><span>${j.due.payday === j.today ? "payday today" : `payday ${day(j.due.payday)}`}: <b class="winx-jar__due-sum">put in ${j.due.sum ? money(j.due.sum) : "your part"}</b></span>${new Button({ text: "✓ done", kind: "pill", action: "deposit", data: { path: j.path } })}</div>` : ""}
        <div class="winx-jar__next">next payday: ${j.next.map(day).join(" · ")}</div>
      </div>`;
    })}</div>`;
  }
}
