import { createResource, createSignal, Show } from 'solid-js'
import { useNavigate, useParams } from '@solidjs/router'
import type { Models } from 'appwrite'
import { appwriteConfig, databases, ID, Permission, Role } from '../lib/appwrite'
import { useSession } from '../context/session'
import { toLocalDateTimeInputValue } from '../lib/dates'

type BookDoc = Models.Document & {
  title: string
  author?: string
}

type LogDoc = Models.Document & {
  userId: string
  bookId: string
  date: string
  note?: string
}

async function getBook(id: string) {
  const { databaseId, booksCollectionId } = appwriteConfig
  if (!databaseId || !booksCollectionId) {
    throw new Error('Missing Appwrite env vars (see .env.example)')
  }
  return databases.getDocument<BookDoc>(databaseId, booksCollectionId, id)
}

export default function CreateHistoryLogPage() {
  const session = useSession()
  const params = useParams()
  const navigate = useNavigate()

  const bookId = () => params.id

  const [book] = createResource(() => bookId(), async (id) => (id ? getBook(id) : undefined))

  const [logDate, setLogDate] = createSignal(toLocalDateTimeInputValue(new Date()))
  const [note, setNote] = createSignal('')

  const [busy, setBusy] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)

  const submit = async (e: Event) => {
    e.preventDefault()
    setError(null)
    setBusy(true)

    try {
      const userId = session.user()?.$id as string | undefined
      const id = bookId()
      if (!userId) throw new Error('Not logged in')
      if (!id) throw new Error('Missing book id')

      const { databaseId, logsCollectionId } = appwriteConfig
      if (!databaseId || !logsCollectionId) throw new Error('Missing logs env vars')

      await databases.createDocument<LogDoc>(
        databaseId,
        logsCollectionId,
        ID.unique(),
        {
          userId,
          bookId: id,
          date: new Date(logDate()).toISOString(),
          note: note().trim() || undefined,
        },
        [
          Permission.read(Role.user(userId)),
          Permission.update(Role.user(userId)),
          Permission.delete(Role.user(userId)),
        ]
      )

      navigate('/history')
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create history log')
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
            <h2 class="text-2xl font-bold text-gray-900">Create History Log</h2>
            <p class="text-sm text-gray-500 mt-1">
              <Show when={!book.loading} fallback={<>Loading book…</>}>
                <Show when={book()} fallback={<>Book</>}>
                  {(b) => <>{b().title}</>}
                </Show>
              </Show>
            </p>
          </div>
        </header>

        <div class="px-10 pb-10 pt-8">
          <div class="max-w-3xl">
            <Show when={error()}>
              <div class="mb-6 bg-white border border-red-100 text-red-700 rounded-xl p-4 text-sm shadow-sm">
                {error()}
              </div>
            </Show>

            <form class="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6" onSubmit={submit}>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  class="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-2.5"
                  type="datetime-local"
                  value={logDate()}
                  onInput={(e) => setLogDate(e.currentTarget.value)}
                  required
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Note</label>
                <input
                  class="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-2.5"
                  type="text"
                  placeholder="What happened?"
                  value={note()}
                  onInput={(e) => setNote(e.currentTarget.value)}
                  required
                />
              </div>

              <div class="flex items-center justify-end gap-3">
                <button
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                  type="button"
                  onClick={() => navigate('/history')}
                >
                  Cancel
                </button>
                <button
                  class="bg-black hover:bg-gray-800 text-white font-medium rounded-lg text-sm px-6 py-2.5 flex items-center gap-2 disabled:opacity-60"
                  type="submit"
                  disabled={busy()}
                >
                  <span class="material-symbols-outlined text-[18px]">add</span>
                  <span>{busy() ? 'Creating…' : 'Create Note'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
