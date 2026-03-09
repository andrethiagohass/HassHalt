import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  getExpenses, addExpense, updateExpense, deleteExpense, getCategories, getFamilyMembers
} from '../lib/supabase'
import {
  formatCurrency, formatDate, getMonthName, getCurrentMonthYear, getTodayISO
} from '../lib/formatters'
import Toast from '../components/Toast'

const PAYMENT_OPTIONS = [
  { value: 'pix',    label: '💸 Pix' },
  { value: 'debit',  label: '💳 Débito' },
  { value: 'credit', label: '💳 Crédito' },
  { value: 'cash',   label: '💵 Dinheiro' },
]

const PAYMENT_BADGE = {
  pix:    { label: 'Pix',     cls: 'badge-primary' },
  debit:  { label: 'Débito',  cls: 'badge-neutral' },
  credit: { label: 'Crédito', cls: 'badge-warning' },
  cash:   { label: 'Dinheiro',cls: 'badge-neutral' },
}

const EMPTY_FORM = {
  description: '',
  amount: '',
  date: getTodayISO(),
  category_id: '',
  payment_type: 'pix',
  shared: false,
  paid_by: '',
  notes: '',
}

export default function Expenses() {
  const { familyId, user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const { month: curMonth, year: curYear } = getCurrentMonthYear()

  const [month, setMonth]         = useState(curMonth)
  const [year, setYear]           = useState(curYear)
  const [expenses, setExpenses]   = useState([])
  const [categories, setCategories] = useState([])
  const [familyMembers, setFamilyMembers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [toast, setToast]         = useState(null)

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)

  const [filterCategory, setFilterCategory] = useState('all')
  const [filterType, setFilterType]         = useState('all')
  const [filterSearch, setFilterSearch]     = useState('')

  useEffect(() => {
    if (!familyId) return
    loadCategories()
  }, [familyId])

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setSearchParams({}, { replace: true })
      openAdd()
    }
  }, [searchParams])

  useEffect(() => {
    if (!familyId) return
    loadExpenses()
  }, [familyId, month, year])

  async function loadCategories() {
    try {
      const [cats, mems] = await Promise.all([getCategories(familyId), getFamilyMembers(familyId)])
      setCategories(cats)
      setFamilyMembers(mems)
    } catch { /* silent */ }
  }

  async function loadExpenses() {
    setLoading(true)
    setError(null)
    try {
      const data = await getExpenses(familyId, month, year)
      setExpenses(data)
    } catch {
      setError('Erro ao carregar lançamentos.')
    } finally {
      setLoading(false)
    }
  }

  function openAdd() {
    setForm({ ...EMPTY_FORM, date: getTodayISO(), paid_by: user.id })
    setEditingId(null)
    setShowModal(true)
  }

  function openEdit(expense) {
    setForm({
      description:  expense.description,
      amount:       String(expense.amount),
      date:         expense.date,
      category_id:  expense.category_id || '',
      payment_type: expense.payment_type || 'pix',
      shared:       expense.shared || false,
      paid_by:      expense.paid_by || '',
      notes:        expense.notes || ''
    })
    setEditingId(expense.id)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        family_id:    familyId,
        user_id:      user.id,
        description:  form.description.trim(),
        amount:       parseFloat(form.amount),
        date:         form.date,
        category_id:  form.category_id || null,
        payment_type: form.payment_type,
        shared:       form.shared,
        paid_by:      form.shared && form.paid_by ? form.paid_by : null,
        notes:        form.notes.trim() || null,
      }

      if (editingId) {
        const updated = await updateExpense(editingId, payload)
        setExpenses(prev => prev.map(e => e.id === editingId ? updated : e))
        setToast({ type: 'success', text: 'Gasto atualizado com sucesso!' })
      } else {
        const created = await addExpense(payload)
        setExpenses(prev => [created, ...prev])
        setToast({ type: 'success', text: 'Gasto adicionado com sucesso!' })
      }
      closeModal()
    } catch {
      setToast({ type: 'error', text: 'Erro ao salvar gasto.' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Excluir este lançamento?')) return
    try {
      await deleteExpense(id)
      setExpenses(prev => prev.filter(e => e.id !== id))
      setToast({ type: 'success', text: 'Lançamento excluído.' })
    } catch {
      setToast({ type: 'error', text: 'Erro ao excluir.' })
    }
  }

  // Filtered list
  const filtered = expenses.filter(e => {
    if (filterCategory !== 'all' && e.category_id !== filterCategory) return false
    if (filterType === 'shared'   && !e.shared)  return false
    if (filterType === 'personal' && e.shared)   return false
    if (filterSearch && !e.description.toLowerCase().includes(filterSearch.toLowerCase())) return false
    return true
  })

  const totalFiltered = filtered.reduce((sum, e) => sum + Number(e.amount), 0)
  const years = [curYear - 1, curYear, curYear + 1]

  return (
    <div>
      <Toast message={toast} onClose={() => setToast(null)} />

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Lançamentos</h1>
          <p className="page-subtitle">Gerencie seus gastos mensais</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openAdd}>
            + Novo Gasto
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <input
          className="form-control"
          type="text"
          placeholder="🔍 Buscar..."
          style={{ maxWidth: '180px' }}
          value={filterSearch}
          onChange={e => setFilterSearch(e.target.value)}
        />
        <select
          className="form-control"
          style={{ width: 'auto' }}
          value={month}
          onChange={e => setMonth(Number(e.target.value))}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
            <option key={m} value={m}>{getMonthName(m)}</option>
          ))}
        </select>
        <select
          className="form-control"
          style={{ width: 'auto' }}
          value={year}
          onChange={e => setYear(Number(e.target.value))}
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          className="form-control"
          style={{ width: 'auto' }}
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
        >
          <option value="all">Todas as categorias</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
          ))}
        </select>
        <select
          className="form-control"
          style={{ width: 'auto' }}
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
        >
          <option value="all">Todos</option>
          <option value="personal">Pessoais</option>
          <option value="shared">Compartilhados</option>
        </select>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading-page">
          <div className="loading-spinner" />
          <span>Carregando lançamentos...</span>
        </div>
      ) : (
        <div>
          {/* Table */}
          {filtered.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">💸</div>
                <p className="empty-state-text">
                  {expenses.length === 0
                    ? `Nenhum gasto em ${getMonthName(month)} ${year}.`
                    : 'Nenhum resultado para os filtros aplicados.'}
                </p>
                {expenses.length === 0 && (
                  <button className="btn btn-primary" onClick={openAdd}>
                    + Adicionar primeiro gasto
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="table-wrapper">
                <table className="mobile-cards">
                  <thead>
                    <tr>
                      <th>Descrição</th>
                      <th>Data</th>
                      <th>Categoria</th>
                      <th>Forma</th>
                      <th>Tipo</th>
                      <th style={{ textAlign: 'right' }}>Valor</th>
                      <th style={{ textAlign: 'center' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(expense => {
                      const badge = PAYMENT_BADGE[expense.payment_type] || PAYMENT_BADGE.pix
                      return (
                        <tr key={expense.id}>
                          <td className="td-desc">
                            <strong>{expense.description}</strong>
                            {expense.notes && <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.4rem', fontSize: '0.8rem' }}>— {expense.notes}</span>}
                          </td>
                          <td data-label="Data" style={{ whiteSpace: 'nowrap', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                            {formatDate(expense.date)}
                          </td>
                          <td data-label="Categoria">
                            <span title={expense.hh_categories?.name}>
                              {expense.hh_categories?.icon || '💰'}{' '}
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {expense.hh_categories?.name || '—'}
                              </span>
                            </span>
                          </td>
                          <td data-label="Forma">
                            <span className={`badge ${badge.cls}`}>{badge.label}</span>
                          </td>
                          <td data-label="Tipo">
                            {expense.shared ? (
                              <span className="badge badge-primary">
                                💑 {expense.paid_by ? (familyMembers.find(m => m.user_id === expense.paid_by)?.display_name || 'Membro') : 'Casal'}
                              </span>
                            ) : (
                              <span className="badge badge-neutral">Pessoal</span>
                            )}
                          </td>
                          <td className="td-amount" data-label="Valor" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--primary-color)', whiteSpace: 'nowrap' }}>
                            {formatCurrency(expense.amount)}
                          </td>
                          <td className="td-actions" style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <button className="btn-icon" style={{ marginRight: '0.25rem' }} onClick={() => openEdit(expense)} title="Editar">✏️</button>
                            <button className="btn-icon" style={{ color: 'var(--error-color)', borderColor: 'var(--error-light)' }} onClick={() => handleDelete(expense.id)} title="Excluir">🗑️</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <div className="table-footer">
                  <span>{filtered.length} {filtered.length === 1 ? 'lançamento' : 'lançamentos'}</span>
                  <span>Total: <strong>{formatCurrency(totalFiltered)}</strong></span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">
                {editingId ? '✏️ Editar Gasto' : '➕ Novo Gasto'}
              </h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Descrição *</label>
                  <input
                    className="form-control"
                    type="text"
                    placeholder="Ex: Supermercado, Uber, Farmácia..."
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    required
                    autoFocus
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Valor (R$) *</label>
                    <input
                      className="form-control"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0,00"
                      value={form.amount}
                      onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Data *</label>
                    <input
                      className="form-control"
                      type="date"
                      value={form.date}
                      onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Categoria</label>
                    <select
                      className="form-control"
                      value={form.category_id}
                      onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                    >
                      <option value="">— Sem categoria —</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Forma de Pagamento</label>
                    <select
                      className="form-control"
                      value={form.payment_type}
                      onChange={e => setForm(f => ({ ...f, payment_type: e.target.value }))}
                    >
                      {PAYMENT_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-check">
                    <input
                      type="checkbox"
                      checked={form.shared}
                      onChange={e => setForm(f => ({ ...f, shared: e.target.checked, paid_by: '' }))}
                    />
                    Gasto compartilhado (do casal)
                  </label>
                </div>

                {form.shared && (
                  <div className="form-group">
                    <label className="form-label">💰 Quem pagou este gasto?</label>
                    <select
                      className="form-control"
                      value={form.paid_by}
                      onChange={e => setForm(f => ({ ...f, paid_by: e.target.value }))}
                      required
                    >
                      <option value="">— Selecione quem pagou —</option>
                      {familyMembers.map(m => (
                        <option key={m.user_id} value={m.user_id}>
                          {m.display_name || m.user_id.slice(0, 8)}
                        </option>
                      ))}
                    </select>
                    <span className="form-hint">Controle quem pagou as despesas do casal.</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Observações</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Detalhes opcionais..."
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Salvando...' : editingId ? '💾 Salvar' : '➕ Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
