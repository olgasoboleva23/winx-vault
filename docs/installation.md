[← Docs](index.md)

# 🚀 Install

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
4. Click ✨ on the left: the dashboard and the calendar open as two pinned tabs.

Without step 2 there is no ✨, and the notes' cards stay empty: the plugin draws them.

## Into your own vault

Copy the plugin and what it reads:

| What | Where it goes in your vault |
|---|---|
| `plugin/dist/*` (after `npm run build`) | `.obsidian/plugins/winx/` — then turn **Winx** on in Community plugins |
| the plugins from the table below | Community plugins (or copy `.obsidian/plugins/<name>/` from here) |
| `Mobile.md`, `Mobile/` | anywhere (they hold the widget blocks) |
| `02 Areas/Personal/Tasks/` (`Master.md`, `Pool.md`, `Kanban.md`), `Goals.md`, `00 System/Data/`, `00 System/Assets/` | the same paths: the widgets and the calendar read them there |

The paths the widgets read are in the widget files (`plugin/src/widgets/*.js`, `plugin/src/calendar/view.ts`, constants at the top) and `plugin/src/lib/config.js`.

## Keeping your vault in sync with this repo

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

## 📱 Phone

The plugin works on the phone (no desktop-only code). It only has to get there: whatever syncs your vault (Obsidian Sync, iCloud, Remotely Save, …) must carry `.obsidian/plugins/winx/`, and **Winx** must be on in the phone's Community plugins. Tools that skip dot-folders (Remotely Save does) need a visible copy of the config folder that you move into place on the phone; `00 System/Scripts/QuickAdd/MirrorMobileConfig.js` does that from an `obsidian-mobile/` folder.

---

## ⚙️ Plugins

> Obsidian version: 1.12.7

| Plugin | Version | Purpose |
|---|---|---|
| **Winx** | this repo, `plugin/` | Widgets, task window, commands, all styles |
| **Dataview** | 0.5.68 | Data for the widgets and the calendar (its index of tasks and pages) |
| **Tasks** | 7.23.1 | Task format, the edit dialog, ticking 🔁 tasks |
| **Templater** | 2.19.3 | Daily note template |
| **QuickAdd** | 2.12.0 | Work task and Recipe notes |
| **Charts** | 3.9.0 | Radar, bar & line charts in widgets |
| **Meta Bind** | 1.4.8 | `INPUT[slider]` in old daily notes (optional) |
