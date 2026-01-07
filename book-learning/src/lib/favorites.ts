import { account } from './appwrite'

// Stored in Appwrite Account prefs so favorites sync across devices.
export const FAVORITES_PREF_KEY = 'favoriteBookIds'

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
  if (!prefs) return new Set()
  return parseFavoriteIds(prefs[FAVORITES_PREF_KEY])
}

export async function saveFavoriteBookIdsCloud(ids: Set<string>): Promise<void> {
  const prefs = await safeGetPrefs()
  if (!prefs) throw new Error('Not logged in')

  await account.updatePrefs({
    ...prefs,
    [FAVORITES_PREF_KEY]: Array.from(ids),
  })
}

export async function toggleFavoriteBookIdCloud(bookId: string): Promise<Set<string>> {
  const current = await loadFavoriteBookIdsCloud()
  const next = new Set(current)
  if (next.has(bookId)) next.delete(bookId)
  else next.add(bookId)
  await saveFavoriteBookIdsCloud(next)
  return next
}
