import { Show } from 'solid-js'
import { A } from '@solidjs/router'
import { useSession } from '../context/session'

export default function Nav() {
  const session = useSession()

  return (
    <header class="nav">
      <div class="nav-left">
        <A class="brand" href="/library">
          Book Learning
        </A>
        <nav class="nav-links">
          <A href="/library" activeClass="active">
            Library
          </A>
        </nav>
      </div>

      <div class="nav-right">
        <Show when={session.user()} fallback={<A href="/login">Login</A>}>
          <span class="muted">{session.user()?.name ?? session.user()?.email}</span>
          <button class="btn" onClick={() => void session.logout()}>
            Logout
          </button>
        </Show>
      </div>
    </header>
  )
}
