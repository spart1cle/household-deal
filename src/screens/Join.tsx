import { useState, type FormEvent } from 'react'
import { useHousehold } from '../HouseholdContext'

export function JoinScreen() {
  const { createHousehold, joinHousehold, firebaseReady, error } =
    useHousehold()
  const [mode, setMode] = useState<'pick' | 'create' | 'join'>('pick')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [people, setPeople] = useState([
    { name: '', role: 'adult' as const },
    { name: '', role: 'child' as const },
  ])

  async function onCreate(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setLocalError(null)
    try {
      await createHousehold(people)
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Could not create household.')
    } finally {
      setBusy(false)
    }
  }

  async function onJoin(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setLocalError(null)
    try {
      await joinHousehold(code)
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Could not join.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="sheet join">
      <p className="eyebrow">Household Deal</p>
      <h1>Let the house deal today&apos;s jobs.</h1>
      <p className="lede">
        One shared board on every phone. The app assigns what has to happen
        today. Nobody has to pick names.
      </p>
      {!firebaseReady ? (
        <p className="banner">
          Running on this device only until Firebase is connected. Then every
          phone can share the same household.
        </p>
      ) : null}
      {error ? <p className="banner warn">{error}</p> : null}
      {localError ? <p className="banner warn">{localError}</p> : null}

      {mode === 'pick' ? (
        <div className="stack">
          <button type="button" className="btn primary" onClick={() => setMode('create')}>
            Create a household
          </button>
          <button type="button" className="btn" onClick={() => setMode('join')}>
            I have a code
          </button>
        </div>
      ) : null}

      {mode === 'create' ? (
        <form className="stack" onSubmit={(e) => void onCreate(e)}>
          <p>
            Add everyone who should get jobs. Blank rows are skipped. After
            this, open <strong>Setup</strong> to edit chores and how often they
            happen.
          </p>
          {people.map((person, index) => (
            <div className="row" key={index}>
              <input
                value={person.name}
                placeholder={index === 0 ? 'Adult name' : 'Name'}
                onChange={(e) => {
                  const next = [...people]
                  next[index] = { ...person, name: e.target.value }
                  setPeople(next)
                }}
              />
              <select
                value={person.role}
                onChange={(e) => {
                  const next = [...people]
                  next[index] = {
                    ...person,
                    role: e.target.value as typeof person.role,
                  }
                  setPeople(next)
                }}
              >
                <option value="adult">Adult</option>
                <option value="teen">Teen</option>
                <option value="child">Child</option>
              </select>
            </div>
          ))}
          <button
            type="button"
            className="btn ghost"
            onClick={() =>
              setPeople([...people, { name: '', role: 'child' }])
            }
          >
            Add another person
          </button>
          <button type="submit" className="btn primary" disabled={busy}>
            Deal us in
          </button>
          <button type="button" className="btn ghost" onClick={() => setMode('pick')}>
            Back
          </button>
        </form>
      ) : null}

      {mode === 'join' ? (
        <form className="stack" onSubmit={(e) => void onJoin(e)}>
          <label>
            Household code
            <input
              value={code}
              autoCapitalize="characters"
              autoCorrect="off"
              placeholder="e.g. 7K2NQP"
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
          <button type="submit" className="btn primary" disabled={busy}>
            Join
          </button>
          <button type="button" className="btn ghost" onClick={() => setMode('pick')}>
            Back
          </button>
        </form>
      ) : null}
    </main>
  )
}
