import { A, useLocation } from '@solidjs/router'
import { Show, createEffect, createMemo, createSignal, onCleanup } from 'solid-js'

function cls(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export default function MobileBottomNav() {
  const loc = useLocation()
  const [createOpen, setCreateOpen] = createSignal(false)

  const path = createMemo(() => loc.pathname)
  const isActive = (prefix: string) =>
    createMemo(() => (prefix === '/' ? path() === '/' : path().startsWith(prefix)))

  createEffect(() => {
    path()
    loc.search
    setCreateOpen(false)
  })

  createEffect(() => {
    if (!createOpen()) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCreateOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    onCleanup(() => window.removeEventListener('keydown', onKeyDown))
  })

  const homeActive = isActive('/library')
  const booksActive = isActive('/bookshelf')
  const favActive = isActive('/favorites')
  const settingsActive = isActive('/settings')

  return (
    <nav
      class="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-gray-200 bg-mainBg/90 backdrop-blur-md backdrop-saturate-150"
      aria-label="Bottom navigation"
    >
      <Show when={createOpen()}>
        <div class="fixed inset-0 z-50 bg-black/40" onClick={() => setCreateOpen(false)} />
        <div class="fixed left-0 right-0 bottom-20 z-50 px-4">
          <div class="mx-auto max-w-md bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
            <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div class="text-sm font-semibold text-gray-900">Create</div>
              <button
                type="button"
                class="text-sm font-medium text-gray-600 hover:text-gray-900"
                onClick={() => setCreateOpen(false)}
              >
                Close
              </button>
            </div>

            <div class="p-2">
              <A
                href="/bookshelf/create"
                class="flex items-center justify-between w-full px-3 py-3 rounded-xl hover:bg-gray-50"
                onClick={() => setCreateOpen(false)}
              >
                <div>
                  <div class="text-sm font-semibold text-gray-900">Book</div>
                  <div class="text-xs text-gray-600">Add a new book to your library</div>
                </div>
                <span class="text-xs font-semibold text-gray-400">→</span>
              </A>

              <A
                href="/library?tab=logs&create=readinglog"
                class="flex items-center justify-between w-full px-3 py-3 rounded-xl hover:bg-gray-50"
                onClick={() => setCreateOpen(false)}
              >
                <div>
                  <div class="text-sm font-semibold text-gray-900">Reading log</div>
                  <div class="text-xs text-gray-600">Pick a book, then log your session</div>
                </div>
                <span class="text-xs font-semibold text-gray-400">→</span>
              </A>

              <A
                href="/library?tab=logs&create=historylog"
                class="flex items-center justify-between w-full px-3 py-3 rounded-xl hover:bg-gray-50"
                onClick={() => setCreateOpen(false)}
              >
                <div>
                  <div class="text-sm font-semibold text-gray-900">History log</div>
                  <div class="text-xs text-gray-600">Pick a book, then add a history entry</div>
                </div>
                <span class="text-xs font-semibold text-gray-400">→</span>
              </A>
            </div>
          </div>
        </div>
      </Show>

      <div class="relative max-w-md mx-auto px-4">
        <div class="h-16 flex items-center justify-between">
          <A
            href="/library"
            class={cls(
              'flex flex-col items-center justify-center gap-1 w-16',
              homeActive() ? 'text-black' : 'text-gray-500'
            )}
          >
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
            </svg>
            <span class="text-[11px] font-medium">Home</span>
          </A>

          <A
            href="/bookshelf"
            class={cls(
              'flex flex-col items-center justify-center gap-1 w-16',
              booksActive() && !path().includes('/create') ? 'text-black' : 'text-gray-500'
            )}
          >
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V4zm10.586-1.586A2 2 0 0114 2h2a2 2 0 012 2v12a2 2 0 01-2 2h-2a2 2 0 01-2-2V4a2 2 0 01.586-1.414zM8 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H9a1 1 0 01-1-1V4z" />
            </svg>
            <span class="text-[11px] font-medium">Books</span>
          </A>

          <div class="w-16 flex items-center justify-center">
            <button
              type="button"
              class={cls(
                'w-14 h-14 -mt-10 rounded-full shadow-lg flex items-center justify-center',
                'bg-black text-white ring-4 ring-mainBg',
                createOpen() ? 'opacity-100' : 'opacity-95 hover:opacity-100'
              )}
              aria-label="Create"
              aria-expanded={createOpen()}
              onClick={() => setCreateOpen(v => !v)}
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v14m7-7H5" />
              </svg>
            </button>
          </div>

          <A
            href="/favorites"
            class={cls(
              'flex flex-col items-center justify-center gap-1 w-16',
              favActive() ? 'text-black' : 'text-gray-500'
            )}
          >
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span class="text-[11px] font-medium">Favs</span>
          </A>

          <A
            href="/settings"
            class={cls(
              'flex flex-col items-center justify-center gap-1 w-16',
              settingsActive() ? 'text-black' : 'text-gray-500'
            )}
          >
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
              />
            </svg>
            <span class="text-[11px] font-medium">Settings</span>
          </A>
        </div>
      </div>
    </nav>
  )
}
