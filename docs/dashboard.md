[← Docs](index.md)

# 🖥 Dashboard

A tab of its own: the ✨ icon on the left (it opens the dashboard and the calendar, both pinned, or goes back to the one you used last) or **Winx: Open dashboard** (Cmd+P). At the top: the day it shows (‹ › and **today**; no date set means today, and it moves on at midnight), and **✦ Open** for that day's daily note. After a change to the tasks or the data the tab dims with a pink ✦ until the cards have redrawn. Its layout is `plugin/src/components/pages/dashboard/layout.md`: the same callouts and `winx` blocks a note would have.

![Dashboard](images/dashboard.webp)

| Card | What it shows |
|---|---|
| **Level** | Current level, total XP, progress to the next level |
| **Pomodoro** | 25/5 min focus timer, session counter; 🧘 switches to a meditation (10 min by default, its own length under ⚙, a chime at its end, its minutes counted apart); a running session keeps the screen on, so the Mac doesn't sleep |
| **Goals** | Per goal "X of Y this week", Mon–Sun dots, the minimum version |
| **Life Areas** | Radar chart — XP earned per area this month |
| **Cycle** | Cycle day, next start forecast, "started today" button |
| **Weight** | Last 30 days chart, change vs a week ago, a field to log today's weight; the second pill shows a free journal (`00 System/Data/Journals/`, a note each: a level 0–3 a day and its reasons; with more than one, a select under the pills picks it): a click on a level or a reason saves the day |
| **Pages** | links to the notes with a page of their own: Finance, Shop, Supplies, Medication (the courses' base), Food (the food journal: a week, a row a day: what was eaten with its marks, the marks counted, each free journal's level after its lag, 💊 a course on that day, a note; ＋ a fuzzy search of the foods or a new one, ✎ a food, ⚙ the marks) |
| **XP Today** | XP earned today, level name, streak heatmap |
| **Quests** | Tasks due today, grouped by life area |
| **Celestial Market** | Pending shopping items grouped by category |

Any note can show a widget too, with a `winx` block: the widget's name, then `key: value` lines. `card: Title` draws it inside a dashboard card (`meta: scroll` / `scroll tall` for the scrolling ones):

````
```winx
weight
card: Weight
```
````

On a phone the same dashboard and calendar tabs are used (📅 / ✦ switch between them).

## 🎮 XP & Levels

Completing a task awards XP and gold by its difficulty:

| Tag | XP | Gold |
|---|---|---|
| `#⭐easy` | 5 | 2 |
| `#⭐⭐medium` | 10 | 5 |
| `#⭐⭐⭐hard` | 20 | 10 |
| `#⭐⭐⭐⭐epic` | 50 | 25 |

Level `n` costs `100 + (n-1) × 25` XP.

## Life areas

| Area | Tag | Radar name |
|---|---|---|
| 🌺 Body | `#area/body` | Vitality |
| 🔮 Mind | `#area/mind` | Knowledge |
| 💎 Wealth | `#area/wealth` | Resources |
| 🏰 Base | `#area/base` | Sanctuary |
| 🌠 Occasions | `#area/occasions` | Memory |
| 🌙 Rest | `#area/rest` | Serenity |

Tags without a radar row still get an icon: `#area/learning` 📜, `#area/work` 🪄, `#area/personal` 🦋, `#area/health` 🧪. All of it is in `plugin/src/helpers/config.js`.

---

## 🛍 Shop

Gold from tasks buys real-world rewards listed in `00 System/Data/Shop.md` (`- name:: Cozy Coffee cost:: 20`). The Shop page shows the balance; a click on an affordable item logs it to `Purchases.md` (or use **Winx: Buy reward**).

## 🌌 Celestial Market

A shopping list card. Items are checkbox lines in `00 System/Data/Celestial Market.md` tagged with a category (`- [ ] Fresh bread #food`); ticking one clears it from the card. Categories: 🌿 Harvest `#food`, 🌸 Bloom `#care`, 🐾 Familiar `#pet`, 🏰 Sanctuary `#home`, ✨ Vitality `#health`; untagged items land in ✦ Other.

## 🎯 Goals

A goal is a recurring task in `Master.md` tagged `#goal/<slug>`, ticked like any task. `00 System/Data/Goals.md` describes each one:

```
- name:: Stretching
  tag:: #goal/stretch
  days:: tue, thu, sat
  min:: 5 minutes on the mat
  plan:: when I shut the laptop in the evening, I roll out the mat
```

- `days` sets the weekly plan; otherwise `perWeek:: N` (`days` wins if both are given). A day counts when a done task with the tag has its `✅` on that day. Weeks start on Monday.
- A missed goal task stays on its day: the calendar's **Missed?** lists it, to tick it for that day or move it to today.

## 📝 Daily Note

Notes (free text) and an XP Log. Made by **✦ Open** on the dashboard for the selected day (its layout: `daily` in `plugin/src/models/kinds.js`).
