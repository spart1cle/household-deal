import { addDays, diffDays, weekdayInZone } from './dates'
import { EFFORT_WEIGHTS, PACE_FACTOR } from './effort'
import { newId } from './ids'
import type {
  Assignment,
  Chore,
  DayDeal,
  Household,
  Pace,
  Person,
} from './types'

export type Rng = () => number

export function effectiveInterval(chore: Chore, pace: Pace): number {
  if (chore.dailyLocked || chore.baseDays <= 1) {
    return Math.max(1, chore.baseDays || 1)
  }
  return Math.max(1, Math.round(chore.baseDays * PACE_FACTOR[pace]))
}

export function activePeople(people: Person[]): Person[] {
  return people.filter((p) => !p.archived)
}

export function homePeople(people: Person[], outPersonIds: string[]): Person[] {
  const out = new Set(outPersonIds)
  return activePeople(people).filter((p) => !out.has(p.id))
}

export function eligiblePeople(chore: Chore, people: Person[]): Person[] {
  const active = activePeople(people)
  if (chore.eligiblePersonIds.length > 0) {
    const allow = new Set(chore.eligiblePersonIds)
    return active.filter((p) => allow.has(p.id))
  }
  return active.filter((p) => chore.eligibleRoles.includes(p.role))
}

export function lastHandled(
  household: Household,
  choreId: string,
): string | undefined {
  const done = household.lastDone[choreId]
  const skip = household.lastSkip[choreId]
  if (done && skip) return done >= skip ? done : skip
  return done ?? skip
}

export function isDailyChore(chore: Chore): boolean {
  return chore.dailyLocked || chore.baseDays <= 1
}

export function isDue(
  chore: Chore,
  household: Household,
  today: string,
): boolean {
  if (chore.archived) return false
  const weekday = weekdayInZone(household.timezone, today)
  if (chore.weekday != null && weekday !== chore.weekday) return false
  const last = lastHandled(household, chore.id)
  if (last === today) return false
  const interval = effectiveInterval(chore, household.pace)
  if (last) return diffDays(last, today) >= interval
  if (isDailyChore(chore)) return true
  const startedOn = household.startedOn || today
  return diffDays(startedOn, today) >= interval
}

export function assignmentWeight(
  assignment: Assignment,
  chores: Chore[],
): number {
  const chore = chores.find((c) => c.id === assignment.choreId)
  return chore ? EFFORT_WEIGHTS[chore.effort] : 0
}

export function rollingEffort(
  household: Household,
  today: string,
  lookbackDays = 7,
): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const person of household.people) totals[person.id] = 0
  const start = addDays(today, -lookbackDays + 1)
  for (let i = 0; i < lookbackDays; i++) {
    const date = addDays(start, i)
    const day = household.days[date]
    if (!day) continue
    for (const a of day.assignments) {
      if (a.status !== 'done' || !a.completedBy) continue
      totals[a.completedBy] =
        (totals[a.completedBy] ?? 0) + assignmentWeight(a, household.chores)
    }
  }
  return totals
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

function pickPerson(
  candidates: Person[],
  scores: Record<string, number>,
  rng: Rng,
): Person | null {
  if (candidates.length === 0) return null
  const mixed = shuffle(candidates, rng)
  mixed.sort((a, b) => (scores[a.id] ?? 0) - (scores[b.id] ?? 0))
  return mixed[0]
}

function coverageCandidates(chore: Chore, home: Person[]): Person[] {
  const eligible = eligiblePeople(chore, home)
  if (eligible.length > 0) return eligible
  const adults = home.filter((p) => p.role === 'adult')
  if (adults.length > 0) return adults
  return home
}

function markMains(assignments: Assignment[], chores: Chore[]): Assignment[] {
  const byPerson = new Map<string, Assignment[]>()
  for (const a of assignments) {
    if (!a.required) continue
    const list = byPerson.get(a.personId) ?? []
    list.push(a)
    byPerson.set(a.personId, list)
  }
  const mains = new Set<string>()
  for (const list of byPerson.values()) {
    const ranked = [...list].sort(
      (a, b) => assignmentWeight(b, chores) - assignmentWeight(a, chores),
    )
    if (ranked[0]) mains.add(ranked[0].id)
  }
  return assignments.map((a) => ({ ...a, isMain: mains.has(a.id) }))
}

