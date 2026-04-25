---
date: 2026-05-02
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
> >dv.view("Settings/scripts/dvWidgets/dailyNote");
> >```

> [!grid]
> > [!col]
> > > [!card] Level
> > > ```dataviewjs
> > > dv.view("Settings/scripts/dvWidgets/levelToday");
> > > ```
> > 
> > > [!card] Pomodoro
> > > ```dataviewjs
> > > dv.view("Settings/scripts/dvWidgets/pomodoro");
> > > ```
> > 
> > > [!card] Monthly Habits
> > > ```dataviewjs
> > > dv.view("Settings/scripts/dvWidgets/habits");
> > > ```
> 
> > [!col]
> > > [!card] Life Areas
> > > ```dataviewjs
> > > dv.view("Settings/scripts/dvWidgets/lifeAreas");
> > > ```
> >
> > > [!card] Weekly State
> > > ```dataviewjs
> > > dv.view("Settings/scripts/dvWidgets/weeklyState");
> > > ```
>
> > [!col]
> > > [!card] XP Today
> > > ```dataviewjs
> > > dv.view("Settings/scripts/dvWidgets/xpToday");
> > > ```
> >
> > > [!card] Tasks
> > > ```tasks
due on {{query.file.property('date')}}
path includes Tasks
group by function task.tags.filter(tag => tag.includes("area"))
short mode
sort by tags
> > > ```
