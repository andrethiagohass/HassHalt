import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading, familyId, familyLoading, familyError, retryFamily } = useAuth()

  // Auth check — instant (localStorage), only blocks briefly on first load
  if (loading) return (
    <div className="loading-page">
      <div className="loading-spinner" />
      <span>Verificando sessão...</span>
    </div>
  )

  if (!user) return <Navigate to="/login" replace />

  // Family data error — show retry (don't reload page, just retry the DB query)
  if (familyError) return (
    <div className="loading-page" style={{ flexDirection: 'column', gap: '1rem', padding: '2rem', textAlign: 'center' }}>
      <span style={{ fontSize: '2rem' }}>⚠️</span>
      <p style={{ color: 'var(--error-color)', fontWeight: 600 }}>Erro ao conectar ao servidor</p>
      <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--border-light)', padding: '0.5rem 1rem', borderRadius: '6px', maxWidth: '480px', wordBreak: 'break-all' }}>
        {familyError}
      </code>
      <button className="btn btn-primary" onClick={retryFamily}>
        🔄 Tentar novamente
      </button>
    </div>
  )

  // Family still loading — DB cold start can take up to 60s on free tier
  if (familyLoading || !familyId) return (
    <div className="loading-page" style={{ flexDirection: 'column', gap: '0.75rem' }}>
      <div className="loading-spinner" />
      <span>Conectando ao servidor...</span>
      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: '260px', textAlign: 'center' }}>
        Primeira conexão do dia pode levar até 60s (servidor gratuito).
      </span>
    </div>
  )

  return children
}