export function requiredChores(
  household: Household,
  today: string,
): Chore[] {
  return household.chores.filter((c) => isDue(c, household, today))
}

export function optionalChores(
  household: Household,
  today: string,
): Chore[] {
  const assigned = new Set(
    (household.days[today]?.assignments ?? []).map((a) => a.choreId),
  )
  return household.chores.filter(
    (c) => !c.archived && !assigned.has(c.id) && !isDue(c, household, today),
  )
}

export function dealDay(
  household: Household,
  today: string,
  options: {
    keepCompleted?: boolean
    outPersonIds?: string[]
    rng?: Rng
  } = {},
): DayDeal {
  const rng = options.rng ?? Math.random
  const existing = household.days[today]
  const outPersonIds = options.outPersonIds ?? existing?.outPersonIds ?? []
  const keepCompleted = options.keepCompleted ?? false

  const kept: Assignment[] = keepCompleted
    ? (existing?.assignments ?? []).filter(
        (a) => a.status === 'done' || a.status === 'skipped',
      )
    : []
  const keptChoreIds = new Set(kept.map((a) => a.choreId))

  const home = homePeople(household.people, outPersonIds)
  const scores = rollingEffort(household, today)

  for (const a of kept) {
    const who = a.completedBy ?? a.personId
    scores[who] = (scores[who] ?? 0) + assignmentWeight(a, household.chores)
  }

  const pool = requiredChores(household, today).filter(
    (c) => !keptChoreIds.has(c.id),
  )
  const sorted = shuffle(pool, rng).sort(
    (a, b) => EFFORT_WEIGHTS[b.effort] - EFFORT_WEIGHTS[a.effort],
  )

  const fresh: Assignment[] = []
  for (const chore of sorted) {
    let candidates = coverageCandidates(chore, home)
    if (candidates.length > 1) {
      const notRepeat = candidates.filter(
        (p) => household.lastAssigned[chore.id] !== p.id,
      )
      if (notRepeat.length > 0) candidates = notRepeat
    }
    const person = pickPerson(candidates, scores, rng)
    if (!person) continue
    const assignment: Assignment = {
      id: newId(),
      choreId: chore.id,
      personId: person.id,
      required: true,
      isMain: false,
      status: 'open',
    }
    fresh.push(assignment)
    scores[person.id] =
      (scores[person.id] ?? 0) + EFFORT_WEIGHTS[chore.effort]
  }

  const extras = keepCompleted
    ? (existing?.assignments ?? []).filter(
        (a) => !a.required && (a.status === 'done' || a.status === 'skipped'),
      )
    : []

  return {
    date: today,
    outPersonIds,
    assignments: markMains([...kept, ...fresh, ...extras], household.chores),
    dealtAt: new Date().toISOString(),
  }
}

export function applyOutToday(
  household: Household,
  today: string,
  outPersonIds: string[],
  rng?: Rng,
): DayDeal {
  const existing = household.days[today]
  if (!existing) {
    return dealDay(household, today, { outPersonIds, rng })
  }
  const kept = existing.assignments.filter(
    (a) =>
      a.status === 'done' ||
      a.status === 'skipped' ||
      !outPersonIds.includes(a.personId),
  )
  const next: Household = {
    ...household,
    days: {
      ...household.days,
      [today]: { ...existing, assignments: kept, outPersonIds },
    },
  }
  return dealDay(next, today, { keepCompleted: true, outPersonIds, rng })
}

export function pruneDays(
  days: Record<string, DayDeal>,
  today: string,
  keep = 21,
): Record<string, DayDeal> {
  const cutoff = addDays(today, -keep)
  const next: Record<string, DayDeal> = {}
  for (const [date, deal] of Object.entries(days)) {
    if (date >= cutoff) next[date] = deal
  }
  return next
}
