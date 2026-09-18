import { useEffect } from 'react'
import { JobCard } from '../components/JobCard'
import { prettyDate } from '../dates'
import { activePeople } from '../deal'
import { EFFORT_LABELS } from '../effort'
import { useHousehold } from '../HouseholdContext'
import { canDo, choreFor } from '../jobs'

export function TodayScreen() {
  const {
    household,
    me,
    today,
    ensureDeal,
    dealAgain,
    setOut,
    claimChore,
    optionalToday,
  } = useHousehold()

  useEffect(() => {
    void ensureDeal()
  }, [ensureDeal])

  if (!household) return null
  const day = household.days[today]
  const people = activePeople(household.people)
  const out = new Set(day?.outPersonIds ?? [])
  const mine = (day?.assignments ?? []).filter((a) => a.personId === me?.id)
  const mineOpen = mine.filter((a) => a.status === 'open')
  const required = (day?.assignments ?? []).filter((a) => a.required)
  const requiredDone = required.filter((a) => a.status !== 'open').length
  const isAdult = me?.role === 'adult'
  const isChild = me?.role === 'child'
  const extras = optionalToday.filter((chore) =>
    me ? canDo(chore, me.id, household.people) : false,
  )

  return (
    <main className={`sheet ${isChild ? 'kid' : ''}`}>
      <header className="today-head">
        <p className="eyebrow">{prettyDate(today)}</p>
        <h1>{me ? `${me.name}’s jobs` : 'Today'}</h1>
        <p className="progress">
          {requiredDone} of {required.length} required done
        </p>
      </header>

      {!me ? (
        <p className="banner">Pick who you are on this phone so Done credits you.</p>
      ) : null}

      {me && out.has(me.id) ? (
        <p className="banner">You are marked out today. Jobs went to everyone else.</p>
      ) : null}

      <section>
        {mineOpen.length === 0 && mine.length > 0 ? (
          <p className="lede">You are clear. Take an extra if you want.</p>
        ) : null}
        {mine
          .slice()
          .sort((a, b) => Number(b.isMain) - Number(a.isMain))
          .map((assignment) => (
            <JobCard key={assignment.id} assignment={assignment} big={isChild} />
          ))}
        {mine.length === 0 && me && !out.has(me.id) ? (
          <p className="muted">No jobs on your list yet. Pull to refresh, or wait for today&apos;s deal.</p>
        ) : null}
      </section>

      {extras.length > 0 && me ? (
        <section>
          <h2>Up for grabs</h2>
          <p className="muted">Optional. Only jobs you can do.</p>
          <ul className="grab-list">
            {extras.map((chore) => (
              <li key={chore.id}>
                <div>
                  <strong>{chore.name}</strong>
                  <span className="effort">{EFFORT_LABELS[chore.effort]}</span>
                </div>
                <button
                  type="button"
                  className="btn"
                  onClick={() => void claimChore(chore.id)}
                >
                  I&apos;ll take it
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!isChild ? (
        <section>
          <h2>The house</h2>
          <ul className="people-strip">
            {people.map((person) => {
              const jobs = (day?.assignments ?? []).filter(
                (a) => a.personId === person.id && a.required,
              )
              const open = jobs.filter((a) => a.status === 'open').length
              return (
                <li key={person.id}>
                  <div>
                    <strong>{person.name}</strong>
                    <span className="muted">
                      {out.has(person.id)
                        ? 'Out today'
                        : `${jobs.length - open}/${jobs.length} done`}
                    </span>
                    <ul className="tiny-jobs">
                      {jobs.map((job) => {
                        const chore = choreFor(household.chores, job.choreId)
                        return (
                          <li key={job.id} className={job.status}>
                            {chore?.name ?? 'Job'}
                            {job.isMain ? ' · Main' : ''}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                  {isAdult ? (
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => void setOut(person.id, !out.has(person.id))}
                    >
                      {out.has(person.id) ? 'Back in' : 'Out today'}
                    </button>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      {isAdult ? (
        <button type="button" className="btn ghost" onClick={() => void dealAgain()}>
          Deal again (keep finished jobs)
        </button>
      ) : null}
    </main>
  )
}
