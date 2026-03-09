import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading, familyId, familyError } = useAuth()

  if (loading) return (
    <div className="loading-page">
      <div className="loading-spinner" />
      <span>Conectando...</span>
    </div>
  )

  if (!user) return <Navigate to="/login" replace />

  if (familyError || (!familyId && !loading)) return (
    <div className="loading-page" style={{ flexDirection: 'column', gap: '1rem', padding: '2rem', textAlign: 'center' }}>
      <span style={{ fontSize: '2rem' }}>⚠️</span>
      <p style={{ color: 'var(--error-color)', fontWeight: 600 }}>Erro ao carregar dados da família</p>
      {familyError && (
        <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--border-light)', padding: '0.5rem 1rem', borderRadius: '6px', maxWidth: '480px', wordBreak: 'break-all' }}>
          {familyError}
        </code>
      )}
      <button className="btn btn-primary" onClick={() => window.location.reload()}>
        🔄 Tentar novamente
      </button>
    </div>
  )

  return children
}
