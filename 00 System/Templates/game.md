<%*
const title = await tp.system.prompt("Game Title");

const status = await tp.system.suggester(
  ["to play", "playing", "completed", "paused", "dropped"],
  ["to_play", "playing", "completed", "paused", "dropped"]
);

const genre = await tp.system.prompt("Genre (optional)", "");

const date = tp.date.now("YYYY-MM-DD");

tR = `---
type: game
title: "${title}"
cover:
status: ${status}
genre: ${genre}
rating: 
hours: 
created: ${date}
tags:
  - #media/game
---

# 🎮 ${title}

## Notes

## Progress
- [ ] Start
- [ ] Play
- [ ] Complete
`;
%>