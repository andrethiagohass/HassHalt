import React from 'react'
import { NavLink } from 'react-router-dom'
import '../styles/sidebar.css'

const NAV_MAIN = [
  { to: '/',          icon: '📊', label: 'Dashboard' },
  { to: '/expenses',  icon: '💸', label: 'Lançamentos' },
  { to: '/budgets',   icon: '📈', label: 'Orçamentos' },
  { to: '/recurring', icon: '🔁', label: 'Recorrentes' },
  { to: '/categories',icon: '🏷️', label: 'Categorias' },
  { to: '/reports',   icon: '📄', label: 'Relatórios' },
]

const COMING_SOON = []

export default function Sidebar({ isOpen, onClose, isCollapsed }) {
  return (
    <>
      {isOpen && <div className="sidebar-overlay visible" onClick={onClose} />}

      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isOpen ? 'sidebar-open' : ''}`}>
        <nav className="sidebar-nav">
          <div className="nav-section">
            {!isCollapsed && <p className="nav-section-title">Menu</p>}
            {NAV_MAIN.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <span className="nav-link-icon">{item.icon}</span>
                <span className="nav-link-text">{item.label}</span>
              </NavLink>
            ))}
          </div>

          {!isCollapsed && (
            <>
              <hr className="nav-divider" />
              <div className="nav-section">
                <p className="nav-section-title">Em breve</p>
                {COMING_SOON.map(item => (
                  <div key={item.label} className="nav-link disabled">
                    <span className="nav-link-icon">{item.icon}</span>
                    <span className="nav-link-text">{item.label}</span>
                    <span className="nav-soon-badge">Em breve</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <hr className="nav-divider" />
          <div className="nav-section">
            <NavLink
              to="/settings"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <span className="nav-link-icon">⚙️</span>
              <span className="nav-link-text">Configurações</span>
            </NavLink>
          </div>
        </nav>
      </aside>
    </>
  )
}
