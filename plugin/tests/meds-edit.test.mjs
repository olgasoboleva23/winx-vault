import { test } from "node:test";
import assert from "node:assert/strict";
import { vault } from "./stubs/vault.mjs";
import { editCourse } from "#/controllers/meds.js";

globalThis.window ??= {};
window.moment = () => ({ format: () => "2026-11-08" });
const P = "00 System/Data/Medication/Аевит, Магний.md";
const MEDS = [
  { name: "Аевит", dose: "1 капсула", times: "any", meal: "any", days: 3 },
  { name: "Магний", dose: "", times: "both", meal: "after", days: 3 },
];
const OLD = `---
type: meds
start: 2026-11-07
days: 3
cssclasses:
  - dashboard
meds:
  - {"name":"Аевит","dose":"1 капсула","times":"any","meal":"any","days":3}
  - {"name":"Магний","dose":"","times":"both","meal":"after","days":3}
---

> [!card] Приём
> - ☀️ утро, после еды: Магний
> - 🌙 на ночь, после еды: Магний
> - в любое время: Аевит 1 капсула

> [!card] Заметки
> от врача: не запивать молоком

> [!card] Легенда
> | Код | Препарат |
> | --- | --- |
> | АЕ | Аевит |
> | МА | Магний |
> | ☀️ | утро |
> | 🌙 | вечер / на ночь |

\`\`\`winx
meds
card: Курс
| Дата | АЕ | МА☀️ | МА🌙 | Заметки |
| --- | :-: | :-: | :-: | --- |
| 2026-11-07 | ✅ | ✅ | ✅ |  |
| 2026-11-08 | ✅ | ☐ | ☐ | поездка |
| 2026-11-09 | ☐ | ☐ | ☐ |  |
\`\`\`

> [!card] От врача
> через месяц анализ
`;

test("editCourse: the window with the course's values; saved: the medicines, the notes and the table rebuilt, the marks carried, the hand-written card kept", async () => {
  const { files } = vault({ [P]: OLD }, { props: { [P]: { type: "meds", start: "2026-11-07", days: 3, meds: MEDS, notes: "от врача: не запивать молоком" } } });
  let asked;
  const ask = async (title, rows, options) => {
    asked = { title, rows: rows.map(r => r.key), values: options.values };

    return {
      ...options.values,
      meds: [options.values.meds[0], { name: "Новопассит 10 мл", times: "evening", meal: "sleep", days: 2 }],
      notes: "от врача: не запивать молоком\nи не курить",
    };
  };

  await editCourse(P, ask);
  assert.equal(asked.title, "✦ Edit medication course");
  assert.deepEqual(asked.rows, ["meds", "start", "notes"]);
  assert.deepEqual(asked.values, { meds: MEDS, start: "2026-11-07", notes: "от врача: не запивать молоком" });
  const text = files[P];

  assert.match(text, /^---\ntype: meds\nstart: 2026-11-07\ndays: 3\ncssclasses:\n  - dashboard\nmeds:\n  - \{"name":"Аевит","dose":"1 капсула","times":"any","meal":"any","days":3\}\n  - \{"name":"Новопассит 10 мл","dose":"","times":"evening","meal":"sleep","days":2\}\nnotes: "от врача: не запивать молоком\\nи не курить"\n---\n/);
  assert.match(text, /\n> \[!card\] Приём\n> - 🌙 на ночь, перед сном: Новопассит 10 мл\n> - в любое время: Аевит 1 капсула\n\n> \[!card\] Заметки\n> от врача: не запивать молоком\n> и не курить\n\n> \[!card\] Легенда\n/);
  // Аевит's marks and the day's note carried, Магний gone, Новопассит new (its 2 days)
  assert.match(text, /\n\| Дата \| АЕ \| НО🌙 \| Заметки \|\n\| --- \| :-: \| :-: \| --- \|\n\| 2026-11-07 \| ✅ \| ☐ \|  \|\n\| 2026-11-08 \| ✅ \| ☐ \| поездка \|\n\| 2026-11-09 \| ☐ \|  \|  \|\n```\n/);
  assert.match(text, /\n```\n\n> \[!card\] От врача\n> через месяц анализ\n$/);
  // not a course: nothing asked
  const { files: other } = vault({ "x.md": "- [ ] a" });
  let calls = 0;

  await editCourse("x.md", async () => { calls++; return null; });
  assert.equal(calls, 0);
  assert.equal(other["x.md"], "- [ ] a");
});
