// "New task", first step: search every task done or planned before (by area, the most done first) or type a new one.
import { Search } from "../uikit/search.ts";
import config from "../core/config.js";
import { dm } from "../core/dates.js";
import { findChoices } from "../core/find.js";
import { taskChoices } from "./task.js";

export function pickTask() {
  const lists = app.plugins.plugins.dataview.api.pages('"02 Areas/Personal/Tasks"').file.lists.array();
  const choices = taskChoices(lists.map(l => l.task ? `- [${l.status}] ${l.text}` : `- ${l.text}`), config.areas.map(a => a.tag));
  const label = area => area ? `${config.areaIcons[area] ?? "✦"} ${config.areaMap[area] ?? area.slice(6)}` : "✦ other";
  const find = q => findChoices(choices, q).map((c, i, all) => ({ ...c, header: !c.isNew && (i === 0 || c.area !== all[i - 1].area) }));
  return Search.pick(app, "Find a past task or type a new one…", find, (c, el) => {
    if (c.header) el.createDiv({ cls: "winx-search-group", text: label(c.area) });
    const row = el.createDiv({ cls: "winx-search-row" });
    row.createSpan({ text: c.isNew ? `+ new: ${c.name}` : c.name });
    row.createSpan({ cls: "winx-search-note", text: c.isNew ? "" : c.done ? `×${c.done} · ${dm(c.last)}` : "not done yet" });
  });
}
