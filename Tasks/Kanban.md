---
date: 2026-05-02
cssclasses:
  - kanban-board
---

`INPUT[date:date]`

> [!grid]
> > [!card] ✅ Done Today
> > ```tasks
done on {{query.file.property('date')}}
path includes Tasks
group by function task.tags.filter(tag => tag.includes("area"))
short mode
sort by tags
> > ```
>
> > [!card] 🔴 Overdue
> > ```tasks
not done
due before {{query.file.property('date')}}
path includes Tasks
group by function task.tags.filter(tag => tag.includes("area"))
short mode
sort by tags
> > ```
>
> > [!card] 🟡 Due Today
> > ```tasks
not done
due on {{query.file.property('date')}}
path includes Tasks
group by function task.tags.filter(tag => tag.includes("area"))
short mode
sort by tags
> > ```
>
> > [!card] 🟢 Due Tomorrow
> > ```tasks
not done
due after {{query.file.property('date')}}
due before in 2 days
path includes Tasks
group by function task.tags.filter(tag => tag.includes("area"))
short mode
sort by tags
> > ```
>
> > [!card] 🌙 This Week
> > ```tasks
not done
filter by function \
  const d = new Date("{{query.file.property('date')}}"); \
  const y = d.getUTCFullYear(), m = d.getUTCMonth(), day = d.getUTCDate(); \
  const start = new Date(y, m, day + 2).getTime(); \
  const daysToSun = (7 - d.getUTCDay()) % 7; \
  const end = new Date(y, m, day + daysToSun + 1).getTime(); \
  const due = task.due?.moment?.valueOf(); \
  return !!due && due >= start && due < end;
path includes Tasks
group by function task.tags.filter(tag => tag.includes("area"))
short mode
sort by tags
> > ```
>
> > [!card] 🌸 This Month
> > ```tasks
not done
filter by function \
  const d = new Date("{{query.file.property('date')}}"); \
  const y = d.getUTCFullYear(), m = d.getUTCMonth(), day = d.getUTCDate(); \
  const daysToSun = (7 - d.getUTCDay()) % 7; \
  const start = new Date(y, m, day + daysToSun + 1).getTime(); \
  const end = new Date(y, m + 1, 1).getTime(); \
  const due = task.due?.moment?.valueOf(); \
  return !!due && due >= start && due < end;
path includes Tasks
group by function task.tags.filter(tag => tag.includes("area"))
short mode
sort by tags
> > ```
>
> > [!card] ✨ This Year
> > ```tasks
not done
filter by function \
  const d = new Date("{{query.file.property('date')}}"); \
  const y = d.getUTCFullYear(), m = d.getUTCMonth(); \
  const start = new Date(y, m + 1, 1).getTime(); \
  const end = new Date(y + 1, 0, 1).getTime(); \
  const due = task.due?.moment?.valueOf(); \
  return !!due && due >= start && due < end;
path includes Tasks
group by function task.tags.filter(tag => tag.includes("area"))
short mode
sort by tags
> > ```
>
> > [!card] 🔮 Future
> > ```tasks
not done
filter by function \
  const d = new Date("{{query.file.property('date')}}"); \
  const nextYear = new Date(d.getUTCFullYear() + 1, 0, 1).getTime(); \
  const due = task.due?.moment?.valueOf(); \
  return !!due && due >= nextYear;
path includes Tasks
group by function task.tags.filter(tag => tag.includes("area"))
short mode
sort by tags
> > ```
>
> > [!card] 💭 Unscheduled
> > ```tasks
not done
no due date
path includes Tasks
group by function task.tags.filter(tag => tag.includes("area"))
short mode
sort by tags
> > ```
