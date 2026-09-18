import { useState } from 'react'
import { HouseholdProvider, useHousehold } from './HouseholdContext'
import { NavContext, type Tab } from './nav'
import { JoinScreen } from './screens/Join'
import { ManageScreen } from './screens/Manage'
import { TodayScreen } from './screens/Today'
import { WeekScreen } from './screens/Week'
import { WhoAmIScreen } from './screens/WhoAmI'

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

  const canManage = !me || me.role === 'adult'
  const current: Tab =
    tab === 'manage' && !canManage ? 'today' : tab

  return (
    <NavContext.Provider value={setTab}>
      <div className="app">
        {current === 'today' ? <TodayScreen /> : null}
        {current === 'week' ? <WeekScreen /> : null}
        {current === 'manage' && canManage ? <ManageScreen /> : null}
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
          {canManage ? (
            <button
              type="button"
              className={current === 'manage' ? 'active' : ''}
              onClick={() => setTab('manage')}
            >
              Setup
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
    </NavContext.Provider>
  )
}

export default function App() {
  return (
    <HouseholdProvider>
      <Shell />
    </HouseholdProvider>
  )
}
