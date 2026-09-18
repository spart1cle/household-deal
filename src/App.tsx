import { useState } from 'react'
import { HouseholdProvider, useHousehold } from './HouseholdContext'
import { JoinScreen } from './screens/Join'
import { ManageScreen } from './screens/Manage'
import { TodayScreen } from './screens/Today'
import { WeekScreen } from './screens/Week'
import { WhoAmIScreen } from './screens/WhoAmI'

type Tab = 'today' | 'week' | 'manage' | 'me'

function Shell() {
  const { household, loading, me } = useHousehold()
  const [tab, setTab] = useState<Tab>('today')

  if (loading) {
    return (
      <main className="sheet">
        <p className="eyebrow">Household Deal</p>
        <h1>Shuffling the deck…</h1>
      </main>
    )
  }

  if (!household) return <JoinScreen />

  const isAdult = me?.role === 'adult'
  const current: Tab =
    tab === 'manage' && !isAdult ? 'today' : tab

  return (
    <div className="app">
      {current === 'today' ? <TodayScreen /> : null}
      {current === 'week' ? <WeekScreen /> : null}
      {current === 'manage' && isAdult ? <ManageScreen /> : null}
      {current === 'me' ? <WhoAmIScreen /> : null}
      <nav className="tabbar">
        <button
          type="button"
          className={current === 'today' ? 'active' : ''}
          onClick={() => setTab('today')}
        >
          Today
        </button>
        <button
          type="button"
          className={current === 'week' ? 'active' : ''}
          onClick={() => setTab('week')}
        >
          Week
        </button>
        {isAdult ? (
          <button
            type="button"
            className={current === 'manage' ? 'active' : ''}
            onClick={() => setTab('manage')}
          >
            List
          </button>
        ) : null}
        <button
          type="button"
          className={current === 'me' ? 'active' : ''}
          onClick={() => setTab('me')}
        >
          Me
        </button>
      </nav>
    </div>
  )
}

export default function App() {
  return (
    <HouseholdProvider>
      <Shell />
    </HouseholdProvider>
  )
}
