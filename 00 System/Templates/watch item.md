<%*
const title = await tp.system.prompt("Title");

const media_type = await tp.system.suggester(
  ["Movie", "Cartoon", "Animated series", "TV Show", "Anime", "Documentary", "Other"],
  ["movie", "cartoon", "animated_series", "tv", "anime", "doc", "other"]
);

const status = await tp.system.suggester(
  ["to watch", "watching", "completed", "dropped"],
  ["to_watch", "watching", "completed", "dropped"]
);

const date = tp.date.now("YYYY-MM-DD");

tR = `---
type: watch
title: "${title}"
media_type: ${media_type}
status: ${status}
rating: 
created: ${date}
tags:
---

# 🎬 ${title}

## Notes

## Progress
- [ ] Start
- [ ] Watch
- [ ] Finish
`;
%>