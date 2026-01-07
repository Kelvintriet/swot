import { createEffect, createMemo, createSignal, Show } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { useSession } from '../context/session'
import { account } from '../lib/appwrite'

export default function VerifyRequiredPage() {
  const session = useSession()
  const navigate = useNavigate()

  const [busy, setBusy] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)
  const [success, setSuccess] = createSignal<string | null>(null)

  const [editBusy, setEditBusy] = createSignal(false)
  const [editError, setEditError] = createSignal<string | null>(null)
  const [editSuccess, setEditSuccess] = createSignal<string | null>(null)
  const [newEmail, setNewEmail] = createSignal('')
  const [emailPassword, setEmailPassword] = createSignal('')

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
  const newEmailLooksValid = createMemo(() => {
    if (!newEmail().trim()) return false
    return isValidEmail(newEmail())
  })

  createEffect(() => {
    if (session.user()?.emailVerification) {
      navigate('/library', { replace: true })
    }
  })

  const resend = async () => {
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      await session.sendVerificationEmail()
      setSuccess('Verification email sent. Check your inbox.')
    } catch (err: any) {
      setError(err?.message ?? 'Failed to send verification email')
    } finally {
      setBusy(false)
    }
  }

  const checkNow = async () => {
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      await session.refresh()
      // Navigate regardless; the guard will bounce back if still not verified.
      navigate('/library', { replace: true })
    } catch (err: any) {
      setError(err?.message ?? 'Failed to refresh session')
    } finally {
      setBusy(false)
    }
  }

  const updateEmailAndResend = async (e: Event) => {
    e.preventDefault()
    setEditBusy(true)
    setEditError(null)
    setEditSuccess(null)

    const nextEmail = newEmail().trim()
    const pw = emailPassword()

    if (!nextEmail) {
      setEditError('Please enter an email')
      setEditBusy(false)
      return
    }
    if (!isValidEmail(nextEmail)) {
      setEditError('Please enter a valid email address')
      setEditBusy(false)
      return
    }
    if (!pw.trim()) {
      setEditError('Password is required to change email')
      setEditBusy(false)
      return
    }

    try {
      await account.updateEmail(nextEmail, pw)
      setEmailPassword('')
      await session.refresh()
      await session.sendVerificationEmail()
      setEditSuccess('Email updated. Verification email sent — check your inbox.')
    } catch (err: any) {
      setEditError(err?.message ?? 'Failed to update email')
    } finally {
      setEditBusy(false)
    }
  }

  return (
    <div class="min-h-screen flex items-center justify-center px-6 py-12 bg-mainBg">
      <div class="w-full max-w-xl bg-white rounded-lg shadow-sm p-8 border border-gray-100">
        <h1 class="text-2xl font-bold text-gray-900">Verify your email</h1>
        <p class="text-sm text-gray-500 mt-1">
          You need to verify your email before you can use BookTracker.
        </p>

        <div class="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          <div class="font-medium text-gray-900">Signed in as</div>
          <div class="mt-1 text-gray-700">{session.user()?.email}</div>
          <Show when={session.user() && session.user()?.emailVerification === false}>
            <div class="mt-2 text-xs text-gray-500">
              Status: <span class="font-medium text-gray-800">Not verified</span>
            </div>
          </Show>
        </div>

        <Show when={error()}>
          <div class="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error()}</div>
        </Show>
        <Show when={success()}>
          <div class="mt-6 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success()}</div>
        </Show>

        <div class="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <button
            type="button"
            class="bg-black hover:bg-gray-800 text-white font-medium rounded-lg text-sm px-5 py-2.5 focus:outline-none focus:ring-4 focus:ring-gray-300 disabled:opacity-60"
            disabled={busy()}
            onClick={() => void resend()}
          >
            {busy() ? 'Sending…' : 'Resend verification email'}
          </button>

          <div class="flex gap-3">
            <button
              type="button"
              class="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-sm px-5 py-2.5"
              disabled={busy()}
              onClick={() => void checkNow()}
            >
              I verified already
            </button>
            <button
              type="button"
              class="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-sm px-5 py-2.5"
              onClick={() => {
                void session.logout()
                navigate('/login', { replace: true })
              }}
            >
              Log out
            </button>
          </div>
        </div>

        <div class="mt-8 pt-6 border-t border-gray-100">
          <h2 class="text-base font-semibold text-gray-900">Entered the wrong email?</h2>
          <p class="text-sm text-gray-500 mt-1">
            Update your email (password required), then resend verification.
          </p>

          <form class="mt-4 space-y-4" onSubmit={updateEmailAndResend}>
            <Show when={editError()}>
              <div class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{editError()}</div>
            </Show>
            <Show when={editSuccess()}>
              <div class="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                {editSuccess()}
              </div>
            </Show>

            <div class="flex flex-col space-y-2">
              <label class="text-sm font-medium text-gray-700" for="new-email">
                New email
              </label>
              <input
                id="new-email"
                class="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-2.5"
                type="email"
                placeholder="you@example.com"
                value={newEmail()}
                onInput={(e) => setNewEmail(e.currentTarget.value)}
                required
              />
              <Show when={newEmail().trim() && !newEmailLooksValid()}>
                <p class="text-xs text-red-600">Please enter a valid email address.</p>
              </Show>
            </div>

            <div class="flex flex-col space-y-2">
              <label class="text-sm font-medium text-gray-700" for="email-password">
                Password
              </label>
              <input
                id="email-password"
                class="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-2.5"
                type="password"
                placeholder="••••••••"
                value={emailPassword()}
                onInput={(e) => setEmailPassword(e.currentTarget.value)}
                required
              />
            </div>

            <div class="flex justify-end">
              <button
                type="submit"
                class="bg-black hover:bg-gray-800 text-white font-medium rounded-lg text-sm px-5 py-2.5 focus:outline-none focus:ring-4 focus:ring-gray-300 disabled:opacity-60"
                disabled={editBusy()}
              >
                {editBusy() ? 'Updating…' : 'Update email & resend'}
              </button>
            </div>
          </form>
        </div>

        <p class="mt-6 text-xs text-gray-500">
          Tip: If you don’t see it, check Spam/Junk.
        </p>
      </div>
    </div>
  )
}
