import { createSignal, Show } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { appwriteConfig, databases, ID, Permission, Role, storage } from '../lib/appwrite'
import { useSession } from '../context/session'
import MobileBottomNav from '../components/MobileBottomNav'

function toIsoDateOrUndefined(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const d = new Date(trimmed)
  if (Number.isNaN(d.getTime())) return undefined
  return d.toISOString()
}

export default function CreateBookPage() {
  const session = useSession()
  const navigate = useNavigate()

  const [title, setTitle] = createSignal('')
  const [author, setAuthor] = createSignal('')
  const [genre, setGenre] = createSignal('')
  const [status, setStatus] = createSignal<'to-read' | 'reading' | 'done'>('reading')

  const [coverFile, setCoverFile] = createSignal<File | null>(null)
  const [coverPreviewUrl, setCoverPreviewUrl] = createSignal<string | null>(null)

  const [publishedDate, setPublishedDate] = createSignal('')
  const [isbn, setIsbn] = createSignal('')
  const [boughtDate, setBoughtDate] = createSignal('')
  const [language, setLanguage] = createSignal('')
  const [totalPages, setTotalPages] = createSignal('')
  const [startPage, setStartPage] = createSignal('')

  const [busy, setBusy] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)

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
      if (!userId) throw new Error('Not logged in')

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

      const toIntOrUndefined = (v: string) => {
        const t = v.trim()
        if (!t) return undefined
        const n = Number(t)
        return Number.isFinite(n) ? Math.trunc(n) : undefined
      }

      await databases.createDocument(
        databaseId,
        booksCollectionId,
        ID.unique(),
        {
          title: title().trim(),
          author: author().trim() || undefined,
          genre: genre().trim() || undefined,
          status: status(),
          userId,

          coverFileId,
          publishedDate: toIsoDateOrUndefined(publishedDate()),
          isbn: isbn().trim() || undefined,
          boughtDate: toIsoDateOrUndefined(boughtDate()),
          language: language().trim() || undefined,
          totalPages: toIntOrUndefined(totalPages()),
          startPage: toIntOrUndefined(startPage()),
        },
        [
          Permission.read(Role.user(userId)),
          Permission.update(Role.user(userId)),
          Permission.delete(Role.user(userId)),
        ]
      )

      navigate('/bookshelf')
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create book')
    } finally {
      setBusy(false)
    }
  }

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
            <h2 class="text-xl md:text-2xl font-bold text-gray-900">Add Book</h2>
            <p class="text-sm text-gray-500 mt-1">Create a new book in your bookshelf.</p>
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

        <div class="px-4 pb-24 pt-6 md:px-10 md:pb-10 md:pt-8">
          <div class="max-w-3xl">
            <Show when={error()}>
              <div class="mb-6 bg-white border border-red-100 text-red-700 rounded-xl p-4 text-sm shadow-sm">
                {error()}
              </div>
            </Show>

            <form class="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6" onSubmit={submit}>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-2">Book Title</label>
                  <input
                    class="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-2.5 placeholder-gray-400"
                    placeholder="Book Title"
                    type="text"
                    value={title()}
                    onInput={(e) => setTitle(e.currentTarget.value)}
                    required
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
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Author</label>
                  <input
                    class="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-2.5 placeholder-gray-400"
                    placeholder="Author"
                    type="text"
                    value={author()}
                    onInput={(e) => setAuthor(e.currentTarget.value)}
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Cover (Upload)</label>
                  <input
                    class="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-900 hover:file:bg-gray-200"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.currentTarget.files?.[0] ?? null
                      onPickCover(file)
                    }}
                  />
                  <Show when={coverPreviewUrl()}>
                    <div class="mt-3 flex items-center gap-4">
                      <img
                        alt="Cover Preview"
                        class="h-24 w-16 object-cover rounded shadow-sm border border-gray-200"
                        src={coverPreviewUrl() ?? ''}
                      />
                    </div>
                  </Show>
                </div>
              </div>

              <details class="bg-gray-50 border border-gray-200 rounded-xl p-4">
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
                      type="text"
                      placeholder="ISBN"
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
                      type="text"
                      placeholder="e.g. English"
                      value={language()}
                      onInput={(e) => setLanguage(e.currentTarget.value)}
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Total pages</label>
                    <input
                      class="bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-2.5"
                      inputmode="numeric"
                      type="text"
                      placeholder="Total pages"
                      value={totalPages()}
                      onInput={(e) => setTotalPages(e.currentTarget.value)}
                    />
                    <p class="text-xs text-gray-500 mt-1">If not provided, it shows "-" everywhere.</p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Start page (no prologue)</label>
                    <input
                      class="bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-2.5"
                      inputmode="numeric"
                      type="text"
                      placeholder="Start page"
                      value={startPage()}
                      onInput={(e) => setStartPage(e.currentTarget.value)}
                    />
                  </div>
                </div>
              </details>

              <div class="flex items-center justify-end gap-3">
                <button
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                  type="button"
                  onClick={() => navigate('/bookshelf')}
                >
                  Cancel
                </button>
                <button
                  class="bg-black hover:bg-gray-800 text-white font-medium rounded-lg text-sm px-6 py-2.5 flex items-center gap-2 disabled:opacity-60"
                  type="submit"
                  disabled={busy()}
                >
                  <span class="material-symbols-outlined text-[18px]">add</span>
                  <span>{busy() ? 'Creating…' : 'Create Book'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}
