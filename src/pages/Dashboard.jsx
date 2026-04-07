import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getPersonalDashboard, getFamilyMembers } from '../lib/supabase'
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

function CategoryBars({ breakdown, total, emptyText, month, year }) {
  if (breakdown.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📊</div>
        <p className="empty-state-text">{emptyText || 'Nenhum gasto neste período.'}</p>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
      {breakdown.map((cat, i) => {
        const pct = total > 0 ? (cat.total / total) * 100 : 0
        const linkTo = `/expenses?category=${cat.id}&month=${month}&year=${year}`
        return (
          <Link key={cat.id || cat.name} to={linkTo} style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
              <span>{cat.icon} {cat.name}</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(cat.total)}</span>
            </div>
            <div style={{ height: '6px', borderRadius: '100px', background: 'var(--border-light)', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${pct}%`,
                background: cat.color || CHART_COLORS[i % CHART_COLORS.length],
                borderRadius: '100px',
                transition: 'width 0.4s ease',
              }} />
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
              {pct.toFixed(1)}%
            </div>
          </Link>
        )
      })}
    </div>
  )
}

function RecentList({ expenses, emptyText }) {
  if (expenses.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">💸</div>
        <p className="empty-state-text">{emptyText || 'Nenhum lançamento.'}</p>
      </div>
    )
  }
  return (
    <div>
      {expenses.map(expense => (
        <div key={expense.id} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border-light)', gap: '0.75rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            <span style={{ fontSize: '1.25rem', width: '2rem', textAlign: 'center', flexShrink: 0 }}>
              {expense.hh_categories?.icon || '💰'}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 500, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
              <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>Casal</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { familyId, displayName, user } = useAuth()
  const { month: curMonth, year: curYear } = getCurrentMonthYear()

  const [month, setMonth]       = useState(curMonth)
  const [year, setYear]         = useState(curYear)
  const [viewAs, setViewAs]     = useState(null) // user_id to view as
  const [members, setMembers]   = useState([])
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  // Load family members once
  useEffect(() => {
    if (!familyId) return
    getFamilyMembers(familyId).then(mems => {
      setMembers(mems)
      if (!viewAs && user) setViewAs(user.id)
    }).catch(() => {})
  }, [familyId])

  // Set viewAs to current user when user loads
  useEffect(() => {
    if (user && !viewAs) setViewAs(user.id)
  }, [user])

  useEffect(() => {
    if (!familyId || !viewAs) return
    loadData()
  }, [familyId, month, year, viewAs])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const result = await getPersonalDashboard(familyId, month, year, viewAs)
      setData(result)
    } catch {
      setError('Erro ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }

  const years = [curYear - 1, curYear, curYear + 1]
  const viewingName = members.find(m => m.user_id === viewAs)?.display_name || displayName || ''
  const isMe = viewAs === user?.id

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{displayName ? getGreeting(displayName) : 'Dashboard'}</h1>
          <p className="page-subtitle">
            {isMe ? 'Visão dos seus gastos' : `Visualizando como ${viewingName}`} · {getMonthName(month)} {year}
          </p>
        </div>
        <div className="page-actions">
          {/* View As selector */}
          {members.length > 1 && (
            <select
              className="form-control"
              style={{ width: 'auto', fontWeight: 600 }}
              value={viewAs || ''}
              onChange={e => setViewAs(e.target.value)}
            >
              {members.map(m => (
                <option key={m.user_id} value={m.user_id}>
                  👁️ {m.display_name}{m.user_id === user?.id ? ' (eu)' : ''}
                </option>
              ))}
            </select>
          )}
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
            🔄
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
            <div className="stat-card" style={{ borderLeft: '4px solid var(--primary-color)' }}>
              <span className="stat-label">🧑 Gastos Pessoais</span>
              <span className="stat-value">{formatCurrency(data.personalTotal)}</span>
              <span className="stat-sub">{data.personalCount} {data.personalCount === 1 ? 'lançamento' : 'lançamentos'}</span>
            </div>

            <div className="stat-card" style={{ borderLeft: '4px solid var(--accent-color)' }}>
              <span className="stat-label">💑 Gastos do Casal</span>
              <span className="stat-value">{formatCurrency(data.coupleTotal)}</span>
              <span className="stat-sub">
                {isMe ? 'Eu paguei' : `${viewingName} pagou`}: {formatCurrency(data.paidByMeTotal)} ({data.paidByMeCount})
              </span>
            </div>

            <div className="stat-card primary">
              <span className="stat-label">💸 Total Desembolsado</span>
              <span className="stat-value">{formatCurrency(data.grandTotal)}</span>
              <span className="stat-sub">Pessoal + pago do casal</span>
            </div>
          </div>

          {/* Personal Section */}
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🧑 Gastos Pessoais {!isMe && <span style={{ fontWeight: 400, fontSize: '0.85rem', color: 'var(--text-muted)' }}>de {viewingName}</span>}
          </h2>
          <div className="grid-cols-2" style={{ alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div className="card">
              <div className="card-header"><span className="card-title">Categorias (Pessoal)</span></div>
              <div className="card-body">
                <CategoryBars breakdown={data.personalBreakdown} total={data.personalTotal} emptyText="Nenhum gasto pessoal." month={month} year={year} />
              </div>
            </div>
            <div className="card">
              <div className="card-header">
                <span className="card-title">Últimos Pessoais</span>
                <Link to="/expenses" className="btn btn-ghost btn-sm">Ver todos</Link>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <RecentList expenses={data.personalRecent} emptyText="Nenhum gasto pessoal." />
                {data.personalRecent.length > 0 && (
                  <div style={{ padding: '0.75rem 1.25rem', textAlign: 'center' }}>
                    <Link to="/expenses" className="btn btn-ghost btn-sm">Ver todos →</Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Couple Section */}
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            💑 Gastos do Casal
          </h2>
          <div className="grid-cols-2" style={{ alignItems: 'flex-start' }}>
            <div className="card">
              <div className="card-header"><span className="card-title">Categorias (Casal)</span></div>
              <div className="card-body">
                <CategoryBars breakdown={data.coupleBreakdown} total={data.coupleTotal} emptyText="Nenhum gasto compartilhado." month={month} year={year} />
              </div>
            </div>
            <div className="card">
              <div className="card-header">
                <span className="card-title">Últimos do Casal</span>
                <Link to="/expenses" className="btn btn-ghost btn-sm">Ver todos</Link>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <RecentList expenses={data.coupleRecent} emptyText="Nenhum gasto compartilhado." />
                {data.coupleRecent.length > 0 && (
                  <div style={{ padding: '0.75rem 1.25rem', textAlign: 'center' }}>
                    <Link to="/expenses" className="btn btn-ghost btn-sm">Ver todos →</Link>
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
