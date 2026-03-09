import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getFamilyMembers, updateDisplayName, joinFamily, removeMember } from '../lib/supabase'
import Toast from '../components/Toast'

export default function Settings() {
  const { user, familyId } = useAuth()
  const [members, setMembers]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [toast, setToast]           = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [savingName, setSavingName]   = useState(false)
  const [joinCode, setJoinCode]       = useState('')
  const [joining, setJoining]         = useState(false)
  const [copied, setCopied]           = useState(false)
  const [removing, setRemoving]       = useState(null)

  useEffect(() => {
    if (familyId) loadMembers()
  }, [familyId])

  async function loadMembers() {
    setLoading(true)
    try {
      const data = await getFamilyMembers(familyId)
      setMembers(data)
      const me = data.find(m => m.user_id === user?.id)
      if (me) setDisplayName(me.display_name || '')
    } catch { setToast({ type: 'error', text: 'Erro ao carregar membros.' }) }
    finally  { setLoading(false) }
  }

  async function handleSaveName(e) {
    e.preventDefault()
    setSavingName(true)
    try {
      await updateDisplayName(user.id, familyId, displayName.trim())
      setToast({ type: 'success', text: 'Nome atualizado!' })
      loadMembers()
    } catch { setToast({ type: 'error', text: 'Erro ao salvar nome.' }) }
    finally  { setSavingName(false) }
  }

  async function handleJoin(e) {
    e.preventDefault()
    setJoining(true)
    try {
      await joinFamily(joinCode.trim(), user.id, user.email)
      setToast({ type: 'success', text: 'Você entrou na família com sucesso! Faça logout e login novamente para aplicar.' })
      setJoinCode('')
    } catch (err) {
      setToast({ type: 'error', text: err.message || 'Erro ao entrar na família.' })
    } finally { setJoining(false) }
  }

  function copyFamilyId() {
    navigator.clipboard.writeText(familyId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleRemoveMember(targetUserId, name) {
    if (!window.confirm(`Remover ${name} da família? Isso revogará o acesso dessa pessoa.`)) return
    setRemoving(targetUserId)
    try {
      await removeMember(targetUserId, familyId)
      setToast({ type: 'success', text: `${name} foi removido(a) da família.` })
      loadMembers()
    } catch { setToast({ type: 'error', text: 'Erro ao remover membro.' }) }
    finally  { setRemoving(null) }
  }

  const me      = members.find(m => m.user_id === user?.id)
  const isAdmin = me?.role === 'admin'

  return (
    <div>
      <Toast message={toast} onClose={() => setToast(null)} />

      <div className="page-header">
        <div>
          <h1 className="page-title">Configurações</h1>
          <p className="page-subtitle">Perfil, família e preferências</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '640px' }}>

        {/* Profile */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">👤 Meu Perfil</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', padding: '1rem', background: 'var(--border-light)', borderRadius: '8px' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--primary-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 700 }}>
                {user?.email?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{me?.display_name || user?.email?.split('@')[0]}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user?.email}</div>
                <span className="badge badge-primary" style={{ marginTop: '0.25rem' }}>{me?.role === 'admin' ? '👑 Admin' : '👤 Membro'}</span>
              </div>
            </div>
            <form onSubmit={handleSaveName}>
              <div className="form-group">
                <label className="form-label">Nome de exibição</label>
                <input className="form-control" type="text" placeholder="Como quer ser chamado?" value={displayName}
                  onChange={e => setDisplayName(e.target.value)} />
                <span className="form-hint">Este nome aparece nos lançamentos e relatórios do casal.</span>
              </div>
              <button type="submit" className="btn btn-primary" disabled={savingName}>
                {savingName ? 'Salvando...' : '💾 Salvar nome'}
              </button>
            </form>
          </div>
        </div>

        {/* Family */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">👥 Minha Família</span>
          </div>
          <div className="card-body">
            {/* Family ID */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Código da família</label>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Compartilhe este código com sua esposa para ela entrar na mesma família.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <code style={{ flex: 1, padding: '0.5rem 0.75rem', background: 'var(--border-light)', borderRadius: '6px', fontSize: '0.75rem', wordBreak: 'break-all', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                  {familyId}
                </code>
                <button className="btn btn-secondary" onClick={copyFamilyId} style={{ flexShrink: 0 }}>
                  {copied ? '✅ Copiado!' : '📋 Copiar'}
                </button>
              </div>
            </div>

            <hr className="divider" />

            {/* Members list */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Membros ({members.length})</label>
              {loading ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Carregando...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {members.map(m => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem', background: 'var(--border-light)', borderRadius: '8px' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: m.user_id === user?.id ? 'var(--primary-color)' : 'var(--accent-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700, flexShrink: 0 }}>
                        {(m.display_name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>
                          {m.display_name || 'Sem nome'}
                          {m.user_id === user?.id && <span style={{ marginLeft: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>(você)</span>}
                        </div>
                      </div>
                      <span className="badge badge-neutral">{m.role === 'admin' ? '👑 Admin' : 'Membro'}</span>
                      {isAdmin && m.user_id !== user?.id && (
                        <button
                          className="btn btn-secondary"
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: 'var(--error-color)', borderColor: 'var(--error-light)', flexShrink: 0 }}
                          onClick={() => handleRemoveMember(m.user_id, m.display_name || 'Membro')}
                          disabled={removing === m.user_id}
                        >
                          {removing === m.user_id ? '...' : '🗑️ Remover'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <hr className="divider" />

            {isAdmin && members.length > 1 ? (
              <div>
                <label className="form-label">👑 Convidar membro</label>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  Compartilhe o <strong>Código da família</strong> acima com a pessoa que você quer convidar.
                  Ela deve ir em <em>Configurações → Entrar com código</em> e colar o código.
                </p>
                <div style={{ padding: '0.75rem', background: 'var(--primary-light)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--primary-color)' }}>
                  ℹ️ Como admin, você controla quem entra. Para remover um membro, use o botão 🗑️ na lista acima.
                </div>
              </div>
            ) : (
              <div>
                <label className="form-label">{isAdmin ? '🚪 Entrar em uma família' : 'Entrar em outra família'}</label>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  {isAdmin
                    ? 'Você ainda está sozinho. Cole o código de outra família para se juntar a ela, ou compartilhe seu código acima para convidar alguém.'
                    : 'Peça o código da família ao admin e cole abaixo para se juntar.'}
                </p>
                <form onSubmit={handleJoin} style={{ display: 'flex', gap: '0.5rem' }}>
                  <input className="form-control" type="text" placeholder="Cole o código da família aqui..."
                    value={joinCode} onChange={e => setJoinCode(e.target.value)} required />
                  <button type="submit" className="btn btn-primary" disabled={joining || !joinCode.trim()} style={{ flexShrink: 0 }}>
                    {joining ? 'Entrando...' : '🚪 Entrar'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* App info */}
        <div className="card card-body" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>
          <strong style={{ color: 'var(--primary-color)', fontSize: '1rem' }}>HassHalt</strong> v0.1.0 — Controle de Gastos Familiar<br />
          Fase 2 · Supabase + React 18
        </div>
      </div>
    </div>
  )
}
