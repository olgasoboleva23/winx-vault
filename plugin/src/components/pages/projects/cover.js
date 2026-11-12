// A project card's picture: its cover from the vault, else a pink-to-lavender sky with a pair of
// the cards' fairy wings (the wing of --winx-wing-svg, mirrored on the left, as it is on the right)
const WING =
  "<path d='M2 32 C2 14 14 2 32 2 C24 8 18 16 16 26 C22 22 30 22 36 26 C28 28 22 32 18 38 " +
  "C14 34 8 34 2 32 Z'/><path d='M4 38 C4 50 14 60 28 60 C22 54 18 46 16 38 C20 38 24 40 " +
  "26 44 C22 44 18 42 14 40 C10 40 6 40 4 38 Z'/>";

export const PLACEHOLDER = "data:image/svg+xml," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 150" preserveAspectRatio="xMidYMid slice">' +
  '<defs><linearGradient id="g" x2="1" y2="1"><stop offset="0" stop-color="#fce4f1"/>' +
  '<stop offset="1" stop-color="#b88ad8"/></linearGradient>' +
  '<linearGradient id="w" x2="1" y2="1"><stop offset="0" stop-color="#f8c8e0"/>' +
  '<stop offset="1" stop-color="#a8c8f0"/></linearGradient></defs>' +
  '<rect width="1200" height="150" fill="url(#g)"/>' +
  // wide and cropped to the card (slice), so the wings keep their shape at any width
  '<svg x="0" y="30" width="1200" height="90" viewBox="0 0 112 64">' +
  '<g fill="url(#w)" stroke="#c89dd6" stroke-width="0.8">' +
  `<g transform="translate(56 0) scale(-1 1)">${WING}</g>` +
  `<g transform="translate(56 0)">${WING}</g></g></svg></svg>`,
);

// the cover's resource path; no cover, or its file is gone: the placeholder
export function coverUrl(project, app) {
  const file = project.cover && app.vault.getFileByPath(project.cover);

  return file ? app.vault.getResourcePath(file) : PLACEHOLDER;
}
