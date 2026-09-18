import { useHousehold } from '../HouseholdContext'

export function WhoAmIScreen() {
  const { household, me, setMeId, leaveHousehold } = useHousehold()
  if (!household) return null
  const people = household.people.filter((p) => !p.archived)

  return (
    <main className="sheet">
      <p className="eyebrow">This phone</p>
      <h1>Who is using this phone?</h1>
      <p className="lede">Done taps count for the person you pick.</p>
      <ul className="choose-me">
        {people.map((person) => (
          <li key={person.id}>
            <button
              type="button"
              className={`btn ${me?.id === person.id ? 'primary' : ''}`}
              onClick={() => setMeId(person.id)}
            >
              {person.name}
              <span className="muted"> {person.role}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="code-block">
        Household code <strong>{household.code}</strong>
      </p>
      <button type="button" className="btn ghost" onClick={leaveHousehold}>
        Leave household on this phone
      </button>
    </main>
  )
}
