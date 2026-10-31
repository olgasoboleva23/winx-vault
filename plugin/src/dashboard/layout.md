
>[!grid]
>>[!col]
> ><div class="winx-dash-date"></div>
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
> > cycle
> > card: Cycle
> > ```
> >
> > ```winx
> > weight
> > card: Weight
> > ```
> >
> > ```winx
> > financeMonth
> > card: Finance
> > ```
> >
> > ```winx
> > savings
> > card: Savings
> > ```
>
> > [!col]
> > ```winx
> > xpToday
> > card: XP Today
> > ```
> >
> > > [!card|scroll] Quests
> > > <div class="winx-dash-quests"></div>
> >
> > ```winx
> > celestialMarket
> > card: Celestial
> > meta: scroll
> > ```

%% the Quests card's Tasks query, for the tab's day (the dashboard draws it into the card) %%

```tasks
due on {{date}}
path includes Tasks
short mode
sort by tags
```
