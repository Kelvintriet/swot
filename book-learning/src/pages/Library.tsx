import { createEffect, createMemo, createResource, createSignal, For, Show } from 'solid-js'
import { useNavigate, useSearchParams } from '@solidjs/router'
import type { Models } from 'appwrite'
import { appwriteConfig, databases, Query } from '../lib/appwrite'
import { useSession } from '../context/session'
import { coverUrlFor } from '../lib/covers'
import { formatShortDate } from '../lib/dates'

type BookDoc = Models.Document & {
  title: string
  author?: string
  status?: 'to-read' | 'reading' | 'done'
  genre?: string
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

type WordDoc = Models.Document & {
  userId: string
  bookId: string
  word: string
  meaning?: string
  context?: string
  page?: number
  srsDueAt: string
}

export default function LibraryPage() {
  const session = useSession()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams<{ tab?: string, create?: string }>()

  const [createMenuOpen, setCreateMenuOpen] = createSignal(false)
  const [pickBookMode, setPickBookMode] = createSignal<'readinglog' | 'historylog' | null>(null)

  const activeTab = () => searchParams.tab ?? 'books'

  const [books] = createResource(async () => {
    const userId = session.user()?.$id
    if (!userId) return []

    const { databaseId, booksCollectionId } = appwriteConfig
    if (!databaseId || !booksCollectionId) {
      throw new Error(
        'Missing Appwrite database/collection env vars. Fill .env.local (see .env.example).'
      )
    }

    const res = await databases.listDocuments<BookDoc>(databaseId, booksCollectionId, [
      Query.equal('userId', userId),
      Query.orderDesc('$createdAt'),
      Query.limit(50),
    ])
    return res.documents
  })

  const bookTitleById = createMemo(() => {
    const map = new Map<string, string>()
    for (const b of books() ?? []) map.set(b.$id, b.title)
    return map
  })

  const [logs] = createResource(async () => {
    const userId = session.user()?.$id
    if (!userId) return []

    const { databaseId, logsCollectionId } = appwriteConfig
    if (!databaseId || !logsCollectionId) return []

    const res = await databases.listDocuments<LogDoc>(databaseId, logsCollectionId, [
      Query.equal('userId', userId),
      Query.orderDesc('date'),
      Query.limit(20),
    ])
    return res.documents
  })

  const [words] = createResource(async () => {
    const userId = session.user()?.$id
    if (!userId) return []

    const { databaseId, wordsCollectionId } = appwriteConfig
    if (!databaseId || !wordsCollectionId) return []

    const res = await databases.listDocuments<WordDoc>(databaseId, wordsCollectionId, [
      Query.equal('userId', userId),
      Query.orderAsc('srsDueAt'),
      Query.limit(20),
    ])
    return res.documents
  })

  const openBookPicker = (mode: 'readinglog' | 'historylog') => {
    setPickBookMode(mode)
    setCreateMenuOpen(false)
  }

  createEffect(() => {
    const mode = searchParams.create
    if (mode !== 'readinglog' && mode !== 'historylog') return
    openBookPicker(mode)
    setSearchParams({ create: undefined } as any)
  })

  const goCreateForBook = (bookId: string) => {
    const mode = pickBookMode()
    if (!mode) return
    setPickBookMode(null)
    navigate(`/bookshelf/book/${bookId}/create/${mode}`)
  }

  return (
    <div class="space-y-8 relative">
      <section>
        <div class="mb-4">
          <h3 class="text-2xl font-bold text-gray-900">Recent Activity &amp; History</h3>
          <p class="text-sm text-gray-500 mt-1">Your latest books, logs, and words.</p>
        </div>

        <div class="flex space-x-6 border-b border-gray-200 mb-0">
          <button
            class={`pb-3 text-sm ${activeTab() === 'books' ? 'tab-active' : 'tab-inactive'}`}
            onClick={() => setSearchParams({ tab: 'books' })}
            type="button"
          >
            Recently Added
          </button>
          <button
            class={`pb-3 text-sm ${activeTab() === 'logs' ? 'tab-active' : 'tab-inactive'}`}
            onClick={() => setSearchParams({ tab: 'logs' })}
            type="button"
          >
            Reading Logs
          </button>
          <button
            class={`pb-3 text-sm ${activeTab() === 'words' ? 'tab-active' : 'tab-inactive'}`}
            onClick={() => setSearchParams({ tab: 'words' })}
            type="button"
          >
            Hard Words
          </button>
        </div>

        <div class="bg-white rounded-b-lg rounded-tr-lg shadow-sm border border-gray-100 mt-4 overflow-hidden">
          <Show when={activeTab() === 'books'}>
            <ul class="divide-y divide-gray-100">
              <Show when={!books.loading} fallback={<li class="p-4 text-sm text-gray-500">Loading…</li>}>
                <Show
                  when={(books() ?? []).length > 0}
                  fallback={<li class="p-4 text-sm text-gray-500">No books yet.</li>}
                >
                  <For each={books() ?? []}>
                    {(b) => (
                      <li class="p-4 hover:bg-gray-50 transition duration-150 ease-in-out">
                        <button
                          type="button"
                          class="w-full flex items-start space-x-4 text-left"
                          onClick={() => navigate(`/bookshelf/book/${b.$id}`)}
                        >
                          <div class="flex-shrink-0">
                            <img
                              alt={`${b.title} cover`}
                              class="h-16 w-12 object-cover rounded border border-gray-200 bg-gray-100"
                              src={coverUrlFor(b.coverFileId, { width: 96, height: 128 })}
                              onError={(e) => {
                                e.currentTarget.src = '/cover-placeholder.svg'
                              }}
                            />
                          </div>
                          <div class="flex-1 min-w-0 py-1">
                            <p class="text-sm font-bold text-gray-900 truncate">{b.title}</p>
                            <p class="text-sm text-gray-500 truncate">
                              by {b.author ?? '—'} —{' '}
                              <span class="text-gray-400">Added {formatShortDate(b.$createdAt)}</span>
                            </p>
                            <Show when={(b.genre ?? '').trim()}>
                              <div class="mt-1">
                                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                  {(b.genre ?? '').trim()}
                                </span>
                              </div>
                            </Show>
                          </div>
                        </button>
                      </li>
                    )}
                  </For>
                </Show>
              </Show>
            </ul>
          </Show>

          <Show when={activeTab() === 'logs'}>
            <ul class="divide-y divide-gray-100">
              <Show when={!logs.loading} fallback={<li class="p-4 text-sm text-gray-500">Loading…</li>}>
                <Show
                  when={(logs() ?? []).length > 0}
                  fallback={<li class="p-4 text-sm text-gray-500">No logs yet.</li>}
                >
                  <For each={logs() ?? []}>
                    {(l) => (
                      <li class="p-4 hover:bg-gray-50 transition duration-150 ease-in-out">
                        <div class="flex items-start justify-between gap-4">
                          <div class="min-w-0">
                            <p class="text-sm font-bold text-gray-900 truncate">
                              {bookTitleById().get(l.bookId) ?? l.bookId}
                            </p>
                            <p class="text-sm text-gray-500 truncate">
                              {formatShortDate(l.date)}
                              <Show when={l.minutes != null}>
                                {' '}• {l.minutes} min
                              </Show>
                              <Show when={l.note}>
                                {' '}• <span class="text-gray-400">{l.note}</span>
                              </Show>
                            </p>
                          </div>
                          <button
                            type="button"
                            class="text-sm text-gray-500 hover:text-gray-900"
                            onClick={() => navigate(`/bookshelf/book/${l.bookId}`)}
                          >
                            Open
                          </button>
                        </div>
                      </li>
                    )}
                  </For>
                </Show>
              </Show>
            </ul>
          </Show>

          <Show when={activeTab() === 'words'}>
            <ul class="divide-y divide-gray-100">
              <Show when={!words.loading} fallback={<li class="p-4 text-sm text-gray-500">Loading…</li>}>
                <Show
                  when={(words() ?? []).length > 0}
                  fallback={<li class="p-4 text-sm text-gray-500">No hard words yet.</li>}
                >
                  <For each={words() ?? []}>
                    {(w) => (
                      <li class="p-4 hover:bg-gray-50 transition duration-150 ease-in-out">
                        <div class="flex items-start justify-between gap-4">
                          <div class="min-w-0">
                            <p class="text-sm font-bold text-gray-900 truncate">{w.word}</p>
                            <p class="text-sm text-gray-500 truncate">
                              {bookTitleById().get(w.bookId) ?? w.bookId}
                              <Show when={typeof w.page === 'number'}>
                                {' '}• <span class="text-gray-400">p. {w.page}</span>
                              </Show>
                              {' '}• <span class="text-gray-400">Due {formatShortDate(w.srsDueAt)}</span>
                              <Show when={w.meaning}>
                                {' '}• <span class="text-gray-400">{w.meaning}</span>
                              </Show>
                            </p>
                          </div>
                          <button
                            type="button"
                            class="text-sm text-gray-500 hover:text-gray-900"
                            onClick={() => navigate(`/bookshelf/book/${w.bookId}`)}
                          >
                            Open
                          </button>
                        </div>
                      </li>
                    )}
                  </For>
                </Show>
              </Show>
            </ul>
          </Show>
        </div>
      </section>

      <div class="fixed bottom-6 right-6 z-50">
        <div class="relative">
          <Show when={createMenuOpen()}>
            <div class="absolute bottom-14 right-0 w-72 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
              <button
                class="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center gap-3"
                type="button"
                onClick={() => {
                  setCreateMenuOpen(false)
                  navigate('/bookshelf/create')
                }}
              >
                <span class="material-symbols-outlined text-[18px] text-gray-700">library_add</span>
                <span class="font-medium text-gray-900">Create New Book</span>
              </button>
              <button
                class="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center gap-3"
                type="button"
                onClick={() => openBookPicker('readinglog')}
              >
                <span class="material-symbols-outlined text-[18px] text-gray-700">add_notes</span>
                <span class="font-medium text-gray-900">Create Reading Log</span>
              </button>
              <button
                class="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center gap-3"
                type="button"
                onClick={() => openBookPicker('historylog')}
              >
                <span class="material-symbols-outlined text-[18px] text-gray-700">history</span>
                <span class="font-medium text-gray-900">Create History Log</span>
              </button>
            </div>
          </Show>

          <button
            class="bg-black hover:bg-gray-800 text-white font-medium rounded-full text-sm px-5 py-3 flex items-center gap-2 shadow-lg"
            type="button"
            onClick={() => setCreateMenuOpen((v) => !v)}
          >
            <span class="material-symbols-outlined text-[18px]">add</span>
            <span>Create</span>
          </button>
        </div>
      </div>

      <Show when={pickBookMode() != null}>
        <div class="fixed inset-0 z-40">
          <div class="absolute inset-0 bg-black/30" onClick={() => setPickBookMode(null)} />
          <div class="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center p-4">
            <div class="bg-white rounded-2xl border border-gray-200 shadow-xl w-full max-w-lg overflow-hidden">
              <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p class="text-sm font-semibold text-gray-900">Pick a book</p>
                  <p class="text-xs text-gray-500">
                    {pickBookMode() === 'readinglog' ? 'Create Reading Log' : 'Create History Log'}
                  </p>
                </div>
                <button
                  class="text-gray-500 hover:text-gray-900"
                  type="button"
                  onClick={() => setPickBookMode(null)}
                >
                  <span class="material-symbols-outlined">close</span>
                </button>
              </div>

              <div class="max-h-80 overflow-y-auto">
                <Show when={!books.loading} fallback={<div class="p-4 text-sm text-gray-500">Loading…</div>}>
                  <Show
                    when={(books() ?? []).length > 0}
                    fallback={<div class="p-4 text-sm text-gray-500">No books yet.</div>}
                  >
                    <For each={books() ?? []}>
                      {(b) => (
                        <button
                          type="button"
                          class="w-full text-left px-5 py-4 hover:bg-gray-50 border-b border-gray-100"
                          onClick={() => goCreateForBook(b.$id)}
                        >
                          <div class="text-sm font-semibold text-gray-900">{b.title}</div>
                          <div class="text-xs text-gray-500">{b.author ?? '—'}</div>
                        </button>
                      )}
                    </For>
                  </Show>
                </Show>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </div>
  )
}
