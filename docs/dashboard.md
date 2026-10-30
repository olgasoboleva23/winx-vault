[← Docs](index.md)

# 🖥 Dashboard

| Card | What it shows |
|---|---|
| **Level** | Current level, total XP, progress to the next level |
| **Pomodoro** | 25/5 min focus timer, session counter |
| **Goals** | Per goal "X of Y this week", Mon–Sun dots, the minimum version |
| **Life Areas** | Radar chart — XP earned per area this month |
| **Cycle** | Cycle day, next start forecast, "started today" button |
| **Weight** | Last 30 days chart, change vs a week ago, a field to log today's weight |
| **XP Today** | XP earned today, level name, streak heatmap |
| **Quests** | Tasks due today, grouped by life area |
| **Celestial Market** | Pending shopping items grouped by category |

A note shows a widget with a `winx` block: the widget's name, then `key: value` lines. `card: Title` draws it inside a dashboard card (`meta: scroll` / `scroll tall` for the scrolling ones):

````
```winx
weight
card: Weight
```
````

`Week.md` is the weekly review: goals × days, cycle day, tasks done and still open, the first lines of each daily note. `Mobile.md` and `Mobile/` are the same widgets laid out for a phone.

## 🎮 XP & Levels

Completing a task awards XP and gold by its difficulty:

| Tag | XP | Gold |
|---|---|---|
| `#⭐easy` | 5 | 2 |
| `#⭐⭐medium` | 10 | 5 |
| `#⭐⭐⭐hard` | 20 | 10 |
| `#⭐⭐⭐⭐epic` | 50 | 25 |

Level `n` costs `100 + (n-1) × 25` XP. Complete a habit **30+ times** in a month → **+100 XP** per habit.

## Life areas

| Area | Tag | Radar name |
|---|---|---|
| 🌺 Body | `#area/body` | Vitality |
| 🔮 Mind | `#area/mind` | Knowledge |
| 💎 Wealth | `#area/wealth` | Resources |
| 🏰 Base | `#area/base` | Sanctuary |
| 🌠 Occasions | `#area/occasions` | Memory |
| 🌙 Rest | `#area/rest` | Serenity |

Tags without a radar row still get an icon: `#area/learning` 📜, `#area/work` 🪄, `#area/personal` 🦋, `#area/health` 🧪. All of it is in `plugin/src/lib/config.js`.

---

## 🛍 Shop

Gold from tasks buys real-world rewards listed in `00 System/Data/Shop.md` (`- name:: Cozy Coffee cost:: 20`). The Shop page shows the balance; a click on an affordable item logs it to `Purchases.md` (or use **Winx: Buy reward**).

## 🌌 Celestial Market

A shopping list card. Items are checkbox lines in `00 System/Data/Celestial Market.md` tagged with a category (`- [ ] Fresh bread #food`); ticking one clears it from the card. Categories: 🌿 Harvest `#food`, 🌸 Bloom `#care`, 🐾 Familiar `#pet`, 🏰 Sanctuary `#home`, ✨ Vitality `#health`; untagged items land in ✦ Other.

## 🎯 Goals

A goal is a recurring task in `Master.md` tagged `#goal/<slug>`, ticked like any task. `02 Areas/Personal/Goals.md` describes each one:

```
- name:: Stretching
  tag:: #goal/stretch
  days:: tue, thu, sat
  min:: 5 minutes on the mat
  plan:: when I shut the laptop in the evening, I roll out the mat
```

- `days` sets the weekly plan; otherwise `perWeek:: N` (`days` wins if both are given). A day counts when a done task with the tag has its `✅` on that day. Weeks start on Monday.
- Use repeats without `when done` (`🔁 every week on Tuesday, Thursday`).

### A missed goal task moves on by itself

The **Goals** card moves a goal's open task whose date has passed to the goal's next planned day from today, when it draws (opening the dashboard is enough). Example: `days:: tue, thu`, the task is on Thursday 29.10 and not done; on Friday 30.10 the card rewrites its `📅 2026-10-29` to `📅 2026-11-03` (Tuesday). Without `days` (`perWeek:: N`), it moves to today.

So a goal task never piles up as overdue, and it never shows in the calendar's **Missed?** (that lists only overdue tasks, and a goal task is never overdue for long). If you did it on the missed day, drag it from its new day onto that day's ✓ zone in the calendar: it is marked done on that day.

Only the `📅` date of an open task with the goal's tag changes; done tasks and other tasks are left alone.

## 📝 Daily Note

Notes (free text; the first lines show on the Week page) and an XP Log. Made from `00 System/Templates/Daily Note.md`, or by **✦ Open** on the dashboard for the selected day.
