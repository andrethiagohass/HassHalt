import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const timeout = setTimeout(() => {
      setLoading(false)
      setError('Tempo esgotado (30s). Verifique sua conexão ou tente novamente.')
    }, 30000)

    try {
      const { error: signInError } = await signIn(email, password)
      clearTimeout(timeout)
      if (signInError) throw signInError
      navigate('/')
    } catch (err) {
      clearTimeout(timeout)
      console.error('Login error:', err)
      setError(err?.message || 'E-mail ou senha incorretos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f766e 0%, #0d5c56 50%, #064e3b 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        {/* Logo & Title */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="HassHalt" style={{ width: 64, height: 64, marginBottom: '1rem' }} />
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: '#0f766e',
            letterSpacing: '-0.03em',
            marginBottom: '0.25rem',
          }}>
            HassHalt
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            Controle de gastos familiar
          </p>
        </div>

        {error && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            color: '#991b1b',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            fontSize: '0.875rem',
            marginBottom: '1.25rem',
          }}>
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.85rem',
              fontWeight: 500,
              color: '#0f172a',
              marginBottom: '0.375rem',
            }}>
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="seu@email.com"
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '0.9rem',
                outline: 'none',
                transition: 'border-color 0.15s',
                boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = '#0f766e'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.85rem',
              fontWeight: 500,
              color: '#0f172a',
              marginBottom: '0.375rem',
            }}>
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '0.9rem',
                outline: 'none',
                transition: 'border-color 0.15s',
                boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = '#0f766e'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: loading ? '#94a3b8' : '#0f766e',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'background 0.15s',
            }}
          >
            {loading ? (
              <>
                <span style={{
                  width: '16px', height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                  display: 'inline-block',
                }} />
                Entrando...
              </>
            ) : '🔐 Entrar'}
          </button>
        </form>

        <p style={{
          marginTop: '1.5rem',
          textAlign: 'center',
          fontSize: '0.78rem',
          color: '#94a3b8',
        }}>
          Use as mesmas credenciais do HAsset
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
