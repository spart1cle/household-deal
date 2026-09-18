import { addDays, startOfWeek } from '../dates'
import { activePeople, assignmentWeight } from '../deal'
import { useHousehold } from '../HouseholdContext'

export function WeekScreen() {
  const { household, today } = useHousehold()
  if (!household) return null
  const people = activePeople(household.people)
  const weekStart = startOfWeek(today)
  const totals: Record<string, number> = {}
  const lastDoneEntries = Object.entries(household.lastDone)
  for (const person of people) totals[person.id] = 0
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i)
    const day = household.days[date]
    if (!day) continue
    for (const a of day.assignments) {
      if (a.status !== 'done' || !a.completedBy) continue
      totals[a.completedBy] =
        (totals[a.completedBy] ?? 0) + assignmentWeight(a, household.chores)
    }
  }
  const max = Math.max(1, ...Object.values(totals))
  const rotating = household.chores.filter(
    (c) => !c.archived && !c.dailyLocked && c.baseDays > 1,
  )

  const groups: Array<typeof people> = [
    people.filter((p) => p.role === 'adult'),
    people.filter((p) => p.role === 'teen'),
    people.filter((p) => p.role === 'child'),
  ]

  return (
    <main className="sheet">
      <p className="eyebrow">This week</p>
      <h1>Effort, not a scoreboard.</h1>
      <p className="lede">
        Taller bars mean more work credited this week. Groups are separate so
        kids are not compared to adults.
      </p>
      {groups.map((group) =>
        group.length === 0 ? null : (
          <section key={group[0].role}>
            <h2>
              {group[0].role === 'adult'
                ? 'Adults'
                : group[0].role === 'teen'
                  ? 'Teens'
                  : 'Children'}
            </h2>
            <ul className="bars">
              {group.map((person) => (
                <li key={person.id}>
                  <div className="bar-meta">
                    <strong>{person.name}</strong>
                    <span>{totals[person.id] ?? 0}</span>
                  </div>
                  <div className="bar">
                    <span
                      style={{
                        width: `${((totals[person.id] ?? 0) / max) * 100}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ),
      )}
      <section>
        <h2>Rotating jobs</h2>
        <ul className="last-done">
          {rotating.map((chore) => (
            <li key={chore.id}>
              <span>{chore.name}</span>
              <span className="muted">
                {lastDoneEntries.find(([id]) => id === chore.id)?.[1] ??
                  'Not yet'}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
