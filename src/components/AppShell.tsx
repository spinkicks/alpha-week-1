import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  { to: '/feed', label: 'For You', icon: '▶' },
  { to: '/following', label: 'Following', icon: '☆' },
  { to: '/upload', label: 'Upload', icon: '＋' },
  { to: '/search', label: 'Search', icon: '⌕' },
  { to: '/profile', label: 'Profile', icon: '☻' },
]

/** Authenticated layout: scrollable content + persistent bottom tab bar. */
export default function AppShell() {
  return (
    <div className="app-shell">
      <main className="app-main">
        <Outlet />
      </main>
      <nav className="tabbar">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) => (isActive ? 'tab active' : 'tab')}
          >
            <span className="tab-icon" aria-hidden="true">
              {tab.icon}
            </span>
            <span className="tab-label">{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
