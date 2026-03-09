import React, { useState, useEffect } from 'react'
import CurrencyInput from '../components/CurrencyInput'
import { useAuth } from '../contexts/AuthContext'
import { getBudgetSummary, upsertBudget, deleteBudget } from '../lib/supabase'
import { formatCurrency, getMonthName, getCurrentMonthYear } from '../lib/formatters'
import Toast from '../components/Toast'

function ProgressBar({ spent, budget }) {
  if (!budget) return null
  const pct = Math.min((spent / budget) * 100, 100)
  const over = spent > budget
  const warn = pct >= 80

  const color = over ? 'var(--error-color)' : warn ? 'var(--warning-color)' : 'var(--success-color)'
  const bg    = over ? 'var(--error-light)'  : warn ? 'var(--warning-light)'  : 'var(--success-light)'

  return (
    <div>
      <div style={{ height: 8, borderRadius: 100, background: bg, overflow: 'hidden', marginBottom: '0.25rem' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 100, transition: 'width 0.4s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
        <span style={{ color: over ? 'var(--error-color)' : 'var(--text-muted)' }}>
          {over ? `⚠️ ${formatCurrency(spent - budget)} acima` : `${pct.toFixed(0)}% utilizado`}
        </span>
        <span style={{ color: 'var(--text-muted)' }}>
          Restante: <strong style={{ color: over ? 'var(--error-color)' : 'var(--text-primary)' }}>
            {formatCurrency(Math.max(budget - spent, 0))}
          </strong>
        </span>
      </div>
    </div>
  )
}

export default function Budgets() {
  const { familyId } = useAuth()
  const { month: curMonth, year: curYear } = getCurrentMonthYear()

  const [month, setMonth]   = useState(curMonth)
  const [year, setYear]     = useState(curYear)
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast]   = useState(null)
  const [editing, setEditing] = useState({})   // categoryId → amount string
  const [saving, setSaving]   = useState({})   // categoryId → bool

  useEffect(() => {
    if (familyId) loadData()
  }, [familyId, month, year])

  async function loadData() {
    setLoading(true)
    try {
      const summary = await getBudgetSummary(familyId, month, year)
      setData(summary)
    } catch { setToast({ type: 'error', text: 'Erro ao carregar orçamentos.' }) }
    finally  { setLoading(false) }
  }

  function startEdit(catId, currentAmount) {
    setEditing(prev => ({ ...prev, [catId]: currentAmount != null ? String(currentAmount) : '' }))
  }

  function cancelEdit(catId) {
    setEditing(prev => { const n = { ...prev }; delete n[catId]; return n })
  }

  async function saveBudget(catId) {
    const amount = parseFloat(editing[catId])
    if (!amount || amount <= 0) { setToast({ type: 'error', text: 'Valor inválido.' }); return }
    setSaving(prev => ({ ...prev, [catId]: true }))
    try {
      await upsertBudget(familyId, catId, month, year, amount)
      cancelEdit(catId)
      await loadData()
      setToast({ type: 'success', text: 'Orçamento salvo!' })
    } catch { setToast({ type: 'error', text: 'Erro ao salvar orçamento.' }) }
    finally  { setSaving(prev => ({ ...prev, [catId]: false })) }
  }

  async function handleDeleteBudget(budgetId, catId) {
    try {
      await deleteBudget(budgetId)
      cancelEdit(catId)
      await loadData()
      setToast({ type: 'success', text: 'Orçamento removido.' })
    } catch { setToast({ type: 'error', text: 'Erro ao remover orçamento.' }) }
  }

  const years = [curYear - 1, curYear, curYear + 1]
  const withBudget    = data?.rows.filter(r => r.budget) || []
  const withoutBudget = data?.rows.filter(r => !r.budget) || []

  return (
    <div>
      <Toast message={toast} onClose={() => setToast(null)} />

      <div className="page-header">
        <div>
          <h1 className="page-title">Orçamentos</h1>
          <p className="page-subtitle">Defina limites mensais por categoria</p>
        </div>
        <div className="page-actions">
          <select className="form-control" style={{ width: 'auto' }} value={month} onChange={e => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{getMonthName(m)}</option>
            ))}
          </select>
          <select className="form-control" style={{ width: 'auto' }} value={year} onChange={e => setYear(Number(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-page"><div className="loading-spinner" /><span>Carregando...</span></div>
      ) : data && (
        <>
          {/* Summary cards */}
          <div className="grid-cols-3" style={{ marginBottom: '1.5rem' }}>
            <div className="stat-card">
              <span className="stat-label">📊 Total Orçado</span>
              <span className="stat-value" style={{ color: 'var(--primary-color)' }}>{formatCurrency(data.totalBudget)}</span>
              <span className="stat-sub">{getMonthName(month)} {year}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">💸 Total Gasto</span>
              <span className="stat-value" style={{ color: data.totalSpent > data.totalBudget && data.totalBudget > 0 ? 'var(--error-color)' : 'var(--text-primary)' }}>
                {formatCurrency(data.totalSpent)}
              </span>
              <span className="stat-sub">{data.totalBudget > 0 ? `${((data.totalSpent / data.totalBudget) * 100).toFixed(0)}% do orçamento` : 'Sem orçamento definido'}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">💰 Saldo Restante</span>
              <span className="stat-value" style={{ color: (data.totalBudget - data.totalSpent) < 0 ? 'var(--error-color)' : 'var(--success-color)' }}>
                {formatCurrency(Math.max(data.totalBudget - data.totalSpent, 0))}
              </span>
              <span className="stat-sub">{withBudget.length} {withBudget.length === 1 ? 'categoria com orçamento' : 'categorias com orçamento'}</span>
            </div>
          </div>

          {/* Categories with budget */}
          {withBudget.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                Com orçamento definido
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {withBudget.map(({ category: cat, budget, spent }) => (
                  <div key={cat.id} className="card card-body">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '1.5rem' }}>{cat.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{cat.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Gasto: <strong>{formatCurrency(spent)}</strong> de {formatCurrency(budget.amount)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                        {editing[cat.id] !== undefined ? (
                          <>
                            <CurrencyInput
                              className="form-control"
                              style={{ width: '120px' }}
                              value={editing[cat.id]}
                              onChange={v => setEditing(prev => ({ ...prev, [cat.id]: v }))}
                              autoFocus
                            />
                            <button className="btn btn-primary btn-sm" onClick={() => saveBudget(cat.id)} disabled={saving[cat.id]}>
                              {saving[cat.id] ? '...' : '✓'}
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => cancelEdit(cat.id)}>✕</button>
                          </>
                        ) : (
                          <>
                            <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary-color)' }}>{formatCurrency(budget.amount)}</span>
                            <button className="btn-icon" onClick={() => startEdit(cat.id, budget.amount)} title="Editar orçamento">✏️</button>
                            <button className="btn-icon" style={{ color: 'var(--error-color)', borderColor: 'var(--error-light)' }}
                              onClick={() => handleDeleteBudget(budget.id, cat.id)} title="Remover orçamento">🗑️</button>
                          </>
                        )}
                      </div>
                    </div>
                    <ProgressBar spent={spent} budget={budget.amount} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Categories without budget */}
          {withoutBudget.length > 0 && (
            <div>
              <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                Sem orçamento — clique para definir
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                {withoutBudget.map(({ category: cat, spent }) => (
                  <div key={cat.id} className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '1.25rem' }}>{cat.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{cat.name}</div>
                        {spent > 0 && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gasto: {formatCurrency(spent)}</div>}
                      </div>
                    </div>
                    {editing[cat.id] !== undefined ? (
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <CurrencyInput
                          className="form-control"
                          placeholder="0,00"
                          value={editing[cat.id]}
                          onChange={v => setEditing(prev => ({ ...prev, [cat.id]: v }))}
                          autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') saveBudget(cat.id); if (e.key === 'Escape') cancelEdit(cat.id) }}
                        />
                        <button className="btn btn-primary btn-sm" onClick={() => saveBudget(cat.id)} disabled={saving[cat.id]}>
                          {saving[cat.id] ? '...' : '✓'}
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => cancelEdit(cat.id)}>✕</button>
                      </div>
                    ) : (
                      <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'center', borderStyle: 'dashed', borderColor: 'var(--border-color)', border: '1px dashed' }}
                        onClick={() => startEdit(cat.id, null)}>
                        + Definir limite
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
