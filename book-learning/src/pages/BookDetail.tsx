import { createMemo, createResource, createSignal, For, Show } from 'solid-js'
import { useNavigate, useParams } from '@solidjs/router'
import type { Models } from 'appwrite'
import {
  appwriteConfig,
  databases,
  ID,
  Permission,
  Query,
  Role,
} from '../lib/appwrite'
import { useSession } from '../context/session'
import { coverUrlFor } from '../lib/covers'
import { formatShortDate } from '../lib/dates'
import { initialSrsState } from '../lib/srs'

type BookDoc = Models.Document & {
  title: string
  author?: string
  status?: string
  genre?: string
  totalPages?: number
  rating?: number
  startPage?: number
  publishedDate?: string
  isbn?: string
  boughtDate?: string
  language?: string
  coverFileId?: string
}

type LogDoc = Models.Document & {
  userId: string
  bookId: string
  date: string
  minutes?: number
  pagesStart?: number
  pagesEnd?: number
  note?: string
}

type WordDoc = Models.Document & {
  userId: string
  bookId: string
  word: string
  meaning?: string
  context?: string
  page?: number
  srsDueAt: string
  srsIntervalDays: number
  srsEase: number
  srsReps: number
  lastReviewedAt?: string
}

async function getBook(id: string) {
  const { databaseId, booksCollectionId } = appwriteConfig
  if (!databaseId || !booksCollectionId) {
    throw new Error('Missing Appwrite env vars (see .env.example)')
  }
  return databases.getDocument<BookDoc>(databaseId, booksCollectionId, id)
}

