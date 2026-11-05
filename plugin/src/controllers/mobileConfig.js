import { Notice } from "obsidian";
import { app } from "#/helpers/app.js";

// The synced visible folder obsidian-mobile/ copied into the real mobile config folder
// .obsidian-mobile. Obsidian wants a config folder starting with a dot, Remotely Save never syncs
// dot folders, and iOS can't make them by hand: so obsidian-mobile/ is how the config travels, and
// this puts it in place on the phone. Only writes what the source has, never deletes: device-local
// files (Remotely Save's login, workspace.json) stay.
export async function mirrorMobileConfig() {
  const SRC = "obsidian-mobile", DST = ".obsidian-mobile", ad = app.vault.adapter;

  if (!(await ad.exists(SRC)))
    return void new Notice(`✦ "${SRC}" folder not found — sync the vault first`);
  let copied = 0;
  const mirror = async (src, dst) => {
    if (!(await ad.exists(dst))) await ad.mkdir(dst);
    const { files, folders } = await ad.list(src);

    for (const f of files) {
      await ad.writeBinary(`${dst}/${f.slice(src.length + 1)}`, await ad.readBinary(f));
      copied++;
    }

    for (const d of folders) await mirror(d, `${dst}/${d.slice(src.length + 1)}`);
  };

  await mirror(SRC, DST);
  new Notice(`✦ Mobile config updated (${copied} files). Restart Obsidian to apply.`);
}
