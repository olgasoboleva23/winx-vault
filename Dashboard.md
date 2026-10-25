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
> >dv.view("00 System/Scripts/dvWidgets/dailyNote");
> >```

> [!grid]
> > [!col]
> > > [!card] Level
> > > ```dataviewjs
> > > dv.view("00 System/Scripts/dvWidgets/levelToday");
> > > ```
> > 
> > > [!card] Pomodoro
> > > ```dataviewjs
> > > dv.view("00 System/Scripts/dvWidgets/pomodoro");
> > > ```
> > 
> > > [!card] Goals
> > > ```dataviewjs
> > > dv.view("00 System/Scripts/dvWidgets/goals");
> > > ```
> > > 🗓 [[Week|Week]]
> 
> > [!col]
> > > [!card] Life Areas
> > > ```dataviewjs
> > > dv.view("00 System/Scripts/dvWidgets/lifeAreas");
> > > ```
> >
> > > [!card] Cycle
> > > ```dataviewjs
> > > dv.view("00 System/Scripts/dvWidgets/cycle");
> > > ```
> >
> > > [!card] Weight
> > > ```dataviewjs
> > > dv.view("00 System/Scripts/dvWidgets/weight");
> > > ```
> >
> > > [!card] Finance
> > > 💰 [[Finance|Open finance]]
>
> > [!col]
> > > [!card] XP Today
> > > ```dataviewjs
> > > dv.view("00 System/Scripts/dvWidgets/xpToday");
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
> > > dv.view("00 System/Scripts/dvWidgets/celestialMarket");
> > > ```
