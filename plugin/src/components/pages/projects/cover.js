// A project card's picture: its cover from the vault, else a pink-to-lavender sky with a star
export const PLACEHOLDER = "data:image/svg+xml," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 150" preserveAspectRatio="none">' +
  '<defs><linearGradient id="g" x2="1" y2="1"><stop offset="0" stop-color="#fce4f1"/>' +
  '<stop offset="1" stop-color="#b88ad8"/></linearGradient></defs>' +
  '<rect width="400" height="150" fill="url(#g)"/>' +
  '<path d="M200 45l8 22 22 8-22 8-8 22-8-22-22-8 22-8z" fill="#ffd966"/></svg>',
);

// the cover's resource path; no cover, or its file is gone: the placeholder
export function coverUrl(project, app) {
  const file = project.cover && app.vault.getFileByPath(project.cover);

  return file ? app.vault.getResourcePath(file) : PLACEHOLDER;
}
