# ✨ Winx Vault — Obsidian RPG Dashboard

A gamified personal productivity system built in Obsidian with a magical-girl aesthetic. Track tasks, habits, energy, and life balance through an RPG-style dashboard.

![[dashboard.png]]

---

## 🗂 Vault Structure

```
├── 📁 00 System
│   ├── 📁 Assets - Sounds for pomodoro and shop
│   ├── 📁 Data
│   │   └── Shop.md
│   ├── 📁 Scripts
│   │   ├── 📁 QuickAdd
│   │   │   └── NewTask.js           — Date selector widget
│   │   └── 📁 dvWidgets
│   │       ├── config.js              — Central config (areas, difficulties, XP values, levels)
│   │       ├── levelToday.js          — Level & XP progress card
│   │       ├── xpToday.js             — XP earned today + streak heatmap
│   │       ├── habits.js              — Monthly habits bar chart
│   │       ├── lifeAreas.js           — Radar chart of life area scores
│   │       ├── weeklyState.js         — Energy & mood line chart
│   │       ├── helpers.js             — Shared AudioEngine, Wallet, PurchaseLog
│   │       ├── wallet.js              — Gold balance widget
│   │       ├── shop.js                — Shop view with buy buttons
│   │       ├── pomodoro.js            — Pomodoro timer
│   │       └── dailyNote.js           — Date selector widget
│   └── 📁 Templates
│       ├── Daily Note.md — Templater template for new daily notes
│       ├── game.md — Templater template for new game
│       ├── recipe.md — Templater template for new recipe
│       ├── task.md — Templater template for new task
│       └── watch item.md — Templater template for new watch item (cartoon, movie, etc)
├── 📁 01 Projects
├── 📁 02 Areas
│   └── 📁 Personal
│       ├── 📁 Daily Notes — Daily journal entries (mood, energy, habits, XP log)
│       └── 📁 Tasks
│           └── Kanban.md — Kanban board view of tasks
├── 📁 04 Archive
├── 📁 99 Inbox
└── Dashboard.md
```

---

## ⚙️ Required Plugins

> Obsidian version: 1.12.7

| Plugin | Version | Purpose |
|---|---|---|
| **Dataview** | 0.5.68 | Powers all JS widgets |
| **Templater** | 2.19.3 | Daily note template |
| **Tasks** | 7.23.1 | Task tracking & completion dates |
| **QuickAdd** | 2.12.0 | `NewTask` macro for fast task creation |
| **Charts** | 3.9.0 | Radar, bar & line charts in widgets |
| **Meta Bind** | 1.4.8 | `INPUT[slider]` and `INPUT[date]` inline inputs |

---

## 🎮 XP & Leveling System

Tasks are tagged with a **difficulty** and a **life area**. Completing a task awards XP.

### Difficulties

| Tag | XP | Gold |
|---|---|---|
| `#⭐easy` | 5 | 2 |
| `#⭐⭐medium` | 10 | 5 |
| `#⭐⭐⭐hard` | 20 | 10 |
| `#⭐⭐⭐⭐epic` | 50 | 25 |

### Level Formula

Level `n` costs `100 + (n-1) × 25` XP. Levels are named:

| Name | Total XP threshold |
|---|---|
| VOID | 0 |
| SPARK | 10 |
| GLOW | 20 |
| AURA | 30 |
| TRANSFORMATION | ∞ |

### Habit Bonus

Complete a habit **30+ times** in a month → **+100 XP** bonus per qualifying habit.

---

## 🌐 Life Areas (Radar Chart)

| Emoji | Tag | Radar Name |
|---|---|---|
| 🏃 Body | `#area/body` | Vitality |
| 💼 Work | `#area/work` | Craft |
| 🧠 Mind | `#area/mind` | Knowledge |
| 💰 Wealth | `#area/wealth` | Resources |
| 🏡 Base | `#area/base` | Sanctuary |
| 🌄 Occasions | `#area/occasions` | Memory |
| 🌙 Rest | `#area/rest` | Serenity |

---

## 🛍 Shop

Completing tasks earns **gold** alongside XP. Spend it on real-world rewards defined in `Shop.md`.

### How it works

1. **Earn** — completing any tagged task adds gold (see Difficulties table).
2. **Browse** — open `Shop.md` to see your balance and available items. Affordable items show ✅, unaffordable show ❌.
3. **Buy** — click an affordable item. The purchase is logged to `Purchases.md` and the balance updates immediately.

### Adding items

Edit `Shop.md` and add a list entry:

- name:: Cozy Coffee cost:: 20

### Caching

Earned and spent totals are computed once and cached in memory. The cache is invalidated automatically when task or purchase files change, so widget re-renders are fast.

---

## 📝 Daily Note

Each daily note tracks:
- **Energy** & **Mood** (1–10 sliders)
- **XP Log** — freeform notes on what you did/learned
- **Habits** — checkbox tasks tagged `#habit/<area>/<name>`

Create via Templater from `Settings/Templates/Daily Note.md`.

---

## ✅ Creating a Task

![[kanban.png]]

Use the **QuickAdd `NewTask` macro**:
1. Choose difficulty (Easy / Medium / Hard / Epic)
2. Choose life area
3. Fill in task details in the Tasks modal
4. Task is prepended to `Tasks/Master.md`

---

## 🖥 Dashboard Widgets

| Widget | Description |
|---|---|
| **Level** | Current level, total XP, progress to next level |
| **Pomodoro** | 25/5 min focus timer, session counter |
| **Monthly Habits** | Bar chart of habit completions this month |
| **Life Areas** | Radar chart — XP earned per area this month |
| **Weekly State** | Line chart of energy & mood over the past week |
| **XP Today** | XP earned today, current level name, streak heatmap |
| **Quests** | Tasks due today, grouped by life area tag |
| **Wallet** | Current gold balance, shown under Level card |
| **Shop**   | (in Shop.md) Browse rewards, click to buy with gold |
