// One synced choice; only Winx containers inherit its palette (styles/_themes.scss).
import { watch } from "vue";
import config, { THEMES } from "#/helpers/config.js";
import { THEME_IMAGES } from "#/helpers/paths.js";
import { taskStore } from "#/store/tasks.js";
import { useFileChanges } from "#/composables/use.js";

export function useTheme(plugin) {
  const { app } = plugin, body = document.body;
  const classes = THEMES.map(t => `winx-theme-${t.value}`);
  const images = THEMES.filter(t => t.value !== "winx")
    .map(t => `${THEME_IMAGES}/${t.value}.avif`);
  const clear = () => {
    body.classList.remove(...classes);
    body.style.removeProperty("--winx-theme-image");
  };

  const apply = () => {
    clear();
    if (config.theme !== "winx") {
      body.classList.add(`winx-theme-${config.theme}`);
      const file = app.vault.getFileByPath(`${THEME_IMAGES}/${config.theme}.avif`);

      body.style.setProperty("--winx-theme-image",
        file ? `url(${JSON.stringify(app.vault.getResourcePath(file))})` : "none");
    }

    app.workspace.trigger("winx:theme");
  };

  // The store reads config before its version changes; apply before widgets rebuild charts.
  plugin.register(watch(() => (taskStore.version.value, config.theme), apply,
    { immediate: true, flush: "sync" }));
  useFileChanges(plugin, apply, images);   // an image can arrive after config during sync
  plugin.register(clear);
}
