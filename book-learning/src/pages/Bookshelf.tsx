import { createEffect, createMemo, createResource, createSignal, For, Show } from 'solid-js'
import type { Models } from 'appwrite'
import { useNavigate } from '@solidjs/router'
import { appwriteConfig, databases, Query } from '../lib/appwrite'
import { useSession } from '../context/session'
import { coverUrlFor } from '../lib/covers'
import { loadFavoriteBookIdsCloud, toggleFavoriteBookIdCloud } from '../lib/favorites'
import MobileBottomNav from '../components/MobileBottomNav'

type BookDoc = Models.Document & {
  title: string
  author?: string
  status?: 'to-read' | 'reading' | 'done'
  genre?: string
  totalPages?: number
  startPage?: number
  coverFileId?: string
}

type LogDoc = Models.Document & {
  userId: string
  bookId: string
  date: string
  pagesStart?: number
  pagesEnd?: number
}

function statusLabel(status?: BookDoc['status']) {
  if (status === 'done') return 'Finished'
  if (status === 'to-read') return 'Want to Read'
  return 'Reading'
}

function statusBadgeClass(status?: BookDoc['status']) {
  if (status === 'done') return 'bg-blue-100 text-blue-800'
  if (status === 'to-read') return 'bg-yellow-100 text-yellow-800'
  return 'bg-green-100 text-green-800'
}

