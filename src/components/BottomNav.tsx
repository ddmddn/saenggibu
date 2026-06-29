import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/',        label: '홈',   icon: '🏠' },
  { to: '/routine', label: '루틴', icon: '✅' },
  { to: '/record',  label: '기록', icon: '📝' },
  { to: '/relation',label: '관계', icon: '👤' },
  { to: '/report',  label: '생기부',icon: '📋' },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {tabs.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}
        >
          <span className="tab-icon">{icon}</span>
          <span className="tab-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
