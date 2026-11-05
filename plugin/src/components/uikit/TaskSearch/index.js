// "New task", first step: search every task done or planned before (by area, the most done first)
// or type a new one.
import { Search } from "#/components/uikit/Search/index.ts";
import config from "#/helpers/config.js";
import { dm } from "#/helpers/dates.js";
import { findChoices } from "#/helpers/find.js";
import { dataview } from "#/helpers/plugins.js";
import { taskChoices } from "#/models/task.js";
import { TASKS } from "#/helpers/paths.js";
import { app } from "#/helpers/app.js";

export function pickTask() {
  const lists = dataview().pages(`"${TASKS}"`).file.lists.array();
  const choices = taskChoices(
    lists.map(l => l.task ? `- [${l.status}] ${l.text}` : `- ${l.text}`),
    config.areas.map(a => a.tag),
  );
  const label = area => area
    ? `${config.areaIcons[area] ?? "✦"} ${config.areaMap[area] ?? area.slice(6)}`
    : "✦ other";
  const find = q => findChoices(choices, q)
    .map((c, i, all) => ({ ...c, header: !c.isNew && (i === 0 || c.area !== all[i - 1].area) }));

  return Search.pick(app, "Find a past task or type a new one…", find, (c, el) => {
    if (c.header) el.createDiv({ cls: "winx-search__group", text: label(c.area) });
    const row = el.createDiv({ cls: "winx-search__row winx-row winx-between winx-gap-l" });
    row.createSpan({ text: c.isNew ? `+ new: ${c.name}` : c.name });
    const note = c.isNew ? "" : c.done ? `×${c.done} · ${dm(c.last)}` : "not done yet";
    row.createSpan({ cls: "winx-search__note winx-nowrap", text: note });
  });
}
