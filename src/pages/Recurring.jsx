import React, { useState, useEffect } from 'react'
import CurrencyInput from '../components/CurrencyInput'
import { useAuth } from '../contexts/AuthContext'
import { getRecurring, addRecurring, updateRecurring, deleteRecurring, getCategories, generateMonthExpenses } from '../lib/supabase'
import { formatCurrency, getMonthName, getCurrentMonthYear, getTodayISO } from '../lib/formatters'
import Toast from '../components/Toast'

const PAYMENT_OPTIONS = [
  { value: 'pix',    label: '💸 Pix' },
  { value: 'debit',  label: '💳 Débito' },
  { value: 'credit', label: '💳 Crédito' },
  { value: 'cash',   label: '💵 Dinheiro' },
]

const PAYMENT_LABELS = { pix: 'Pix', debit: 'Débito', credit: 'Crédito', cash: 'Dinheiro' }

const EMPTY_FORM = {
  description: '',
  amount: '',
  day_of_month: '5',
  category_id: '',
  payment_type: 'credit',
  shared: true,
}

export default function Recurring() {
  const { familyId, user } = useAuth()
  const { month: curMonth, year: curYear } = getCurrentMonthYear()

  const [recurring, setRecurring]   = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [toast, setToast]           = useState(null)
  const [showModal, setShowModal]   = useState(false)
  const [editingId, setEditingId]   = useState(null)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [saving, setSaving]         = useState(false)
  const [genMonth, setGenMonth]     = useState(curMonth)
  const [genYear, setGenYear]       = useState(curYear)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (familyId) { loadRecurring(); loadCategories() }
  }, [familyId])

  async function loadRecurring() {
    setLoading(true)
    try   { setRecurring(await getRecurring(familyId)) }
    catch { setToast({ type: 'error', text: 'Erro ao carregar recorrentes.' }) }
    finally { setLoading(false) }
  }

  async function loadCategories() {
    try { setCategories(await getCategories(familyId)) } catch {}
  }

  function openAdd() { setForm(EMPTY_FORM); setEditingId(null); setShowModal(true) }
  function openEdit(r) {
    setForm({ description: r.description, amount: String(r.amount), day_of_month: String(r.day_of_month), category_id: r.category_id || '', payment_type: r.payment_type || 'debit', shared: r.shared })
    setEditingId(r.id)
    setShowModal(true)
  }
  function closeModal() { setShowModal(false); setEditingId(null); setForm(EMPTY_FORM) }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { family_id: familyId, description: form.description.trim(), amount: parseFloat(form.amount), day_of_month: parseInt(form.day_of_month), category_id: form.category_id || null, payment_type: form.payment_type, shared: form.shared }
      if (editingId) {
        const updated = await updateRecurring(editingId, payload)
        setRecurring(prev => prev.map(r => r.id === editingId ? updated : r))
        setToast({ type: 'success', text: 'Recorrente atualizada!' })
      } else {
        const created = await addRecurring({ ...payload, active: true })
        setRecurring(prev => [...prev, created].sort((a, b) => a.day_of_month - b.day_of_month))
        setToast({ type: 'success', text: 'Despesa recorrente criada!' })
      }
      closeModal()
    } catch { setToast({ type: 'error', text: 'Erro ao salvar.' }) }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!window.confirm('Excluir esta despesa recorrente?')) return
    try {
      await deleteRecurring(id)
      setRecurring(prev => prev.filter(r => r.id !== id))
      setToast({ type: 'success', text: 'Excluída.' })
    } catch { setToast({ type: 'error', text: 'Erro ao excluir.' }) }
  }

  async function handleToggleActive(r) {
    try {
      const updated = await updateRecurring(r.id, { active: !r.active })
      setRecurring(prev => prev.map(x => x.id === r.id ? updated : x))
      setToast({ type: 'success', text: updated.active ? 'Reativada.' : 'Pausada.' })
    } catch { setToast({ type: 'error', text: 'Erro ao atualizar.' }) }
  }

  async function handleGenerate() {
    setGenerating(true)
    try {
      const created = await generateMonthExpenses(familyId, user.id, genMonth, genYear)
      setToast({ type: 'success', text: `${created.length} lançamento(s) gerado(s) para ${getMonthName(genMonth)} ${genYear}!` })
    } catch (err) { setToast({ type: 'error', text: err.message || 'Erro ao gerar.' }) }
    finally { setGenerating(false) }
  }

  const active   = recurring.filter(r => r.active)
  const paused   = recurring.filter(r => !r.active)
  const totalActive = active.reduce((s, r) => s + Number(r.amount), 0)
  const years = [curYear - 1, curYear, curYear + 1]

  return (
    <div>
      <Toast message={toast} onClose={() => setToast(null)} />

      <div className="page-header">
        <div>
          <h1 className="page-title">Recorrentes</h1>
          <p className="page-subtitle">Despesas fixas mensais e assinaturas</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openAdd}>+ Nova Recorrente</button>
        </div>
      </div>

      {loading ? (
        <div className="loading-page"><div className="loading-spinner" /><span>Carregando...</span></div>
      ) : (
        <>
          {/* Summary + Generate */}
          <div className="grid-cols-2" style={{ marginBottom: '1.5rem', alignItems: 'flex-start' }}>
            <div className="stat-card">
              <span className="stat-label">🔁 Total Mensal Fixo</span>
              <span className="stat-value" style={{ color: 'var(--primary-color)' }}>{formatCurrency(totalActive)}</span>
              <span className="stat-sub">{active.length} {active.length === 1 ? 'despesa ativa' : 'despesas ativas'}</span>
            </div>

            <div className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>⚡ Gerar lançamentos do mês</div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <select className="form-control" style={{ width: 'auto' }} value={genMonth} onChange={e => setGenMonth(Number(e.target.value))}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{getMonthName(m)}</option>)}
                </select>
                <select className="form-control" style={{ width: 'auto' }} value={genYear} onChange={e => setGenYear(Number(e.target.value))}>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <button className="btn btn-primary" onClick={handleGenerate} disabled={generating || active.length === 0}>
                  {generating ? 'Gerando...' : `⚡ Gerar ${active.length} lançamento(s)`}
                </button>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                Cria automaticamente os lançamentos na página de Despesas.
              </p>
            </div>
          </div>

          {/* Active list */}
          {active.length === 0 && paused.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">🔁</div>
                <p className="empty-state-text">Nenhuma despesa recorrente cadastrada ainda.</p>
                <button className="btn btn-primary" onClick={openAdd}>+ Adicionar primeira recorrente</button>
              </div>
            </div>
          ) : (
            <>
              {active.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                    Ativas ({active.length})
                  </h2>
                  <div className="table-wrapper">
                    <table className="mobile-cards">
                      <thead>
                        <tr>
                          <th>Descrição</th>
                          <th>Dia</th>
                          <th>Categoria</th>
                          <th>Forma</th>
                          <th>Tipo</th>
                          <th style={{ textAlign: 'right' }}>Valor</th>
                          <th style={{ textAlign: 'center' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {active.map(r => (
                          <tr key={r.id}>
                            <td className="td-desc"><strong>{r.description}</strong></td>
                            <td data-label="Dia"><span className="badge badge-primary">Dia {r.day_of_month}</span></td>
                            <td data-label="Categoria">{r.hh_categories?.icon || '💰'} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{r.hh_categories?.name || '—'}</span></td>
                            <td data-label="Forma"><span className="badge badge-neutral">{PAYMENT_LABELS[r.payment_type] || r.payment_type}</span></td>
                            <td data-label="Tipo">{r.shared ? <span className="badge badge-primary">Compartilhado</span> : <span className="badge badge-neutral">Pessoal</span>}</td>
                            <td className="td-amount" data-label="Valor" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--primary-color)' }}>{formatCurrency(r.amount)}</td>
                            <td className="td-actions" style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                              <button className="btn-icon" style={{ marginRight: '0.25rem' }} onClick={() => openEdit(r)} title="Editar">✏️</button>
                              <button className="btn-icon" style={{ marginRight: '0.25rem', color: 'var(--warning-color)' }} onClick={() => handleToggleActive(r)} title="Pausar">⏸️</button>
                              <button className="btn-icon" style={{ color: 'var(--error-color)', borderColor: 'var(--error-light)' }} onClick={() => handleDelete(r.id)} title="Excluir">🗑️</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="table-footer">
                      <span>{active.length} recorrente(s) ativa(s)</span>
                      <span>Total mensal: <strong>{formatCurrency(totalActive)}</strong></span>
                    </div>
                  </div>
                </div>
              )}

              {paused.length > 0 && (
                <div>
                  <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                    Pausadas ({paused.length})
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {paused.map(r => (
                      <div key={r.id} className="card card-body" style={{ display: 'flex', alignItems: 'center', gap: '1rem', opacity: 0.6 }}>
                        <span style={{ fontSize: '1.25rem' }}>{r.hh_categories?.icon || '💰'}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{r.description}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dia {r.day_of_month} · {formatCurrency(r.amount)}</div>
                        </div>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleToggleActive(r)}>▶️ Reativar</button>
                        <button className="btn-icon" style={{ color: 'var(--error-color)', borderColor: 'var(--error-light)' }} onClick={() => handleDelete(r.id)}>🗑️</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{editingId ? '✏️ Editar Recorrente' : '🔁 Nova Recorrente'}</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Descrição *</label>
                  <input className="form-control" type="text" required autoFocus placeholder="Ex: Aluguel, Netflix, Academia..."
                    value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Valor (R$) *</label>
                    <CurrencyInput className="form-control" required
                      value={form.amount} onChange={v => setForm(f => ({ ...f, amount: v }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Dia do vencimento *</label>
                    <input className="form-control" type="number" min="1" max="31" required
                      value={form.day_of_month} onChange={e => setForm(f => ({ ...f, day_of_month: e.target.value }))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Categoria</label>
                    <select className="form-control" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                      <option value="">— Sem categoria —</option>
                      {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Forma de Pagamento</label>
                    <select className="form-control" value={form.payment_type} onChange={e => setForm(f => ({ ...f, payment_type: e.target.value }))}>
                      {PAYMENT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-check">
                    <input type="checkbox" checked={form.shared} onChange={e => setForm(f => ({ ...f, shared: e.target.checked }))} />
                    Despesa compartilhada (do casal)
                  </label>
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
