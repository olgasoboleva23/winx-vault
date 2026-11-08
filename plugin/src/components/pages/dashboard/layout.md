
>[!grid]
>>[!col]
> ><div class="winx-dash__date"></div>
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
> > ```winx
> > cycle
> > card: Cycle
> > ```
> >
> > ```winx
> > pomodoro
> > card: Pomodoro
> > ```
> >
> > > [!card] Goals
> > > ```winx
> > > goals
> > > ```
>
> > [!col]
> > ```winx
> > lifeAreas
> > card: Life Areas
> > ```
> >
> > ```winx
> > weight
> > card: Weight
> > ```
>
> > [!col]
> > ```winx
> > xpToday
> > card: XP Today
> > ```
> >
> > > [!card|scroll] Quests
> > > <div class="winx-dash__quests"></div>
> >
> > ```winx
> > celestialMarket
> > card: Celestial
> > meta: scroll
> > ```
> >
> > > [!card] Finance
> > > ```winx
> > > financeMonth
> > > ```
> > >
> > > ```winx
> > > savings
> > > ```
> >
> > > [!card] Pages
> > > [[02 Areas/Finance|💰 Finance]] · [[00 System/Data/Shop|🛍 Shop]] · [[00 System/Data/Supplies|📦 Supplies]] · [[00 System/Data/Medication/_index.base|💊 Medication]]

%% Quests, for the tab's day (drawn into its card): what's left of the day's plan, and what was done that day %%

```tasks
((due on {{date}}) AND (not done)) OR (done on {{date}})
path includes 00 System/Data/Tasks
short mode
sort by status
sort by tags
```
