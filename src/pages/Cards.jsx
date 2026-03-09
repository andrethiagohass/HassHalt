import React, { useState, useEffect } from 'react'
import CurrencyInput from '../components/CurrencyInput'
import { useAuth } from '../contexts/AuthContext'
import { getCards, addCard, updateCard, deleteCard, getCardStatement } from '../lib/supabase'
import { formatCurrency, getMonthName, getCurrentMonthYear, formatDate } from '../lib/formatters'
import Toast from '../components/Toast'

const CARD_COLORS = ['#0f766e','#0891b2','#7c3aed','#db2777','#ea580c','#ca8a04','#dc2626','#2563eb','#475569','#1e293b']

const EMPTY_FORM = { name: '', last_digits: '', limit_amount: '', closing_day: '1', due_day: '10', color: '#0f766e' }

export default function Cards() {
  const { familyId } = useAuth()
  const { month: curMonth, year: curYear } = getCurrentMonthYear()

  const [cards, setCards]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [toast, setToast]           = useState(null)
  const [showModal, setShowModal]   = useState(false)
  const [editingId, setEditingId]   = useState(null)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [saving, setSaving]         = useState(false)
  const [selectedCard, setSelectedCard] = useState(null)
  const [stmtMonth, setStmtMonth]   = useState(curMonth)
  const [stmtYear, setStmtYear]     = useState(curYear)
  const [statement, setStatement]   = useState(null)
  const [stmtLoading, setStmtLoading] = useState(false)

  useEffect(() => { if (familyId) loadCards() }, [familyId])
  useEffect(() => { if (selectedCard) loadStatement() }, [selectedCard, stmtMonth, stmtYear])

  async function loadCards() {
    setLoading(true)
    try   { const data = await getCards(familyId); setCards(data); if (data.length > 0 && !selectedCard) setSelectedCard(data[0]) }
    catch { setToast({ type: 'error', text: 'Erro ao carregar cartões.' }) }
    finally { setLoading(false) }
  }

  async function loadStatement() {
    setStmtLoading(true)
    try   { setStatement(await getCardStatement(familyId, selectedCard.id, stmtMonth, stmtYear)) }
    catch { setToast({ type: 'error', text: 'Erro ao carregar fatura.' }) }
    finally { setStmtLoading(false) }
  }

  function openAdd()   { setForm(EMPTY_FORM); setEditingId(null); setShowModal(true) }
  function openEdit(c) {
    setForm({ name: c.name, last_digits: c.last_digits || '', limit_amount: c.limit_amount ? String(c.limit_amount) : '', closing_day: String(c.closing_day || 1), due_day: String(c.due_day || 10), color: c.color || '#0f766e' })
    setEditingId(c.id); setShowModal(true)
  }
  function closeModal() { setShowModal(false); setEditingId(null); setForm(EMPTY_FORM) }

  async function handleSave(e) {
    e.preventDefault(); setSaving(true)
    try {
      const payload = { family_id: familyId, name: form.name.trim(), last_digits: form.last_digits || null, limit_amount: form.limit_amount ? parseFloat(form.limit_amount) : null, closing_day: parseInt(form.closing_day), due_day: parseInt(form.due_day), color: form.color }
      if (editingId) {
        const updated = await updateCard(editingId, payload)
        setCards(prev => prev.map(c => c.id === editingId ? updated : c))
        if (selectedCard?.id === editingId) setSelectedCard(updated)
        setToast({ type: 'success', text: 'Cartão atualizado!' })
      } else {
        const created = await addCard(payload)
        setCards(prev => [...prev, created])
        if (!selectedCard) setSelectedCard(created)
        setToast({ type: 'success', text: 'Cartão criado!' })
      }
      closeModal()
    } catch { setToast({ type: 'error', text: 'Erro ao salvar cartão.' }) }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!window.confirm('Arquivar este cartão?')) return
    try {
      await deleteCard(id)
      const remaining = cards.filter(c => c.id !== id)
      setCards(remaining)
      if (selectedCard?.id === id) setSelectedCard(remaining[0] || null)
      setToast({ type: 'success', text: 'Cartão arquivado.' })
    } catch { setToast({ type: 'error', text: 'Erro ao arquivar.' }) }
  }

  const usedPct = selectedCard && statement && selectedCard.limit_amount
    ? Math.min((statement.total / selectedCard.limit_amount) * 100, 100) : 0

  const years = [curYear - 1, curYear, curYear + 1]

  return (
    <div>
      <Toast message={toast} onClose={() => setToast(null)} />

      <div className="page-header">
        <div><h1 className="page-title">Cartões de Crédito</h1><p className="page-subtitle">Gerencie seus cartões e faturas</p></div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openAdd}>+ Novo Cartão</button>
        </div>
      </div>

      {loading ? (
        <div className="loading-page"><div className="loading-spinner" /><span>Carregando...</span></div>
      ) : cards.length === 0 ? (
        <div className="card"><div className="empty-state">
          <div className="empty-state-icon">💳</div>
          <p className="empty-state-text">Nenhum cartão cadastrado ainda.</p>
          <button className="btn btn-primary" onClick={openAdd}>+ Adicionar cartão</button>
        </div></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem', alignItems: 'flex-start' }}>

          {/* Card list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {cards.map(card => (
              <div key={card.id}
                onClick={() => setSelectedCard(card)}
                className="card card-body"
                style={{ cursor: 'pointer', borderLeft: `4px solid ${card.color}`, background: selectedCard?.id === card.id ? 'var(--primary-light)' : undefined, transition: 'background 0.2s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{card.name}</div>
                    {card.last_digits && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>•••• {card.last_digits}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button className="btn-icon" style={{ padding: '0.2rem' }} onClick={e => { e.stopPropagation(); openEdit(card) }}>✏️</button>
                    <button className="btn-icon" style={{ padding: '0.2rem', color: 'var(--error-color)' }} onClick={e => { e.stopPropagation(); handleDelete(card.id) }}>🗑️</button>
                  </div>
                </div>
                {card.limit_amount && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                    Limite: {formatCurrency(card.limit_amount)}
                  </div>
                )}
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  Fecha dia {card.closing_day} · Vence dia {card.due_day}
                </div>
              </div>
            ))}
          </div>

          {/* Statement */}
          {selectedCard && (
            <div>
              {/* Card visual */}
              <div style={{ background: `linear-gradient(135deg, ${selectedCard.color}, ${selectedCard.color}cc)`, borderRadius: '16px', padding: '1.5rem', color: 'white', marginBottom: '1rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                <div style={{ position: 'absolute', bottom: -30, right: 40, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
                <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>💳 {selectedCard.name}</div>
                {selectedCard.last_digits && <div style={{ fontFamily: 'monospace', fontSize: '0.9rem', opacity: 0.8, marginBottom: '0.75rem' }}>•••• •••• •••• {selectedCard.last_digits}</div>}
                {selectedCard.limit_amount && (
                  <>
                    <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '0.25rem' }}>Fatura {getMonthName(stmtMonth)} · Limite: {formatCurrency(selectedCard.limit_amount)}</div>
                    <div style={{ height: 6, borderRadius: 100, background: 'rgba(255,255,255,0.3)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${usedPct}%`, background: 'white', borderRadius: 100, transition: 'width 0.4s' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem', fontSize: '0.75rem', opacity: 0.9 }}>
                      <span>{formatCurrency(statement?.total || 0)} usado</span>
                      <span>{usedPct.toFixed(0)}%</span>
                    </div>
                  </>
                )}
              </div>

              {/* Statement selector */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Fatura:</span>
                <select className="form-control" style={{ width: 'auto' }} value={stmtMonth} onChange={e => setStmtMonth(Number(e.target.value))}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{getMonthName(m)}</option>)}
                </select>
                <select className="form-control" style={{ width: 'auto' }} value={stmtYear} onChange={e => setStmtYear(Number(e.target.value))}>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              {/* Statement table */}
              {stmtLoading ? (
                <div className="loading-page" style={{ minHeight: '120px' }}><div className="loading-spinner" /></div>
              ) : statement?.expenses.length === 0 ? (
                <div className="card"><div className="empty-state">
                  <div className="empty-state-icon">📄</div>
                  <p className="empty-state-text">Nenhum lançamento neste cartão em {getMonthName(stmtMonth)}/{stmtYear}.</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Vincule lançamentos a este cartão na página de Despesas.</p>
                </div></div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Categoria</th>
                        <th>Descrição</th>
                        <th style={{ textAlign: 'right' }}>Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statement.expenses.map(e => (
                        <tr key={e.id}>
                          <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{formatDate(e.date)}</td>
                          <td>{e.hh_categories?.icon || '💰'} <span style={{ fontSize: '0.8rem' }}>{e.hh_categories?.name || '—'}</span></td>
                          <td style={{ fontWeight: 500 }}>{e.description}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--primary-color)' }}>{formatCurrency(e.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="table-footer">
                    <span>{statement.expenses.length} lançamento(s)</span>
                    <span>Total fatura: <strong style={{ color: 'var(--primary-color)' }}>{formatCurrency(statement.total)}</strong></span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{editingId ? '✏️ Editar Cartão' : '💳 Novo Cartão'}</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nome do cartão *</label>
                  <input className="form-control" type="text" required autoFocus placeholder="Ex: Nubank, Itaú Visa..."
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Últimos 4 dígitos</label>
                    <input className="form-control" type="text" maxLength={4} placeholder="1234"
                      value={form.last_digits} onChange={e => setForm(f => ({ ...f, last_digits: e.target.value.replace(/\D/g,'') }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Limite (R$)</label>
                    <CurrencyInput className="form-control" placeholder="5.000,00"
                      value={form.limit_amount} onChange={v => setForm(f => ({ ...f, limit_amount: v }))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Dia de fechamento</label>
                    <input className="form-control" type="number" min="1" max="31"
                      value={form.closing_day} onChange={e => setForm(f => ({ ...f, closing_day: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Dia de vencimento</label>
                    <input className="form-control" type="number" min="1" max="31"
                      value={form.due_day} onChange={e => setForm(f => ({ ...f, due_day: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Cor</label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {CARD_COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                        style={{ width: 28, height: 28, borderRadius: '6px', background: c, border: `3px solid ${form.color === c ? 'var(--text-primary)' : 'transparent'}`, cursor: 'pointer' }} />
                    ))}
                    <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                      style={{ width: 28, height: 28, border: 'none', padding: 0, cursor: 'pointer' }} />
                  </div>
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
