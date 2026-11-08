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
| `00 System/Data/` (`Tasks/Master.md`, `Tasks/Pool.md`, `Goals.md`, the widgets' notes), `00 System/Assets/` | the same paths: the widgets and the calendar read them there |

The paths the widgets read are in `plugin/src/helpers/paths.js` (and constants at the top of the controllers, `plugin/src/controllers/*.js`); the areas, difficulties and levels in `plugin/src/helpers/config.js`.

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

The plugin works on the phone (no desktop-only code). It only has to get there: whatever syncs your vault (Obsidian Sync, iCloud, Remotely Save, …) must carry `.obsidian/plugins/winx/`, and **Winx** must be on in the phone's Community plugins. Tools that skip dot-folders (Remotely Save does) need a visible copy of the config folder that you move into place on the phone; **Winx: Update mobile config** (on the phone) does that from an `obsidian-mobile/` folder.

A sync tool can bring deleted or renamed notes back: Remotely Save decides deletions from its memory of the previous sync, and when that memory is missing on one device, a note absent on the other side counts as new and is copied back (on 2026-11-06 it returned 78 old copies of Collections notes renamed the day before). Two guards, no plugin code involved: in Remotely Save's settings set **Protect modification percentage** low (5 %: a sync that would change more than that share of the vault stops and asks) and keep **Delete to** on the system trash; and after a mass rename or delete, sync from the desktop right away, then sync the phone before editing anything there.

---

## ⚙️ Plugins

> Obsidian version: 1.12.7

| Plugin | Version | Purpose |
|---|---|---|
| **Winx** | this repo, `plugin/` | Widgets, task window, commands, all styles |
| **Dataview** | 0.5.68 | Data for the widgets (its index of pages and lists; the tasks the plugin reads itself) |
| **Tasks** | 7.23.1 | Task format, the edit dialog, ticking 🔁 tasks |
| **Charts** | 3.9.0 | Radar, bar & line charts in widgets |
| **Meta Bind** | 1.4.8 | `INPUT[slider]` in old daily notes (optional) |
