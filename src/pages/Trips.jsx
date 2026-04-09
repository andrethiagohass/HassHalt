import React, { useState, useEffect } from 'react'
import CurrencyInput from '../components/CurrencyInput'
import { useAuth } from '../contexts/AuthContext'
import {
  getTrips, addTrip, updateTrip, deleteTrip,
  getTripParticipants, setTripParticipants,
  getTripExpenses, addTripExpense, updateTripExpense, deleteTripExpense,
  getFamilyMembers,
  getTripExpenseSplits, setTripExpenseSplits,
  getTripSettlements, addTripSettlement, deleteTripSettlement,
} from '../lib/supabase'
import { formatCurrency, formatDate, getTodayISO } from '../lib/formatters'
import Toast from '../components/Toast'

const TRIP_CATEGORIES = [
  { value: 'Hospedagem',   icon: '🏨' },
  { value: 'Alimentação',  icon: '🍽️' },
  { value: 'Transporte',   icon: '🚗' },
  { value: 'Passeios',     icon: '🎡' },
  { value: 'Compras',      icon: '🛍️' },
  { value: 'Outros',       icon: '💰' },
]

const CAT_ICON = Object.fromEntries(TRIP_CATEGORIES.map(c => [c.value, c.icon]))

export default function Trips() {
  const { familyId, user } = useAuth()

  const [trips, setTrips]                 = useState([])
  const [familyMembers, setFamilyMembers] = useState([])
  const [loading, setLoading]             = useState(true)
  const [toast, setToast]                 = useState(null)

  // Trip form
  const [showTripModal, setShowTripModal] = useState(false)
  const [editingTripId, setEditingTripId] = useState(null)
  const [tripForm, setTripForm]           = useState({ name: '', start_date: '', end_date: '', participants: [] })
  const [savingTrip, setSavingTrip]       = useState(false)

  // Selected trip detail
  const [selectedTrip, setSelectedTrip]     = useState(null)
  const [tripExpenses, setTripExpenses]     = useState([])
  const [participants, setParticipants]     = useState([])
  const [loadingDetail, setLoadingDetail]   = useState(false)
  const [allSplits, setAllSplits]           = useState({})

  // Expense form
  const [showExpModal, setShowExpModal] = useState(false)
  const [editingExpId, setEditingExpId] = useState(null)
  const [expForm, setExpForm]           = useState({ description: '', amount: '', date: getTodayISO(), category: 'Outros', paid_by: '', split_type: 'equal', notes: '', customSplits: {} })
  const [savingExp, setSavingExp]       = useState(false)

  // Settlements
  const [settlements, setSettlements]           = useState([])
  const [showSettleModal, setShowSettleModal]   = useState(false)
  const [settlingDebt, setSettlingDebt]         = useState(false)

  useEffect(() => {
    if (familyId) { loadTrips(); loadMembers() }
  }, [familyId])

  async function loadTrips() {
    setLoading(true)
    try { setTrips(await getTrips(familyId)) }
    catch { setToast({ type: 'error', text: 'Erro ao carregar viagens.' }) }
    finally { setLoading(false) }
  }

  async function loadMembers() {
    try { setFamilyMembers(await getFamilyMembers(familyId)) } catch {}
  }

  async function openTripDetail(trip) {
    setSelectedTrip(trip)
    setLoadingDetail(true)
    try {
      const [parts, exps, settles] = await Promise.all([
        getTripParticipants(trip.id),
        getTripExpenses(trip.id),
        getTripSettlements(trip.id),
      ])
      setParticipants(parts)
      setTripExpenses(exps)
      setSettlements(settles)
      const splitsMap = {}
      for (const e of exps) {
        if (e.split_type === 'custom') {
          splitsMap[e.id] = await getTripExpenseSplits(e.id)
        }
      }
      setAllSplits(splitsMap)
    } catch { setToast({ type: 'error', text: 'Erro ao carregar detalhes.' }) }
    finally { setLoadingDetail(false) }
  }

  function closeTripDetail() {
    setSelectedTrip(null)
    setTripExpenses([])
    setParticipants([])
    setAllSplits({})
    setSettlements([])
  }

  // ---- Trip CRUD ----
  function openAddTrip() {
    setTripForm({ name: '', start_date: '', end_date: '', participants: familyMembers.map(m => m.user_id) })
    setEditingTripId(null)
    setShowTripModal(true)
  }

  async function openEditTrip(trip) {
    const parts = await getTripParticipants(trip.id)
    setTripForm({
      name: trip.name,
      start_date: trip.start_date || '',
      end_date: trip.end_date || '',
      participants: parts.map(p => p.user_id),
    })
    setEditingTripId(trip.id)
    setShowTripModal(true)
  }

  function closeTripModal() { setShowTripModal(false); setEditingTripId(null) }

  async function handleSaveTrip(e) {
    e.preventDefault()
    setSavingTrip(true)
    try {
      const payload = {
        family_id: familyId,
        name: tripForm.name.trim(),
        start_date: tripForm.start_date || null,
        end_date: tripForm.end_date || null,
      }
      let trip
      if (editingTripId) {
        trip = await updateTrip(editingTripId, payload)
        setTrips(prev => prev.map(t => t.id === editingTripId ? trip : t))
        if (selectedTrip?.id === editingTripId) setSelectedTrip(trip)
      } else {
        trip = await addTrip(payload)
        setTrips(prev => [trip, ...prev])
      }
      await setTripParticipants(trip.id, tripForm.participants)
      if (selectedTrip?.id === trip.id) {
        const parts = await getTripParticipants(trip.id)
        setParticipants(parts)
      }
      setToast({ type: 'success', text: editingTripId ? 'Viagem atualizada!' : 'Viagem criada!' })
      closeTripModal()
    } catch { setToast({ type: 'error', text: 'Erro ao salvar viagem.' }) }
    finally { setSavingTrip(false) }
  }

  async function handleDeleteTrip(id) {
    if (!window.confirm('Excluir esta viagem e todos os seus gastos?')) return
    try {
      await deleteTrip(id)
      setTrips(prev => prev.filter(t => t.id !== id))
      if (selectedTrip?.id === id) closeTripDetail()
      setToast({ type: 'success', text: 'Viagem excluída.' })
    } catch { setToast({ type: 'error', text: 'Erro ao excluir.' }) }
  }

  function toggleParticipant(uid) {
    setTripForm(f => ({
      ...f,
      participants: f.participants.includes(uid)
        ? f.participants.filter(id => id !== uid)
        : [...f.participants, uid],
    }))
  }

  // ---- Expense CRUD ----
  function openAddExp() {
    setExpForm({
      description: '', amount: '', date: getTodayISO(), category: 'Outros',
      paid_by: user.id, split_type: 'equal', notes: '', customSplits: {},
    })
    setEditingExpId(null)
    setShowExpModal(true)
  }

  async function openEditExp(exp) {
    const custom = {}
    if (exp.split_type === 'custom') {
      const splits = allSplits[exp.id] || await getTripExpenseSplits(exp.id)
      for (const s of splits) custom[s.user_id] = String(s.amount)
    }
    setExpForm({
      description: exp.description, amount: String(exp.amount), date: exp.date,
      category: exp.category, paid_by: exp.paid_by || user.id,
      split_type: exp.split_type || 'equal', notes: exp.notes || '',
      customSplits: custom,
    })
    setEditingExpId(exp.id)
    setShowExpModal(true)
  }

  function closeExpModal() { setShowExpModal(false); setEditingExpId(null) }

  async function handleSaveExp(e) {
    e.preventDefault()
    setSavingExp(true)
    try {
      const payload = {
        trip_id:     selectedTrip.id,
        description: expForm.description.trim(),
        amount:      parseFloat(expForm.amount),
        date:        expForm.date,
        category:    expForm.category,
        paid_by:     expForm.paid_by || null,
        split_type:  expForm.split_type,
        notes:       expForm.notes.trim() || null,
      }
      let exp
      if (editingExpId) {
        exp = await updateTripExpense(editingExpId, payload)
        setTripExpenses(prev => prev.map(x => x.id === editingExpId ? exp : x))
      } else {
        exp = await addTripExpense(payload)
        setTripExpenses(prev => [exp, ...prev])
      }
      // Save custom splits
      if (expForm.split_type === 'custom') {
        const splits = Object.entries(expForm.customSplits)
          .filter(([, v]) => parseFloat(v) > 0)
          .map(([uid, v]) => ({ user_id: uid, amount: parseFloat(v) }))
        await setTripExpenseSplits(exp.id, splits)
        setAllSplits(prev => ({ ...prev, [exp.id]: splits }))
      } else {
        if (editingExpId) {
          await setTripExpenseSplits(exp.id, [])
          setAllSplits(prev => { const n = { ...prev }; delete n[exp.id]; return n })
        }
      }
      setToast({ type: 'success', text: editingExpId ? 'Gasto atualizado!' : 'Gasto adicionado!' })
      closeExpModal()
    } catch { setToast({ type: 'error', text: 'Erro ao salvar gasto.' }) }
    finally { setSavingExp(false) }
  }

  async function handleDeleteExp(id) {
    if (!window.confirm('Excluir este gasto?')) return
    try {
      await deleteTripExpense(id)
      setTripExpenses(prev => prev.filter(x => x.id !== id))
      setAllSplits(prev => { const n = { ...prev }; delete n[id]; return n })
      setToast({ type: 'success', text: 'Gasto excluído.' })
    } catch { setToast({ type: 'error', text: 'Erro ao excluir.' }) }
  }

  // ---- Computed summary ----
  function computeSummary() {
    const total = tripExpenses.reduce((s, e) => s + Number(e.amount), 0)
    const byCategory = {}
    const paidByUser = {}
    const owedByUser = {}

    for (const e of tripExpenses) {
      byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount)

      // Personal expenses: only the payer is responsible, no splitting
      if (e.split_type === 'personal') {
        if (e.paid_by) {
          paidByUser[e.paid_by] = (paidByUser[e.paid_by] || 0) + Number(e.amount)
          owedByUser[e.paid_by] = (owedByUser[e.paid_by] || 0) + Number(e.amount)
        }
        continue
      }

      if (e.paid_by) paidByUser[e.paid_by] = (paidByUser[e.paid_by] || 0) + Number(e.amount)

      if (e.split_type === 'custom' && allSplits[e.id]) {
        for (const s of allSplits[e.id]) {
          owedByUser[s.user_id] = (owedByUser[s.user_id] || 0) + Number(s.amount)
        }
      } else {
        const count = participants.length || 1
        const share = Number(e.amount) / count
        for (const p of participants) {
          owedByUser[p.user_id] = (owedByUser[p.user_id] || 0) + share
        }
      }
    }

    // Balance: paid - owed
    const balances = {}
    const allUsers = new Set([...Object.keys(paidByUser), ...Object.keys(owedByUser)])
    for (const uid of allUsers) {
      balances[uid] = (paidByUser[uid] || 0) - (owedByUser[uid] || 0)
    }

    // Apply existing settlements to balances
    for (const s of settlements) {
      // from_user paid to_user => from_user balance goes up, to_user balance goes down
      balances[s.from_user] = (balances[s.from_user] || 0) + Number(s.amount)
      balances[s.to_user] = (balances[s.to_user] || 0) - Number(s.amount)
    }

    // Settlements needed: who owes whom
    const pendingSettlements = []
    const debtors = Object.entries(balances)
      .filter(([, b]) => b < -0.01)
      .map(([uid, b]) => ({ uid, amount: -b }))
      .sort((a, b) => b.amount - a.amount)
    const creditors = Object.entries(balances)
      .filter(([, b]) => b > 0.01)
      .map(([uid, b]) => ({ uid, amount: b }))
      .sort((a, b) => b.amount - a.amount)

    let di = 0, ci = 0
    while (di < debtors.length && ci < creditors.length) {
      const transfer = Math.min(debtors[di].amount, creditors[ci].amount)
      if (transfer > 0.01) {
        pendingSettlements.push({ from: debtors[di].uid, to: creditors[ci].uid, amount: transfer })
      }
      debtors[di].amount -= transfer
      creditors[ci].amount -= transfer
      if (debtors[di].amount < 0.01) di++
      if (creditors[ci].amount < 0.01) ci++
    }

    return { total, byCategory, paidByUser, owedByUser, balances, pendingSettlements }
  }

  // ---- Settle debts ----
  async function handleSettleDebts() {
    const summary = computeSummary()
    if (summary.pendingSettlements.length === 0) return
    setSettlingDebt(true)
    try {
      const newSettles = []
      for (const s of summary.pendingSettlements) {
        const result = await addTripSettlement({
          trip_id: selectedTrip.id,
          from_user: s.from,
          to_user: s.to,
          amount: s.amount,
        })
        newSettles.push(result)
      }
      setSettlements(prev => [...newSettles, ...prev])
      setToast({ type: 'success', text: '✅ Dívidas quitadas com sucesso!' })
      setShowSettleModal(false)
    } catch { setToast({ type: 'error', text: 'Erro ao quitar dívidas.' }) }
    finally { setSettlingDebt(false) }
  }

  async function handleDeleteSettlement(id) {
    if (!window.confirm('Desfazer esta quitação?')) return
    try {
      await deleteTripSettlement(id)
      setSettlements(prev => prev.filter(s => s.id !== id))
      setToast({ type: 'success', text: 'Quitação desfeita.' })
    } catch { setToast({ type: 'error', text: 'Erro ao desfazer.' }) }
  }

  function memberName(uid) {
    return familyMembers.find(m => m.user_id === uid)?.display_name || 'Membro'
  }

  // ---- RENDER ----

  // Trip detail view
  if (selectedTrip) {
    const summary = computeSummary()
    return (
      <div>
        <Toast message={toast} onClose={() => setToast(null)} />

        <div className="page-header">
          <div>
            <button className="btn btn-ghost btn-sm" onClick={closeTripDetail} style={{ marginBottom: '0.25rem' }}>← Voltar</button>
            <h1 className="page-title">✈️ {selectedTrip.name}</h1>
            <p className="page-subtitle">
              {selectedTrip.start_date && selectedTrip.end_date
                ? `${formatDate(selectedTrip.start_date)} — ${formatDate(selectedTrip.end_date)}`
                : selectedTrip.start_date ? `A partir de ${formatDate(selectedTrip.start_date)}` : ''}
              {participants.length > 0 && ` · ${participants.length} participante(s)`}
            </p>
          </div>
          <div className="page-actions">
            <button className="btn btn-secondary" onClick={() => openEditTrip(selectedTrip)}>✏️ Editar Viagem</button>
            <button className="btn btn-primary" onClick={openAddExp}>+ Novo Gasto</button>
          </div>
        </div>

        {loadingDetail ? (
          <div className="loading-page"><div className="loading-spinner" /><span>Carregando...</span></div>
        ) : (
          <>
            {/* Debt Summary Banner */}
            {(() => {
              const s = computeSummary()
              if (s.pendingSettlements.length > 0) {
                return (
                  <div style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', border: '1px solid #f59e0b', borderRadius: '0.75rem', padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#92400e', marginBottom: '0.35rem' }}>💸 Resumo de Dívidas</div>
                        {s.pendingSettlements.map((st, i) => (
                          <div key={i} style={{ fontSize: '0.9rem', color: '#78350f', marginBottom: '0.15rem' }}>
                            <strong>{memberName(st.from)}</strong> deve <strong style={{ color: '#dc2626' }}>{formatCurrency(st.amount)}</strong> para <strong>{memberName(st.to)}</strong>
                          </div>
                        ))}
                      </div>
                      <button className="btn btn-primary" style={{ whiteSpace: 'nowrap' }} onClick={() => setShowSettleModal(true)}>✅ Quitar Dívidas</button>
                    </div>
                  </div>
                )
              }
              if (tripExpenses.length > 0) {
                return (
                  <div style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)', border: '1px solid #10b981', borderRadius: '0.75rem', padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#065f46' }}>✅ Contas quitadas! Ninguém deve nada.</div>
                  </div>
                )
              }
              return null
            })()}

            {/* Summary Cards */}
            <div className="grid-cols-2" style={{ marginBottom: '1.5rem', alignItems: 'flex-start' }}>
              <div className="stat-card">
                <span className="stat-label">💰 Total da Viagem</span>
                <span className="stat-value" style={{ color: 'var(--primary-color)' }}>{formatCurrency(summary.total)}</span>
                <span className="stat-sub">{tripExpenses.length} gasto(s)</span>
              </div>
              <div className="card card-body" style={{ padding: '1rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>📊 Por Categoria</div>
                {Object.entries(summary.byCategory).sort((a, b) => b[1] - a[1]).map(([cat, total]) => (
                  <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                    <span>{CAT_ICON[cat] || '💰'} {cat}</span>
                    <strong>{formatCurrency(total)}</strong>
                  </div>
                ))}
                {Object.keys(summary.byCategory).length === 0 && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nenhum gasto ainda.</span>}
              </div>
            </div>

            {/* Per person + Settlements */}
            <div className="grid-cols-2" style={{ marginBottom: '1.5rem', alignItems: 'flex-start' }}>
              <div className="card card-body" style={{ padding: '1rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>👤 Por Pessoa</div>
                {participants.map(p => {
                  const paid = summary.paidByUser[p.user_id] || 0
                  const owed = summary.owedByUser[p.user_id] || 0
                  return (
                    <div key={p.user_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem', alignItems: 'center' }}>
                      <span>{memberName(p.user_id)}</span>
                      <div style={{ textAlign: 'right' }}>
                        <div>Pagou: <strong>{formatCurrency(paid)}</strong></div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Deveria: {formatCurrency(owed)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="card card-body" style={{ padding: '1rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>⚖️ Acerto de Contas</div>
                {summary.pendingSettlements.length > 0 ? summary.pendingSettlements.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    <span className="badge badge-neutral">{memberName(s.from)}</span>
                    <span>→</span>
                    <span className="badge badge-primary">{memberName(s.to)}</span>
                    <strong style={{ marginLeft: 'auto' }}>{formatCurrency(s.amount)}</strong>
                  </div>
                )) : (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {tripExpenses.length === 0 ? 'Nenhum gasto ainda.' : '✅ Tudo acertado!'}
                  </span>
                )}
                {settlements.length > 0 && (
                  <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>📋 Quitações registradas</div>
                    {settlements.map(s => (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                        <span>{memberName(s.from_user)} → {memberName(s.to_user)}: <strong>{formatCurrency(s.amount)}</strong></span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(s.settled_at).toLocaleDateString('pt-BR')}</span>
                        <button className="btn-icon" style={{ fontSize: '0.7rem', padding: '0.1rem 0.25rem', color: 'var(--error-color)' }} onClick={() => handleDeleteSettlement(s.id)} title="Desfazer">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Expense list */}
            {tripExpenses.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <div className="empty-state-icon">💸</div>
                  <p className="empty-state-text">Nenhum gasto nesta viagem ainda.</p>
                  <button className="btn btn-primary" onClick={openAddExp}>+ Adicionar primeiro gasto</button>
                </div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="mobile-cards">
                  <thead>
                    <tr>
                      <th>Descrição</th>
                      <th>Data</th>
                      <th>Categoria</th>
                      <th>Quem pagou</th>
                      <th style={{ textAlign: 'right' }}>Valor</th>
                      <th style={{ textAlign: 'center' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tripExpenses.map(exp => (
                      <tr key={exp.id}>
                        <td className="td-desc">
                          <strong>{exp.description}</strong>
                          {exp.notes && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{exp.notes}</div>}
                        </td>
                        <td data-label="Data" style={{ whiteSpace: 'nowrap', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{formatDate(exp.date)}</td>
                        <td data-label="Categoria"><span>{CAT_ICON[exp.category] || '💰'} {exp.category}</span></td>
                        <td data-label="Quem pagou">
                          <span className="badge badge-primary">{memberName(exp.paid_by)}</span>
                          {exp.split_type === 'personal' && <span className="badge badge-neutral" style={{ marginLeft: '0.25rem', fontSize: '0.65rem' }}>Pessoal</span>}
                        </td>
                        <td className="td-amount" data-label="Valor" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--primary-color)' }}>{formatCurrency(exp.amount)}</td>
                        <td className="td-actions" style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <button className="btn-icon" style={{ marginRight: '0.25rem' }} onClick={() => openEditExp(exp)} title="Editar">✏️</button>
                          <button className="btn-icon" style={{ color: 'var(--error-color)', borderColor: 'var(--error-light)' }} onClick={() => handleDeleteExp(exp.id)} title="Excluir">🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="table-footer">
                  <span>{tripExpenses.length} gasto(s)</span>
                  <span>Total: <strong>{formatCurrency(summary.total)}</strong></span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Expense Modal */}
        {showExpModal && (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeExpModal()}>
            <div className="modal">
              <div className="modal-header">
                <h2 className="modal-title">{editingExpId ? '✏️ Editar Gasto' : '💸 Novo Gasto'}</h2>
                <button className="modal-close" onClick={closeExpModal}>✕</button>
              </div>
              <form onSubmit={handleSaveExp}>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">Descrição *</label>
                    <input className="form-control" type="text" required autoFocus placeholder="Ex: Hotel, Almoço, Uber..."
                      value={expForm.description} onChange={e => setExpForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Valor (R$) *</label>
                      <CurrencyInput className="form-control" required
                        value={expForm.amount} onChange={v => setExpForm(f => ({ ...f, amount: v }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Data *</label>
                      <input className="form-control" type="date" required
                        value={expForm.date} onChange={e => setExpForm(f => ({ ...f, date: e.target.value }))} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Categoria</label>
                      <select className="form-control" value={expForm.category} onChange={e => setExpForm(f => ({ ...f, category: e.target.value }))}>
                        {TRIP_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.value}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Quem pagou *</label>
                      <select className="form-control" value={expForm.paid_by} onChange={e => setExpForm(f => ({ ...f, paid_by: e.target.value }))}>
                        {participants.map(p => <option key={p.user_id} value={p.user_id}>{memberName(p.user_id)}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Divisão</label>
                    <select className="form-control" value={expForm.split_type} onChange={e => setExpForm(f => ({ ...f, split_type: e.target.value }))}>
                      <option value="equal">Dividido igualmente</option>
                      <option value="personal">Somente meu (não dividir)</option>
                      <option value="custom">Personalizado</option>
                    </select>
                  </div>
                  {expForm.split_type === 'custom' && (
                    <div className="form-group">
                      <label className="form-label">Valor por pessoa</label>
                      {participants.map(p => (
                        <div key={p.user_id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                          <span style={{ minWidth: '100px', fontSize: '0.85rem' }}>{memberName(p.user_id)}</span>
                          <CurrencyInput className="form-control" style={{ flex: 1 }}
                            value={expForm.customSplits[p.user_id] || ''}
                            onChange={v => setExpForm(f => ({ ...f, customSplits: { ...f.customSplits, [p.user_id]: v } }))} />
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">Observações</label>
                    <textarea className="form-control" rows={2} placeholder="Detalhes opcionais..."
                      value={expForm.notes} onChange={e => setExpForm(f => ({ ...f, notes: e.target.value }))} style={{ resize: 'vertical' }} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeExpModal}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={savingExp}>
                    {savingExp ? 'Salvando...' : editingExpId ? '💾 Salvar' : '+ Adicionar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Settle Debts Modal */}
        {showSettleModal && (() => {
          const s = computeSummary()
          return (
            <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowSettleModal(false)}>
              <div className="modal">
                <div className="modal-header">
                  <h2 className="modal-title">✅ Quitar Dívidas</h2>
                  <button className="modal-close" onClick={() => setShowSettleModal(false)}>✕</button>
                </div>
                <div className="modal-body">
                  <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                    Ao confirmar, as dívidas abaixo serão marcadas como quitadas e o saldo será zerado a partir deste momento.
                  </p>
                  {s.pendingSettlements.map((st, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', marginBottom: '0.5rem', padding: '0.5rem 0.75rem', background: 'var(--bg-hover)', borderRadius: '0.5rem' }}>
                      <strong>{memberName(st.from)}</strong>
                      <span>paga</span>
                      <strong style={{ color: 'var(--primary-color)' }}>{formatCurrency(st.amount)}</strong>
                      <span>para</span>
                      <strong>{memberName(st.to)}</strong>
                    </div>
                  ))}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowSettleModal(false)}>Cancelar</button>
                  <button type="button" className="btn btn-primary" disabled={settlingDebt} onClick={handleSettleDebts}>
                    {settlingDebt ? 'Quitando...' : '✅ Confirmar Quitação'}
                  </button>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Trip Edit Modal (reused) */}
        {showTripModal && renderTripModal()}
      </div>
    )
  }

  // ---- Trip list view ----
  function renderTripModal() {
    return (
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeTripModal()}>
        <div className="modal">
          <div className="modal-header">
            <h2 className="modal-title">{editingTripId ? '✏️ Editar Viagem' : '✈️ Nova Viagem'}</h2>
            <button className="modal-close" onClick={closeTripModal}>✕</button>
          </div>
          <form onSubmit={handleSaveTrip}>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nome da viagem *</label>
                <input className="form-control" type="text" required autoFocus placeholder="Ex: Croácia e Eslovênia 2026"
                  value={tripForm.name} onChange={e => setTripForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Data de início</label>
                  <input className="form-control" type="date"
                    value={tripForm.start_date} onChange={e => setTripForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Data de fim</label>
                  <input className="form-control" type="date"
                    value={tripForm.end_date} onChange={e => setTripForm(f => ({ ...f, end_date: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Participantes</label>
                {familyMembers.map(m => (
                  <label key={m.user_id} className="form-check" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <input type="checkbox" checked={tripForm.participants.includes(m.user_id)} onChange={() => toggleParticipant(m.user_id)} />
                    {m.display_name}
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={closeTripModal}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={savingTrip}>
                {savingTrip ? 'Salvando...' : editingTripId ? '💾 Salvar' : '+ Criar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Toast message={toast} onClose={() => setToast(null)} />

      <div className="page-header">
        <div>
          <h1 className="page-title">Viagens</h1>
          <p className="page-subtitle">Controle de gastos por viagem</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openAddTrip}>+ Nova Viagem</button>
        </div>
      </div>

      {loading ? (
        <div className="loading-page"><div className="loading-spinner" /><span>Carregando...</span></div>
      ) : trips.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">✈️</div>
            <p className="empty-state-text">Nenhuma viagem cadastrada ainda.</p>
            <button className="btn btn-primary" onClick={openAddTrip}>+ Criar primeira viagem</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {trips.map(trip => (
            <div key={trip.id} className="card card-body" style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }} onClick={() => openTripDetail(trip)}>
              <span style={{ fontSize: '1.5rem' }}>✈️</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '1rem' }}>{trip.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {trip.start_date && trip.end_date
                    ? `${formatDate(trip.start_date)} — ${formatDate(trip.end_date)}`
                    : trip.start_date ? `A partir de ${formatDate(trip.start_date)}` : 'Sem datas definidas'}
                </div>
              </div>
              <button className="btn-icon" style={{ marginRight: '0.25rem' }} onClick={e => { e.stopPropagation(); openEditTrip(trip) }} title="Editar">✏️</button>
              <button className="btn-icon" style={{ color: 'var(--error-color)', borderColor: 'var(--error-light)' }} onClick={e => { e.stopPropagation(); handleDeleteTrip(trip.id) }} title="Excluir">🗑️</button>
            </div>
          ))}
        </div>
      )}

      {showTripModal && renderTripModal()}
    </div>
  )
}
