import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getAllCategories, addCategory, updateCategory } from '../lib/supabase'
import Toast from '../components/Toast'

const PRESET_ICONS = ['🏠','🛒','🚗','🍔','💊','🎓','🎬','👗','💡','🐾','📱','✈️','💰','🏋️','🎵','🍷','💇','🛠️','📚','🎮','🐶','👶','💍','🏖️','🎁']
const PRESET_COLORS = ['#0f766e','#0d9488','#0891b2','#ea580c','#dc2626','#7c3aed','#db2777','#c026d3','#ca8a04','#65a30d','#2563eb','#0369a1','#475569','#059669','#d97706']

const EMPTY_FORM = { name: '', icon: '💰', color: '#0f766e' }

export default function Categories() {
  const { familyId } = useAuth()
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [toast, setToast]           = useState(null)
  const [showModal, setShowModal]   = useState(false)
  const [editingId, setEditingId]   = useState(null)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [saving, setSaving]         = useState(false)

  useEffect(() => {
    if (familyId) loadCategories()
  }, [familyId])

  async function loadCategories() {
    setLoading(true)
    try {
      const data = await getAllCategories(familyId)
      setCategories(data)
    } catch { setToast({ type: 'error', text: 'Erro ao carregar categorias.' }) }
    finally  { setLoading(false) }
  }

  function openAdd() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowModal(true)
  }

  function openEdit(cat) {
    setForm({ name: cat.name, icon: cat.icon, color: cat.color })
    setEditingId(cat.id)
    setShowModal(true)
  }

  function closeModal() { setShowModal(false); setEditingId(null); setForm(EMPTY_FORM) }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingId) {
        const updated = await updateCategory(editingId, { name: form.name, icon: form.icon, color: form.color })
        setCategories(prev => prev.map(c => c.id === editingId ? updated : c))
        setToast({ type: 'success', text: 'Categoria atualizada!' })
      } else {
        const created = await addCategory({ family_id: familyId, name: form.name, icon: form.icon, color: form.color })
        setCategories(prev => [...prev, created].sort((a,b) => a.name.localeCompare(b.name)))
        setToast({ type: 'success', text: 'Categoria criada!' })
      }
      closeModal()
    } catch { setToast({ type: 'error', text: 'Erro ao salvar categoria.' }) }
    finally  { setSaving(false) }
  }

  async function handleToggleActive(cat) {
    try {
      const updated = await updateCategory(cat.id, { active: !cat.active })
      setCategories(prev => prev.map(c => c.id === cat.id ? updated : c))
      setToast({ type: 'success', text: updated.active ? 'Categoria reativada.' : 'Categoria arquivada.' })
    } catch { setToast({ type: 'error', text: 'Erro ao atualizar categoria.' }) }
  }

  const active   = categories.filter(c => c.active)
  const archived = categories.filter(c => !c.active)

  return (
    <div>
      <Toast message={toast} onClose={() => setToast(null)} />

      <div className="page-header">
        <div>
          <h1 className="page-title">Categorias</h1>
          <p className="page-subtitle">Gerencie as categorias de gastos</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openAdd}>+ Nova Categoria</button>
        </div>
      </div>

      {loading ? (
        <div className="loading-page"><div className="loading-spinner" /><span>Carregando...</span></div>
      ) : (
        <>
          {/* Active */}
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
              Ativas ({active.length})
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
              {active.map(cat => (
                <div key={cat.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <span style={{ fontSize: '1.75rem', lineHeight: 1 }}>{cat.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color, display: 'inline-block' }} />
                        {cat.is_default && <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>Padrão</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.25rem' }}>
                    <button className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => openEdit(cat)}>✏️ Editar</button>
                    <button className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center', color: 'var(--text-muted)' }} onClick={() => handleToggleActive(cat)}>📦 Arquivar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Archived */}
          {archived.length > 0 && (
            <div>
              <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                Arquivadas ({archived.length})
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
                {archived.map(cat => (
                  <div key={cat.id} className="card" style={{ padding: '1rem', opacity: 0.6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '1.5rem' }}>{cat.icon}</span>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{cat.name}</span>
                    </div>
                    <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => handleToggleActive(cat)}>♻️ Reativar</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{editingId ? '✏️ Editar Categoria' : '🏷️ Nova Categoria'}</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nome *</label>
                  <input className="form-control" type="text" required autoFocus placeholder="Ex: Academia, Farmácia..."
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>

                <div className="form-group">
                  <label className="form-label">Ícone</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <input className="form-control" style={{ width: '80px', textAlign: 'center', fontSize: '1.25rem' }}
                      value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} maxLength={4} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ou escolha abaixo:</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                    {PRESET_ICONS.map(ic => (
                      <button key={ic} type="button" onClick={() => setForm(f => ({ ...f, icon: ic }))}
                        style={{ fontSize: '1.25rem', padding: '0.3rem', border: `2px solid ${form.icon === ic ? 'var(--primary-color)' : 'transparent'}`, borderRadius: '6px', background: form.icon === ic ? 'var(--primary-light)' : 'transparent', cursor: 'pointer' }}>
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Cor</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', alignItems: 'center' }}>
                    {PRESET_COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                        style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: `3px solid ${form.color === c ? 'var(--text-primary)' : 'transparent'}`, cursor: 'pointer' }} />
                    ))}
                    <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                      style={{ width: 28, height: 28, border: 'none', padding: 0, cursor: 'pointer', borderRadius: '50%' }} title="Cor personalizada" />
                  </div>
                </div>

                {/* Preview */}
                <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'var(--border-light)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>{form.icon}</span>
                  <span style={{ fontWeight: 600 }}>{form.name || 'Prévia'}</span>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: form.color, marginLeft: 'auto' }} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Salvando...' : editingId ? '💾 Salvar' : '+ Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
