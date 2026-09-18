import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { starterCatalog } from './catalog'
import { todayInZone } from './dates'
import {
  applyOutToday,
  dealDay,
  optionalChores,
  pruneDays,
  requiredChores,
} from './deal'
import { newHouseholdCode, newId, normalizeCode } from './ids'
import {
  isFirebaseConfigured,
  loadHousehold,
  saveHousehold,
  subscribeHousehold,
} from './storage'
import type {
  Assignment,
  Chore,
  Household,
  Pace,
  Person,
  Role,
} from './types'

const SESSION_KEY = 'household-deal:session'

interface Session {
  code: string
  meId: string | null
}

function readSession(): Session | null {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

function writeSession(session: Session | null): void {
  if (!session) localStorage.removeItem(SESSION_KEY)
  else localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

interface HouseholdApi {
  household: Household | null
  loading: boolean
  error: string | null
  me: Person | null
  today: string
  firebaseReady: boolean
  setMeId: (id: string | null) => void
  createHousehold: (people: { name: string; role: Role }[]) => Promise<void>
  joinHousehold: (code: string) => Promise<void>
  leaveHousehold: () => void
  updateHousehold: (next: Household) => Promise<void>
  ensureDeal: () => Promise<void>
  dealAgain: () => Promise<void>
  setOut: (personId: string, out: boolean) => Promise<void>
  markAssignment: (
    assignmentId: string,
    status: Assignment['status'],
  ) => Promise<void>
  claimChore: (choreId: string) => Promise<void>
  addPerson: (name: string, role: Role) => Promise<void>
  savePerson: (person: Person) => Promise<void>
  addChore: (chore: Omit<Chore, 'id' | 'archived'>) => Promise<void>
  saveChore: (chore: Chore) => Promise<void>
  setPace: (pace: Pace) => Promise<void>
  optionalToday: Chore[]
}

const HouseholdContext = createContext<HouseholdApi | null>(null)

function withDay(household: Household, date: string, deal: Household['days'][string]): Household {
  return {
    ...household,
    days: pruneDays({ ...household.days, [date]: deal }, date),
  }
}

function recordCompletion(
  household: Household,
  assignment: Assignment,
  status: Assignment['status'],
  today: string,
): Household {
  const lastDone = { ...household.lastDone }
  const lastSkip = { ...household.lastSkip }
  if (status === 'done') lastDone[assignment.choreId] = today
  if (status === 'skipped') lastSkip[assignment.choreId] = today
  if (status === 'open') {
    if (lastDone[assignment.choreId] === today) delete lastDone[assignment.choreId]
    if (lastSkip[assignment.choreId] === today) delete lastSkip[assignment.choreId]
  }
  return { ...household, lastDone, lastSkip }
}

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => readSession())
  const [household, setHousehold] = useState<Household | null>(null)
  const [loading, setLoading] = useState(Boolean(session?.code))
  const [error, setError] = useState<string | null>(null)

  const today = household
    ? todayInZone(household.timezone)
    : todayInZone(Intl.DateTimeFormat().resolvedOptions().timeZone)

  useEffect(() => {
    writeSession(session)
  }, [session])

  useEffect(() => {
    if (!session?.code) {
      setHousehold(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    return subscribeHousehold(session.code, (data) => {
      setHousehold(data)
      setLoading(false)
      if (!data) setError('No household found for that code.')
    })
  }, [session?.code])

  const persist = useCallback(async (next: Household) => {
    setHousehold(next)
    await saveHousehold(next)
  }, [])

  const createHousehold = useCallback(
    async (peopleInput: { name: string; role: Role }[]) => {
      const code = newHouseholdCode()
      const people: Person[] = peopleInput
        .filter((p) => p.name.trim())
        .map((p) => ({
          id: newId(),
          name: p.name.trim(),
          role: p.role,
          archived: false,
        }))
      if (!people.some((p) => p.role === 'adult')) {
        throw new Error('Add at least one adult so someone can manage the list.')
      }
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const next: Household = {
        code,
        startedOn: todayInZone(timezone),
        timezone,
        pace: 'normal',
        people,
        chores: starterCatalog(),
        lastDone: {},
        lastSkip: {},
        lastAssigned: {},
        days: {},
      }
      await saveHousehold(next)
      setHousehold(next)
      const adult = people.find((p) => p.role === 'adult')
      setSession({ code, meId: adult?.id ?? people[0]?.id ?? null })
      setError(null)
    },
    [],
  )

  const joinHousehold = useCallback(async (raw: string) => {
    const code = normalizeCode(raw)
    if (code.length < 4) throw new Error('Enter the household code.')
    const found = await loadHousehold(code)
    if (!found) throw new Error('No household found for that code.')
    setHousehold(found)
    setSession({ code, meId: null })
    setError(null)
  }, [])

  const leaveHousehold = useCallback(() => {
    setSession(null)
    setHousehold(null)
    setError(null)
  }, [])

  const updateHousehold = useCallback(
    async (next: Household) => {
      await persist(next)
    },
    [persist],
  )

  const ensureDeal = useCallback(async () => {
    if (!household) return
    const date = todayInZone(household.timezone)
    const current: Household = household.startedOn
      ? household
      : { ...household, startedOn: date }
    const dueIds = new Set(requiredChores(current, date).map((c) => c.id))
    const day = current.days[date]
    const stale =
      day?.assignments.some(
        (a) => a.required && a.status === 'open' && !dueIds.has(a.choreId),
      ) ?? false
    if (day && !stale) {
      if (current !== household) await persist(current)
      return
    }
    const deal = dealDay(current, date, { keepCompleted: Boolean(day) })
    const lastAssigned = { ...current.lastAssigned }
    for (const a of deal.assignments) {
      if (a.required && a.status === 'open') lastAssigned[a.choreId] = a.personId
    }
    await persist(withDay({ ...current, lastAssigned }, date, deal))
  }, [household, persist])

  const dealAgain = useCallback(async () => {
    if (!household) return
    const date = todayInZone(household.timezone)
    const deal = dealDay(household, date, { keepCompleted: true })
    const lastAssigned = { ...household.lastAssigned }
    for (const a of deal.assignments) {
      if (a.required && a.status === 'open') lastAssigned[a.choreId] = a.personId
    }
    await persist(withDay({ ...household, lastAssigned }, date, deal))
  }, [household, persist])

  const setOut = useCallback(
    async (personId: string, out: boolean) => {
      if (!household) return
      const date = todayInZone(household.timezone)
      const current = household.days[date]?.outPersonIds ?? []
      const outPersonIds = out
        ? Array.from(new Set([...current, personId]))
        : current.filter((id) => id !== personId)
      const deal = applyOutToday(household, date, outPersonIds)
      const lastAssigned = { ...household.lastAssigned }
      for (const a of deal.assignments) {
        if (a.required && a.status === 'open') lastAssigned[a.choreId] = a.personId
      }
      await persist(withDay({ ...household, lastAssigned }, date, deal))
    },
    [household, persist],
  )

  const markAssignment = useCallback(
    async (assignmentId: string, status: Assignment['status']) => {
      if (!household || !session?.meId) return
      const date = todayInZone(household.timezone)
      const day = household.days[date]
      if (!day) return
      const assignment = day.assignments.find((a) => a.id === assignmentId)
      if (!assignment) return
      const nextAssignment: Assignment = {
        ...assignment,
        status,
        completedBy: status === 'open' ? undefined : session.meId,
        completedAt: status === 'open' ? undefined : new Date().toISOString(),
      }
      const nextDay = {
        ...day,
        assignments: day.assignments.map((a) =>
          a.id === assignmentId ? nextAssignment : a,
        ),
      }
      await persist(
        withDay(
          recordCompletion(household, assignment, status, date),
          date,
          nextDay,
        ),
      )
    },
    [household, persist, session?.meId],
  )

  const claimChore = useCallback(
    async (choreId: string) => {
      if (!household || !session?.meId) return
      const date = todayInZone(household.timezone)
      let currentHouse = household
      let current = currentHouse.days[date]
      if (!current) {
        const deal = dealDay(currentHouse, date)
        const lastAssigned = { ...currentHouse.lastAssigned }
        for (const a of deal.assignments) {
          if (a.required) lastAssigned[a.choreId] = a.personId
        }
        currentHouse = withDay({ ...currentHouse, lastAssigned }, date, deal)
        current = deal
      }
      if (current.assignments.some((a) => a.choreId === choreId)) return
      const assignment: Assignment = {
        id: newId(),
        choreId,
        personId: session.meId,
        required: false,
        isMain: false,
        status: 'open',
      }
      await persist(
        withDay(currentHouse, date, {
          ...current,
          assignments: [...current.assignments, assignment],
        }),
      )
    },
    [household, persist, session?.meId],
  )

  const addPerson = useCallback(
    async (name: string, role: Role) => {
      if (!household) return
      const person: Person = {
        id: newId(),
        name: name.trim(),
        role,
        archived: false,
      }
      await persist({ ...household, people: [...household.people, person] })
    },
    [household, persist],
  )

  const savePerson = useCallback(
    async (person: Person) => {
      if (!household) return
      await persist({
        ...household,
        people: household.people.map((p) => (p.id === person.id ? person : p)),
      })
    },
    [household, persist],
  )

  const addChore = useCallback(
    async (input: Omit<Chore, 'id' | 'archived'>) => {
      if (!household) return
      const chore: Chore = { ...input, id: newId(), archived: false }
      await persist({ ...household, chores: [...household.chores, chore] })
    },
    [household, persist],
  )

  const saveChore = useCallback(
    async (chore: Chore) => {
      if (!household) return
      await persist({
        ...household,
        chores: household.chores.map((c) => (c.id === chore.id ? chore : c)),
      })
    },
    [household, persist],
  )

  const setPace = useCallback(
    async (pace: Pace) => {
      if (!household) return
      await persist({ ...household, pace })
    },
    [household, persist],
  )

  const me =
    household?.people.find((p) => p.id === session?.meId && !p.archived) ?? null

  const optionalToday = useMemo(
    () => (household ? optionalChores(household, today) : []),
    [household, today],
  )

  const value: HouseholdApi = {
    household,
    loading,
    error,
    me,
    today,
    firebaseReady: isFirebaseConfigured(),
    setMeId: (id) =>
      setSession((prev) => (prev ? { ...prev, meId: id } : prev)),
    createHousehold,
    joinHousehold,
    leaveHousehold,
    updateHousehold,
    ensureDeal,
    dealAgain,
    setOut,
    markAssignment,
    claimChore,
    addPerson,
    savePerson,
    addChore,
    saveChore,
    setPace,
    optionalToday,
  }

  return (
    <HouseholdContext.Provider value={value}>
      {children}
    </HouseholdContext.Provider>
  )
}

export function useHousehold(): HouseholdApi {
  const ctx = useContext(HouseholdContext)
  if (!ctx) throw new Error('useHousehold must be used inside HouseholdProvider')
  return ctx
}
