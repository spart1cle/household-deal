import type { EffortLevel, Pace } from './types'

export const EFFORT_LABELS: Record<EffortLevel, string> = {
  1: 'Quick',
  2: 'Short',
  3: 'Medium',
  4: 'Long',
  5: 'Heavy',
}

export const EFFORT_WEIGHTS: Record<EffortLevel, number> = {
  1: 1,
  2: 2,
  3: 3,
  4: 5,
  5: 8,
}

export const PACE_FACTOR: Record<Pace, number> = {
  relaxed: 1.5,
  normal: 1,
  onTop: 0.7,
}

export const PACE_LABELS: Record<Pace, string> = {
  relaxed: 'Relaxed',
  normal: 'Normal',
  onTop: 'On top of it',
}

export const FREQUENCY_STEPS = [1, 2, 3, 4, 7, 14, 21, 30] as const

export function frequencyLabel(days: number): string {
  if (days <= 1) return 'Every day'
  if (days === 7) return 'Weekly'
  if (days === 14) return 'Every 2 weeks'
  if (days === 21) return 'Every 3 weeks'
  if (days >= 28) return 'Monthly'
  return `Every ${days} days`
}

export function weekdayLabel(day: number): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day] ?? ''
}
