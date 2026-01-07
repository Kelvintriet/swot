import { createEffect, createSignal, Show } from 'solid-js'
import { useNavigate, useSearchParams } from '@solidjs/router'
import { account } from '../lib/appwrite'
import { useSession } from '../context/session'

export default function VerifyEmailPage() {
  const session = useSession()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [busy, setBusy] = createSignal(true)
  const [error, setError] = createSignal<string | null>(null)
  const [success, setSuccess] = createSignal<string | null>(null)

  createEffect(() => {
    const userId = String(params.userId ?? '')
    const secret = String(params.secret ?? '')

    const run = async () => {
      setBusy(true)
      setError(null)
      setSuccess(null)

      if (!userId || !secret) {
        setError('Invalid verification link. Please request a new one.')
        setBusy(false)
        return
      }

      try {
        await account.updateVerification(userId, secret)
        await session.refresh()
        setSuccess('Email verified. You can continue.')
        navigate('/library', { replace: true })
      } catch (err: any) {
        setError(err?.message ?? 'Failed to verify email')
      } finally {
        setBusy(false)
      }
    }

    void run()
  })

  return (
    <div class="min-h-screen flex items-center justify-center px-6 py-12 bg-mainBg">
      <div class="w-full max-w-xl bg-white rounded-lg shadow-sm p-8 border border-gray-100">
        <h1 class="text-2xl font-bold text-gray-900">Verify Email</h1>
        <p class="text-sm text-gray-500 mt-1">We’re confirming your email address…</p>

        <Show when={busy()}>
          <p class="text-sm text-gray-500 mt-6">Verifying…</p>
        </Show>

        <Show when={error()}>
          <div class="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error()}</div>
        </Show>

        <Show when={success()}>
          <div class="mt-6 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {success()}
          </div>
        </Show>

        <div class="mt-6 flex gap-3">
          <button
            type="button"
            class="bg-black hover:bg-gray-800 text-white font-medium rounded-lg text-sm px-5 py-2.5 focus:outline-none focus:ring-4 focus:ring-gray-300"
            onClick={() => navigate('/library', { replace: true })}
          >
            Go to Dashboard
          </button>
          <button
            type="button"
            class="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-sm px-5 py-2.5"
            onClick={() => navigate('/login', { replace: true })}
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  )
}
