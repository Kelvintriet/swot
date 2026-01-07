import {
  createContext,
  createEffect,
  createResource,
  createSignal,
  useContext,
} from 'solid-js'
import type { ParentComponent } from 'solid-js'
import { account, ID } from '../lib/appwrite'

type SessionContextValue = {
  user: () => any | null
  loading: () => boolean
  error: () => string | null
  refresh: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, name?: string) => Promise<void>
  sendVerificationEmail: () => Promise<void>
  logout: () => Promise<void>
}

const SessionContext = createContext<SessionContextValue>()

async function safeGetUser() {
  try {
    return await account.get()
  } catch {
    return null
  }
}

function isActiveSessionError(err: any) {
  const message = String(err?.message ?? '').toLowerCase()
  const type = String(err?.type ?? '').toLowerCase()
  return (
    message.includes('active session') ||
    (message.includes('session') && message.includes('active')) ||
    type.includes('user_session_already_exists')
  )
}

async function safeDeleteCurrentSession() {
  try {
    await account.deleteSession('current')
  } catch {
    // ignore
  }
}

export const SessionProvider: ParentComponent = (props) => {
  const [user, setUser] = createSignal<any | null>(null)
  const [error, setError] = createSignal<string | null>(null)

  const [initialUser, { refetch }] = createResource(safeGetUser)

  createEffect(() => {
    if (initialUser.state === 'errored') {
      setError('Failed to load session')
      return
    }
    if (initialUser.state === 'ready') {
      setUser(initialUser() ?? null)
      setError(null)
    }
  })

  const refresh = async () => {
    setError(null)
    await refetch()
  }

  const login = async (email: string, password: string) => {
    setError(null)
    try {
      await account.createEmailPasswordSession(email, password)
    } catch (err: any) {
      if (!isActiveSessionError(err)) throw err
      await safeDeleteCurrentSession()
      await account.createEmailPasswordSession(email, password)
    }
    await refresh()
  }

  const signup = async (email: string, password: string, name?: string) => {
    setError(null)
    await account.create(ID.unique(), email, password, name)
    try {
      await account.createEmailPasswordSession(email, password)
    } catch (err: any) {
      if (!isActiveSessionError(err)) throw err
      await safeDeleteCurrentSession()
      await account.createEmailPasswordSession(email, password)
    }

    try {
      const origin =
        typeof window !== 'undefined' && window.location?.origin
          ? window.location.origin
          : ''
      if (origin) {
        await account.createVerification(`${origin}/verify-email`)
      }
    } catch {
      // ignore: user can manually resend from UI
    }

    await refresh()
  }

  const sendVerificationEmail = async () => {
    const origin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : ''
    if (!origin) throw new Error('Missing app origin URL')
    await account.createVerification(`${origin}/verify-email`)
  }

  const logout = async () => {
    setError(null)
    await safeDeleteCurrentSession()
    setUser(null)
    await refresh()
  }

  const value: SessionContextValue = {
    user,
    loading: () => initialUser.loading,
    error,
    refresh,
    login,
    signup,
    sendVerificationEmail,
    logout,
  }

  return (
    <SessionContext.Provider value={value}>
      {props.children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}
