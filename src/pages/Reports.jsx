import React, { useState, useEffect, useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, ArcElement,
  Title, Tooltip, Legend, PointElement, LineElement,
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import { useAuth } from '../contexts/AuthContext'
import { getMonthlyTrend, getCategoryComparison, getDashboardSummary, getMemberSpending } from '../lib/supabase'
import { formatCurrency, getMonthName, getCurrentMonthYear } from '../lib/formatters'

ChartJS.register(
  CategoryScale, LinearScale, BarElement, ArcElement,
  Title, Tooltip, Legend, PointElement, LineElement
)

const CHART_COLORS = [
  '#0f766e','#14b8a6','#0891b2','#7c3aed','#db2777',
  '#ea580c','#ca8a04','#65a30d','#dc2626','#2563eb','#c026d3','#0369a1','#475569',
]

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 12 } } },
    tooltip: {
      callbacks: {
        label: ctx => ` ${formatCurrency(ctx.parsed.y ?? ctx.parsed)}`,
      },
    },
  },
}

export default function Reports() {
  const { familyId } = useAuth()
  const { month: curMonth, year: curYear } = getCurrentMonthYear()

  const [month, setMonth] = useState(curMonth)
  const [year, setYear]   = useState(curYear)
  const [trend, setTrend]       = useState(null)
  const [summary, setSummary]   = useState(null)
  const [comparison, setComparison] = useState(null)
  const [coupleData, setCoupleData] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => {
    if (familyId) loadAll()
  }, [familyId, month, year])

  async function loadAll() {
    setLoading(true)
    setError(null)
    try {
      const [t, s, c, cp] = await Promise.all([
        getMonthlyTrend(familyId, 6),
        getDashboardSummary(familyId, month, year),
        getCategoryComparison(familyId, 3),
        getMemberSpending(familyId, month, year),
      ])
      setTrend(t)
      setSummary(s)
      setComparison(c)
      setCoupleData(cp)
    } catch (err) {
      setError('Erro ao carregar relatórios.')
    } finally {
      setLoading(false)
    }
  }

  const years = [curYear - 1, curYear, curYear + 1]

  // ── Bar chart: last 6 months ──────────────────────────────
  const barData = trend && {
    labels: trend.map(r => `${getMonthName(r.month).slice(0,3)} ${r.year}`),
    datasets: [
      {
        label: 'Compartilhado',
        data: trend.map(r => r.shared),
        backgroundColor: '#14b8a6',
        borderRadius: 6,
        stack: 'a',
      },
      {
        label: 'Pessoal',
        data: trend.map(r => r.personal),
        backgroundColor: '#0f766e',
        borderRadius: 6,
        stack: 'a',
      },
    ],
  }

  const barOptions = {
    ...chartDefaults,
    plugins: {
      ...chartDefaults.plugins,
      tooltip: {
        callbacks: {
          label: ctx => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`,
          footer: items => `  Total: ${formatCurrency(items.reduce((s, i) => s + i.parsed.y, 0))}`,
        },
      },
    },
    scales: {
      x: { grid: { display: false }, stacked: true },
      y: {
        stacked: true,
        ticks: { callback: v => `R$${(v/1000).toFixed(0)}k` },
        grid: { color: '#f1f5f9' },
      },
    },
  }

  // ── Doughnut: category breakdown ─────────────────────────
  const donutData = summary && summary.categoryBreakdown.length > 0 && {
    labels: summary.categoryBreakdown.map(c => `${c.icon} ${c.name}`),
    datasets: [{
      data: summary.categoryBreakdown.map(c => c.total),
      backgroundColor: summary.categoryBreakdown.map((c, i) => c.color || CHART_COLORS[i % CHART_COLORS.length]),
      borderWidth: 2,
      borderColor: '#fff',
      hoverOffset: 8,
    }],
  }

  const donutOptions = {
    ...chartDefaults,
    cutout: '65%',
    plugins: {
      ...chartDefaults.plugins,
      tooltip: {
        callbacks: {
          label: ctx => ` ${ctx.label}: ${formatCurrency(ctx.parsed)} (${summary.total > 0 ? ((ctx.parsed / summary.total) * 100).toFixed(1) : 0}%)`,
        },
      },
    },
  }

  // ── Line chart: daily spending (current month) ───────────
  const lineData = trend && {
    labels: trend.map(r => `${getMonthName(r.month).slice(0,3)}`),
    datasets: [{
      label: 'Total mensal',
      data: trend.map(r => r.total),
      borderColor: '#0f766e',
      backgroundColor: 'rgba(15,118,110,0.1)',
      tension: 0.3,
      fill: true,
      pointBackgroundColor: '#0f766e',
      pointRadius: 4,
    }],
  }

  const lineOptions = {
    ...chartDefaults,
    plugins: {
      ...chartDefaults.plugins,
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => ` ${formatCurrency(ctx.parsed.y)}` } },
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        ticks: { callback: v => `R$${(v/1000).toFixed(1)}k` },
        grid: { color: '#f1f5f9' },
      },
    },
  }

  const avgMonthly  = trend ? trend.reduce((s, r) => s + r.total, 0) / (trend.filter(r => r.total > 0).length || 1) : 0
  const currentIdx  = trend ? trend.length - 1 : -1
  const prevTotal   = trend && currentIdx > 0 ? trend[currentIdx - 1].total : 0
  const currTotal   = trend && currentIdx >= 0 ? trend[currentIdx].total : 0
  const vsLastMonth = prevTotal > 0 ? ((currTotal - prevTotal) / prevTotal) * 100 : 0

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Relatórios</h1>
          <p className="page-subtitle">Análise e tendências dos seus gastos</p>
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
          <button className="btn btn-secondary" onClick={loadAll} disabled={loading}>🔄</button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading-page"><div className="loading-spinner" /><span>Carregando relatórios...</span></div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid-cols-3" style={{ marginBottom: '1.5rem' }}>
            <div className="stat-card">
              <span className="stat-label">💸 Total {getMonthName(month)}</span>
              <span className="stat-value" style={{ color: 'var(--primary-color)' }}>{formatCurrency(summary?.total || 0)}</span>
              <span className="stat-sub">
                {vsLastMonth !== 0 && (
                  <span style={{ color: vsLastMonth > 0 ? 'var(--error-color)' : 'var(--success-color)', fontWeight: 600 }}>
                    {vsLastMonth > 0 ? '▲' : '▼'} {Math.abs(vsLastMonth).toFixed(1)}% vs mês anterior
                  </span>
                )}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">📊 Média Mensal (6m)</span>
              <span className="stat-value">{formatCurrency(avgMonthly)}</span>
              <span className="stat-sub">{summary?.count || 0} lançamentos em {getMonthName(month)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">🏆 Maior Categoria</span>
              <span className="stat-value" style={{ fontSize: '1.2rem' }}>
                {summary?.topCategory ? `${summary.topCategory.icon} ${summary.topCategory.name}` : '—'}
              </span>
              <span className="stat-sub">
                {summary?.topCategory ? formatCurrency(summary.topCategory.total) : 'Sem dados'}
              </span>
            </div>
          </div>

          {/* Charts row 1: Bar + Donut */}
          <div className="grid-cols-2" style={{ marginBottom: '1.5rem', alignItems: 'flex-start' }}>
            <div className="card">
              <div className="card-header">
                <span className="card-title">📊 Gastos dos Últimos 6 Meses</span>
              </div>
              <div className="card-body">
                {barData ? (
                  <div style={{ height: '260px' }}>
                    <Bar data={barData} options={barOptions} />
                  </div>
                ) : (
                  <div className="empty-state"><div className="empty-state-icon">📊</div><p className="empty-state-text">Sem dados suficientes.</p></div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <span className="card-title">🥧 Gastos por Categoria — {getMonthName(month)}</span>
              </div>
              <div className="card-body">
                {donutData ? (
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ flex: '0 0 200px', height: '200px' }}>
                      <Doughnut data={donutData} options={donutOptions} />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '200px', overflowY: 'auto' }}>
                      {summary.categoryBreakdown.map((cat, i) => (
                        <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color || CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }} />
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.icon} {cat.name}</span>
                          <span style={{ fontWeight: 600, flexShrink: 0 }}>{formatCurrency(cat.total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="empty-state"><div className="empty-state-icon">🥧</div><p className="empty-state-text">Sem gastos em {getMonthName(month)}.</p></div>
                )}
              </div>
            </div>
          </div>

          {/* Line chart: trend */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <span className="card-title">📈 Tendência de Gastos (6 meses)</span>
            </div>
            <div className="card-body">
              <div style={{ height: '200px' }}>
                <Line data={lineData} options={lineOptions} />
              </div>
            </div>
          </div>

          {/* Couple spending breakdown */}
          {coupleData.length >= 1 && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-header">
                <span className="card-title">💑 Divisão de Gastos do Casal — {getMonthName(month)}</span>
              </div>
              <div className="card-body">
                {coupleData.every(m => m.sharedPaid === 0) ? (
                  <div className="empty-state" style={{ padding: '1rem' }}>
                    <p className="empty-state-text" style={{ fontSize: '0.875rem' }}>Nenhuma despesa compartilhada com pagador definido em {getMonthName(month)}.</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ao lançar uma despesa compartilhada, selecione quem pagou.</p>
                  </div>
                ) : (() => {
                  const totalShared = coupleData.reduce((s, m) => s + m.sharedPaid, 0)
                  return (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                        {coupleData.map((m, i) => {
                          const pct = totalShared > 0 ? (m.sharedPaid / totalShared) * 100 : 0
                          const color = i === 0 ? 'var(--primary-color)' : 'var(--accent-color)'
                          return (
                            <div key={m.userId} className="stat-card" style={{ borderLeft: `4px solid ${color}` }}>
                              <span className="stat-label">👤 {m.displayName}</span>
                              <span className="stat-value" style={{ color }}>{formatCurrency(m.sharedPaid)}</span>
                              <div style={{ margin: '0.4rem 0', height: 6, borderRadius: 100, background: 'var(--border-color)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 100, transition: 'width 0.4s' }} />
                              </div>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{pct.toFixed(1)}% das despesas compartilhadas</span>
                            </div>
                          )
                        })}
                      </div>
                      {coupleData.length === 2 && (() => {
                        const [a, b] = coupleData
                        const diff = Math.abs(a.sharedPaid - b.sharedPaid)
                        const more = a.sharedPaid >= b.sharedPaid ? a : b
                        const less = a.sharedPaid >= b.sharedPaid ? b : a
                        return diff > 0 && (
                          <div style={{ padding: '0.75rem 1rem', background: 'var(--primary-light)', borderRadius: '8px', fontSize: '0.875rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            ⚖️ <strong>{more.displayName}</strong> pagou {formatCurrency(diff)} a mais que <strong>{less.displayName}</strong> nas despesas do casal este mês.
                          </div>
                        )
                      })()}
                    </div>
                  )
                })()}
              </div>
            </div>
          )}

          {/* Category comparison table */}
          {comparison && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">📋 Comparativo por Categoria (últimos 3 meses)</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Categoria</th>
                      {comparison.months.map(m => (
                        <th key={`${m.month}-${m.year}`} style={{ textAlign: 'right' }}>
                          {getMonthName(m.month).slice(0,3)} {m.year}
                        </th>
                      ))}
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.categories
                      .filter(cat => comparison.rows.some(r => r.byCategory[cat.id]))
                      .map(cat => {
                        const totals = comparison.rows.map(r => r.byCategory[cat.id] || 0)
                        const rowTotal = totals.reduce((s, v) => s + v, 0)
                        return (
                          <tr key={cat.id}>
                            <td>
                              <span style={{ marginRight: '0.4rem' }}>{cat.icon}</span>
                              <span style={{ fontWeight: 500 }}>{cat.name}</span>
                            </td>
                            {totals.map((v, i) => (
                              <td key={i} style={{ textAlign: 'right', color: v > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                {v > 0 ? formatCurrency(v) : '—'}
                              </td>
                            ))}
                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary-color)' }}>
                              {formatCurrency(rowTotal)}
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid var(--border-color)' }}>
                      <td style={{ fontWeight: 700 }}>Total</td>
                      {comparison.rows.map((r, i) => {
                        const t = Object.values(r.byCategory).reduce((s, v) => s + v, 0)
                        return (
                          <td key={i} style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary-color)' }}>
                            {formatCurrency(t)}
                          </td>
                        )
                      })}
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary-color)' }}>
                        {formatCurrency(comparison.rows.flatMap(r => Object.values(r.byCategory)).reduce((s, v) => s + v, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
