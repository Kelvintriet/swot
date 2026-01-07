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
  coverFileId?: string
  rating?: number
}

function statusPill(status?: BookDoc['status']) {
  if (status === 'done') return { label: 'Finished', cls: 'bg-indigo-50 text-indigo-700' }
  if (status === 'to-read') return { label: 'Want to Read', cls: 'bg-green-50 text-green-700' }
  return { label: 'Reading', cls: 'bg-blue-50 text-blue-700' }
}

export default function FavoritesPage() {
  const session = useSession()
  const navigate = useNavigate()

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

  const favoriteBooks = createMemo(() => {
    const ids = favoriteIds()
    return (books() ?? []).filter((b) => ids.has(b.$id))
  })

  const avgRating = createMemo(() => {
    const list = favoriteBooks()
    const rated = list
      .map((b) => (typeof b.rating === 'number' ? b.rating : 0))
      .filter((r) => r > 0)
    if (rated.length === 0) return null
    const sum = rated.reduce((a, b) => a + b, 0)
    return sum / rated.length
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
            <a class="flex items-center space-x-3 text-textPrimary hover:text-black group" href="/bookshelf">
              <svg class="w-5 h-5 text-gray-500 group-hover:text-black" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V4zm10.586-1.586A2 2 0 0114 2h2a2 2 0 012 2v12a2 2 0 01-2 2h-2a2 2 0 01-2-2V4a2 2 0 01.586-1.414zM8 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H9a1 1 0 01-1-1V4z"></path>
              </svg>
              <span class="font-medium text-sm">My Bookshelf</span>
            </a>
            <a class="flex items-center space-x-3 text-black font-semibold group" href="/favorites">
              <svg class="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 20 20">
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

      <main class="flex-1 overflow-y-auto" data-purpose="favorites-content">
        <header class="flex justify-between items-center py-4 px-4 md:py-6 md:px-10 sticky top-0 z-40 border-b border-gray-100 bg-mainBg bg-opacity-90 backdrop-blur-md backdrop-saturate-150">
          <div>
            <h2 class="text-xl md:text-2xl font-bold text-gray-900">Favorites</h2>
            <p class="text-sm text-gray-500 mt-1">Your curated collection of most-loved books.</p>
          </div>
          <div class="flex items-center space-x-4">
            <div class="relative group">
              <button
                class="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium flex items-center shadow-sm"
                type="button"
              >
                <span class="material-symbols-outlined text-base mr-2">sort</span>
                Sort by: Recent
              </button>
            </div>
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

        <div class="px-4 pb-24 pt-6 md:px-10 md:pb-10 md:pt-8">
          <div class="flex justify-between items-end mb-8">
            <div class="flex space-x-8">
              <div class="text-center sm:text-left">
                <p class="text-3xl font-bold text-gray-900">{favoriteBooks().length}</p>
                <p class="text-sm text-gray-500 font-medium">Total Favorites</p>
              </div>
              <div class="text-center sm:text-left">
                  <p class="text-3xl font-bold text-gray-900">
                    <Show when={avgRating()} fallback={<>—</>}>
                      {(avg) => <>{avg().toFixed(1)}</>}
                    </Show>
                  </p>
                <p class="text-sm text-gray-500 font-medium">Avg. Rating</p>
              </div>
            </div>
            <div class="hidden sm:flex space-x-2 bg-gray-100 p-1 rounded-lg">
              <button class="px-3 py-1.5 bg-white shadow-sm rounded-md text-sm font-medium text-gray-900" type="button">
                Grid
              </button>
              <button class="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900" type="button">
                List
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 md:gap-8">
            <Show when={!books.loading} fallback={<div class="text-sm text-gray-500">Loading…</div>}>
              <For each={favoriteBooks()}>
                {(b) => {
                  const pill = () => statusPill(b.status)

                  return (
                    <div class="group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden">
                      <div class="relative w-full aspect-[2/3] overflow-hidden bg-gray-200">
                        <img
                          alt={`${b.title} Cover`}
                          class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          src={coverUrlFor(b.coverFileId, { width: 600, height: 900 })}
                          onError={(e) => {
                            e.currentTarget.src = '/cover-placeholder.svg'
                          }}
                        />
                        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                          <button
                            class="w-full bg-white/90 backdrop-blur text-gray-900 py-2.5 rounded-lg text-sm font-semibold hover:bg-white transition-colors shadow-lg flex items-center justify-center space-x-2"
                            type="button"
                            onClick={() => navigate(`/bookshelf/book/${b.$id}`)}
                          >
                            <span class="material-symbols-outlined text-[18px]">visibility</span>
                            <span>View Details</span>
                          </button>
                        </div>
                        <button
                          class="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-md rounded-full text-red-500 shadow-sm hover:scale-110 transition-transform z-10"
                          type="button"
                          onClick={() => {
                            void toggleFavoriteBookIdCloud(b.$id)
                              .then((ids) => setFavoriteIds(ids))
                              .catch(() => {
                                // ignore
                              })
                          }}
                        >
                          <span class="material-symbols-outlined text-[20px] fill-current">favorite</span>
                        </button>
                      </div>
                      <div class="p-5 flex flex-col flex-1">
                        <div class="flex-1">
                          <h3 class="font-bold text-gray-900 text-lg leading-tight mb-1 line-clamp-2">{b.title}</h3>
                          <p class="text-sm text-gray-500 mb-3">
                            {b.author ?? '—'} • {(typeof b.totalPages === 'number' && b.totalPages > 0) ? `${b.totalPages} pages` : '- pages'}
                          </p>
                            <Show when={(b.genre ?? '').trim()}>
                              <div class="mb-1">
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                  {(b.genre ?? '').trim()}
                                </span>
                              </div>
                            </Show>
                        </div>
                        <div class="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
                          <div class="flex items-center space-x-1">
                            <span class="material-symbols-outlined text-yellow-400 text-[18px] fill-current">star</span>
                            <span class="text-sm font-bold text-gray-900">
                              {typeof b.rating === 'number' && b.rating > 0 ? b.rating : '—'}
                            </span>
                          </div>
                          <span class={'text-xs font-medium px-2 py-1 rounded-md ' + pill().cls}>{pill().label}</span>
                        </div>
                      </div>
                    </div>
                  )
                }}
              </For>

              <div
                class="group relative bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 hover:border-gray-400 transition-colors duration-300 flex flex-col items-center justify-center text-center p-8 cursor-pointer h-full min-h-[300px]"
                onClick={() => navigate('/bookshelf')}
              >
                <div class="bg-white p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform duration-300">
                  <span class="material-symbols-outlined text-gray-400 text-3xl group-hover:text-gray-600">add</span>
                </div>
                <h3 class="font-bold text-gray-900 text-lg">Add New Favorite</h3>
                <p class="text-sm text-gray-500 mt-2 max-w-[150px]">Browse your library to add more books here.</p>
              </div>
            </Show>
          </div>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}
