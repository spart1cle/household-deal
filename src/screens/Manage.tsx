import { useState } from 'react'
import {
  FREQUENCY_STEPS,
  PACE_LABELS,
  EFFORT_LABELS,
  frequencyLabel,
  weekdayLabel,
} from '../effort'
import { useHousehold } from '../HouseholdContext'
import type { Chore, EffortLevel, Pace, Person, Role } from '../types'

const ROLES: Role[] = ['adult', 'teen', 'child']
const EFFORTS: EffortLevel[] = [1, 2, 3, 4, 5]

export function ManageScreen() {
  const {
    household,
    me,
    addPerson,
    savePerson,
    addChore,
    saveChore,
    setPace,
  } = useHousehold()
  const [personName, setPersonName] = useState('')
  const [personRole, setPersonRole] = useState<Role>('child')
  const [newChoreName, setNewChoreName] = useState('')
  const [copied, setCopied] = useState(false)

  if (!household || (me && me.role !== 'adult')) {
    return (
      <main className="sheet">
        <h1>Adults only</h1>
        <p>Kids and teens can do today&apos;s jobs, but they cannot edit the list.</p>
      </main>
    )
  }

  async function copyCode() {
    if (!household) return
    await navigator.clipboard.writeText(household.code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <main className="sheet manage">
      <p className="eyebrow">Adults</p>
      <h1>People and chores</h1>
      <p className="lede">
        Tap a chore to change effort, how often it runs, who may do it, or
        archive it. House pace stretches rotating jobs only.
      </p>
      <p className="code-block">
        Share this code
        <strong> {household.code}</strong>
        <button type="button" className="btn ghost" onClick={() => void copyCode()}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </p>

      <section>
        <h2>House pace</h2>
        <p className="muted">
          Stretches rotating jobs only. Dishes and the dog stay daily.
        </p>
        <div className="pace">
          {(['relaxed', 'normal', 'onTop'] as Pace[]).map((pace) => (
            <button
              key={pace}
              type="button"
              className={`btn ${household.pace === pace ? 'primary' : ''}`}
              onClick={() => void setPace(pace)}
            >
              {PACE_LABELS[pace]}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2>People</h2>
        <ul className="edit-list">
          {household.people.map((person) => (
            <PersonRow
              key={person.id}
              person={person}
              onSave={(next) => void savePerson(next)}
            />
          ))}
        </ul>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault()
            if (!personName.trim()) return
            void addPerson(personName, personRole)
            setPersonName('')
          }}
        >
          <input
            value={personName}
            placeholder="Add a person"
            onChange={(e) => setPersonName(e.target.value)}
          />
          <select
            value={personRole}
            onChange={(e) => setPersonRole(e.target.value as Role)}
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <button type="submit" className="btn">
            Add
          </button>
        </form>
      </section>

      <section>
        <h2>Chores</h2>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault()
            if (!newChoreName.trim()) return
            void addChore({
              name: newChoreName.trim(),
              effort: 3,
              baseDays: 3,
              dailyLocked: false,
              weekday: null,
              eligibleRoles: ['adult', 'teen', 'child'],
              eligiblePersonIds: [],
              note: '',
            })
            setNewChoreName('')
          }}
        >
          <input
            value={newChoreName}
            placeholder="Add a chore"
            onChange={(e) => setNewChoreName(e.target.value)}
          />
          <button type="submit" className="btn">
            Add
          </button>
        </form>
        <ul className="edit-list">
          {household.chores.map((chore) => (
            <ChoreRow
              key={chore.id}
              chore={chore}
              people={household.people.filter((p) => !p.archived)}
              onSave={(next) => void saveChore(next)}
            />
          ))}
        </ul>
      </section>
    </main>
  )
}

