import React, { useEffect } from 'react'

const ICONS = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' }
const COLORS = {
  success: { bg: '#d1fae5', border: '#6ee7b7', text: '#065f46' },
  error:   { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b' },
  warning: { bg: '#fef3c7', border: '#fcd34d', text: '#92400e' },
  info:    { bg: '#e0f2fe', border: '#7dd3fc', text: '#0c4a6e' },
}

export default function Toast({ message, onClose, duration = 4000 }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [message, onClose, duration])

  if (!message) return null

  const type = message.type || 'info'
  const c = COLORS[type] || COLORS.info

  return (
    <div style={{
      position: 'fixed', top: '72px', right: '1.5rem', zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      padding: '0.875rem 1.25rem',
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
      borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
      maxWidth: '380px', fontSize: '0.9rem', fontWeight: 500,
      animation: 'slideInToast 0.25s ease',
    }}>
      <span>{ICONS[type]}</span>
      <span style={{ flex: 1 }}>{message.text}</span>
      <button onClick={onClose} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: '1.1rem', color: c.text, opacity: 0.6, padding: '0 0.25rem',
      }}>✕</button>
      <style>{`@keyframes slideInToast{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}`}</style>
    </div>
  )
}