export default function BookDetailPage() {
  const session = useSession()
  const params = useParams()
  const navigate = useNavigate()
  const bookId = () => params.id
  const [book, { refetch: refetchBook }] = createResource(() => params.id, getBook)

  const [ratingBusy, setRatingBusy] = createSignal(false)
  const [ratingError, setRatingError] = createSignal<string | null>(null)

  const [word, setWord] = createSignal('')
  const [meaning, setMeaning] = createSignal('')
  const [context, setContext] = createSignal('')
  const [page, setPage] = createSignal('')
  const [wordBusy, setWordBusy] = createSignal(false)
  const [wordError, setWordError] = createSignal<string | null>(null)

  const [logs, { refetch: refetchLogs }] = createResource(async () => {
    const userId = session.user()?.$id
    const id = bookId()
    if (!userId || !id) return [] as LogDoc[]

    const { databaseId, logsCollectionId } = appwriteConfig
    if (!databaseId || !logsCollectionId) {
      throw new Error('Missing logs collection env vars (see .env.example)')
    }

    const res = await databases.listDocuments<LogDoc>(databaseId, logsCollectionId, [
      Query.equal('userId', userId),
      Query.equal('bookId', id),
      Query.orderDesc('date'),
      Query.limit(100),
    ])

    return res.documents
  })

  const [words, { refetch: refetchWords }] = createResource(async () => {
    const userId = session.user()?.$id
    const id = bookId()
    if (!userId || !id) return [] as WordDoc[]

    const { databaseId, wordsCollectionId } = appwriteConfig
    if (!databaseId || !wordsCollectionId) {
      throw new Error('Missing words collection env vars (see .env.example)')
    }

    const res = await databases.listDocuments<WordDoc>(databaseId, wordsCollectionId, [
      Query.equal('userId', userId),
      Query.equal('bookId', id),
      Query.orderDesc('$createdAt'),
      Query.limit(50),
    ])

    return res.documents
  })

  const isReadingSession = (l: LogDoc) => l.pagesStart != null || l.pagesEnd != null || l.minutes != null

  const readingLogs = createMemo(() => (logs() ?? []).filter(isReadingSession))

  type TimelineEvent =
    | { kind: 'reading-session'; at: Date; log: LogDoc }
    | { kind: 'note'; at: Date; log: LogDoc }
    | { kind: 'hard-word'; at: Date; word: WordDoc }

  const timeline = createMemo(() => {
    const items: TimelineEvent[] = []
    for (const l of logs() ?? []) {
      const at = new Date(l.date)
      if (Number.isNaN(at.getTime())) continue
      items.push({ kind: isReadingSession(l) ? 'reading-session' : 'note', at, log: l })
    }
    for (const w of words() ?? []) {
      const at = new Date(w.$createdAt)
      if (Number.isNaN(at.getTime())) continue
      items.push({ kind: 'hard-word', at, word: w })
    }
    items.sort((a, b) => b.at.getTime() - a.at.getTime())
    return items
  })

  const groupedTimeline = createMemo(() => {
    const groups = new Map<string, { day: string; items: TimelineEvent[] }>()
    for (const e of timeline()) {
      const key = e.at.toISOString().slice(0, 10)
      const existing = groups.get(key)
      if (existing) existing.items.push(e)
      else groups.set(key, { day: key, items: [e] })
    }
    return Array.from(groups.values())
  })

  const formatDayHeading = (isoDay: string) => {
    const d = new Date(`${isoDay}T00:00:00`)
    if (Number.isNaN(d.getTime())) return isoDay
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const formatTimeLabel = (d: Date) =>
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

  const statusLabel = (s?: string) => {
    if (s === 'to-read') return 'To read'
    if (s === 'done') return 'Done'
    return 'Reading'
  }

  const statusBadgeClass = (s?: string) => {
    if (s === 'done') return 'bg-green-50 text-green-700'
    if (s === 'to-read') return 'bg-gray-100 text-gray-600'
    return 'bg-blue-50 text-blue-700'
  }

  const addWord = async (e: Event) => {
    e.preventDefault()
    setWordError(null)
    setWordBusy(true)

    try {
      const userId = session.user()?.$id as string | undefined
      const id = bookId()
      if (!userId) throw new Error('Not logged in')
      if (!id) throw new Error('Missing book id')

      const { databaseId, wordsCollectionId } = appwriteConfig
      if (!databaseId || !wordsCollectionId) throw new Error('Missing words env vars')

      const srs = initialSrsState()

      const toIntOrUndefined = (v: string) => {
        const t = v.trim()
        if (!t) return undefined
        const n = Number(t)
        return Number.isFinite(n) ? Math.trunc(n) : undefined
      }

      await databases.createDocument(
        databaseId,
        wordsCollectionId,
        ID.unique(),
        {
          userId,
          bookId: id,
          word: word().trim(),
          meaning: meaning().trim() || undefined,
          context: context().trim() || undefined,
          page: toIntOrUndefined(page()),
          srsDueAt: new Date().toISOString(),
          srsIntervalDays: srs.intervalDays,
          srsEase: srs.ease,
          srsReps: srs.reps,
        },
        [
          Permission.read(Role.user(userId)),
          Permission.update(Role.user(userId)),
          Permission.delete(Role.user(userId)),
        ]
      )

      setWord('')
      setMeaning('')
      setContext('')
      setPage('')
      await refetchWords()
    } catch (err: any) {
      setWordError(err?.message ?? 'Failed to add word')
    } finally {
      setWordBusy(false)
    }
  }

  const setRating = async (value: number) => {
    setRatingError(null)
    setRatingBusy(true)

    try {
      const userId = session.user()?.$id as string | undefined
      const id = bookId()
      if (!userId) throw new Error('Not logged in')
      if (!id) throw new Error('Missing book id')

      const { databaseId, booksCollectionId } = appwriteConfig
      if (!databaseId || !booksCollectionId) throw new Error('Missing books env vars')

      const v = Number.isFinite(value) ? Math.max(0, Math.min(5, Math.trunc(value))) : 0

      await databases.updateDocument(
        databaseId,
        booksCollectionId,
        id,
        { rating: v },
        [
          Permission.read(Role.user(userId)),
          Permission.update(Role.user(userId)),
          Permission.delete(Role.user(userId)),
        ]
      )

      await refetchBook()
    } catch (err: any) {
      setRatingError(err?.message ?? 'Failed to update rating')
    } finally {
      setRatingBusy(false)
    }
  }

  return (
    <div class="space-y-8">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Book Details</h1>
          <p class="text-sm text-gray-500">Cover, metadata, and book-specific activity.</p>
        </div>
        <button
          class="text-sm font-medium text-gray-600 hover:text-black"
          type="button"
          onClick={() => navigate('/bookshelf')}
        >
          Back to Bookshelf
        </button>
      </div>

      <Show when={book.error}>
        <div class="bg-white border border-red-100 text-red-700 rounded-xl p-4 text-sm shadow-sm">
          {(book.error as any)?.message ?? 'Failed to load book'}
        </div>
      </Show>

      <Show when={book()}>
        {(b) => (
          <>
            {(() => {
              const bookDoc = b()

              return (
            <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div class="flex flex-col md:flex-row gap-6">
                <div class="flex-shrink-0">
                  <div class="w-28 md:w-32">
                    <img
                      alt={`${bookDoc.title} cover`}
                      class="w-28 h-40 md:w-32 md:h-44 object-cover rounded-lg shadow-sm border border-gray-200 bg-gray-100"
                      src={coverUrlFor(bookDoc.coverFileId)}
                    />
                  </div>
                </div>

                <div class="flex-1 min-w-0">
                  <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div class="min-w-0">
                      <div class="flex items-center gap-3 flex-wrap">
                        <h2 class="text-xl font-bold text-gray-900 truncate">{bookDoc.title}</h2>
                        <span class={
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ' +
                          statusBadgeClass(bookDoc.status)
                        }>
                          {statusLabel(bookDoc.status)}
                        </span>
                        <Show when={(bookDoc.genre ?? '').trim()}>
                          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {(bookDoc.genre ?? '').trim()}
                          </span>
                        </Show>
                      </div>
                      <p class="text-sm text-gray-500 mt-1">{bookDoc.author ?? '—'}</p>
                    </div>

                    <div class="flex items-center gap-2">
                      <button
                        class="bg-white hover:bg-gray-50 text-gray-900 font-medium rounded-lg text-sm px-4 py-2 flex items-center gap-2 border border-gray-200"
                        type="button"
                        onClick={() => navigate(`/bookshelf/book/${bookDoc.$id}/edit`)}
                      >
                        <span class="material-symbols-outlined text-[18px]">edit</span>
                        Edit
                      </button>
                      <button
                        class="bg-black hover:bg-gray-800 text-white font-medium rounded-lg text-sm px-4 py-2 flex items-center gap-2"
                        type="button"
                        onClick={() => navigate(`/bookshelf/book/${bookDoc.$id}/create/readinglog`)}
                      >
                        <span class="material-symbols-outlined text-[18px]">menu_book</span>
                        Add Reading Log
                      </button>
                      <button
                        class="bg-white hover:bg-gray-50 text-gray-900 font-medium rounded-lg text-sm px-4 py-2 flex items-center gap-2 border border-gray-200"
                        type="button"
                        onClick={() => navigate(`/bookshelf/book/${bookDoc.$id}/create/historylog`)}
                      >
                        <span class="material-symbols-outlined text-[18px]">edit_note</span>
                        Add Note
                      </button>
                    </div>
                  </div>

                  <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mt-5">
                    <div>
                      <div class="text-xs text-gray-500">Rating</div>
                      <div class="flex items-center gap-2 mt-1">
                        <div class="flex items-center">
                          <For each={[1, 2, 3, 4, 5] as const}>
                            {(i) => {
                              const filled = () => (typeof bookDoc.rating === 'number' ? bookDoc.rating : 0) >= i
                              return (
                                <button
                                  type="button"
                                  class="p-0.5"
                                  aria-label={`Rate ${i} star${i === 1 ? '' : 's'}`}
                                  disabled={ratingBusy()}
                                  onClick={() => void setRating(i)}
                                >
                                  <span
                                    class={
                                      'material-symbols-outlined text-[18px] ' +
                                      (filled() ? 'text-yellow-400' : 'text-gray-300')
                                    }
                                    style={filled() ? { 'font-variation-settings': "'FILL' 1" } : undefined}
                                  >
                                    star
                                  </span>
                                </button>
                              )
                            }}
                          </For>
                        </div>
                        <button
                          type="button"
                          class="text-xs text-gray-500 hover:text-black"
                          disabled={ratingBusy()}
                          onClick={() => void setRating(0)}
                        >
                          Clear
                        </button>
                        <Show when={ratingBusy()}>
                          <span class="text-xs text-gray-400">Saving…</span>
                        </Show>
                      </div>
                      <Show when={ratingError()}>
                        <div class="text-xs text-red-600 mt-1">{ratingError()}</div>
                      </Show>
                    </div>
                    <div>
                      <div class="text-xs text-gray-500">Total pages</div>
                      <div class="text-sm font-semibold text-gray-900">
                        {typeof bookDoc.totalPages === 'number' && bookDoc.totalPages > 0 ? bookDoc.totalPages : '—'}
                      </div>
                    </div>
                    <div>
                      <div class="text-xs text-gray-500">Genre</div>
                      <div class="text-sm font-semibold text-gray-900">{(bookDoc.genre ?? '').trim() || '—'}</div>
                    </div>
                    <div>
                      <div class="text-xs text-gray-500">Start page</div>
                      <div class="text-sm font-semibold text-gray-900">
                        {typeof bookDoc.startPage === 'number' && bookDoc.startPage >= 0 ? bookDoc.startPage : '—'}
                      </div>
                    </div>
                    <div>
                      <div class="text-xs text-gray-500">Language</div>
                      <div class="text-sm font-semibold text-gray-900">{bookDoc.language ?? '—'}</div>
                    </div>
                    <div>
                      <div class="text-xs text-gray-500">Published</div>
                      <div class="text-sm font-semibold text-gray-900">
                        {bookDoc.publishedDate ? formatShortDate(bookDoc.publishedDate) : '—'}
                      </div>
                    </div>
                    <div>
                      <div class="text-xs text-gray-500">Bought</div>
                      <div class="text-sm font-semibold text-gray-900">
                        {bookDoc.boughtDate ? formatShortDate(bookDoc.boughtDate) : '—'}
                      </div>
                    </div>
                    <div>
                      <div class="text-xs text-gray-500">ISBN</div>
                      <div class="text-sm font-semibold text-gray-900">{bookDoc.isbn ?? '—'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

              )
            })()}

            <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <h3 class="text-lg font-bold text-gray-900">Log History</h3>
                  <p class="text-sm text-gray-500">Only activity for this book.</p>
                </div>
                <button
                  class="text-sm font-medium text-gray-600 hover:text-black"
                  type="button"
                  onClick={() => void refetchLogs()}
                >
                  Refresh
                </button>
              </div>

              <Show when={logs.error}>
                <div class="mb-4 bg-white border border-red-100 text-red-700 rounded-xl p-4 text-sm shadow-sm">
                  {(logs.error as any)?.message ?? 'Failed to load logs'}
                </div>
              </Show>

              <Show when={!logs.loading && !words.loading} fallback={
                <div class="text-sm text-gray-500">Loading activity…</div>
              }>
                <Show when={timeline().length > 0} fallback={
                  <div class="bg-gray-50 rounded-xl border border-gray-200 p-4 text-sm text-gray-600">
                    No activity yet.
                  </div>
                }>
                  <div class="space-y-6">
                    <For each={groupedTimeline()}>
                      {(g) => (
                        <div>
                          <div class="flex items-center mb-3">
                            <span class="text-sm font-bold text-gray-500 uppercase tracking-wider bg-mainBg pr-4">
                              {formatDayHeading(g.day)}
                            </span>
                            <div class="flex-1 border-t border-gray-200" />
                          </div>

                          <div class="relative pl-6 space-y-4">
                            <div class="absolute left-2 top-2 bottom-2 w-px bg-gray-200" />

                            <For each={g.items}>
                              {(e) => (
                                <Show
                                  when={e.kind === 'reading-session'}
                                  fallback={
                                    <Show
                                      when={e.kind === 'hard-word'}
                                      fallback={
                                        <div class="relative flex items-start gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm z-10">
                                          <div class="absolute -left-10 bg-gray-100 h-8 w-8 rounded-full flex items-center justify-center border-2 border-white ring-2 ring-gray-50">
                                            <span class="material-symbols-outlined text-gray-600 text-sm">edit_note</span>
                                          </div>
                                          <div class="flex-1">
                                            <div class="flex justify-between items-start gap-3">
                                              <div>
                                                <p class="text-sm font-semibold text-gray-900">Added a Note</p>
                                                <p class="text-sm text-gray-600">{(e as any).log.note}</p>
                                              </div>
                                              <span class="text-xs text-gray-400 font-medium whitespace-nowrap">
                                                {formatTimeLabel(e.at)}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      }
                                    >
                                      <div class="relative flex items-start gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm z-10">
                                        <div class="absolute -left-10 bg-yellow-100 h-8 w-8 rounded-full flex items-center justify-center border-2 border-white ring-2 ring-gray-50">
                                          <span class="material-symbols-outlined text-yellow-600 text-sm">spellcheck</span>
                                        </div>
                                        <div class="flex-1">
                                          <div class="flex justify-between items-start gap-3">
                                            <div>
                                              <p class="text-sm font-semibold text-gray-900">Added Hard Word</p>
                                              <p class="text-sm text-gray-600">
                                                <span class="font-medium text-gray-900">“{(e as any).word.word}”</span>
                                                    {' '}• {(e as any).word.meaning ?? '—'}
                                                    <Show when={typeof (e as any).word.page === 'number'}>
                                                      {' '}• p. {(e as any).word.page}
                                                    </Show>
                                              </p>
                                            </div>
                                            <span class="text-xs text-gray-400 font-medium whitespace-nowrap">
                                              {formatTimeLabel(e.at)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </Show>
                                  }
                                >
                                  <div class="relative flex items-start gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm z-10">
                                    <div class="absolute -left-10 bg-blue-100 h-8 w-8 rounded-full flex items-center justify-center border-2 border-white ring-2 ring-gray-50">
                                      <span class="material-symbols-outlined text-blue-600 text-sm">menu_book</span>
                                    </div>
                                    <div class="flex-1">
                                      <div class="flex justify-between items-start gap-3">
                                        <div>
                                          <p class="text-sm font-semibold text-gray-900">Reading Session</p>
                                          <p class="text-sm text-gray-600">
                                            Pages {(e as any).log.pagesStart ?? '—'} → {(e as any).log.pagesEnd ?? '—'}
                                            <Show when={(e as any).log.minutes != null}>
                                              {' '}• {(e as any).log.minutes} min
                                            </Show>
                                            <Show when={(e as any).log.note}>
                                              {' '}• {(e as any).log.note}
                                            </Show>
                                          </p>
                                        </div>
                                        <span class="text-xs text-gray-400 font-medium whitespace-nowrap">
                                          {formatTimeLabel(e.at)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </Show>
                              )}
                            </For>
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
              </Show>
            </div>

            <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <h3 class="text-lg font-bold text-gray-900">Reading Logs</h3>
                  <p class="text-sm text-gray-500">Sessions for this book.</p>
                </div>
                <button
                  class="text-sm font-medium text-gray-600 hover:text-black"
                  type="button"
                  onClick={() => navigate(`/bookshelf/book/${b().$id}/create/readinglog`)}
                >
                  Add
                </button>
              </div>

              <Show when={!logs.loading} fallback={<div class="text-sm text-gray-500">Loading…</div>}>
                <Show when={readingLogs().length > 0} fallback={
                  <div class="bg-gray-50 rounded-xl border border-gray-200 p-4 text-sm text-gray-600">
                    No reading logs yet.
                  </div>
                }>
                  <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                      <thead>
                        <tr class="text-xs text-gray-500 border-b border-gray-200">
                          <th class="text-left font-semibold py-3">Date</th>
                          <th class="text-left font-semibold py-3">Pages</th>
                          <th class="text-left font-semibold py-3">Minutes</th>
                          <th class="text-left font-semibold py-3">Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        <For each={readingLogs()}>
                          {(l) => (
                            <tr class="border-b border-gray-100 last:border-b-0">
                              <td class="py-3 text-gray-900 font-medium whitespace-nowrap">{formatShortDate(l.date)}</td>
                              <td class="py-3 text-gray-700 whitespace-nowrap">
                                {l.pagesStart ?? '—'} → {l.pagesEnd ?? '—'}
                              </td>
                              <td class="py-3 text-gray-700 whitespace-nowrap">{l.minutes ?? '—'}</td>
                              <td class="py-3 text-gray-600">{l.note ?? '—'}</td>
                            </tr>
                          )}
                        </For>
                      </tbody>
                    </table>
                  </div>
                </Show>
              </Show>
            </div>

            <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <h3 class="text-lg font-bold text-gray-900">Hard Words</h3>
                  <p class="text-sm text-gray-500">Vocabulary saved for this book.</p>
                </div>
                <button
                  class="text-sm font-medium text-gray-600 hover:text-black"
                  type="button"
                  onClick={() => void refetchWords()}
                >
                  Refresh
                </button>
              </div>

              <Show when={words.error || wordError()}>
                <div class="mb-4 bg-white border border-red-100 text-red-700 rounded-xl p-4 text-sm shadow-sm">
                  {(wordError() as any) ?? (words.error as any)?.message ?? 'Failed to load words'}
                </div>
              </Show>

              <form class="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4" onSubmit={addWord}>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Word</label>
                    <input
                      class="bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-2.5"
                      value={word()}
                      onInput={(e) => setWord(e.currentTarget.value)}
                      required
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Meaning</label>
                    <input
                      class="bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-2.5"
                      value={meaning()}
                      onInput={(e) => setMeaning(e.currentTarget.value)}
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Context</label>
                    <input
                      class="bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-2.5"
                      value={context()}
                      onInput={(e) => setContext(e.currentTarget.value)}
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Page</label>
                    <input
                      class="bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-2.5"
                      inputmode="numeric"
                      type="text"
                      placeholder="e.g. 42"
                      value={page()}
                      onInput={(e) => setPage(e.currentTarget.value)}
                    />
                  </div>
                </div>
                <div class="flex items-center justify-end">
                  <button
                    class="bg-black hover:bg-gray-800 text-white font-medium rounded-lg text-sm px-4 py-2"
                    type="submit"
                    disabled={wordBusy()}
                  >
                    {wordBusy() ? 'Adding…' : 'Add word'}
                  </button>
                </div>
              </form>

              <div class="mt-5">
                <Show when={!words.loading} fallback={<div class="text-sm text-gray-500">Loading…</div>}>
                  <Show when={(words() ?? []).length > 0} fallback={
                    <div class="bg-gray-50 rounded-xl border border-gray-200 p-4 text-sm text-gray-600">
                      No words yet.
                    </div>
                  }>
                    <div class="overflow-x-auto">
                      <table class="w-full text-sm">
                        <thead>
                          <tr class="text-xs text-gray-500 border-b border-gray-200">
                            <th class="text-left font-semibold py-3">Word</th>
                            <th class="text-left font-semibold py-3">Meaning</th>
                            <th class="text-left font-semibold py-3">Context</th>
                            <th class="text-left font-semibold py-3">Page</th>
                            <th class="text-left font-semibold py-3">Due</th>
                          </tr>
                        </thead>
                        <tbody>
                          <For each={words() ?? []}>
                            {(w) => (
                              <tr class="border-b border-gray-100 last:border-b-0">
                                <td class="py-3 font-semibold text-gray-900">{w.word}</td>
                                <td class="py-3 text-gray-700">{w.meaning ?? '—'}</td>
                                <td class="py-3 text-gray-600">{w.context ?? '—'}</td>
                                <td class="py-3 text-gray-700 whitespace-nowrap">{typeof w.page === 'number' ? `p. ${w.page}` : '—'}</td>
                                <td class="py-3 text-gray-700 whitespace-nowrap">{formatShortDate(w.srsDueAt)}</td>
                              </tr>
                            )}
                          </For>
                        </tbody>
                      </table>
                    </div>
                  </Show>
                </Show>
              </div>
            </div>
          </>
        )}
      </Show>
    </div>
  )
}
