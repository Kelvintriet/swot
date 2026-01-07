import Nav from './Nav'

import type { ParentComponent } from 'solid-js'

const Layout: ParentComponent = (props) => {
  return (
    <div class="app">
      <Nav />
      <main class="container">
        {props.children}
      </main>
    </div>
  )
}

export default Layout
