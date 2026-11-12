[← Docs](index.md)

# ✅ Tasks and the calendar

## Tasks and commands

![Task window](images/task-window.webp)

Every task has an id (`t12`). `00 System/Data/Tasks/Master.md` holds the Tasks plugin's part, one line per task, in Tasks' **Dataview format** (Settings → Tasks → Task format → Dataview): the id as the text, then the rule and the dates:

```
- [ ] t12 [repeat:: every week on Tuesday, Thursday] [due:: 2026-11-03]
```

Winx's part is in `00 System/Data/Tasks/tasks.json`, a record by id: `name`, `difficulty` (easy / medium / hard / epic / none), `area` (an area key: body, mind…), `daytime` (morning / evening), `goal` (a goal's key in `Goals.md`: workout), `sticker`, `after` (the task ID it follows, or an array of IDs), `order` (the place in its day), `pool`, `variants` (names in cycle order), `currVariant` (the upcoming variant). A rename or a new sticker changes only the record: the done lines keep the id, so the history stays. Difficulty and area live in the record too, so changing them recounts the gold and XP of all that task's past done copies (no history of changes is kept). A line whose id has no record shows the id as its name.

```
"t12": { "name": "read a chapter", "difficulty": "medium", "area": "mind", "daytime": "evening", "sticker": "rings.webp" }
```

