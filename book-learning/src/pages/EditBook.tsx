import { createEffect, createResource, createSignal, Show } from 'solid-js'
import { useNavigate, useParams } from '@solidjs/router'
import type { Models } from 'appwrite'
import { appwriteConfig, databases, ID, Permission, Role, storage } from '../lib/appwrite'
import { useSession } from '../context/session'
import { coverUrlFor } from '../lib/covers'

type BookDoc = Models.Document & {
  title: string
  author?: string
  status?: 'to-read' | 'reading' | 'done'
  coverFileId?: string
  publishedDate?: string
  isbn?: string
  boughtDate?: string
  language?: string
  totalPages?: number
  startPage?: number
  rating?: number
  genre?: string
}

function toIsoDateOrNull(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const d = new Date(trimmed)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function toLocalDateInputValueOrEmpty(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

async function getBook(id: string) {
  const { databaseId, booksCollectionId } = appwriteConfig
  if (!databaseId || !booksCollectionId) {
    throw new Error('Missing Appwrite env vars (see .env.example)')
  }
  return databases.getDocument<BookDoc>(databaseId, booksCollectionId, id)
}

export default function EditBookPage() {
  const session = useSession()
  const params = useParams()
  const navigate = useNavigate()

  const bookId = () => params.id

  const [book, { refetch }] = createResource(() => bookId(), async (id) => (id ? getBook(id) : undefined))

  const [title, setTitle] = createSignal('')
  const [author, setAuthor] = createSignal('')
  const [status, setStatus] = createSignal<'to-read' | 'reading' | 'done'>('reading')
  const [genre, setGenre] = createSignal('')

  const [coverFile, setCoverFile] = createSignal<File | null>(null)
  const [coverPreviewUrl, setCoverPreviewUrl] = createSignal<string | null>(null)

  const [publishedDate, setPublishedDate] = createSignal('')
  const [isbn, setIsbn] = createSignal('')
  const [boughtDate, setBoughtDate] = createSignal('')
  const [language, setLanguage] = createSignal('')
  const [totalPages, setTotalPages] = createSignal('')
  const [startPage, setStartPage] = createSignal('')
  const [rating, setRating] = createSignal('0')

  const [busy, setBusy] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)

  createEffect(() => {
    const b = book()
    if (!b) return

    setTitle(b.title ?? '')
    setAuthor(b.author ?? '')
    setGenre(b.genre ?? '')
    setStatus((b.status as any) ?? 'reading')

    setPublishedDate(toLocalDateInputValueOrEmpty(b.publishedDate))
    setIsbn(b.isbn ?? '')
    setBoughtDate(toLocalDateInputValueOrEmpty(b.boughtDate))
    setLanguage(b.language ?? '')

    setTotalPages(typeof b.totalPages === 'number' ? String(b.totalPages) : '')
    setStartPage(typeof b.startPage === 'number' ? String(b.startPage) : '')
    setRating(typeof b.rating === 'number' ? String(b.rating) : '0')
  })

  const onPickCover = (file: File | null) => {
    setCoverFile(file)
    if (!file) {
      setCoverPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setCoverPreviewUrl(url)
  }

  const submit = async (e: Event) => {
    e.preventDefault()
    setError(null)
    setBusy(true)

    try {
      const userId = session.user()?.$id as string | undefined
      const id = bookId()
      if (!userId) throw new Error('Not logged in')
      if (!id) throw new Error('Missing book id')

      const { databaseId, booksCollectionId, storageBucketId } = appwriteConfig
      if (!databaseId || !booksCollectionId) throw new Error('Missing Appwrite env vars')

      let coverFileId: string | undefined
      const f = coverFile()
      if (f) {
        if (!storageBucketId) {
          throw new Error('Cover upload requires VITE_APPWRITE_STORAGE_BUCKET_ID')
        }
        const uploaded = await storage.createFile(
          storageBucketId,
          ID.unique(),
          f,
          [
            Permission.read(Role.user(userId)),
            Permission.update(Role.user(userId)),
            Permission.delete(Role.user(userId)),
          ]
        )
        coverFileId = uploaded.$id
      }

      const toIntOrNull = (v: string) => {
        const t = v.trim()
        if (!t) return null
        const n = Number(t)
        return Number.isFinite(n) ? Math.trunc(n) : null
      }

      const ratingValue = (() => {
        const t = rating().trim()
        if (!t) return 0
        const n = Number(t)
        if (!Number.isFinite(n)) return 0
        return Math.max(0, Math.min(5, Math.trunc(n)))
      })()

      const payload: Record<string, any> = {
        title: title().trim(),
        author: author().trim() || null,
        genre: genre().trim() || null,
        status: status(),

        publishedDate: toIsoDateOrNull(publishedDate()),
        isbn: isbn().trim() || null,
        boughtDate: toIsoDateOrNull(boughtDate()),
        language: language().trim() || null,
        totalPages: toIntOrNull(totalPages()),
        startPage: toIntOrNull(startPage()),
        rating: ratingValue,
      }

      if (coverFileId) payload.coverFileId = coverFileId

      await databases.updateDocument(
        databaseId,
        booksCollectionId,
        id,
        payload,
        [
          Permission.read(Role.user(userId)),
          Permission.update(Role.user(userId)),
          Permission.delete(Role.user(userId)),
        ]
      )

      await refetch()
      navigate(`/bookshelf/book/${id}`)
    } catch (err: any) {
      setError(err?.message ?? 'Failed to update book')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div class="bg-mainBg font-sans text-textPrimary h-screen flex overflow-hidden">
      <aside
        class="w-64 bg-sidebar border-r border-gray-200 flex flex-col justify-between flex-shrink-0 h-full overflow-y-auto"
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
            <a
              class="flex items-center space-x-3 text-textPrimary hover:text-black group"
              href="#"
              onClick={(e) => {
                e.preventDefault()
                void session.logout()
              }}
            >
              <svg
                class="w-5 h-5 text-gray-500 group-hover:text-black"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                />
              </svg>
              <span class="font-medium text-sm">Log out</span>
            </a>
          </nav>
        </div>
      </aside>

      <main class="flex-1 overflow-y-auto" data-purpose="dashboard-content">
        <header class="flex justify-between items-center py-6 px-10 sticky top-0 z-40 border-b border-gray-100 bg-mainBg bg-opacity-90 backdrop-blur-md backdrop-saturate-150">
          <div>
            <h2 class="text-2xl font-bold text-gray-900">Edit Book</h2>
            <p class="text-sm text-gray-500 mt-1">Update required + optional metadata.</p>
          </div>
          <div class="flex items-center gap-3">
            <button
              class="text-sm font-medium text-gray-600 hover:text-black"
              type="button"
              onClick={() => navigate(`/bookshelf/book/${bookId()}`)}
            >
              Cancel
            </button>
          </div>
        </header>

        <div class="px-10 pb-10 pt-8">
          <div class="max-w-3xl">
            <Show when={error()}>
              <div class="mb-6 bg-white border border-red-100 text-red-700 rounded-xl p-4 text-sm shadow-sm">
                {error()}
              </div>
            </Show>

            <Show when={book.error}>
              <div class="mb-6 bg-white border border-red-100 text-red-700 rounded-xl p-4 text-sm shadow-sm">
                {(book.error as any)?.message ?? 'Failed to load book'}
              </div>
            </Show>

            <Show when={book()} fallback={<div class="text-sm text-gray-500">Loading…</div>}>
              {(b) => (
                <form class="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6" onSubmit={submit}>
                  <div class="flex items-start gap-6">
                    <div class="flex-shrink-0">
                      <img
                        alt="Cover preview"
                        class="h-24 w-16 object-cover rounded shadow-sm border border-gray-200 bg-gray-100"
                        src={coverPreviewUrl() ?? coverUrlFor(b().coverFileId, { width: 96, height: 144 })}
                        onError={(e) => {
                          e.currentTarget.src = '/cover-placeholder.svg'
                        }}
                      />
                    </div>
                    <div class="flex-1">
                      <label class="block text-sm font-medium text-gray-700 mb-2">Cover image (optional)</label>
                      <input
                        class="block w-full text-sm text-gray-900 border border-gray-200 rounded-lg cursor-pointer bg-gray-50"
                        type="file"
                        accept="image/*"
                        onChange={(e) => onPickCover(e.currentTarget.files?.[0] ?? null)}
                      />
                      <p class="text-xs text-gray-500 mt-2">If you pick a new file, it will replace the current cover.</p>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Title</label>
                      <input
                        class="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-2.5"
                        value={title()}
                        onInput={(e) => setTitle(e.currentTarget.value)}
                        required
                      />
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Author</label>
                      <input
                        class="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-2.5"
                        value={author()}
                        onInput={(e) => setAuthor(e.currentTarget.value)}
                      />
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <select
                        class="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-2.5"
                        value={status()}
                        onChange={(e) => setStatus(e.currentTarget.value as any)}
                      >
                        <option value="to-read">To read</option>
                        <option value="reading">Reading</option>
                        <option value="done">Finished</option>
                      </select>
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Rating (0–5)</label>
                      <select
                        class="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-2.5"
                        value={rating()}
                        onChange={(e) => setRating(e.currentTarget.value)}
                      >
                        <option value="0">—</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                      </select>
                    </div>
                  </div>

                  <details class="bg-gray-50 border border-gray-200 rounded-xl p-4" open>
                    <summary class="cursor-pointer text-sm font-semibold text-gray-900">Optional details</summary>
                    <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Genre / Type</label>
                        <input
                          class="bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-2.5"
                          type="text"
                          placeholder="History, Business, Fiction…"
                          value={genre()}
                          onInput={(e) => setGenre(e.currentTarget.value)}
                        />
                      </div>
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Date published</label>
                        <input
                          class="bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-2.5"
                          type="date"
                          value={publishedDate()}
                          onInput={(e) => setPublishedDate(e.currentTarget.value)}
                        />
                      </div>
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">ISBN</label>
                        <input
                          class="bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-2.5"
                          value={isbn()}
                          onInput={(e) => setIsbn(e.currentTarget.value)}
                        />
                      </div>
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Date bought</label>
                        <input
                          class="bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-2.5"
                          type="date"
                          value={boughtDate()}
                          onInput={(e) => setBoughtDate(e.currentTarget.value)}
                        />
                      </div>
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Language</label>
                        <input
                          class="bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-2.5"
                          value={language()}
                          onInput={(e) => setLanguage(e.currentTarget.value)}
                        />
                      </div>
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Total pages</label>
                        <input
                          class="bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-2.5"
                          inputmode="numeric"
                          value={totalPages()}
                          onInput={(e) => setTotalPages(e.currentTarget.value)}
                        />
                      </div>
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Start page</label>
                        <input
                          class="bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-2.5"
                          inputmode="numeric"
                          value={startPage()}
                          onInput={(e) => setStartPage(e.currentTarget.value)}
                        />
                      </div>
                    </div>
                  </details>

                  <div class="flex items-center justify-end gap-3">
                    <button
                      class="bg-white hover:bg-gray-50 text-gray-900 font-medium rounded-lg text-sm px-4 py-2 border border-gray-200"
                      type="button"
                      onClick={() => navigate(`/bookshelf/book/${b().$id}`)}
                    >
                      Cancel
                    </button>
                    <button
                      class="bg-black hover:bg-gray-800 text-white font-medium rounded-lg text-sm px-4 py-2"
                      type="submit"
                      disabled={busy()}
                    >
                      {busy() ? 'Saving…' : 'Save changes'}
                    </button>
                  </div>
                </form>
              )}
            </Show>
          </div>
        </div>
      </main>
    </div>
  )
}
