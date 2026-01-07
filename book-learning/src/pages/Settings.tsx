import { createEffect, createMemo, createSignal, Show } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { useSession } from '../context/session'
import { account } from '../lib/appwrite'
import MobileBottomNav from '../components/MobileBottomNav'

export default function SettingsPage() {
  const session = useSession()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = createSignal('')
  const [email, setEmail] = createSignal('')
  const [bio, setBio] = createSignal('')

  const [emailPassword, setEmailPassword] = createSignal('')

  const [currentPassword, setCurrentPassword] = createSignal('')
  const [newPassword, setNewPassword] = createSignal('')
  const [confirmNewPassword, setConfirmNewPassword] = createSignal('')

  const [saving, setSaving] = createSignal(false)
  const [saveError, setSaveError] = createSignal<string | null>(null)
  const [saveSuccess, setSaveSuccess] = createSignal<string | null>(null)

  const [passwordBusy, setPasswordBusy] = createSignal(false)
  const [passwordError, setPasswordError] = createSignal<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = createSignal<string | null>(null)

  const [weeklyDigest, setWeeklyDigest] = createSignal(true)
  const [newFollowers, setNewFollowers] = createSignal(true)
  const [hardWordReminders, setHardWordReminders] = createSignal(false)

  const [seededUserId, setSeededUserId] = createSignal<string | null>(null)

  createEffect(() => {
    const u = session.user()
    if (!u) {
      setSeededUserId(null)
      return
    }

    const id = String(u.$id ?? '')
    if (seededUserId() === id) return

    setDisplayName(u.name ?? '')
    setEmail(u.email ?? '')
    setBio((u.prefs?.bio as string | undefined) ?? '')
    setSeededUserId(id)
  })

  const isValidEmail = (v: string) => {
    const t = v.trim()
    if (!t) return false
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)
  }

  const emailLooksValid = createMemo(() => isValidEmail(email()))

  const emailChanged = createMemo(() => {
    const u = session.user()
    if (!u) return false
    return email().trim() !== String(u.email ?? '').trim()
  })

  const saveAccount = async (e: Event) => {
    e.preventDefault()
    setSaveError(null)
    setSaveSuccess(null)

    const u = session.user()
    if (!u) {
      setSaveError('Not logged in')
      return
    }

    const nextName = displayName().trim()
    const nextEmail = email().trim()
    const nextBio = bio().trim()

    if (!nextName) {
      setSaveError('Display name is required')
      return
    }

    if (!emailLooksValid()) {
      setSaveError('Please enter a valid email address')
      return
    }

    if (emailChanged() && !emailPassword().trim()) {
      setSaveError('Current password is required to change email')
      return
    }

    setSaving(true)
    try {
      const prevName = String(u.name ?? '').trim()
      const prevEmail = String(u.email ?? '').trim()
      const prevBio = String(u.prefs?.bio ?? '').trim()

      if (nextName !== prevName) {
        await account.updateName(nextName)
      }

      if (nextBio !== prevBio) {
        await account.updatePrefs({
          ...(u.prefs ?? {}),
          bio: nextBio,
        })
      }

      if (nextEmail !== prevEmail) {
        await account.updateEmail(nextEmail, emailPassword())
      }

      await session.refresh()
      setEmailPassword('')
      setSaveSuccess('Saved')
    } catch (err: any) {
      setSaveError(err?.message ?? 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const savePassword = async (e: Event) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(null)

    if (!session.user()) {
      setPasswordError('Not logged in')
      return
    }

    const oldPw = currentPassword()
    const nextPw = newPassword()
    const nextPw2 = confirmNewPassword()

    if (!oldPw.trim()) {
      setPasswordError('Current password is required')
      return
    }

    if (!nextPw.trim()) {
      setPasswordError('New password is required')
      return
    }

    if (nextPw === oldPw) {
      setPasswordError('New password must be different from current password')
      return
    }

    if (nextPw.length < 8) {
      setPasswordError('New password must be at least 8 characters')
      return
    }

    if (nextPw !== nextPw2) {
      setPasswordError('Passwords do not match')
      return
    }

    setPasswordBusy(true)
    try {
      await account.updatePassword(nextPw, oldPw)
      setNewPassword('')
      setConfirmNewPassword('')
      setCurrentPassword('')
      setPasswordSuccess('Password updated')
      await session.refresh()
    } catch (err: any) {
      setPasswordError(err?.message ?? 'Failed to update password')
    } finally {
      setPasswordBusy(false)
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
                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
              </svg>
              <span class="font-medium text-sm">Dashboard</span>
            </a>
            <a class="flex items-center space-x-3 text-textPrimary hover:text-black group" href="/history">
              <svg class="w-5 h-5 text-gray-500 group-hover:text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
              </svg>
              <span class="font-medium text-sm">Log History</span>
            </a>
            <a class="flex items-center space-x-3 text-textPrimary hover:text-black group" href="/reading-logs">
              <svg class="w-5 h-5 text-gray-500 group-hover:text-black" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                />
              </svg>
              <span class="font-medium text-sm">Reading Logs</span>
            </a>
            <a class="flex items-center space-x-3 text-textPrimary hover:text-black group" href="/bookshelf">
              <svg class="w-5 h-5 text-gray-500 group-hover:text-black" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V4zm10.586-1.586A2 2 0 0114 2h2a2 2 0 012 2v12a2 2 0 01-2 2h-2a2 2 0 01-2-2V4a2 2 0 01.586-1.414zM8 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H9a1 1 0 01-1-1V4z" />
              </svg>
              <span class="font-medium text-sm">My Bookshelf</span>
            </a>
            <a class="flex items-center space-x-3 text-textPrimary hover:text-black group" href="/favorites">
              <svg class="w-5 h-5 text-gray-500 group-hover:text-black" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span class="font-medium text-sm">Favorites</span>
            </a>
          </nav>
        </div>

        <div class="p-6 border-t border-gray-100">
          <nav class="space-y-4">
            <a class="flex items-center space-x-3 text-black font-semibold group" href="/settings">
              <svg class="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                />
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

      <main class="flex-1 overflow-y-auto" data-purpose="settings-content">
        <header class="flex justify-between items-center py-4 px-4 md:py-6 md:px-10 sticky top-0 z-40 border-b border-gray-100 bg-mainBg bg-opacity-90 backdrop-blur-md backdrop-saturate-150">
          <div>
            <h2 class="text-xl md:text-2xl font-bold text-gray-900">Settings</h2>
          </div>
          <div class="flex items-center space-x-4">
            <button class="text-gray-500 hover:text-gray-700 focus:outline-none relative" type="button">
              <span class="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
              <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a6 6 0 00-9 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
            </button>
            <div
              class="flex items-center space-x-2 cursor-pointer"
              onClick={() => navigate('/library')}
              role="button"
              tabindex={0}
            >
              <img
                alt="User Avatar"
                class="w-8 h-8 rounded-full border border-gray-200"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBZvMnkgfCsX_LLkueIXM4CE4MGOX7i0r1lxiCxcXzWqt39ccMaggbOYYfDZNo_PrkY3EnQYTBflOOiKNHgxFHC8VN1R4_8yub006WBIVftZsO77bve_f-HDq4OPBmSZz2w7dp8NsYFKzPkzY5BUa3SdJgk8eRsL9SGurloixLZ856wIvaWFCLn76_aQJ7BLIeOWPmMGfaHfoSVXT-_mpWCKgPAgPQmrOh9sH0GII0HKd1MvShyXuEzw7hr3abL3UQLVxOgObXKMCs"
              />
              <span class="text-sm font-medium text-gray-900">
                <Show when={session.user()} fallback={<>Alex</>}>
                  {session.user()?.name ?? session.user()?.email}
                </Show>
              </span>
              <svg class="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                />
              </svg>
            </div>
          </div>
        </header>

        <div class="px-4 py-6 pb-24 md:px-10 md:py-8 md:pb-10 space-y-8 max-w-5xl mx-auto">
          <div class="md:hidden">
            <div class="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <button
                type="button"
                class="w-full px-6 py-4 text-left flex items-center justify-between"
                onClick={async () => {
                  await session.logout()
                  navigate('/login')
                }}
              >
                <div>
                  <div class="text-sm font-semibold text-gray-900">Log out</div>
                  <div class="text-xs text-gray-500">Sign out of this device</div>
                </div>
                <span class="text-xs font-semibold text-gray-400">→</span>
              </button>
            </div>
          </div>

          <section>
            <div class="mb-4">
              <h3 class="text-lg font-semibold text-gray-900">Notifications</h3>
              <p class="text-sm text-gray-500">Choose what you want to be notified about.</p>
            </div>

            <div class="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <div class="p-6 space-y-6">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="text-sm font-medium text-gray-900">Weekly Digest</h4>
                    <p class="text-sm text-gray-500">Receive a weekly summary of your reading progress.</p>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input
                      class="sr-only peer"
                      type="checkbox"
                      checked={weeklyDigest()}
                      onChange={(e) => setWeeklyDigest(e.currentTarget.checked)}
                    />
                    <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black" />
                  </label>
                </div>

                <hr class="border-gray-100" />

                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="text-sm font-medium text-gray-900">New Followers</h4>
                    <p class="text-sm text-gray-500">Get notified when someone follows your reading journey.</p>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input
                      class="sr-only peer"
                      type="checkbox"
                      checked={newFollowers()}
                      onChange={(e) => setNewFollowers(e.currentTarget.checked)}
                    />
                    <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black" />
                  </label>
                </div>

                <hr class="border-gray-100" />

                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="text-sm font-medium text-gray-900">Hard Word Reminders</h4>
                    <p class="text-sm text-gray-500">Daily reminders to review your hard words list.</p>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input
                      class="sr-only peer"
                      type="checkbox"
                      checked={hardWordReminders()}
                      onChange={(e) => setHardWordReminders(e.currentTarget.checked)}
                    />
                    <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black" />
                  </label>
                </div>

                <div class="pt-2">
                  <p class="text-xs text-gray-500">
                    UI only for now — notifications will be implemented later.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div class="mb-4">
              <h3 class="text-lg font-semibold text-gray-900">Account Management</h3>
              <p class="text-sm text-gray-500">Update your personal information and profile settings.</p>
            </div>
            <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-8">
              <form onSubmit={saveAccount}>
                <Show when={saveError()}>
                  <div class="mb-6 bg-white border border-red-100 text-red-700 rounded-xl p-4 text-sm shadow-sm">
                    {saveError()}
                  </div>
                </Show>
                <Show when={saveSuccess()}>
                  <div class="mb-6 bg-white border border-green-100 text-green-700 rounded-xl p-4 text-sm shadow-sm">
                    {saveSuccess()}
                  </div>
                </Show>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div class="flex flex-col space-y-2">
                    <label class="text-sm font-medium text-gray-700" for="full-name">Display Name</label>
                    <input
                      id="full-name"
                      class="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-2.5"
                      type="text"
                      value={displayName()}
                      onInput={(e) => setDisplayName(e.currentTarget.value)}
                      required
                    />
                  </div>
                  <div class="flex flex-col space-y-2">
                    <label class="text-sm font-medium text-gray-700" for="email">Email Address</label>
                    <input
                      id="email"
                      class="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-2.5"
                      type="email"
                      value={email()}
                      onInput={(e) => setEmail(e.currentTarget.value)}
                      required
                    />
                    <Show when={email().trim() && !emailLooksValid()}>
                      <p class="text-xs text-red-600">Please enter a valid email address.</p>
                    </Show>
                  </div>

                  <div class="flex flex-col space-y-2 md:col-span-2">
                    <label class="text-sm font-medium text-gray-700" for="email-password">
                      Current Password
                      <span class="text-gray-400"> (required to change email)</span>
                    </label>
                    <input
                      id="email-password"
                      class="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-2.5"
                      type="password"
                      placeholder="••••••••"
                      value={emailPassword()}
                      onInput={(e) => setEmailPassword(e.currentTarget.value)}
                    />
                  </div>

                  <div class="flex flex-col space-y-2 md:col-span-2">
                    <label class="text-sm font-medium text-gray-700" for="bio">Bio</label>
                    <textarea
                      id="bio"
                      class="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-2.5"
                      rows={3}
                      placeholder="Tell us a little about your reading habits..."
                      value={bio()}
                      onInput={(e) => setBio(e.currentTarget.value)}
                    />
                  </div>
                </div>
                <div class="mt-6 flex justify-end">
                  <button
                    class="bg-black text-white hover:bg-gray-800 font-medium rounded-lg text-sm px-6 py-2.5 focus:outline-none focus:ring-4 focus:ring-gray-300 disabled:opacity-60"
                    type="submit"
                    disabled={saving()}
                  >
                    {saving() ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </section>

          <section>
            <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-8">
              <div class="mb-6 pb-6 border-b border-gray-100">
                <h4 class="text-base font-semibold text-gray-900">Security</h4>
                <p class="text-sm text-gray-500 mt-1">Manage your password and account security.</p>
              </div>

              <form class="space-y-6" onSubmit={savePassword}>
                <Show when={passwordError()}>
                  <div class="bg-white border border-red-100 text-red-700 rounded-xl p-4 text-sm shadow-sm">
                    {passwordError()}
                  </div>
                </Show>
                <Show when={passwordSuccess()}>
                  <div class="bg-white border border-green-100 text-green-700 rounded-xl p-4 text-sm shadow-sm">
                    {passwordSuccess()}
                  </div>
                </Show>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div class="flex flex-col space-y-2 md:col-span-2">
                    <label class="text-sm font-medium text-gray-700" for="pw-old">
                      Current Password
                      <span class="text-gray-400"> (required)</span>
                    </label>
                    <input
                      id="pw-old"
                      class="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-2.5"
                      type="password"
                      placeholder="••••••••"
                      value={currentPassword()}
                      onInput={(e) => setCurrentPassword(e.currentTarget.value)}
                      required
                    />
                  </div>

                  <div class="flex flex-col space-y-2">
                    <label class="text-sm font-medium text-gray-700" for="new-password">New Password</label>
                    <input
                      id="new-password"
                      class="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-2.5"
                      type="password"
                      placeholder="••••••••"
                      value={newPassword()}
                      onInput={(e) => setNewPassword(e.currentTarget.value)}
                    />
                    <Show when={newPassword().trim() && newPassword().length < 8}>
                      <p class="text-xs text-red-600">Minimum 8 characters.</p>
                    </Show>
                  </div>

                  <div class="flex flex-col space-y-2">
                    <label class="text-sm font-medium text-gray-700" for="confirm-password">Confirm New Password</label>
                    <input
                      id="confirm-password"
                      class="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-2.5"
                      type="password"
                      placeholder="••••••••"
                      value={confirmNewPassword()}
                      onInput={(e) => setConfirmNewPassword(e.currentTarget.value)}
                    />
                    <Show when={confirmNewPassword().trim() && confirmNewPassword() !== newPassword()}>
                      <p class="text-xs text-red-600">Passwords do not match.</p>
                    </Show>
                  </div>
                </div>

                <div class="flex justify-end">
                  <button
                    class="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-sm px-5 py-2.5 disabled:opacity-60"
                    type="submit"
                    disabled={passwordBusy()}
                  >
                    {passwordBusy() ? 'Updating…' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          </section>

          <section class="pt-2">
            <div class="bg-red-50 rounded-lg border border-red-100 p-6">
              <h4 class="text-base font-semibold text-red-800">Danger Zone</h4>
              <p class="text-sm text-red-600 mt-1 mb-4">
                UI placeholder. Account deletion is not implemented.
              </p>
              <button
                class="text-white bg-red-600 hover:bg-red-700 focus:ring-4 focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 focus:outline-none disabled:opacity-60"
                type="button"
                disabled
                title="Not implemented yet"
              >
                Delete Account
              </button>
            </div>
          </section>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}