**Winx: New task** (Cmd+P, or **＋ task** in the calendar):
1. One window: difficulty and area (both needed), time of day, sticker, variants (a 🔁 task's names in turn, and the next one); or tick **To pool** to keep it only as a record
2. Rule and dates in the Tasks dialog
3. A new id (an existing name reuses its id), a record in `tasks.json`, a line at the top of `Master.md` (none for the pool)

The pool is the records with `pool: true`: tasks to pick when it's time. Dragging one onto a day makes a line with the same id (there is no `Pool.md`).

**Winx: Migrate tasks** is a one-off command for a vault in the old format (`#area/…` tags and 📅 / 🔁 dates in the text, plus `Pool.md`): it gives every task an id (a task and its done copies the same one), writes `tasks.json`, rewrites `Master.md` in the Dataview format and keeps the old notes as `Master (old).md` and `Pool (old).md`. It refuses to run when `tasks.json` exists. Afterwards switch Tasks' format to Dataview.

**Recurring tasks with variants:** one record, for example `t12` named `Training` with `variants: ["Core", "Arms"]` and `currVariant: "Core"`. All occurrences share the same ID, properties, goal and history. A following task uses `after: "t12"`, so it follows either variant. The Tasks line contains only its ID and native Tasks fields: `- [ ] t12 [repeat:: every week on Monday, Wednesday, Friday when done] [due:: 2026-11-13]`. Winx-specific state belongs in its JSON, not in Tasks lines.

In the open task's Winx window, **Variants · in order** takes one name per line; **Next variant** selects `currVariant` (or the first name in the list). Completing through Winx lets Tasks generate the next occurrence and advances `currVariant` in a circle. Dates follow the recurrence rule. Skipping does not advance it; **Undo** restores both the completion and the JSON queue, provided neither changed meanwhile. A failed JSON save rolls back the unchanged log edit. There is no per-completion variant history: completed and skipped tasks show the common task name, regardless of the current variant. Clearing the list disables alternation.

Regulars shows one **Training · Core ↔ Arms** card, the upcoming variant and date, and the combined history. Its pencil opens the common properties and variants, then Tasks' text/date dialog. Pause and resume retain the current variant. Completion works from Winx's dashboard, calendar and task edit window. Direct checkbox changes in raw Markdown are handled by Tasks alone and do not advance Winx's queue. Use the completion notice's **Undo** to roll back a step; reopening an old completion does not rewrite the later chain. A second open occurrence of the same task must be resolved before completion can advance the cycle.

**Sync:** `tasks.json` and `Master.md` are two files. A record edit rewrites the whole `tasks.json`, so between syncs the last writer wins for the whole file: one device's record edits since the last sync can be lost. Sync the desktop first, then the phone, before editing there.

| Command (Cmd+P) | Creates |
|---|---|
| **Winx: New project** | a project in `00 System/Data/Projects/projects.json`: name, description, status (Active by default), an optional cover picked from `03 Resources/Media`; then the Winx tab opens on it in Projects |
| **Winx: New task** | a task: a record in `Tasks/tasks.json` and a line in `Tasks/Master.md` |
| **Winx: Settings** | ⚙ the difficulties' XP and gold, the areas, XP Today's thresholds and the level cost, saved in `00 System/Data/config.json` (also in the Winx tab's drawer) |
| **Winx: New watch item** / **New read item** / **New game** | a note in `03 Resources/Collections/Watchlist` / `Readlist` / `Gamelist` |
| **Winx: New recipe** | a note in `03 Resources/Collections/Recipes` |
| **Winx: New work task** | a note in `01 Projects/Work/tasks` (another folder: `"workTasks"` in the plugin's `data.json`), named `<next number>_<title in lower case with underscores>` |
| **Winx: New medication course** | for a course of vitamins or medicines: a note in `00 System/Data/Medication` (`"meds"` in `data.json`): a group per medicine (+ adds one): name, dose, when (morning / morning and evening / day / evening / any), the meal (before / after / before sleep / any), its days; a start; the day by its anchors (a time of day and a meal: what to take then) and the codes' legend on cards, and a day per row up to the longest course inside a ```winx meds block that draws the course (today's doses as chips, the grid, a note per day) and ticks a cell round ☐ → ✅ → ❌ (its legend: taken, skipped on purpose, not marked) on a click, writing the table. A notes field (several lines) goes on a Заметки card. **Winx: Edit medication course** (or the ✎ by the course card's title) opens the same window with the course's values (kept in its `meds` property) and rebuilds the note: the marks and the days' notes carry over by date and column, cards written by hand stay. The courses' list: `_index.base` in the folder, linked from the notes that list it |
| **Winx: New journal** | a free journal in `00 System/Data/Journals`: its title, its reasons (a comma list) and the days after a meal its level is looked at on the food page (a rash: 1) |
| **Winx: Buy reward** | a line in `00 System/Data/Purchases.md` |
| **Winx: New market item** | a catalog item (if new) and an open ID line in `00 System/Data/Celestial Market.md` |
| **Winx: Migrate market** | `Market/items.json`, an ID-based log, and the original `Celestial Market (old).md` backup |

**Winx: Menu** (Alt+T) lists every Winx command to pick from. On the desktop Winx also sends today's reminders: a goal's task at the goal's time, a task with `HH:MM` in its text 30 minutes before, and a morning summary.

## 📅 Calendar

A page of the Winx tab (🗓 in its pill; see [Dashboard](dashboard.md#the-winx-tab)). The tasks of `00 System/Data/Tasks` on a week or a month. The tab keeps the week, tab and unfolded days across restarts (Obsidian saves them with the layout). Until you pick a date it follows today.

![Calendar](images/calendar.webp)

- **Days** show one-off tasks, and a day's 🔁 tasks folded into one pill "🔁 2/5"; a click unfolds them, grouped by time of day (morning / evening, which any task can have). The order inside a day is dragged and kept in the records' `order`.
- **Drag** a task onto a day: open and due that day, or ✓ done that day. While dragging, a bar of 7 days sticks to the top of the screen.
- **Missed?** lists open tasks whose day has passed: ✓ done that day, or ☀️ move to today.
- **Bottom tabs:** **No date** (open one-off tasks without a date, not a project's), **Ahead** (dated tasks after this week and the birthdays, a card per month), **Regulars** (🔁 tasks), **Projects** ("Projects · N": the open tasks of projects, grouped by project and stage; a Done project with open tasks still shows), **Pool** (tasks to pick when it's time, the records with `pool: true`: drag one onto a day to make a line).

  ![Ahead](images/calendar-ahead.webp)
- **On a task:** ⭐ change difficulty, ✏️ edit (the task window, then the Tasks dialog), ⏭ skip a 🔁 task this time, 🗑 delete (click twice). On the phone, swipe right = done, swipe left = skip / take the date off.
- **Stickers:** a task's `sticker` (files in `00 System/Assets/stickers/`); hover to see one big.
- **Quests** (the dashboard card, or a ```` ```winx ```` block named `quests` in any note): today's tasks by life area. The food page has a 🏋 training column: pick one task once under ⚙, ✓ on the days it was done.

## Projects

A page of the Winx tab (**⋯ Other** in the pill, then Projects). A project is a bigger undertaking cut into stages, each a list of tasks. **Winx: New project** (or **✦ New project** in the tab's header) creates one.

The file is `00 System/Data/Projects/projects.json`, an object by key (`p1`, `p2`…) in display order: `name`, `status` (idea / active / paused / done), `description`, `result`, `notes`, `cover` (a picture path in the vault, or null) and `stages`, each `{ "name": "Dig the beds", "tasks": ["t41", "t42"] }`, the task ids from `tasks.json`. A project's tasks are ordinary tasks: they live in `Master.md` like the rest and take Tasks' dates and repeats.

- **The list:** a card per project (cover, status, description, progress, the next open task, which its box ticks), with tabs by status and their counts. A click on a card opens the project.
- **A project's page:** the status (a menu), description, progress, Result and Notes (each edited in a window), and the stages with their tasks; **+ stage** adds one, **+ task** on a stage runs the New task flow and puts the new task there. A task's 📅 puts it on a calendar day (today, tomorrow or a date).
- **The calendar:** a project's task with a date shows on its day like any other. One without a date is not in **No date**: it shows only in the calendar's **Projects** tab (by project, then stage) and on its project's page.
