import { Navigate, Route, Router } from '@solidjs/router'
import type { ParentComponent } from 'solid-js'
import { Show } from 'solid-js'
import DashboardShell from './components/DashboardShell'
import { SessionProvider, useSession } from './context/session'
import BookDetailPage from './pages/BookDetail'
import BookshelfPage from './pages/Bookshelf'
import CreateBookPage from './pages/CreateBook'
import CreateHistoryLogPage from './pages/CreateHistoryLog'
import CreateReadingLogPage from './pages/CreateReadingLog'
import EditBookPage from './pages/EditBook'
import FavoritesPage from './pages/Favorites'
import LibraryPage from './pages/Library'
import LogHistoryPage from './pages/LogHistory'
import LoginPage from './pages/Login'
import ReadingLogsPage from './pages/ReadingLogs'
import SettingsPage from './pages/Settings'
import VerifyEmailPage from './pages/VerifyEmail.tsx'
import VerifyRequiredPage from './pages/VerifyRequired.tsx'

const RequireAuth: ParentComponent = (props) => {
  const session = useSession()

  return (
    <Show
      when={!session.loading()}
      fallback={<p class="text-sm text-gray-500 px-6 py-4">Loading session…</p>}
    >
      <Show when={session.user()} fallback={<Navigate href="/login" />}>
        {props.children}
      </Show>
    </Show>
  )
}

const RequireVerified: ParentComponent = (props) => {
  const session = useSession()

  return (
    <RequireAuth>
      <Show when={session.user()?.emailVerification} fallback={<Navigate href="/verify-required" />}>
        {props.children}
      </Show>
    </RequireAuth>
  )
}

function HomeRedirect() {
  const session = useSession()
  return (
    <Show
      when={!session.loading()}
      fallback={<p class="text-sm text-gray-500 px-6 py-4">Loading…</p>}
    >
      <Navigate href={session.user() ? '/library' : '/login'} />
    </Show>
  )
}

export default function App() {
  return (
    <SessionProvider>
      <Router>
        <Route path="/" component={HomeRedirect} />
        <Route path="/login" component={LoginPage} />

        <Route path="/verify-email" component={VerifyEmailPage} />
        <Route
          path="/verify-required"
          component={() => (
            <RequireAuth>
              <VerifyRequiredPage />
            </RequireAuth>
          )}
        />

        <Route
          path="/library"
          component={() => (
            <RequireVerified>
              <DashboardShell>
                <LibraryPage />
              </DashboardShell>
            </RequireVerified>
          )}
        />
        <Route
          path="/book/:id"
          component={() => (
            <RequireVerified>
              <DashboardShell>
                <BookDetailPage />
              </DashboardShell>
            </RequireVerified>
          )}
        />

        <Route
          path="/bookshelf/book/:id"
          component={() => (
            <RequireVerified>
              <DashboardShell>
                <BookDetailPage />
              </DashboardShell>
            </RequireVerified>
          )}
        />

        <Route
          path="/history"
          component={() => (
            <RequireVerified>
              <LogHistoryPage />
            </RequireVerified>
          )}
        />
        <Route
          path="/reading-logs"
          component={() => (
            <RequireVerified>
              <ReadingLogsPage />
            </RequireVerified>
          )}
        />

        <Route
          path="/bookshelf"
          component={() => (
            <RequireVerified>
              <BookshelfPage />
            </RequireVerified>
          )}
        />

        <Route
          path="/bookshelf/create"
          component={() => (
            <RequireVerified>
              <CreateBookPage />
            </RequireVerified>
          )}
        />

        <Route
          path="/bookshelf/book/:id/create/readinglog"
          component={() => (
            <RequireVerified>
              <CreateReadingLogPage />
            </RequireVerified>
          )}
        />
        <Route
          path="/bookshelf/book/:id/create/historylog"
          component={() => (
            <RequireVerified>
              <CreateHistoryLogPage />
            </RequireVerified>
          )}
        />

        <Route
          path="/bookshelf/book/:id/edit"
          component={() => (
            <RequireVerified>
              <EditBookPage />
            </RequireVerified>
          )}
        />
        <Route
          path="/favorites"
          component={() => (
            <RequireVerified>
              <FavoritesPage />
            </RequireVerified>
          )}
        />

        <Route
          path="/settings"
          component={() => (
            <RequireVerified>
              <SettingsPage />
            </RequireVerified>
          )}
        />

        <Route path="*404" component={() => <Navigate href="/" />} />
      </Router>
    </SessionProvider>
  )
}
