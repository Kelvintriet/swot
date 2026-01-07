import { createEffect, createSignal, Show } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { useSession } from '../context/session'

export default function LoginPage() {
  const session = useSession()
  const navigate = useNavigate()

  const [mode, setMode] = createSignal<'login' | 'signup'>('login')
  const [name, setName] = createSignal('')
  const [email, setEmail] = createSignal('')
  const [password, setPassword] = createSignal('')
  const [confirmPassword, setConfirmPassword] = createSignal('')
  const [acceptTerms, setAcceptTerms] = createSignal(false)
  const [busy, setBusy] = createSignal(false)
  const [formError, setFormError] = createSignal<string | null>(null)

  createEffect(() => {
    if (!session.loading() && session.user()) {
      navigate('/library', { replace: true })
    }
  })

  const submit = async (e: Event) => {
    e.preventDefault()
    setFormError(null)
    setBusy(true)

    try {
      if (mode() === 'login') {
        await session.login(email().trim(), password())
      } else {
        const pw = password()
        if (pw.length < 8) {
          setFormError('Password must be at least 8 characters')
          return
        }
        if (confirmPassword() !== pw) {
          setFormError('Passwords do not match')
          return
        }
        if (!acceptTerms()) {
          setFormError('You must agree to the Terms and Conditions')
          return
        }

        await session.signup(email().trim(), pw, name().trim() || undefined)
      }
      // If the account is not verified, routing guard will redirect to /verify-required.
      navigate('/library', { replace: true })
    } catch (err: any) {
      setFormError(err?.message ?? 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div class="bg-mainBg font-sans text-textPrimary min-h-screen flex flex-col overflow-hidden">
      <nav class="w-full bg-white border-b border-gray-200 py-4 px-6 md:px-12 flex justify-between items-center flex-shrink-0 z-20">
        <div class="flex items-center space-x-2">
          <svg class="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
          </svg>
          <span class="font-bold text-lg tracking-tight">Book Tracker</span>
        </div>

        <div class="text-sm">
          {mode() === 'signup' ? (
            <>
              Already have an account?{' '}
              <button
                type="button"
                class="font-semibold text-black hover:underline"
                onClick={() => setMode('login')}
              >
                Log in
              </button>
            </>
          ) : (
            <>
              New here?{' '}
              <button
                type="button"
                class="font-semibold text-black hover:underline"
                onClick={() => setMode('signup')}
              >
                Create an account
              </button>
            </>
          )}
        </div>
      </nav>

      <main class="flex-1 flex items-center justify-center p-6 md:p-12 overflow-y-auto">
        <div class="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-100 p-8 md:p-10">
          <div class="mb-8 text-center">
            <h1 class="text-2xl font-bold text-gray-900 mb-2">
              {mode() === 'signup' ? 'Create your account' : 'Welcome back'}
            </h1>
            <p class="text-gray-500 text-sm">
              {mode() === 'signup'
                ? 'Start tracking your reading journey today.'
                : 'Sign in to continue your reading journey.'}
            </p>
          </div>

          <Show when={session.loading()}>
            <p class="text-sm text-gray-500 mb-4">Checking session…</p>
          </Show>

          <Show when={formError() || session.error()}>
            <div class="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {formError() || session.error()}
            </div>
          </Show>

          <form class="space-y-5" onSubmit={submit}>
            <Show when={mode() === 'signup'}>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1" for="name">
                  Full Name
                </label>
                <input
                  id="name"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-2.5 placeholder-gray-400 transition-colors"
                  placeholder="e.g. Alex Reader"
                  value={name()}
                  onInput={(e) => setName(e.currentTarget.value)}
                  autocomplete="name"
                />
              </div>
            </Show>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1" for="email">
                Email Address
              </label>
              <input
                id="email"
                class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-2.5 placeholder-gray-400 transition-colors"
                type="email"
                placeholder="name@company.com"
                value={email()}
                onInput={(e) => setEmail(e.currentTarget.value)}
                required
                autocomplete="email"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1" for="password">
                Password
              </label>
              <input
                id="password"
                class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-2.5 placeholder-gray-400 transition-colors"
                type="password"
                placeholder="••••••••"
                value={password()}
                onInput={(e) => setPassword(e.currentTarget.value)}
                required
                autocomplete={mode() === 'login' ? 'current-password' : 'new-password'}
              />
              <Show when={mode() === 'signup'}>
                <p class="mt-1 text-xs text-gray-500">Must be at least 8 characters.</p>
              </Show>
            </div>

            <Show when={mode() === 'signup'}>
              <>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1" for="confirm-password">
                    Confirm Password
                  </label>
                  <input
                    id="confirm-password"
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-2.5 placeholder-gray-400 transition-colors"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword()}
                    onInput={(e) => setConfirmPassword(e.currentTarget.value)}
                    required
                    autocomplete="new-password"
                  />
                </div>

                <div class="flex items-start">
                  <div class="flex items-center h-5">
                    <input
                      id="terms"
                      class="w-4 h-4 border border-gray-300 rounded bg-gray-50 focus:ring-3 focus:ring-black/20 text-black"
                      type="checkbox"
                      checked={acceptTerms()}
                      onChange={(e) => setAcceptTerms(e.currentTarget.checked)}
                      required
                    />
                  </div>
                  <label class="ml-2 text-sm font-medium text-gray-900" for="terms">
                    I agree with the{' '}
                    <a class="text-black hover:underline font-semibold" href="#" onClick={(e) => e.preventDefault()}>
                      Terms and Conditions
                    </a>
                  </label>
                </div>
              </>
            </Show>

            <button
              class="w-full text-white bg-black hover:bg-gray-800 focus:ring-4 focus:outline-none focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-3 text-center transition-colors shadow-sm disabled:opacity-60"
              type="submit"
              disabled={busy() || session.loading()}
            >
              {busy()
                ? 'Please wait…'
                : mode() === 'signup'
                  ? 'Create Account'
                  : 'Log in'}
            </button>

            <div class="relative flex py-2 items-center">
              <div class="flex-grow border-t border-gray-200" />
              <span class="flex-shrink-0 mx-4 text-gray-400 text-xs">
                {mode() === 'signup' ? 'or register with' : 'or sign in with'}
              </span>
              <div class="flex-grow border-t border-gray-200" />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <button
                class="w-full flex items-center justify-center bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-lg text-sm px-5 py-2.5 text-center transition-colors shadow-sm"
                type="button"
                title="OAuth not implemented yet"
              >
                <svg aria-hidden="true" class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 18 19" xmlns="http://www.w3.org/2000/svg">
                  <path
                    clip-rule="evenodd"
                    d="M8.842 18.083a8.8 8.8 0 0 1-8.65-8.948 8.841 8.841 0 0 1 8.8-8.652h.153a8.464 8.464 0 0 1 5.7 2.257l-2.193 2.038A5.27 5.27 0 0 0 9.09 3.4a5.882 5.882 0 0 0-.2 11.76h.124a5.091 5.091 0 0 0 5.248-4.057L14.3 11H9V8h8.34c.066.543.095 1.09.088 1.636-.086 5.053-3.463 8.449-8.4 8.449l-.186-.002Z"
                    fill-rule="evenodd"
                  />
                </svg>
                Google
              </button>
              <button
                class="w-full flex items-center justify-center bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-lg text-sm px-5 py-2.5 text-center transition-colors shadow-sm"
                type="button"
                title="OAuth not implemented yet"
              >
                <svg aria-hidden="true" class="w-4 h-4 mr-2 text-black" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path
                    clip-rule="evenodd"
                    d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
                    fill-rule="evenodd"
                  />
                </svg>
                GitHub
              </button>
            </div>
          </form>
        </div>

        <div class="fixed bottom-0 right-0 -z-10 opacity-5 pointer-events-none">
          <svg class="h-96 w-96 text-black" fill="currentColor" viewBox="0 0 100 100">
            <circle cx="100" cy="100" r="80" />
          </svg>
        </div>
        <div class="fixed top-20 left-10 -z-10 opacity-5 pointer-events-none">
          <svg class="h-64 w-64 text-black" fill="currentColor" viewBox="0 0 100 100">
            <rect height="80" rx="10" transform="rotate(15)" width="80" x="0" y="0" />
          </svg>
        </div>
      </main>

      <footer class="py-6 text-center text-sm text-gray-500">
        © 2026 Book Tracker App. All rights reserved.
      </footer>
    </div>
  )
}