function PersonRow({
  person,
  onSave,
}: {
  person: Person
  onSave: (person: Person) => void
}) {
  return (
    <li className={person.archived ? 'archived' : ''}>
      <input
        value={person.name}
        onChange={(e) => onSave({ ...person, name: e.target.value })}
      />
      <select
        value={person.role}
        onChange={(e) => onSave({ ...person, role: e.target.value as Role })}
      >
        {ROLES.map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="btn ghost"
        onClick={() => onSave({ ...person, archived: !person.archived })}
      >
        {person.archived ? 'Restore' : 'Archive'}
      </button>
    </li>
  )
}

function ChoreRow({
  chore,
  people,
  onSave,
}: {
  chore: Chore
  people: Person[]
  onSave: (chore: Chore) => void
}) {
  const [open, setOpen] = useState(false)
  const freqIndex = Math.max(
    0,
    FREQUENCY_STEPS.findIndex((d) => d >= chore.baseDays),
  )

  return (
    <li className={chore.archived ? 'archived' : ''}>
      <button type="button" className="chore-summary" onClick={() => setOpen(!open)}>
        <strong>{chore.name}</strong>
        <span className="muted">
          {EFFORT_LABELS[chore.effort]} · {frequencyLabel(chore.baseDays)}
          {chore.archived ? ' · archived' : ''}
        </span>
      </button>
      {open ? (
        <div className="chore-edit">
          <label>
            Name
            <input
              value={chore.name}
              onChange={(e) => onSave({ ...chore, name: e.target.value })}
            />
          </label>
          <label>
            Effort
            <select
              value={chore.effort}
              onChange={(e) =>
                onSave({
                  ...chore,
                  effort: Number(e.target.value) as EffortLevel,
                })
              }
            >
              {EFFORTS.map((level) => (
                <option key={level} value={level}>
                  {EFFORT_LABELS[level]}
                </option>
              ))}
            </select>
          </label>
          <label>
            How often
            <input
              type="range"
              min={0}
              max={FREQUENCY_STEPS.length - 1}
              value={freqIndex}
              onChange={(e) => {
                const baseDays = FREQUENCY_STEPS[Number(e.target.value)]
                onSave({
                  ...chore,
                  baseDays,
                  dailyLocked: baseDays <= 1 || chore.weekday != null,
                })
              }}
            />
            <span>{frequencyLabel(chore.baseDays)}</span>
          </label>
          <label>
            Weekday only
            <select
              value={chore.weekday ?? ''}
              onChange={(e) => {
                const weekday =
                  e.target.value === '' ? null : Number(e.target.value)
                onSave({
                  ...chore,
                  weekday,
                  dailyLocked: weekday != null || chore.baseDays <= 1,
                })
              }}
            >
              <option value="">Any day</option>
              {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                <option key={day} value={day}>
                  {weekdayLabel(day)}
                </option>
              ))}
            </select>
          </label>
          <label>
            How-to note
            <input
              value={chore.note}
              placeholder="Optional"
              onChange={(e) => onSave({ ...chore, note: e.target.value })}
            />
          </label>
          <fieldset>
            <legend>Who may do it</legend>
            {ROLES.map((role) => (
              <label key={role} className="check">
                <input
                  type="checkbox"
                  checked={chore.eligibleRoles.includes(role)}
                  onChange={(e) => {
                    const eligibleRoles = e.target.checked
                      ? [...chore.eligibleRoles, role]
                      : chore.eligibleRoles.filter((r) => r !== role)
                    onSave({
                      ...chore,
                      eligibleRoles: eligibleRoles.length ? eligibleRoles : [role],
                    })
                  }}
                />
                {role}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Only these people (optional)</legend>
            {people.map((person) => {
              const checked = chore.eligiblePersonIds.includes(person.id)
              return (
                <label key={person.id} className="check">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const eligiblePersonIds = e.target.checked
                        ? [...chore.eligiblePersonIds, person.id]
                        : chore.eligiblePersonIds.filter((id) => id !== person.id)
                      onSave({ ...chore, eligiblePersonIds })
                    }}
                  />
                  {person.name}
                </label>
              )
            })}
          </fieldset>
          <button
            type="button"
            className="btn ghost"
            onClick={() => onSave({ ...chore, archived: !chore.archived })}
          >
            {chore.archived ? 'Restore' : 'Archive'}
          </button>
        </div>
      ) : null}
    </li>
  )
}
