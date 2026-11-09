# ✨ Winx Vault — Obsidian RPG Dashboard

A gamified personal productivity system built in Obsidian with a magical-girl aesthetic. Track tasks, habits, goals and life balance through an RPG-style dashboard and a task calendar.

![Dashboard](docs/images/dashboard.webp)

![Calendar](docs/images/calendar.webp)

<p><img src="docs/images/phone-dashboard.webp" alt="Dashboard on the phone" width="260"> <img src="docs/images/phone-calendar.webp" alt="Calendar on the phone" width="260"></p>

The repo is two things at once:

- **an example vault** (open the repo folder in Obsidian) with demo notes, tasks and the dashboard;
- **the Winx plugin** (`plugin/`): every widget, the calendar tab, the task window, the commands and all the styles. Notes only say where a widget goes.

**Quick start:** build the plugin (`cd plugin && npm ci && npm run build`, then copy `plugin/dist/*` into `.obsidian/plugins/winx/`), open the folder as a vault, turn on community plugins, click ✨ on the left. Details in [Installation](docs/installation.md).

## Docs

- [Installation](docs/installation.md) — install, your own vault, keeping it in sync, the phone
- [Tasks and the calendar](docs/tasks-and-calendar.md) — tasks (an id per task, Winx's fields in `tasks.json`), commands, the calendar tab, medication courses (vitamins and medicines: what to take when, ticked day by day)
- [Dashboard](docs/dashboard.md) — the cards, XP, shop, market, goals, daily note
- [Development](docs/development.md) — structure, build, tests
