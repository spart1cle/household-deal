export type Role = 'adult' | 'teen' | 'child'
export type Pace = 'relaxed' | 'normal' | 'onTop'
export type EffortLevel = 1 | 2 | 3 | 4 | 5
export type AssignmentStatus = 'open' | 'done' | 'skipped'

export interface Person {
  id: string
  name: string
  role: Role
  archived: boolean
}

export interface Chore {
  id: string
  name: string
  effort: EffortLevel
  baseDays: number
  dailyLocked: boolean
  weekday: number | null
  eligibleRoles: Role[]
  eligiblePersonIds: string[]
  note: string
  archived: boolean
}

export interface Assignment {
  id: string
  choreId: string
  personId: string
  required: boolean
  isMain: boolean
  status: AssignmentStatus
  completedBy?: string
  completedAt?: string
}

export interface DayDeal {
  date: string
  outPersonIds: string[]
  assignments: Assignment[]
  dealtAt: string
}

export interface Household {
  code: string
  startedOn: string
  timezone: string
  pace: Pace
  people: Person[]
  chores: Chore[]
  lastDone: Record<string, string>
  lastSkip: Record<string, string>
  lastAssigned: Record<string, string>
  days: Record<string, DayDeal>
}
