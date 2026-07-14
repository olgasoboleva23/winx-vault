---
date: 2026-07-14
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
> > > dv.view("00 System/Scripts/dvWidgets/wallet");
> > > ```
> > 
> > > [!card] Pomodoro
> > > ```dataviewjs
> > > dv.view("00 System/Scripts/dvWidgets/pomodoro");
> > > ```
> > 
> > > [!card] Monthly Habits
> > > ```dataviewjs
> > > dv.view("00 System/Scripts/dvWidgets/habits");
> > > ```
> 
> > [!col]
> > > [!card] Life Areas
> > > ```dataviewjs
> > > dv.view("00 System/Scripts/dvWidgets/lifeAreas");
> > > ```
> >
> > > [!card] Weekly State
> > > ```dataviewjs
> > > dv.view("00 System/Scripts/dvWidgets/weeklyState");
> > > ```
>
> > [!col]
> > > [!card] XP Today
> > > ```dataviewjs
> > > dv.view("00 System/Scripts/dvWidgets/xpToday");
> > > ```
> >
> > > [!card] Quests
> > > ```tasks
due on {{query.file.property('date')}}
path includes Tasks
group by function task.tags.filter(tag => tag.includes("area"))
short mode
sort by tags
> > > ```
> >
> > > [!card] Celestial Market
> > > ```dataviewjs
> > > dv.view("00 System/Scripts/dvWidgets/celestialMarket");
> > > ```
