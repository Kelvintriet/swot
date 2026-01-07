const STORAGE_KEY = 'booktracker:favorites:v1'

function safeParse(json: string | null): unknown {
  if (!json) return null
  try {
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function loadFavoriteBookIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  const parsed = safeParse(window.localStorage.getItem(STORAGE_KEY))
  if (!Array.isArray(parsed)) return new Set()
  return new Set(parsed.filter((v) => typeof v === 'string'))
}

export function saveFavoriteBookIds(ids: Set<string>) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)))
}

export function toggleFavoriteBookId(ids: Set<string>, bookId: string): Set<string> {
  const next = new Set(ids)
  if (next.has(bookId)) next.delete(bookId)
  else next.add(bookId)
  saveFavoriteBookIds(next)
  return next
}
