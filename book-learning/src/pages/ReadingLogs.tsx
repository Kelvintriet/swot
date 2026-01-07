import { createMemo, createResource, createSignal, For, Show } from 'solid-js'
import type { Models } from 'appwrite'
import { useNavigate } from '@solidjs/router'
import { appwriteConfig, databases, Query } from '../lib/appwrite'
import { useSession } from '../context/session'
import { coverUrlFor } from '../lib/covers'

type BookDoc = Models.Document & {
  title: string
  author?: string
  totalPages?: number
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

function formatSessionDate(d: Date) {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatSessionTime(d: Date) {
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function formatDuration(minutes?: number) {
  if (minutes == null) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h <= 0) return `${m}m`
  if (m <= 0) return `${h}h`
  return `${h}h ${m}m`
}

export default function ReadingLogsPage() {
  const session = useSession()
  const navigate = useNavigate()

  const [queryText, setQueryText] = createSignal('')
  const [sortBy, setSortBy] = createSignal<'recent' | 'duration' | 'pages'>('recent')

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

  const [logs, { refetch }] = createResource(async () => {
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

  const filtered = createMemo(() => {
    const q = queryText().trim().toLowerCase()
    let list = (logs() ?? []).map((l) => {
      const book = bookById().get(l.bookId)
      return { log: l, book }
    })

    if (q) {
      list = list.filter(({ book, log }) => {
        const title = (book?.title ?? '').toLowerCase()
        const author = (book?.author ?? '').toLowerCase()
        return title.includes(q) || author.includes(q) || log.bookId.toLowerCase().includes(q)
      })
    }

    const sort = sortBy()
    if (sort === 'recent') {
      list.sort((a, b) => new Date(b.log.date).getTime() - new Date(a.log.date).getTime())
    } else if (sort === 'duration') {
      list.sort((a, b) => (b.log.minutes ?? -1) - (a.log.minutes ?? -1))
    } else {
      const pagesRead = (l: LogDoc) => {
        if (l.pagesStart == null || l.pagesEnd == null) return -1
        return Math.max(0, l.pagesEnd - l.pagesStart)
      }
      list.sort((a, b) => pagesRead(b.log) - pagesRead(a.log))
    }

    return list
  })

  const deleteLog = async (id: string) => {
    const { databaseId, logsCollectionId } = appwriteConfig
    if (!databaseId || !logsCollectionId) return
    await databases.deleteDocument(databaseId, logsCollectionId, id)
    await refetch()
  }

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
            <a class="flex items-center space-x-3 text-textPrimary hover:text-black group" href="/history">
              <svg class="w-5 h-5 text-gray-500 group-hover:text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
              </svg>
              <span class="font-medium text-sm">Log History</span>
            </a>
            <a class="flex items-center space-x-3 text-black font-semibold group" href="/reading-logs">
              <svg class="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 20 20">
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
            <h2 class="text-2xl font-bold text-gray-900">Reading Logs</h2>
            <p class="text-sm text-gray-500 mt-1">Track your reading sessions and reflections</p>
          </div>
          <div class="flex items-center space-x-4">
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
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="flex flex-1 items-center gap-3">
              <div class="relative w-full md:w-80">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span class="material-symbols-outlined text-gray-400 text-lg">search</span>
                </div>
                <input
                  class="bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full pl-10 p-2.5"
                  placeholder="Search by book title..."
                  type="text"
                  value={queryText()}
                  onInput={(e) => setQueryText(e.currentTarget.value)}
                />
              </div>
              <div class="relative hidden md:block">
                <select class="bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-2.5 pr-8 appearance-none">
                  <option>This Month</option>
                  <option>Last 30 Days</option>
                  <option>This Year</option>
                  <option>All Time</option>
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg class="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path clip-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" fill-rule="evenodd"></path>
                  </svg>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <div class="flex items-center text-sm text-gray-500">
                <span class="mr-2">Sort by:</span>
                <select
                  class="bg-transparent font-medium text-gray-900 border-none focus:ring-0 p-0 pr-6 cursor-pointer text-sm"
                  value={sortBy()}
                  onChange={(e) => {
                    const v = e.currentTarget.value
                    if (v === 'duration') setSortBy('duration')
                    else if (v === 'pages') setSortBy('pages')
                    else setSortBy('recent')
                  }}
                >
                  <option value="recent">Recent First</option>
                  <option value="duration">Duration (High-Low)</option>
                  <option value="pages">Pages Read (High-Low)</option>
                </select>
              </div>
              <button
                class="flex items-center bg-black hover:bg-gray-800 text-white font-medium rounded-lg text-sm px-4 py-2.5 gap-2 transition-colors shadow-sm"
                type="button"
                onClick={() => navigate('/library?tab=logs&create=readinglog')}
              >
                <span class="material-symbols-outlined text-lg">add</span>
                Log Session
              </button>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-sm text-left text-gray-500">
                <thead class="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th class="px-6 py-4 font-medium tracking-wide">Book</th>
                    <th class="px-6 py-4 font-medium tracking-wide">Session Date</th>
                    <th class="px-6 py-4 font-medium tracking-wide">Duration</th>
                    <th class="px-6 py-4 font-medium tracking-wide">Pages</th>
                    <th class="px-6 py-4 font-medium tracking-wide w-1/4">Notes</th>
                    <th class="px-6 py-4 font-medium tracking-wide text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <Show when={!logs.loading} fallback={
                    <tr class="bg-white">
                      <td class="px-6 py-4" colspan={6}>Loading…</td>
                    </tr>
                  }>
                    <Show when={(filtered() ?? []).length > 0} fallback={
                      <tr class="bg-white">
                        <td class="px-6 py-4" colspan={6}>No reading logs yet.</td>
                      </tr>
                    }>
                      <For each={filtered()}>
                        {({ log, book }) => {
                          const d = () => new Date(log.date)
                          const pagesRead = () =>
                            log.pagesStart != null && log.pagesEnd != null
                              ? Math.max(0, log.pagesEnd - log.pagesStart)
                              : undefined

                          return (
                            <tr class="bg-white hover:bg-gray-50 transition-colors group">
                              <td class="px-6 py-4">
                                <div class="flex items-center space-x-3">
                                  <img
                                    alt="Book Cover"
                                    class="h-12 w-8 object-cover rounded shadow-sm border border-gray-200"
                                    src={coverUrlFor(book?.coverFileId, { width: 64, height: 96 })}
                                  />
                                  <div>
                                    <div class="font-semibold text-gray-900">{book?.title ?? log.bookId}</div>
                                    <div class="text-xs text-gray-500">
                                      {book?.author ?? '—'} •
                                      {' '}
                                      {typeof book?.totalPages === 'number' && book.totalPages > 0
                                        ? `${book.totalPages} pages`
                                        : '- pages'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td class="px-6 py-4">
                                <div class="font-medium text-gray-900">{formatSessionDate(d())}</div>
                                <div class="text-xs text-gray-500">{formatSessionTime(d())}</div>
                              </td>
                              <td class="px-6 py-4">
                                <span class="inline-flex items-center bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                  <span class="material-symbols-outlined text-[14px] mr-1">timer</span>
                                  {formatDuration(log.minutes)}
                                </span>
                              </td>
                              <td class="px-6 py-4">
                                <div class="text-gray-900 font-medium">
                                  {pagesRead() != null ? `${pagesRead()} Pages` : '—'}
                                </div>
                                <div class="text-xs text-gray-500">
                                  {log.pagesStart != null || log.pagesEnd != null
                                    ? `p. ${log.pagesStart ?? '—'} - ${log.pagesEnd ?? '—'}`
                                    : '—'}
                                </div>
                              </td>
                              <td class="px-6 py-4">
                                <Show
                                  when={(log.note ?? '').trim()}
                                  fallback={<p class="text-gray-400 italic">No notes added.</p>}
                                >
                                  <p
                                    class="text-gray-600 truncate max-w-xs cursor-pointer hover:text-black"
                                    title={log.note ?? ''}
                                  >
                                    {log.note}
                                  </p>
                                </Show>
                              </td>
                              <td class="px-6 py-4 text-right">
                                <div class="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    class="p-1 text-gray-400 hover:text-black rounded"
                                    type="button"
                                    onClick={() => navigate(`/bookshelf/book/${log.bookId}`)}
                                  >
                                    <span class="material-symbols-outlined text-lg">edit</span>
                                  </button>
                                  <button
                                    class="p-1 text-gray-400 hover:text-red-600 rounded"
                                    type="button"
                                    onClick={() => void deleteLog(log.$id)}
                                  >
                                    <span class="material-symbols-outlined text-lg">delete</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        }}
                      </For>
                    </Show>
                  </Show>
                </tbody>
              </table>
            </div>

            <div class="px-6 py-4 flex items-center justify-between border-t border-gray-100 bg-gray-50">
              <span class="text-sm text-gray-500">
                Showing <span class="font-medium text-gray-900">1</span> to{' '}
                <span class="font-medium text-gray-900">{Math.min(5, filtered().length)}</span> of{' '}
                <span class="font-medium text-gray-900">{filtered().length}</span> entries
              </span>
              <div class="flex space-x-2">
                <button
                  class="px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-md hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50"
                  disabled={true}
                  type="button"
                >
                  Previous
                </button>
                <button
                  class="px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-md hover:bg-gray-50 hover:text-gray-700"
                  type="button"
                  onClick={() => void refetch()}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
