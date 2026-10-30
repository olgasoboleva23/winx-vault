---
date: 2026-07-28
cssclasses:
  - dashboard
pomodoro:
  sessions: 1
  minutes: 25
---

>[!grid]
>>[!col]
> >`INPUT[date:date]`
> >
> >```dataviewjs
> >await winx.render("dailyNote", dv);
> >```

> [!grid]
> > [!col]
> > ```winx
> > levelToday
> > card: Level
> > ```
> > 
> > > [!card] Pomodoro
> > > ```dataviewjs
> > > await winx.render("pomodoro", dv);
> > > ```
> > 
> > > [!card] Goals
> > > ```dataviewjs
> > > await winx.render("goals", dv);
> > > ```
> > > 🗓 [[Week|Week]]
> 
> > [!col]
> > > [!card] Life Areas
> > > ```dataviewjs
> > > await winx.render("lifeAreas", dv);
> > > ```
> >
> > > [!card] Cycle
> > > ```dataviewjs
> > > await winx.render("cycle", dv);
> > > ```
> >
> > > [!card] Weight
> > > ```dataviewjs
> > > await winx.render("weight", dv);
> > > ```
> >
> > > [!card] Finance
> > > 💰 [[Finance|Open finance]]
>
> > [!col]
> > > [!card] XP Today
> > > ```dataviewjs
> > > await winx.render("xpToday", dv);
> > > ```
> >
> > > [!card|scroll] Quests
> > > ```tasks
due on {{query.file.property('date')}}
path includes Tasks
group by function const i = {body: "🏃 Body", mind: "🧠 Mind", wealth: "💰 Wealth", base: "🏡 Base", occasions: "🌄 Occasions", rest: "🌙 Rest", learning: "📚 Learning", work: "💼 Work", personal: "🌸 Personal", health: "💊 Health"}; return task.tags.filter(t => t.startsWith("#area/")).map(t => i[t.slice(6)] ?? t)
short mode
sort by tags
> > > ```
> >
> > > [!card|scroll] Celestial Market
> > > ```dataviewjs
> > > await winx.render("celestialMarket", dv);
> > > ```