export default function BookshelfPage() {
  const session = useSession()
  const navigate = useNavigate()

  const [queryText, setQueryText] = createSignal('')
  const [statusFilter, setStatusFilter] = createSignal<'all' | 'reading' | 'to-read' | 'done'>('all')
  const [genreFilter, setGenreFilter] = createSignal<string>('all')
  const [sortBy, setSortBy] = createSignal<'recent' | 'title'>('recent')

  const [favoriteIds, setFavoriteIds] = createSignal<Set<string>>(new Set())

  createEffect(() => {
    const u = session.user()
    if (!u) {
      setFavoriteIds(new Set<string>())
      return
    }

    void loadFavoriteBookIdsCloud()
      .then((ids) => setFavoriteIds(ids))
      .catch(() => {
        // ignore
      })
  })

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

  const [logs] = createResource(async () => {
    const userId = session.user()?.$id
    if (!userId) return [] as LogDoc[]

    const { databaseId, logsCollectionId } = appwriteConfig
    if (!databaseId || !logsCollectionId) return [] as LogDoc[]

    const res = await databases.listDocuments<LogDoc>(databaseId, logsCollectionId, [
      Query.equal('userId', userId),
      Query.orderDesc('date'),
      Query.limit(500),
    ])

    return res.documents
  })

  const currentPageByBookId = createMemo(() => {
    const map = new Map<string, number>()

    for (const l of logs() ?? []) {
      const end = l.pagesEnd
      if (typeof end !== 'number') continue
      const prev = map.get(l.bookId)
      if (prev == null || end > prev) map.set(l.bookId, end)
    }

    return map
  })

  const filteredBooks = createMemo(() => {
    const q = queryText().trim().toLowerCase()
    const filter = statusFilter()
    const genre = genreFilter().trim().toLowerCase()

    let list = (books() ?? [])

    if (filter !== 'all') {
      list = list.filter((b) => (b.status ?? 'reading') === filter)
    }

    if (genre && genre !== 'all') {
      list = list.filter((b) => (b.genre ?? '').trim().toLowerCase() === genre)
    }

    if (q) {
      list = list.filter((b) => {
        const title = (b.title ?? '').toLowerCase()
        const author = (b.author ?? '').toLowerCase()
        const g = (b.genre ?? '').toLowerCase()
        return title.includes(q) || author.includes(q) || g.includes(q)
      })
    }

    const sort = sortBy()
    if (sort === 'recent') {
      list = [...list].sort((a, b) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime())
    } else {
      list = [...list].sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''))
    }

    return list
  })

  const statusFilterLabel = createMemo(() => {
    const v = statusFilter()
    if (v === 'reading') return 'Reading'
    if (v === 'to-read') return 'Want to Read'
    if (v === 'done') return 'Finished'
    return 'All'
  })

  const availableGenres = createMemo(() => {
    const set = new Set<string>()
    for (const b of books() ?? []) {
      const g = (b.genre ?? '').trim()
      if (g) set.add(g)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  })

  const sortLabel = createMemo(() => {
    const v = sortBy()
    if (v === 'title') return 'Title'
    return 'Recently Added'
  })

  return (
    <div class="bg-mainBg font-sans text-textPrimary h-screen flex overflow-hidden">
      <aside
        class="hidden md:flex w-64 bg-sidebar border-r border-gray-200 flex-col justify-between flex-shrink-0 h-full overflow-y-auto"
        data-purpose="sidebar-navigation"
      >
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
            <a class="flex items-center space-x-3 text-textPrimary hover:text-black group" href="/reading-logs">
              <svg class="w-5 h-5 text-gray-500 group-hover:text-black" fill="currentColor" viewBox="0 0 20 20">
                <path clip-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" fill-rule="evenodd"></path>
              </svg>
              <span class="font-medium text-sm">Reading Logs</span>
            </a>
            <a class="flex items-center space-x-3 text-black font-semibold group" href="/bookshelf">
              <svg class="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 20 20">
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

      <main class="flex-1 overflow-y-auto" data-purpose="bookshelf-content">
        <header class="flex justify-between items-center py-4 px-4 md:py-6 md:px-10 sticky top-0 z-40 border-b border-gray-100 bg-mainBg bg-opacity-90 backdrop-blur-md backdrop-saturate-150">
          <div>
            <h2 class="text-xl md:text-2xl font-bold text-gray-900">My Bookshelf</h2>
            <p class="text-sm text-gray-500 mt-1">Manage and track your entire library</p>
          </div>
          <div class="flex items-center space-x-4">
            <button class="text-gray-500 hover:text-gray-700 focus:outline-none relative" type="button">
              <span class="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
              <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a6 6 0 00-9 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"></path>
              </svg>
            </button>
            <div class="flex items-center space-x-2 cursor-pointer">
              <img
                alt="User Avatar"
                class="w-8 h-8 rounded-full border border-gray-200"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBZvMnkgfCsX_LLkueIXM4CE4MGOX7i0r1lxiCxcXzWqt39ccMaggbOYYfDZNo_PrkY3EnQYTBflOOiKNHgxFHC8VN1R4_8yub006WBIVftZsO77bve_f-HDq4OPBmSZz2w7dp8NsYFKzPkzY5BUa3SdJgk8eRsL9SGurloixLZ856wIvaWFCLn76_aQJ7BLIeOWPmMGfaHfoSVXT-_mpWCKgPAgPQmrOh9sH0GII0HKd1MvShyXuEzw7hr3abL3UQLVxOgObXKMCs"
              />
              <span class="text-sm font-medium text-gray-900">
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

        <div class="px-4 pb-24 md:px-10 md:pb-10 space-y-6">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
            <div class="relative w-full md:w-96">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
                </svg>
              </div>
              <input
                class="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm shadow-sm"
                placeholder="Search by title, author, or ISBN..."
                type="search"
                value={queryText()}
                onInput={(e) => setQueryText(e.currentTarget.value)}
              />
            </div>
            <div class="flex items-center space-x-3 w-full md:w-auto overflow-x-auto">
              <div class="relative inline-block text-left">
                <button
                  class="inline-flex justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200"
                  type="button"
                  onClick={() => {
                    const v = statusFilter()
                    if (v === 'all') setStatusFilter('reading')
                    else if (v === 'reading') setStatusFilter('to-read')
                    else if (v === 'to-read') setStatusFilter('done')
                    else setStatusFilter('all')
                  }}
                >
                  Status: {statusFilterLabel()}
                  <svg class="-mr-1 ml-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path clip-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" fill-rule="evenodd"></path>
                  </svg>
                </button>
              </div>
              <div class="relative inline-block text-left">
                <select
                  class="inline-flex justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200"
                  value={genreFilter()}
                  onChange={(e) => setGenreFilter(e.currentTarget.value)}
                >
                  <option value="all">All genres</option>
                  <For each={availableGenres()}>
                    {(g) => <option value={g}>{g}</option>}
                  </For>
                </select>
              </div>
              <div class="relative inline-block text-left">
                <button
                  class="inline-flex justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200"
                  type="button"
                  onClick={() => setSortBy(sortBy() === 'recent' ? 'title' : 'recent')}
                >
                  Sort by: {sortLabel()}
                  <svg class="-mr-1 ml-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path clip-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" fill-rule="evenodd"></path>
                  </svg>
                </button>
              </div>
              <button
                class="bg-black hover:bg-gray-800 text-white font-medium rounded-lg text-sm px-4 py-2 flex items-center space-x-2"
                type="button"
                onClick={() => navigate('/bookshelf/create')}
              >
                <span class="material-symbols-outlined text-[18px]">add</span>
                <span>Add Book</span>
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <Show when={!books.loading} fallback={<div class="text-sm text-gray-500">Loading…</div>}>
              <For each={filteredBooks()}>
                {(b) => {
                  const current = () => currentPageByBookId().get(b.$id) ?? 0
                  const total = () => (typeof b.totalPages === 'number' ? b.totalPages : undefined)
                  const percent = () => {
                    if ((b.status ?? 'reading') === 'done') return 100
                    const t = total()
                    if (!t || t <= 0) return 0
                    return Math.max(0, Math.min(100, Math.round((current() / t) * 100)))
                  }

                  const isFav = () => favoriteIds().has(b.$id)

                  return (
                    <div class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col transition-all duration-200 book-card-hover group">
                      <div
                        class="relative h-48 bg-gray-100 flex items-center justify-center overflow-hidden"
                        onClick={() => navigate(`/bookshelf/book/${b.$id}`)}
                      >
                        <img
                          alt={`${b.title} Cover`}
                          class="h-4/5 w-auto object-cover shadow-md rounded"
                          src={coverUrlFor(b.coverFileId, { height: 320 })}
                          onError={(e) => {
                            e.currentTarget.src = '/cover-placeholder.svg'
                          }}
                        />
                        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center"></div>
                        <div class="absolute top-3 right-3">
                          <button
                            class={
                              'bg-white/90 hover:bg-white p-1.5 rounded-full shadow-sm transition-colors ' +
                              (isFav() ? 'text-red-500' : 'text-gray-400 hover:text-red-500')
                            }
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              void toggleFavoriteBookIdCloud(b.$id)
                                .then((ids) => setFavoriteIds(ids))
                                .catch(() => {
                                  // ignore
                                })
                            }}
                          >
                            <span
                              class="material-symbols-outlined text-[18px] block"
                              style={isFav() ? { 'font-variation-settings': "'FILL' 1" } : undefined}
                            >
                              favorite
                            </span>
                          </button>
                        </div>
                      </div>
                      <div class="p-4 flex flex-col flex-1">
                        <div class="mb-3">
                          <div class="flex flex-wrap items-center gap-2">
                            <span
                              class={
                                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ' +
                                statusBadgeClass(b.status)
                              }
                            >
                              {statusLabel(b.status)}
                            </span>
                            <Show when={(b.genre ?? '').trim()}>
                              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                {(b.genre ?? '').trim()}
                              </span>
                            </Show>
                          </div>
                        </div>
                        <h3 class="text-base font-bold text-gray-900 line-clamp-1" title={b.title}>
                          {b.title}
                        </h3>
                        <p class="text-sm text-gray-500 mb-4">{b.author ?? '—'}</p>
                        <div class="mt-auto">
                          <div class="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                            <div
                              class={
                                (b.status ?? 'reading') === 'done'
                                  ? 'bg-green-500 h-1.5 rounded-full'
                                  : (b.status ?? 'reading') === 'to-read'
                                    ? 'bg-gray-300 h-1.5 rounded-full'
                                    : 'bg-black h-1.5 rounded-full'
                              }
                              style={{ width: `${percent()}%` }}
                            ></div>
                          </div>
                          <div class="flex justify-between text-xs text-gray-500">
                            <span>{percent()}%</span>
                            <span>
                              <Show
                                when={(b.status ?? 'reading') === 'done'}
                                fallback={
                                  <Show
                                    when={total() != null && total()! > 0}
                                    fallback={<>{current()}/- pages</>}
                                  >
                                    {current()}/{total()} pages
                                  </Show>
                                }
                              >
                                Completed
                              </Show>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                }}
              </For>

              <div
                class="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 hover:border-black hover:bg-gray-100 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center p-6 text-center group h-full min-h-[340px]"
                onClick={() => navigate('/bookshelf/create')}
              >
                <div class="bg-white p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
                  <span class="material-symbols-outlined text-gray-400 group-hover:text-black text-[32px] block">
                    add
                  </span>
                </div>
                <h3 class="text-lg font-bold text-gray-900">Add New Book</h3>
                <p class="text-sm text-gray-500 mt-2">Find a book to add to your collection</p>
              </div>
            </Show>
          </div>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}
