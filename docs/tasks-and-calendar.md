[← Docs](index.md)

# ✅ Tasks and the calendar

## Tasks and commands

![Task window](../task-window.png)

Tasks live in `02 Areas/Personal/Tasks/Master.md` in the Tasks plugin's format, tagged with a difficulty and a life area:

```
- [ ] #⭐⭐medium #area/mind #time/evening read a chapter ![[rings.gif|28]] 🔁 every week on Tuesday, Thursday 📅 2026-11-03
```

**Winx: New task** (Cmd+P, or **＋ task** in the calendar):
1. One window: difficulty and area (both needed), time of day, sticker; or tick **To pool** to keep it in `Pool.md` instead
2. Text and dates in the Tasks dialog
3. The task goes to the top of `Master.md` (a pool item to the end of `Pool.md`)

| Command (Cmd+P) | Creates |
|---|---|
| **Winx: New task** | a task in `Tasks/Master.md` |
| **Winx: New watch item** / **New read item** / **New game** | a note in `03 Resources/Collections/Watchlist` / `Readlist` / `Gamelist` |
| **Winx: Buy reward** | a line in `00 System/Data/Purchases.md` |
| **Winx: New market item** | an item in `00 System/Data/Celestial Market.md` |

QuickAdd keeps two Templater choices: **Work task** (`task.md` → `01 Projects`; point it at your own project folder in Settings → QuickAdd) and **Recipe** (`recipe.md` → `03 Resources/Collections/Recipes`).

## 📅 Calendar

A tab of its own: **Winx: Open calendar** (Cmd+P) or the ✨ icon on the left (with the dashboard). The tasks of `02 Areas/Personal/Tasks` on a week or a month. Pin the tab, drag it to a sidebar or a window; it keeps its week, tab and unfolded days across restarts (Obsidian saves them with the layout). Until you pick a date it follows today.

![Calendar](../calendar.png)

- **Days** show one-off tasks, and a day's 🔁 tasks folded into one pill "🔁 2/5"; a click unfolds them, grouped by time of day (`#time/morning`, `#time/evening`).
- **Drag** a task onto a day: open and due that day, or ✓ done that day. While dragging, a bar of 7 days sticks to the top of the screen.
- **Missed?** lists open tasks whose day has passed: ✓ done that day, or ☀️ move to today.
- **Bottom tabs:** **No date** (open tasks without a date), **Regulars** (🔁 tasks), **Pool** (tasks to pick when it's time, from `Tasks/Pool.md`: drag one onto a day to make a copy).
- **On a task:** ⭐ change difficulty, ✏️ edit (the task window, then the Tasks dialog), ⏭ skip a 🔁 task this time, 🗑 delete (click twice). On the phone, swipe right = done, swipe left = skip / take the date off.
- **Stickers:** `![[name.gif|28]]` in a task's text (files in `00 System/Assets/stickers/`); hover to see one big.
