
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
> > > <div class="winx-dash-quests"></div>
> >
> > ```winx
> > celestialMarket
> > card: Celestial Market
> > meta: scroll
> > ```

%% the Quests card's Tasks query, for the tab's day (the dashboard draws it into the card) %%

```tasks
due on {{date}}
path includes Tasks
group by function const i = {body: "🏃 Body", mind: "🧠 Mind", wealth: "💰 Wealth", base: "🏡 Base", occasions: "🌄 Occasions", rest: "🌙 Rest", learning: "📚 Learning", work: "💼 Work", personal: "🌸 Personal", health: "💊 Health"}; return task.tags.filter(t => t.startsWith("#area/")).map(t => i[t.slice(6)] ?? t)
short mode
sort by tags
```
