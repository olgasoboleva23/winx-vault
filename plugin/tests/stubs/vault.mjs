// A vault in memory for the tests, set as the app: path → text (`files`), folders as a set
// (`dirs`), a note's properties (`props`), Obsidian's local storage (`local`, the sounds muted),
// Dataview's api when given (`dataview`); `io.failing` = N: the next N adapter writes throw.
// Anything else a test needs goes on the returned `app` itself.
import { setApp } from "#/helpers/app.js";

export function vault(files = {}, { folders = [], props = {}, dataview = null } = {}) {
  const dirs = new Set(folders), local = { "winx-mute": "1" }, io = { failing: 0 };
  const byPath = p => p in files ? { path: p } : null;
  const app = {
    vault: {
      getFileByPath: byPath,
      getFolderByPath: p => dirs.has(p) ? { path: p } : null,
      read: async f => files[f.path],
      cachedRead: async f => files[f.path],
      process: async (f, fn) => { files[f.path] = fn(files[f.path]); },
      create: async (p, text) => { files[p] = text; return { path: p }; },
      createFolder: async p => { dirs.add(p); },
      adapter: {
        exists: async p => p in files,
        read: async p => files[p],
        write: async (p, text) => {
          if (io.failing-- > 0) throw new Error("disk");
          files[p] = text;
        },
      },
    },
    metadataCache: {
      getCache: p => ({ frontmatter: props[p] ?? {} }),
      getFirstLinkpathDest: p => byPath(p) ?? byPath(`${p}.md`),
    },
    loadLocalStorage: k => local[k] ?? null,
    saveLocalStorage: (k, v) => { local[k] = v; },
    plugins: { plugins: dataview ? { dataview: { api: dataview } } : {} },
    internalPlugins: { getPluginById: () => null },
    workspace: {},
  };
  setApp(app);
  return { files, dirs, local, io, app };
}
