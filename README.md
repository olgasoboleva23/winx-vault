# ✨ Winx Vault — Obsidian RPG Dashboard

A gamified personal productivity system built in Obsidian with a magical-girl aesthetic. Track tasks, habits, goals and life balance through an RPG-style dashboard and a task calendar.

![Dashboard](dashboard.png)

The repo is two things at once:

- **an example vault** (open the repo folder in Obsidian) with demo notes, tasks and the dashboard;
- **the Winx plugin** (`plugin/`): every widget, the task window, the commands and all the styles. Notes only say where a widget goes.

---

## 🚀 Install

You need [Node.js](https://nodejs.org) 24 and Obsidian 1.9 or newer.

1. **Get the repo:** `git clone https://github.com/olgasoboleva23/winx-vault.git`
2. **Build the plugin** into the vault:
   ```sh
   cd winx-vault/plugin
   npm ci
   npm run build
   mkdir -p ../.obsidian/plugins/winx && cp dist/* ../.obsidian/plugins/winx/
   ```
3. **Open the `winx-vault` folder as a vault** in Obsidian, trust its plugins (Settings → Community plugins → Turn on). The other plugins (below) are already in `.obsidian/plugins/`.
4. Open `Dashboard.md`.

Without step 2 every card shows "winx is not defined": the notes ask the plugin to draw them.

### Into your own vault

Copy the plugin and what it reads:

| What | Where it goes in your vault |
|---|---|
| `plugin/dist/*` (after `npm run build`) | `.obsidian/plugins/winx/` — then turn **Winx** on in Community plugins |
| the plugins from the table below | Community plugins (or copy `.obsidian/plugins/<name>/` from here) |
| `Dashboard.md`, `Week.md`, `Mobile.md`, `Mobile/` | anywhere (they hold the widget blocks) |
| `02 Areas/Personal/Tasks/` (`Master.md`, `Pool.md`, `Kanban.md`), `Goals.md`, `00 System/Data/`, `00 System/Assets/` | the same paths: the widgets and the calendar read them there |

The paths the widgets read are in the widget files (`plugin/src/widgets/*.js`, `plugin/src/calendar/view.ts`, constants at the top) and `plugin/src/lib/config.js`.

### Keeping your vault in sync with this repo

Pull and rebuild, then run **Winx: Reload** (Cmd+P):

```sh
cd winx-vault && git pull
cd plugin && npm ci && npm run build && cp dist/* /path/to/your/vault/.obsidian/plugins/winx/
```

Or let a GitHub Action do it, if your vault is a git repo: check out this repo next to it, build the plugin, copy it in, commit. The core steps:

```yaml
- uses: actions/checkout@v4            # your vault
  with: { path: base }
- uses: actions/checkout@v4            # this repo
  with: { repository: olgasoboleva23/winx-vault, path: styles }
- uses: actions/setup-node@v4
  with: { node-version: 24 }
- run: cd styles/plugin && npm ci && npm run build
- run: mkdir -p base/.obsidian/plugins/winx && cp styles/plugin/dist/* base/.obsidian/plugins/winx/
# then copy the notes you take from here, and git commit + push in base/
```

### 📱 Phone

The plugin works on the phone (no desktop-only code). It only has to get there: whatever syncs your vault (Obsidian Sync, iCloud, Remotely Save, …) must carry `.obsidian/plugins/winx/`, and **Winx** must be on in the phone's Community plugins. Tools that skip dot-folders (Remotely Save does) need a visible copy of the config folder that you move into place on the phone; `00 System/Scripts/QuickAdd/MirrorMobileConfig.js` does that from an `obsidian-mobile/` folder.

---

## ⚙️ Plugins

> Obsidian version: 1.12.7

| Plugin | Version | Purpose |
|---|---|---|
| **Winx** | this repo, `plugin/` | Widgets, task window, commands, all styles |
| **Dataview** | 0.5.68 | Data for the widgets (their `dataviewjs` blocks) |
| **Tasks** | 7.23.1 | Task format, the edit dialog, ticking 🔁 tasks |
| **Templater** | 2.19.3 | Daily note template |
| **QuickAdd** | 2.12.0 | Work task and Recipe notes |
| **Charts** | 3.9.0 | Radar, bar & line charts in widgets |
| **Meta Bind** | 1.4.8 | `INPUT[slider]` and `INPUT[date]` inline inputs |

---

## 🖥 Dashboard

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

A note shows a widget with a Dataview block:

````
```dataviewjs
await winx.render("weight", dv);
```
````

`Week.md` is the weekly review: goals × days, cycle day, tasks done and still open, the first lines of each daily note. `Mobile.md` and `Mobile/` are the same widgets laid out for a phone.

---

## 📅 Calendar

A tab of its own: **Winx: Open calendar** (Cmd+P) or the 📅 icon on the left. The tasks of `02 Areas/Personal/Tasks` on a week or a month. Pin the tab, drag it to a sidebar or a window; it keeps its week, tab and unfolded days across restarts (Obsidian saves them with the layout). Until you pick a date it follows today.

![Calendar](calendar.png)

- **Days** show one-off tasks, and a day's 🔁 tasks folded into one pill "🔁 2/5"; a click unfolds them, grouped by time of day (`#time/morning`, `#time/evening`).
- **Drag** a task onto a day: open and due that day, or ✓ done that day. While dragging, a bar of 7 days sticks to the top of the screen.
- **Missed?** lists open tasks whose day has passed: ✓ done that day, or ☀️ move to today.
- **Bottom tabs:** **No date** (open tasks without a date), **Regulars** (🔁 tasks), **Pool** (tasks to pick when it's time, from `Tasks/Pool.md`: drag one onto a day to make a copy).
- **On a task:** ⭐ change difficulty, ✏️ edit (the task window, then the Tasks dialog), ⏭ skip a 🔁 task this time, 🗑 delete (click twice). On the phone, swipe right = done, swipe left = skip / take the date off.
- **Stickers:** `![[name.gif|28]]` in a task's text (files in `00 System/Assets/stickers/`); hover to see one big.

---

## ✅ Tasks and commands

![Task window](task-window.png)

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

---

## 🎮 XP & Levels

Completing a task awards XP and gold by its difficulty:

| Tag | XP | Gold |
|---|---|---|
| `#⭐easy` | 5 | 2 |
| `#⭐⭐medium` | 10 | 5 |
| `#⭐⭐⭐hard` | 20 | 10 |
| `#⭐⭐⭐⭐epic` | 50 | 25 |

Level `n` costs `100 + (n-1) × 25` XP. Complete a habit **30+ times** in a month → **+100 XP** per habit.

### Life areas

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
- Use repeats without `when done`: a missed goal task moves to the next planned day, so it never piles up.

## 📝 Daily Note

Notes (free text; the first lines show on the Week page) and an XP Log. Made from `00 System/Templates/Daily Note.md`, or by **✦ Open** on the dashboard for the selected day.

---

## 🗂 Structure

```
├── 📁 plugin — the Winx plugin
│   ├── 📁 src
│   │   ├── main.ts               — loads everything; window.winx.render for the notes' blocks
│   │   ├── 📁 calendar           — the calendar tab: view.ts (state, redraws), data.js (the model, tested),
│   │   │                           state.js (tested), header, grid, panel, missed, card, drag, swipe, actions
│   │   ├── commands.ts           — the Cmd+P commands
│   │   ├── 📁 ui/form.ts         — one window of buttons / text boxes instead of a chain of prompts
│   │   ├── 📁 lib                — config, goalsLib (week / goal / cycle / weight logic), task (one task line:
│   │   │                           read it, change it), items (watch / read / game notes), helpers
│   │   └── 📁 widgets            — one file per widget, render(dv, input)
│   ├── 📁 styles                 — Sass partials, built into the plugin's styles.css
│   └── 📁 tests                  — npm test; tests/obsidian/ checks styles inside Obsidian
├── 📁 00 System
│   ├── 📁 Assets                 — sounds, task stickers (stickers/)
│   ├── 📁 Data                   — Shop.md, Celestial Market.md, Supplies.md
│   ├── 📁 Scripts                — notify.js (desktop reminders, Templater startup), QuickAdd/MirrorMobileConfig.js
│   └── 📁 Templates              — Daily Note.md, recipe.md, task.md
├── 📁 02 Areas
│   ├── 📁 Health & Body/Cycle.md — cycle start dates
│   └── 📁 Personal
│       ├── Goals.md
│       ├── 📁 Daily Notes
│       └── 📁 Tasks              — Master.md (all tasks), Pool.md, Kanban.md
├── 📁 03 Resources/Collections   — Readlist, Gamelist, Watchlist, Recipes (Obsidian Bases)
├── Dashboard.md, Week.md, Mobile.md, 📁 Mobile
```

## 🛠 Development

```sh
cd plugin
npm ci
npm test                                   # unit tests
WINX_VAULT=/path/to/your/vault npm run dev # build into <vault>/.obsidian/plugins/winx on every save
```

After a rebuild run **Winx: Reload** (Cmd+P) and reopen the open notes (widgets already drawn keep the old code). `npm run build` makes `plugin/dist/` (`main.js`, `styles.css`, `manifest.json`); a Sass error fails it.

`tests/obsidian/styles-snapshot.js` records the computed styles of every element on a set of pages (run it inside Obsidian); `compare-snapshots.mjs` diffs two such records, to check a style change moved nothing it shouldn't.
