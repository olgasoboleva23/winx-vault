// The Quests card's controller: the tab's day as two lists of rows { key, label, done, t }: the
// tasks due that day and still open (by time of day, area, name),
// then the ones done that day. The markup:
// widgets/quests/.
import config from "#/helpers/config.js";
import { pageDay, ymd } from "#/helpers/dates.js";
import { T, taskKey, daytimeMark, daytimeRank } from "#/models/calendarData.js";
import { taskStore } from "#/store/tasks.js";

export async function loadQuests({ dv }) {
  const day = ymd(pageDay(dv)), order = config.areas.map(a => a.key);
  const rank = task => (i => i < 0 ? order.length : i)(order.indexOf(task.area));
  const rows = (pick, done) => taskStore.tasks.map(t => [t, T(t)]).filter(([, k]) => pick(k))
    .sort(([, a], [, b]) => daytimeRank(a.daytime) - daytimeRank(b.daytime) || rank(a) - rank(b)
      || a.text.localeCompare(b.text))
    .map(([t, k]) => ({
      key: taskKey(t), t, done,
      label: daytimeMark(k.daytime) + `${config.areaIcons[k.area] ?? ""} ${k.text}`.trim(),
    }));

  return {
    day,
    open: rows(k => k.isOpen && k.date === day, false),
    done: rows(k => k.isDone && k.doneOn === day, true),
  };
}
