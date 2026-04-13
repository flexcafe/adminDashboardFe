import { NavLink, Outlet } from 'react-router-dom'

export function AppShell() {
  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="sidebarHeader">
          <div className="brandMark" aria-hidden="true" />
          <div className="brandText">
            <div className="brandTitle">Admin</div>
            <div className="brandSubtitle">Dashboard Template</div>
          </div>
        </div>

        <nav className="nav">
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'navItem active' : 'navItem')}>
            Dashboard
          </NavLink>
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbarTitle">Admin Dashboard</div>
          <div className="topbarRight">Template only</div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

