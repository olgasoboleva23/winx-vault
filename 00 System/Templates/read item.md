<%*
const title = await tp.system.prompt("Title");

const media_type = await tp.system.suggester(
  ["Fanfiction", "Fiction", "Scientific pop", "IT"],
  ["fanfiction", "fiction", "scientific_pop", "it"]
);

const status = await tp.system.suggester(
  ["to read", "reading", "completed", "dropped"],
  ["to_read", "reading", "completed", "dropped"]
);

const date = tp.date.now("YYYY-MM-DD");

tR = `---
type: read
title: "${title}"
media_type: ${media_type}
status: ${status}
rating: 
created: ${date}
tags:
  - #media/read
---

# 📖 ${title}

## Notes

## Progress
- [ ] Start
- [ ] Watch
- [ ] Finish
`;
%>