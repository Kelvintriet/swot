import { createResource, createSignal, Show } from 'solid-js'
import type { Models } from 'appwrite'
import { appwriteConfig, databases, Permission, Query, Role } from '../lib/appwrite'
import { useSession } from '../context/session'
import { formatShortDate } from '../lib/dates'
import { nextSrs, type SrsRating } from '../lib/srs'

type WordDoc = Models.Document & {
  userId: string
  bookId: string
  word: string
  meaning?: string
  context?: string
  srsDueAt: string
  srsIntervalDays: number
  srsEase: number
  srsReps: number
  lastReviewedAt?: string
}

export default function ReviewPage() {
  const session = useSession()
  const [revealed, setRevealed] = createSignal(false)
  const [busy, setBusy] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)

  const [due, { refetch }] = createResource(async () => {
    const userId = session.user()?.$id
    if (!userId) return [] as WordDoc[]

    const { databaseId, wordsCollectionId } = appwriteConfig
    if (!databaseId || !wordsCollectionId) {
      throw new Error('Missing words collection env vars (see .env.example)')
    }

    const nowIso = new Date().toISOString()

    const res = await databases.listDocuments<WordDoc>(databaseId, wordsCollectionId, [
      Query.equal('userId', userId),
      Query.lessThanEqual('srsDueAt', nowIso),
      Query.orderAsc('srsDueAt'),
      Query.limit(50),
    ])

    return res.documents
  })

  const current = () => (due() ?? [])[0]

  const rate = async (rating: SrsRating) => {
    setError(null)
    setBusy(true)
    try {
      const w = current()
      if (!w) return

      const userId = session.user()?.$id as string | undefined
      if (!userId) throw new Error('Not logged in')

      const { databaseId, wordsCollectionId } = appwriteConfig
      if (!databaseId || !wordsCollectionId) throw new Error('Missing words env vars')

      const { next, dueAt } = nextSrs(
        {
          intervalDays: w.srsIntervalDays,
          ease: w.srsEase,
          reps: w.srsReps,
        },
        rating
      )

      await databases.updateDocument(
        databaseId,
        wordsCollectionId,
        w.$id,
        {
          srsIntervalDays: next.intervalDays,
          srsEase: next.ease,
          srsReps: next.reps,
          srsDueAt: dueAt.toISOString(),
          lastReviewedAt: new Date().toISOString(),
        },
        [
          Permission.read(Role.user(userId)),
          Permission.update(Role.user(userId)),
          Permission.delete(Role.user(userId)),
        ]
      )

      setRevealed(false)
      await refetch()
    } catch (err: any) {
      setError(err?.message ?? 'Failed to update review')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div class="stack">
      <div class="row">
        <div>
          <h1>Review</h1>
          <p class="muted">Words due now, one-by-one.</p>
        </div>
        <button class="btn" onClick={() => void refetch()}>
          Refresh
        </button>
      </div>

      <Show when={error() || due.error}>
        <p class="error">{error() || (due.error as any)?.message}</p>
      </Show>

      <Show when={!due.loading} fallback={<div class="card"><p class="muted">Loading…</p></div>}>
        <Show
          when={current()}
          fallback={
            <div class="card">
              <h2 style={{ 'margin-top': 0 }}>All caught up</h2>
              <p class="muted">No words are due right now.</p>
            </div>
          }
        >
          {(w) => (
            <div class="card">
              <div class="muted" style={{ 'margin-bottom': '8px' }}>
                due {formatShortDate(w().srsDueAt)}
              </div>

              <h2 style={{ 'margin-top': 0 }}>{w().word}</h2>

              <Show when={revealed()} fallback={
                <button class="btn" onClick={() => setRevealed(true)}>
                  Reveal
                </button>
              }>
                <div class="stack">
                  <div>
                    <div class="muted">Meaning</div>
                    <div>{w().meaning ?? '—'}</div>
                  </div>

                  <Show when={w().context}>
                    <div>
                      <div class="muted">Context</div>
                      <div>“{w().context}”</div>
                    </div>
                  </Show>

                  <div class="row">
                    <button class="btn" disabled={busy()} onClick={() => void rate('again')}>
                      Again
                    </button>
                    <button class="btn" disabled={busy()} onClick={() => void rate('hard')}>
                      Hard
                    </button>
                    <button class="btn primary" disabled={busy()} onClick={() => void rate('good')}>
                      Good
                    </button>
                    <button class="btn" disabled={busy()} onClick={() => void rate('easy')}>
                      Easy
                    </button>
                  </div>
                </div>
              </Show>
            </div>
          )}
        </Show>
      </Show>
    </div>
  )
}
