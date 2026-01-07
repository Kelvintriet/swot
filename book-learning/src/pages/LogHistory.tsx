import { createMemo, createResource, createSignal, For, Show } from 'solid-js'
import type { Models } from 'appwrite'
import { appwriteConfig, databases, Query } from '../lib/appwrite'
import { useSession } from '../context/session'
import { coverUrlFor } from '../lib/covers'

type BookDoc = Models.Document & {
  title: string
  author?: string
  genre?: string
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
}

type TimelineEvent =
  | {
      kind: 'reading-session'
      at: Date
      log: LogDoc
      book?: BookDoc
    }
  | {
      kind: 'note'
      at: Date
      log: LogDoc
      book?: BookDoc
    }
  | {
      kind: 'hard-word'
      at: Date
      word: WordDoc
      book?: BookDoc
    }
  | {
      kind: 'added-book'
      at: Date
      book: BookDoc
    }

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatDayHeading(d: Date) {
  const now = new Date()
  const today = startOfDay(now)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (isSameDay(d, today)) return 'Today'
  if (isSameDay(d, yesterday)) return 'Yesterday'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTimeLabel(d: Date) {
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin >= 0 && diffMin < 60 && isSameDay(d, now)) {
    if (diffMin <= 1) return '1 min ago'
    return `${diffMin} mins ago`
  }

  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export default function LogHistoryPage() {
  const session = useSession()

  const [visibleCount, setVisibleCount] = createSignal(5)

  const [books] = createResource(async () => {
    const userId = session.user()?.$id
    if (!userId) return [] as BookDoc[]

    const { databaseId, booksCollectionId } = appwriteConfig
    if (!databaseId || !booksCollectionId) {
      throw new Error('Missing books collection env vars (see .env.example)')
    }

    const res = await databases.listDocuments<BookDoc>(databaseId, booksCollectionId, [
      Query.equal('userId', userId),
      Query.orderDesc('$createdAt'),
      Query.limit(200),
    ])

    return res.documents
  })

  const bookById = createMemo(() => {
    const map = new Map<string, BookDoc>()
    for (const b of books() ?? []) map.set(b.$id, b)
    return map
  })

  const [logs, { refetch: refetchLogs }] = createResource(async () => {
    const userId = session.user()?.$id
    if (!userId) return [] as LogDoc[]

    const { databaseId, logsCollectionId } = appwriteConfig
    if (!databaseId || !logsCollectionId) {
      throw new Error('Missing logs collection env vars (see .env.example)')
    }

    const res = await databases.listDocuments<LogDoc>(databaseId, logsCollectionId, [
      Query.equal('userId', userId),
      Query.orderDesc('date'),
      Query.limit(200),
    ])

    return res.documents
  })

  const [words] = createResource(async () => {
    const userId = session.user()?.$id
    if (!userId) return [] as WordDoc[]

    const { databaseId, wordsCollectionId } = appwriteConfig
    if (!databaseId || !wordsCollectionId) {
      throw new Error('Missing words collection env vars (see .env.example)')
    }

    const res = await databases.listDocuments<WordDoc>(databaseId, wordsCollectionId, [
      Query.equal('userId', userId),
      Query.orderDesc('$createdAt'),
      Query.limit(200),
    ])

    return res.documents
  })

  const events = createMemo(() => {
    const list: TimelineEvent[] = []

    for (const b of books() ?? []) {
      list.push({
        kind: 'added-book',
        at: new Date(b.$createdAt),
        book: b,
      })
    }

    for (const l of logs() ?? []) {
      const at = new Date(l.date)
      list.push({
        kind: 'reading-session',
        at,
        log: l,
        book: bookById().get(l.bookId),
      })

      if ((l.note ?? '').trim()) {
        list.push({
          kind: 'note',
          at,
          log: l,
          book: bookById().get(l.bookId),
        })
      }
    }

    for (const w of words() ?? []) {
      list.push({
        kind: 'hard-word',
        at: new Date(w.$createdAt),
        word: w,
        book: bookById().get(w.bookId),
      })
    }

    list.sort((a, b) => b.at.getTime() - a.at.getTime())
    return list
  })

  const visibleEvents = createMemo(() => events().slice(0, visibleCount()))

  const grouped = createMemo(() => {
    const groups: Array<{ day: Date; events: TimelineEvent[] }> = []

    for (const e of visibleEvents()) {
      const day = startOfDay(e.at)
      const last = groups[groups.length - 1]
      if (!last || !isSameDay(last.day, day)) {
        groups.push({ day, events: [e] })
      } else {
        last.events.push(e)
      }
    }

    return groups
  })

  const canLoadOlder = createMemo(() => events().length > visibleCount())

  return (
    <div class="bg-mainBg font-sans text-textPrimary h-screen flex overflow-hidden">
      <aside class="w-64 bg-sidebar border-r border-gray-200 flex flex-col justify-between flex-shrink-0 h-full overflow-y-auto" data-purpose="sidebar-navigation">
        <div class="p-6">
          <div class="mb-10">
            <h1 class="text-xl font-semibold tracking-tight">BookTracker</h1>
          </div>
          <nav class="space-y-6">
            <a class="flex items-center space-x-3 text-textPrimary hover:text-black group" href="/library">
              <svg class="w-5 h-5 text-gray-500 group-hover:text-black" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"></path>
              </svg>
              <span class="font-medium text-sm">Dashboard</span>
            </a>
            <a class="flex items-center space-x-3 text-black font-semibold group" href="/history">
              <svg class="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
              </svg>
              <span class="font-medium text-sm">Log History</span>
            </a>
            <a class="flex items-center space-x-3 text-textPrimary hover:text-black group" href="/reading-logs">
              <svg class="w-5 h-5 text-gray-500 group-hover:text-black" fill="currentColor" viewBox="0 0 20 20">
                <path clip-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" fill-rule="evenodd"></path>
              </svg>
              <span class="font-medium text-sm">Reading Logs</span>
            </a>
            <a class="flex items-center space-x-3 text-textPrimary hover:text-black group" href="/bookshelf">
              <svg class="w-5 h-5 text-gray-500 group-hover:text-black" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V4zm10.586-1.586A2 2 0 0114 2h2a2 2 0 012 2v12a2 2 0 01-2 2h-2a2 2 0 01-2-2V4a2 2 0 01.586-1.414zM8 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H9a1 1 0 01-1-1V4z"></path>
              </svg>
              <span class="font-medium text-sm">My Bookshelf</span>
            </a>
            <a class="flex items-center space-x-3 text-textPrimary hover:text-black group" href="/favorites">
              <svg class="w-5 h-5 text-gray-500 group-hover:text-black" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
              </svg>
              <span class="font-medium text-sm">Favorites</span>
            </a>
          </nav>
        </div>
        <div class="p-6 border-t border-gray-100">
          <nav class="space-y-4">
            <a class="flex items-center space-x-3 text-textPrimary hover:text-black group" href="/settings">
              <svg class="w-5 h-5 text-gray-500 group-hover:text-black" fill="currentColor" viewBox="0 0 20 20">
                <path clip-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" fill-rule="evenodd"></path>
              </svg>
              <span class="font-medium text-sm">Settings</span>
            </a>
            <a
              class="flex items-center space-x-3 text-textPrimary hover:text-black group"
              href="#"
              onClick={(e) => {
                e.preventDefault()
                void session.logout()
              }}
            >
              <svg class="w-5 h-5 text-gray-500 group-hover:text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
              </svg>
              <span class="font-medium text-sm">Log out</span>
            </a>
          </nav>
        </div>
      </aside>

      <main class="flex-1 overflow-y-auto" data-purpose="dashboard-content">
        <header class="flex justify-between items-center py-6 px-10 sticky top-0 z-40 border-b border-gray-100 bg-mainBg bg-opacity-90 backdrop-blur-md backdrop-saturate-150">
          <div>
            <h2 class="text-2xl font-bold text-gray-900">Log History</h2>
            <p class="text-sm text-gray-500 mt-1">Track your reading journey and activities over time.</p>
          </div>
          <div class="flex items-center space-x-4">
            <button
              class="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium flex items-center shadow-sm"
              type="button"
              onClick={() => void refetchLogs()}
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
              </svg>
              Filter
            </button>
            <button class="text-gray-500 hover:text-gray-700 focus:outline-none relative p-1 rounded-full hover:bg-gray-100" type="button">
              <span class="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
              <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a6 6 0 00-9 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"></path>
              </svg>
            </button>
            <div class="flex items-center space-x-2 cursor-pointer p-1 rounded-full hover:bg-gray-100 pr-2">
              <img
                alt="User Avatar"
                class="w-8 h-8 rounded-full border border-gray-200"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBZvMnkgfCsX_LLkueIXM4CE4MGOX7i0r1lxiCxcXzWqt39ccMaggbOYYfDZNo_PrkY3EnQYTBflOOiKNHgxFHC8VN1R4_8yub006WBIVftZsO77bve_f-HDq4OPBmSZz2w7dp8NsYFKzPkzY5BUa3SdJgk8eRsL9SGurloixLZ856wIvaWFCLn76_aQJ7BLIeOWPmMGfaHfoSVXT-_mpWCKgPAgPQmrOh9sH0GII0HKd1MvShyXuEzw7hr3abL3UQLVxOgObXKMCs"
              />
              <span class="text-sm font-medium text-gray-900 hidden md:block">
                <Show when={session.user()} fallback={<>Alex</>}>
                  {session.user()?.name ?? session.user()?.email}
                </Show>
              </span>
              <svg class="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path clip-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" fill-rule="evenodd"></path>
              </svg>
            </div>
          </div>
        </header>

        <div class="px-10 pb-10 pt-4 space-y-6">
          <div class="max-w-4xl mx-auto">
            <Show when={!(books.loading || logs.loading || words.loading)} fallback={
              <div class="text-sm text-gray-500">Loading…</div>
            }>
              <Show when={(events() ?? []).length > 0} fallback={
                <div class="bg-white p-6 rounded-xl border border-gray-100 shadow-sm text-sm text-gray-600">
                  No activity yet.
                </div>
              }>
                <For each={grouped()}>
                  {(g) => (
                    <div class="mb-8">
                      <div class="flex items-center mb-4">
                        <span class="text-sm font-bold text-gray-500 uppercase tracking-wider bg-mainBg pr-4">
                          {formatDayHeading(g.day)}
                        </span>
                        <div class="flex-1 border-t border-gray-200"></div>
                      </div>

                      <div class="relative pl-6 space-y-6">
                        <div class="timeline-line"></div>

                        <For each={g.events}>
                          {(e) => (
                            <Show
                              when={e.kind === 'reading-session'}
                              fallback={
                                <Show
                                  when={e.kind === 'hard-word'}
                                  fallback={
                                    <Show
                                      when={e.kind === 'added-book'}
                                      fallback={
                                        <div class="relative flex items-start space-x-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm z-10 transition-transform hover:-translate-y-0.5 hover:shadow-md">
                                          <div class="absolute -left-10 bg-gray-100 h-8 w-8 rounded-full flex items-center justify-center border-2 border-white ring-2 ring-gray-50">
                                            <span class="material-symbols-outlined text-gray-600 text-sm">edit_note</span>
                                          </div>
                                          <div class="flex-1">
                                            <div class="flex justify-between items-start">
                                              <div>
                                                <p class="text-sm font-semibold text-gray-900">Added a Note</p>
                                                <p class="text-sm text-gray-600">
                                                  Added a thought about a session in{' '}
                                                  <span class="font-medium text-gray-900">{(e as any).book?.title ?? (e as any).log.bookId}</span>
                                                </p>
                                              </div>
                                              <span class="text-xs text-gray-400 font-medium whitespace-nowrap">
                                                {formatTimeLabel(e.at)}
                                              </span>
                                            </div>
                                            <div class="mt-2 p-3 bg-gray-50 rounded text-xs text-gray-600 italic border border-gray-200">
                                              “{(e as any).log.note}”
                                            </div>
                                          </div>
                                        </div>
                                      }
                                    >
                                      <div class="relative flex items-start space-x-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm z-10 transition-transform hover:-translate-y-0.5 hover:shadow-md">
                                        <div class="absolute -left-10 bg-green-100 h-8 w-8 rounded-full flex items-center justify-center border-2 border-white ring-2 ring-gray-50">
                                          <span class="material-symbols-outlined text-green-600 text-sm">add_circle</span>
                                        </div>
                                        <div class="flex-shrink-0">
                                          <img
                                            alt="Book Cover"
                                            class="h-14 w-10 object-cover rounded shadow-sm"
                                            src={coverUrlFor((e as any).book.coverFileId, { width: 80, height: 112 })}
                                            onError={(ev) => {
                                              ev.currentTarget.src = '/cover-placeholder.svg'
                                            }}
                                          />
                                        </div>
                                        <div class="flex-1">
                                          <div class="flex justify-between items-start">
                                            <div>
                                              <p class="text-sm font-semibold text-gray-900">Added to Bookshelf</p>
                                              <p class="text-sm text-gray-600">
                                                Started tracking{' '}
                                                <span class="font-medium text-gray-900">{(e as any).book.title}</span>
                                              </p>
                                            </div>
                                            <span class="text-xs text-gray-400 font-medium whitespace-nowrap">
                                              {formatTimeLabel(e.at)}
                                            </span>
                                          </div>
                                          <div class="mt-2 flex space-x-2">
                                            <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-50 text-green-700">
                                              Tracking
                                            </span>
                                            <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                              Personal
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </Show>
                                  }
                                >
                                  <div class="relative flex items-start space-x-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm z-10 transition-transform hover:-translate-y-0.5 hover:shadow-md">
                                    <div class="absolute -left-10 bg-yellow-100 h-8 w-8 rounded-full flex items-center justify-center border-2 border-white ring-2 ring-gray-50">
                                      <span class="material-symbols-outlined text-yellow-600 text-sm">spellcheck</span>
                                    </div>
                                    <div class="flex-1">
                                      <div class="flex justify-between items-start">
                                        <div>
                                          <p class="text-sm font-semibold text-gray-900">Added Hard Word</p>
                                          <p class="text-sm text-gray-600">
                                            Saved new vocabulary from{' '}
                                            <span class="font-medium text-gray-900">{(e as any).book?.title ?? (e as any).word.bookId}</span>
                                          </p>
                                        </div>
                                        <span class="text-xs text-gray-400 font-medium whitespace-nowrap">
                                          {formatTimeLabel(e.at)}
                                        </span>
                                      </div>
                                      <div class="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                                        <div class="flex justify-between items-center">
                                          <span class="text-sm font-bold text-gray-800">“{(e as any).word.word}”</span>
                                          <span class="text-xs text-gray-500 italic">
                                            Page {typeof (e as any).word.page === 'number' ? (e as any).word.page : '—'}
                                          </span>
                                        </div>
                                        <p class="text-xs text-gray-600 mt-1">{(e as any).word.meaning ?? '—'}</p>
                                      </div>
                                    </div>
                                  </div>
                                </Show>
                              }
                            >
                              <div class="relative flex items-start space-x-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm z-10 transition-transform hover:-translate-y-0.5 hover:shadow-md">
                                <div class="absolute -left-10 bg-blue-100 h-8 w-8 rounded-full flex items-center justify-center border-2 border-white ring-2 ring-gray-50">
                                  <span class="material-symbols-outlined text-blue-600 text-sm">menu_book</span>
                                </div>
                                <div class="flex-shrink-0">
                                  <img
                                    alt="Book Cover"
                                    class="h-14 w-10 object-cover rounded shadow-sm"
                                    src={coverUrlFor((e as any).book?.coverFileId, { width: 80, height: 112 })}
                                    onError={(ev) => {
                                      ev.currentTarget.src = '/cover-placeholder.svg'
                                    }}
                                  />
                                </div>
                                <div class="flex-1">
                                  <div class="flex justify-between items-start">
                                    <div>
                                      <p class="text-sm font-semibold text-gray-900">Finished Reading Session</p>
                                      <p class="text-sm text-gray-600">
                                        Read{' '}
                                        <span class="font-medium text-gray-900">
                                          {(() => {
                                            const log = (e as any).log as LogDoc
                                            const pages =
                                              log.pagesStart != null && log.pagesEnd != null
                                                ? Math.max(0, log.pagesEnd - log.pagesStart)
                                                : undefined
                                            return pages != null && pages > 0 ? `${pages} pages` : '— pages'
                                          })()}
                                        </span>
                                        {' '}of{' '}
                                        <span class="font-medium text-gray-900">{(e as any).book?.title ?? (e as any).log.bookId}</span>
                                      </p>
                                    </div>
                                    <span class="text-xs text-gray-400 font-medium whitespace-nowrap">
                                      {formatTimeLabel(e.at)}
                                    </span>
                                  </div>
                                  <div class="mt-2 flex items-center text-xs text-gray-500 bg-gray-50 rounded-md p-2 w-fit">
                                    <span class="material-symbols-outlined text-gray-400 text-sm mr-1">timer</span>
                                    Duration: {((e as any).log.minutes ?? '—')} minutes
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

                <Show when={canLoadOlder()}>
                  <div class="text-center pt-8 pb-4">
                    <button
                      class="text-sm font-medium text-gray-500 hover:text-black transition-colors flex items-center justify-center mx-auto space-x-1"
                      type="button"
                      onClick={() => setVisibleCount(visibleCount() + 5)}
                    >
                      <span>Load older activity</span>
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M19 9l-7 7-7-7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
                      </svg>
                    </button>
                  </div>
                </Show>
              </Show>
            </Show>
          </div>
        </div>
      </main>
    </div>
  )
}
