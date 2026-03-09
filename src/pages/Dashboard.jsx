import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getDashboardSummary, getMemberSpending } from '../lib/supabase'
import { formatCurrency, formatDate, getMonthName, getCurrentMonthYear } from '../lib/formatters'

function getGreeting(name) {
  const h = new Date().getHours()
  const salut = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
  return `${salut}, ${name}! 👋`
}

const CHART_COLORS = [
  '#0f766e','#14b8a6','#0891b2','#7c3aed','#db2777',
  '#ea580c','#ca8a04','#65a30d','#dc2626','#2563eb',
  '#c026d3','#0369a1','#475569',
]

const PAYMENT_LABELS = { pix: 'Pix', debit: 'Débito', credit: 'Crédito', cash: 'Dinheiro' }

export default function Dashboard() {
  const { familyId, displayName } = useAuth()
  const { month: curMonth, year: curYear } = getCurrentMonthYear()

  const [month, setMonth] = useState(curMonth)
  const [year, setYear]   = useState(curYear)
  const [data, setData]       = useState(null)
  const [members, setMembers]  = useState([])
  const [loading, setLoading]  = useState(true)
  const [error, setError]      = useState(null)

  useEffect(() => {
    if (!familyId) return
    loadData()
  }, [familyId, month, year])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [summary, memberSpend] = await Promise.all([
        getDashboardSummary(familyId, month, year),
        getMemberSpending(familyId, month, year),
      ])
      setData(summary)
      setMembers(memberSpend)
    } catch (err) {
      setError('Erro ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }

  const years = [curYear - 1, curYear, curYear + 1]

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{displayName ? getGreeting(displayName) : 'Dashboard'}</h1>
          <p className="page-subtitle">Visão geral dos seus gastos · {getMonthName(month)} {year}</p>
        </div>
        <div className="page-actions">
          {/* Month/Year selector */}
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
          <button className="btn btn-secondary" onClick={loadData} disabled={loading}>
            🔄 Atualizar
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <>
          <div className="grid-cols-3" style={{ marginBottom: '1.25rem' }}>
            {[0,1,2].map(i => (
              <div key={i} className="stat-card">
                <div className="skeleton" style={{ height: '0.75rem', width: '60%', marginBottom: '0.5rem' }} />
                <div className="skeleton" style={{ height: '1.75rem', width: '80%', marginBottom: '0.375rem' }} />
                <div className="skeleton" style={{ height: '0.65rem', width: '40%' }} />
              </div>
            ))}
          </div>
          <div className="grid-cols-2">
            {[0,1].map(i => (
              <div key={i} className="card">
                <div className="card-header"><div className="skeleton" style={{ height: '0.75rem', width: '40%' }} /></div>
                <div className="card-body">
                  {[0,1,2,3].map(j => (
                    <div key={j} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.875rem' }}>
                      <div className="skeleton" style={{ width: '2rem', height: '2rem', borderRadius: '50%', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div className="skeleton" style={{ height: '0.75rem', width: '70%', marginBottom: '0.375rem' }} />
                        <div className="skeleton" style={{ height: '0.6rem', width: '45%' }} />
                      </div>
                      <div className="skeleton" style={{ height: '0.75rem', width: '4rem' }} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : data && (
        <>
          {/* Summary Cards */}
          <div className="grid-cols-3" style={{ marginBottom: '1.25rem' }}>
            <div className="stat-card primary">
              <span className="stat-label">💸 Total Gasto</span>
              <span className="stat-value">{formatCurrency(data.total)}</span>
              <span className="stat-sub">{getMonthName(month)} {year}</span>
            </div>

            <div className="stat-card">
              <span className="stat-label">🧾 Lançamentos</span>
              <span className="stat-value">{data.count}</span>
              <span className="stat-sub">{data.count === 1 ? 'gasto registrado' : 'gastos registrados'}</span>
            </div>

            <div className="stat-card">
              <span className="stat-label">🏆 Maior Categoria</span>
              <span className="stat-value" style={{ fontSize: '1.25rem' }}>
                {data.topCategory ? `${data.topCategory.icon} ${data.topCategory.name}` : '—'}
              </span>
              <span className="stat-sub">
                {data.topCategory ? formatCurrency(data.topCategory.total) : 'Nenhum gasto'}
              </span>
            </div>
          </div>

          {/* Member spending */}
          {members.length > 1 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div className="grid-cols-2">
                {members.map((m, i) => (
                  <div key={m.userId} className="stat-card" style={{ borderLeft: `4px solid ${i === 0 ? 'var(--primary-color)' : 'var(--accent-color)'}` }}>
                    <span className="stat-label">👤 {m.displayName}</span>
                    <span className="stat-value" style={{ fontSize: '1.4rem' }}>{formatCurrency(m.total)}</span>
                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <span>Pessoal: {formatCurrency(m.personal)}</span>
                      <span>Pagou do casal: {formatCurrency(m.sharedPaid)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chart + Recent */}
          <div className="grid-cols-2" style={{ alignItems: 'flex-start' }}>
            {/* Category breakdown */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Gastos por Categoria</span>
              </div>
              <div className="card-body">
                {data.categoryBreakdown.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">📊</div>
                    <p className="empty-state-text">Nenhum gasto neste período.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {data.categoryBreakdown.map((cat, i) => {
                      const pct = data.total > 0 ? (cat.total / data.total) * 100 : 0
                      return (
                        <div key={cat.name}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
                            <span>{cat.icon} {cat.name}</span>
                            <span style={{ fontWeight: 600 }}>{formatCurrency(cat.total)}</span>
                          </div>
                          <div style={{
                            height: '6px', borderRadius: '100px',
                            background: 'var(--border-light)', overflow: 'hidden',
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${pct}%`,
                              background: cat.color || CHART_COLORS[i % CHART_COLORS.length],
                              borderRadius: '100px',
                              transition: 'width 0.4s ease',
                            }} />
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                            {pct.toFixed(1)}% do total
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Recent expenses */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Últimos Lançamentos</span>
                <Link to="/expenses" className="btn btn-ghost btn-sm">Ver todos</Link>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {data.recent.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">💸</div>
                    <p className="empty-state-text">Nenhum lançamento neste período.</p>
                    <Link to="/expenses" className="btn btn-primary">+ Adicionar Gasto</Link>
                  </div>
                ) : (
                  <div>
                    {data.recent.map(expense => (
                      <div key={expense.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1.25rem',
                        borderBottom: '1px solid var(--border-light)',
                        gap: '0.75rem',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                          <span style={{
                            fontSize: '1.25rem',
                            width: '2rem',
                            textAlign: 'center',
                            flex: 'shrink: 0',
                          }}>
                            {expense.hh_categories?.icon || '💰'}
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{
                              fontWeight: 500,
                              fontSize: '0.875rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {expense.description}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {formatDate(expense.date)} · {expense.hh_categories?.name}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--primary-color)' }}>
                            {formatCurrency(expense.amount)}
                          </span>
                          {expense.shared && (
                            <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>Compartilhado</span>
                          )}
                        </div>
                      </div>
                    ))}
                    <div style={{ padding: '0.75rem 1.25rem', textAlign: 'center' }}>
                      <Link to="/expenses" className="btn btn-ghost btn-sm">
                        Ver todos os lançamentos →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
