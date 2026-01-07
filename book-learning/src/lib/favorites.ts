import { account } from './appwrite'

const STORAGE_KEY = 'booktracker:favorites:v1'

// Stored in Appwrite Account prefs so favorites sync across devices.
export const FAVORITES_PREF_KEY = 'favoriteBookIds'

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

function parseFavoriteIds(value: unknown): Set<string> {
  if (!Array.isArray(value)) return new Set()
  return new Set(value.filter((v) => typeof v === 'string'))
}

async function safeGetPrefs(): Promise<Record<string, unknown> | null> {
  try {
    const u: any = await account.get()
    return (u?.prefs ?? {}) as Record<string, unknown>
  } catch {
    return null
  }
}

export async function loadFavoriteBookIdsCloud(): Promise<Set<string>> {
  const prefs = await safeGetPrefs()
  if (!prefs) return loadFavoriteBookIds()
  return parseFavoriteIds(prefs[FAVORITES_PREF_KEY])
}

export async function saveFavoriteBookIdsCloud(ids: Set<string>): Promise<void> {
  const prefs = await safeGetPrefs()
  if (!prefs) {
    // No session; best-effort local cache.
    saveFavoriteBookIds(ids)
    return
  }

  await account.updatePrefs({
    ...prefs,
    [FAVORITES_PREF_KEY]: Array.from(ids),
  })

  // Keep local cache in sync for fast startup.
  saveFavoriteBookIds(ids)
}

// Best-effort migration: merge localStorage favorites into cloud prefs.
export async function migrateFavoritesToCloud(): Promise<Set<string>> {
  const local = loadFavoriteBookIds()
  const cloud = await loadFavoriteBookIdsCloud()

  const merged = new Set<string>([...cloud, ...local])
  const changed =
    merged.size !== cloud.size ||
    [...cloud].some((id) => !merged.has(id))

  if (changed) {
    await saveFavoriteBookIdsCloud(merged)
    return merged
  }

  // Keep local cache aligned.
  saveFavoriteBookIds(cloud)
  return cloud
}

export async function toggleFavoriteBookIdCloud(bookId: string): Promise<Set<string>> {
  const current = await migrateFavoritesToCloud()
  const next = new Set(current)
  if (next.has(bookId)) next.delete(bookId)
  else next.add(bookId)
  await saveFavoriteBookIdsCloud(next)
  return next
}
