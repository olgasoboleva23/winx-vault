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
> >```winx
> >dailyNote
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
> > > ```winx
> > > goals
> > > ```
> > > 🗓 [[Week|Week]]
> 
> > [!col]
> > ```winx
> > lifeAreas
> > card: Life Areas
> > ```
> >
> > ```winx
> > cycle
> > card: Cycle
> > ```
> >
> > ```winx
> > weight
> > card: Weight
> > ```
> >
> > > [!card] Finance
> > > 💰 [[Finance|Open finance]]
>
> > [!col]
> > ```winx
> > xpToday
> > card: XP Today
> > ```
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
> > ```winx
> > celestialMarket
> > card: Celestial Market
> > meta: scroll
> > ```
