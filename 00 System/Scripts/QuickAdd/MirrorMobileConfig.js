// Copies the synced visible folder "obsidian-mobile/" into the real mobile
// config folder ".obsidian-mobile" on this device.
//
// Why: Obsidian requires config-folder overrides to start with a dot, but
// Remotely Save never syncs dot-folders and iOS can't create them manually.
// So the visible folder is the distribution channel, and this script
// promotes it on-device.
//
// Safe to re-run any time the desktop updates obsidian-mobile/: it only
// writes files present in the source and never deletes extras in the
// destination, so device-local files (Remotely Save auth, workspace.json)
// survive. Restart Obsidian after running.
module.exports = async () => {
  const SRC = "obsidian-mobile";
  const DST = ".obsidian-mobile";
  const ad = app.vault.adapter;

  if (!(await ad.exists(SRC))) {
    new Notice(`✦ "${SRC}" folder not found — sync the vault first`);
    return;
  }

  let copied = 0;
  const mirror = async (src, dst) => {
    if (!(await ad.exists(dst))) await ad.mkdir(dst);
    const { files, folders } = await ad.list(src);
    for (const f of files) {
      await ad.writeBinary(`${dst}/${f.substring(src.length + 1)}`, await ad.readBinary(f));
      copied++;
    }
    for (const d of folders) {
      await mirror(d, `${dst}/${d.substring(src.length + 1)}`);
    }
  };

  await mirror(SRC, DST);
  new Notice(`✦ Mobile config updated (${copied} files). Restart Obsidian to apply.`);
};
