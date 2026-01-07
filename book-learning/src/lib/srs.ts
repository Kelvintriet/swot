export type SrsState = {
  intervalDays: number
  ease: number
  reps: number
}

export type SrsRating = 'again' | 'hard' | 'good' | 'easy'

export function initialSrsState(): SrsState {
  return { intervalDays: 0, ease: 2.5, reps: 0 }
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function nextSrs(state: SrsState, rating: SrsRating) {
  const now = new Date()

  let intervalDays = Math.max(0, Math.floor(state.intervalDays ?? 0))
  let ease = typeof state.ease === 'number' ? state.ease : 2.5
  let reps = Math.max(0, Math.floor(state.reps ?? 0))

  if (rating === 'again') {
    reps = 0
    intervalDays = 1
    ease = Math.max(1.3, ease - 0.2)
    return {
      next: { intervalDays, ease, reps },
      dueAt: addDays(now, intervalDays),
    }
  }

  reps += 1

  if (rating === 'hard') {
    intervalDays = intervalDays === 0 ? 1 : Math.max(1, Math.round(intervalDays * 1.2))
    ease = Math.max(1.3, ease - 0.15)
  } else if (rating === 'good') {
    intervalDays = intervalDays === 0 ? 1 : Math.max(1, Math.round(intervalDays * 2.5))
  } else {
    // easy
    intervalDays = intervalDays === 0 ? 2 : Math.max(2, Math.round(intervalDays * 3))
    ease = ease + 0.15
  }

  return {
    next: { intervalDays, ease, reps },
    dueAt: addDays(now, intervalDays),
  }
}
