
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

%% the Quests card's Tasks query, for the tab's day (the dashboard draws it into the card) %%

```tasks
due on {{date}}
path includes 00 System/Data/Tasks
short mode
sort by status
sort by tags
```
