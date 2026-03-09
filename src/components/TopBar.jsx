import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import '../styles/topbar.css'

export default function TopBar({ onMenuClick, onCollapseToggle, sidebarCollapsed }) {
  const { user, displayName, signOut } = useAuth()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    setDropdownOpen(false)
    await signOut()
  }

  const avatarLetter = (displayName || user?.email || 'U').charAt(0).toUpperCase()
  const userName = displayName || user?.email?.split('@')[0] || 'Usuário'
  const isDesktop = window.innerWidth > 768

  const handleMenuClick = () => {
    if (isDesktop) {
      onCollapseToggle()
    } else {
      onMenuClick()
    }
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="topbar-menu-btn" onClick={handleMenuClick} aria-label="Menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6"  x2="21" y2="6"  />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className="topbar-brand">
          <img src="/logo.svg" alt="HassHalt" className="topbar-logo" />
          <span className="topbar-brand-name">
            Hass<span>Halt</span>
          </span>
        </div>
      </div>

      <div className="topbar-right">
        <button className="topbar-quickadd" onClick={() => navigate('/expenses?new=1')} title="Novo lançamento">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Lançamento</span>
        </button>
        <div className="topbar-user" ref={dropdownRef}>
          <button
            className="topbar-user-btn"
            onClick={() => setDropdownOpen(o => !o)}
            aria-label="Conta"
          >
            <div className="topbar-avatar">{avatarLetter}</div>
            <span className="topbar-user-email">{user?.email}</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: '0.25rem' }}>▾</span>
          </button>

          {dropdownOpen && (
            <div className="topbar-dropdown">
              <div className="topbar-dropdown-header">
                <div className="topbar-dropdown-name">{userName}</div>
                <div className="topbar-dropdown-email">{user?.email}</div>
              </div>
              <button className="topbar-dropdown-item" onClick={() => { setDropdownOpen(false); navigate('/settings') }}>
                ⚙️ Configurações
              </button>
              <button className="topbar-dropdown-item danger" onClick={handleLogout}>
                🚪 Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
