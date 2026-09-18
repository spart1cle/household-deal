import { choreFor } from '../jobs'
import { EFFORT_LABELS } from '../effort'
import { useHousehold } from '../HouseholdContext'
import type { Assignment } from '../types'

export function JobCard({
  assignment,
  big = false,
}: {
  assignment: Assignment
  big?: boolean
}) {
  const { household, me, markAssignment } = useHousehold()
  if (!household) return null
  const chore = choreFor(household.chores, assignment.choreId)
  if (!chore) return null
  const done = assignment.status !== 'open'
  const who =
    household.people.find((p) => p.id === assignment.personId)?.name ?? 'Someone'

  return (
    <article
      className={`job ${assignment.isMain ? 'job-main' : ''} ${done ? 'job-done' : ''} ${big ? 'job-big' : ''}`}
    >
      <div className="job-top">
        {assignment.isMain ? <span className="pill pill-main">Main</span> : null}
        {!assignment.required ? <span className="pill">Extra</span> : null}
        <span className="effort">{EFFORT_LABELS[chore.effort]}</span>
      </div>
      <h3>{chore.name}</h3>
      {chore.note ? <p className="note">{chore.note}</p> : null}
      <p className="muted">Dealt to {who}</p>
      <div className="job-actions">
        {assignment.status === 'open' ? (
          <>
            <button
              type="button"
              className="btn primary"
              disabled={!me}
              onClick={() => void markAssignment(assignment.id, 'done')}
            >
              Done
            </button>
            <button
              type="button"
              className="btn"
              disabled={!me}
              onClick={() => void markAssignment(assignment.id, 'skipped')}
            >
              Doesn&apos;t apply
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn"
            onClick={() => void markAssignment(assignment.id, 'open')}
          >
            Undo {assignment.status === 'skipped' ? 'skip' : 'done'}
          </button>
        )}
      </div>
    </article>
  )
}
