import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

const DEFAULT_CATEGORIES = [
  { name: 'Moradia',      icon: '🏠', color: '#0f766e' },
  { name: 'Mercado',      icon: '🛒', color: '#0d9488' },
  { name: 'Transporte',   icon: '🚗', color: '#0891b2' },
  { name: 'Alimentação',  icon: '🍔', color: '#ea580c' },
  { name: 'Saúde',        icon: '💊', color: '#dc2626' },
  { name: 'Educação',     icon: '🎓', color: '#7c3aed' },
  { name: 'Lazer',        icon: '🎬', color: '#db2777' },
  { name: 'Vestuário',    icon: '👗', color: '#c026d3' },
  { name: 'Contas',       icon: '💡', color: '#ca8a04' },
  { name: 'Pets',         icon: '🐾', color: '#65a30d' },
  { name: 'Tecnologia',   icon: '📱', color: '#2563eb' },
  { name: 'Viagem',       icon: '✈️', color: '#0369a1' },
  { name: 'Outros',       icon: '💰', color: '#475569' },
]

export async function getOrCreateFamily(userId, userEmail) {
  const { data: members, error: memberError } = await supabase
    .from('hh_family_members')
    .select('family_id, display_name')
    .eq('user_id', userId)
    .limit(1)

  if (memberError) throw memberError
  const member = members?.[0]
  if (member?.family_id) return {
    familyId: member.family_id,
    displayName: member.display_name || userEmail.split('@')[0],
  }

  const newFamilyId = crypto.randomUUID()

  const { error: familyError } = await supabase
    .from('hh_families')
    .insert({ id: newFamilyId, name: 'Família' })

  if (familyError) throw familyError

  const { error: addMemberError } = await supabase.from('hh_family_members').insert({
    family_id: newFamilyId,
    user_id: userId,
    display_name: userEmail.split('@')[0],
    role: 'admin',
  })

  if (addMemberError) throw addMemberError

  const { error: catError } = await supabase.from('hh_categories').insert(
    DEFAULT_CATEGORIES.map(cat => ({ ...cat, family_id: newFamilyId, is_default: true }))
  )
  if (catError) console.error('Category seed error:', catError)

  return { familyId: newFamilyId, displayName: userEmail.split('@')[0] }
}

export async function getCategories(familyId) {
  const { data, error } = await supabase
    .from('hh_categories')
    .select('*')
    .eq('family_id', familyId)
    .eq('active', true)
    .order('name')

  if (error) throw error
  return data || []
}

export async function getExpenses(familyId, month, year) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const { data, error } = await supabase
    .from('hh_expenses')
    .select('*, hh_categories(id, name, icon, color)')
    .eq('family_id', familyId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function addExpense(expense) {
  const { data, error } = await supabase
    .from('hh_expenses')
    .insert(expense)
    .select('*, hh_categories(id, name, icon, color)')
    .single()

  if (error) throw error
  return data
}

export async function updateExpense(id, updates) {
  const { data, error } = await supabase
    .from('hh_expenses')
    .update(updates)
    .eq('id', id)
    .select('*, hh_categories(id, name, icon, color)')
    .single()

  if (error) throw error
  return data
}

export async function deleteExpense(id) {
  const { error } = await supabase.from('hh_expenses').delete().eq('id', id)
  if (error) throw error
}

export async function getDashboardSummary(familyId, month, year) {
  const expenses = await getExpenses(familyId, month, year)

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const count = expenses.length

  const byCategory = {}
  for (const e of expenses) {
    const cat = e.hh_categories
    if (!cat) continue
    if (!byCategory[cat.name]) {
      byCategory[cat.name] = { name: cat.name, icon: cat.icon, color: cat.color, total: 0 }
    }
    byCategory[cat.name].total += Number(e.amount)
  }

  const categoryBreakdown = Object.values(byCategory).sort((a, b) => b.total - a.total)
  const topCategory = categoryBreakdown[0] || null
  const recent = expenses.slice(0, 8)

  return { total, count, topCategory, categoryBreakdown, recent }
}

export async function getPersonalDashboard(familyId, month, year, viewAsUserId) {
  const expenses = await getExpenses(familyId, month, year)

  // Personal = not shared AND (user created OR user paid)
  const personal = expenses.filter(e => !e.shared && (e.user_id === viewAsUserId || e.paid_by === viewAsUserId))
  // Couple = all shared expenses
  const couple = expenses.filter(e => e.shared)
  // How much this user paid of shared
  const couplePaidByMe = couple.filter(e => e.paid_by === viewAsUserId)

  const personalTotal = personal.reduce((s, e) => s + Number(e.amount), 0)
  const coupleTotal   = couple.reduce((s, e) => s + Number(e.amount), 0)
  const paidByMeTotal = couplePaidByMe.reduce((s, e) => s + Number(e.amount), 0)
  const grandTotal    = personalTotal + paidByMeTotal

  function buildBreakdown(list) {
    const byCategory = {}
    for (const e of list) {
      const cat = e.hh_categories
      if (!cat) continue
      if (!byCategory[cat.id]) byCategory[cat.id] = { id: cat.id, name: cat.name, icon: cat.icon, color: cat.color, total: 0 }
      byCategory[cat.id].total += Number(e.amount)
    }
    return Object.values(byCategory).sort((a, b) => b.total - a.total)
  }

  return {
    personalTotal,
    personalCount: personal.length,
    personalBreakdown: buildBreakdown(personal),
    personalRecent: personal.slice(0, 5),
    coupleTotal,
    coupleCount: couple.length,
    coupleBreakdown: buildBreakdown(couple),
    coupleRecent: couple.slice(0, 5),
    paidByMeTotal,
    paidByMeCount: couplePaidByMe.length,
    grandTotal,
  }
}

// ============================================================
// REPORTS
// ============================================================

export async function getMonthlyTrend(familyId, monthsBack = 6) {
  const results = []
  const now = new Date()

  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const month = d.getMonth() + 1
    const year  = d.getFullYear()
    const startDate = `${year}-${String(month).padStart(2,'0')}-01`
    const lastDay   = new Date(year, month, 0).getDate()
    const endDate   = `${year}-${String(month).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`

    const { data, error } = await supabase
      .from('hh_expenses')
      .select('amount, shared')
      .eq('family_id', familyId)
      .gte('date', startDate)
      .lte('date', endDate)

    if (error) throw error
    const total  = (data || []).reduce((s, e) => s + Number(e.amount), 0)
    const shared = (data || []).filter(e => e.shared).reduce((s, e) => s + Number(e.amount), 0)
    results.push({ month, year, total, shared, personal: total - shared, count: (data || []).length })
  }
  return results
}

export async function getCategoryComparison(familyId, monthsBack = 3) {
  const months = []
  const now = new Date()
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ month: d.getMonth() + 1, year: d.getFullYear() })
  }

  const categories = await getCategories(familyId)
  const rows = []

  for (const { month, year } of months) {
    const expenses = await getExpenses(familyId, month, year)
    const byCategory = {}
    for (const e of expenses) {
      if (!e.category_id) continue
      byCategory[e.category_id] = (byCategory[e.category_id] || 0) + Number(e.amount)
    }
    rows.push({ month, year, byCategory })
  }

  return { categories, months, rows }
}

// ============================================================
// CATEGORIES MANAGEMENT
// ============================================================

export async function getAllCategories(familyId) {
  const { data, error } = await supabase
    .from('hh_categories')
    .select('*')
    .eq('family_id', familyId)
    .order('name')
  if (error) throw error
  return data || []
}

export async function addCategory(data) {
  const { data: result, error } = await supabase
    .from('hh_categories').insert(data).select().single()
  if (error) throw error
  return result
}

export async function updateCategory(id, updates) {
  const { data, error } = await supabase
    .from('hh_categories').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

// ============================================================
// BUDGETS
// ============================================================

export async function getBudgets(familyId, month, year) {
  const { data, error } = await supabase
    .from('hh_budgets')
    .select('*, hh_categories(id, name, icon, color)')
    .eq('family_id', familyId)
    .eq('month', month)
    .eq('year', year)
  if (error) throw error
  return data || []
}

export async function upsertBudget(familyId, categoryId, month, year, amount) {
  const { data, error } = await supabase
    .from('hh_budgets')
    .upsert(
      { family_id: familyId, category_id: categoryId, month, year, amount },
      { onConflict: 'family_id,category_id,month,year' }
    )
    .select().single()
  if (error) throw error
  return data
}

export async function deleteBudget(id) {
  const { error } = await supabase.from('hh_budgets').delete().eq('id', id)
  if (error) throw error
}

export async function getBudgetSummary(familyId, month, year) {
  const [categories, budgets, expenses] = await Promise.all([
    getCategories(familyId),
    getBudgets(familyId, month, year),
    getExpenses(familyId, month, year),
  ])

  const spentByCategory = {}
  for (const e of expenses) {
    if (!e.category_id) continue
    spentByCategory[e.category_id] = (spentByCategory[e.category_id] || 0) + Number(e.amount)
  }

  const budgetByCategory = {}
  for (const b of budgets) budgetByCategory[b.category_id] = b

  const rows = categories.map(cat => ({
    category: cat,
    budget: budgetByCategory[cat.id] || null,
    spent: spentByCategory[cat.id] || 0,
  }))

  const totalBudget = budgets.reduce((s, b) => s + Number(b.amount), 0)
  const totalSpent  = expenses.reduce((s, e) => s + Number(e.amount), 0)

  return { rows, totalBudget, totalSpent }
}

// ============================================================
// RECURRING EXPENSES
// ============================================================

export async function getRecurring(familyId) {
  const { data, error } = await supabase
    .from('hh_recurring')
    .select('*, hh_categories(id, name, icon, color)')
    .eq('family_id', familyId)
    .order('day_of_month')
  if (error) throw error
  return data || []
}

export async function addRecurring(data) {
  const { data: result, error } = await supabase
    .from('hh_recurring')
    .insert(data)
    .select('*, hh_categories(id, name, icon, color)')
    .single()
  if (error) throw error
  return result
}

export async function updateRecurring(id, updates) {
  const { data, error } = await supabase
    .from('hh_recurring')
    .update(updates).eq('id', id)
    .select('*, hh_categories(id, name, icon, color)')
    .single()
  if (error) throw error
  return data
}

export async function deleteRecurring(id) {
  const { error } = await supabase.from('hh_recurring').delete().eq('id', id)
  if (error) throw error
}

export async function generateMonthExpenses(familyId, userId, month, year) {
  const recurring = await getRecurring(familyId)
  const active = recurring.filter(r => r.active)
  if (active.length === 0) return []

  const lastDay = new Date(year, month, 0).getDate()
  const expenses = active.map(r => ({
    family_id:    familyId,
    user_id:      r.shared ? userId : (r.user_id || userId),
    category_id:  r.category_id,
    description:  r.description,
    amount:       r.amount,
    date: `${year}-${String(month).padStart(2,'0')}-${String(Math.min(r.day_of_month, lastDay)).padStart(2,'0')}`,
    payment_type: r.payment_type || 'debit',
    shared:       r.shared,
    paid_by:      r.paid_by || null,
    paid:         false,
    notes:        'Gerado de despesa recorrente',
  }))

  const { data, error } = await supabase
    .from('hh_expenses')
    .insert(expenses)
    .select('*, hh_categories(id, name, icon, color)')
  if (error) throw error
  return data || []
}

// ============================================================
// FAMILY / SETTINGS
// ============================================================

export async function getFamilyMembers(familyId) {
  const { data, error } = await supabase
    .rpc('hh_get_family_members', { p_family_id: familyId })
  if (error) throw error
  return data || []
}

export async function getMemberSpending(familyId, month, year) {
  const expenses = await getExpenses(familyId, month, year)
  const members  = await getFamilyMembers(familyId)

  const memberMap = {}
  for (const m of members) memberMap[m.user_id] = m.display_name || m.user_id.slice(0, 8)

  const byUser = {}
  for (const e of expenses) {
    // For shared expenses, credit the person who paid (paid_by); else the creator
    const uid = (e.shared && e.paid_by) ? e.paid_by : e.user_id
    if (!byUser[uid]) byUser[uid] = { userId: uid, total: 0, sharedPaid: 0, personal: 0, count: 0 }
    byUser[uid].total += Number(e.amount)
    byUser[uid].count += 1
    if (e.shared) byUser[uid].sharedPaid += Number(e.amount)
    else          byUser[uid].personal   += Number(e.amount)
  }

  return Object.values(byUser).map(u => ({
    ...u,
    displayName: memberMap[u.userId] || 'Membro',
  }))
}

export async function removeMember(targetUserId, familyId) {
  const { data, error } = await supabase.rpc('hh_admin_remove_member', {
    p_target_user_id: targetUserId,
    p_family_id:      familyId,
  })
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Membro não encontrado.')
}

export async function updateDisplayName(userId, familyId, name) {
  const { data, error } = await supabase
    .from('hh_family_members')
    .update({ display_name: name })
    .eq('user_id', userId)
    .eq('family_id', familyId)
    .select()
  if (error) throw error
  if (!data || data.length === 0) throw new Error('Sem permissão para atualizar. Execute o SQL de correção no Supabase.')
}

// ============================================================
// FAMILY / SETTINGS
// ============================================================

export async function joinFamily(familyId, userId, userEmail) {
  const { data: existingRows } = await supabase
    .from('hh_family_members')
    .select('family_id')
    .eq('user_id', userId)
    .limit(1)

  const existing = existingRows?.[0]
  if (existing?.family_id === familyId) return

  if (existing) {
    // Check if there are other members in their current family
    const { data: others } = await supabase
      .from('hh_family_members')
      .select('id')
      .eq('family_id', existing.family_id)
      .neq('user_id', userId)
      .limit(1)

    if (others?.length > 0) {
      throw new Error('Você já pertence a uma família com outros membros. Peça ao admin para te remover antes de entrar em outra.')
    }

    // User is alone in their auto-created family — allow them to leave and join
    const { error: leaveError } = await supabase
      .from('hh_family_members')
      .delete()
      .eq('user_id', userId)
      .eq('family_id', existing.family_id)

    if (leaveError) throw leaveError
  }

  const { error } = await supabase.from('hh_family_members').insert({
    family_id:    familyId,
    user_id:      userId,
    display_name: userEmail.split('@')[0],
    role:         'member',
  })
  if (error) {
    if (error.code === '23503') throw new Error('Código de família inválido.')
    throw error
  }
}

// ============================================================
// TRIPS (VIAGENS)
// ============================================================

export async function getTrips(familyId) {
  const { data, error } = await supabase
    .from('hh_trips')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function addTrip(trip) {
  const { data, error } = await supabase
    .from('hh_trips')
    .insert(trip)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTrip(id, updates) {
  const { data, error } = await supabase
    .from('hh_trips')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTrip(id) {
  const { error } = await supabase.from('hh_trips').delete().eq('id', id)
  if (error) throw error
}

export async function getTripParticipants(tripId) {
  const { data, error } = await supabase
    .from('hh_trip_participants')
    .select('*')
    .eq('trip_id', tripId)
  if (error) throw error
  return data || []
}

export async function setTripParticipants(tripId, userIds) {
  const { error: delError } = await supabase
    .from('hh_trip_participants')
    .delete()
    .eq('trip_id', tripId)
  if (delError) throw delError

  if (userIds.length === 0) return []

  const rows = userIds.map(uid => ({ trip_id: tripId, user_id: uid }))
  const { data, error } = await supabase
    .from('hh_trip_participants')
    .insert(rows)
    .select()
  if (error) throw error
  return data || []
}

export async function getTripExpenses(tripId) {
  const { data, error } = await supabase
    .from('hh_trip_expenses')
    .select('*')
    .eq('trip_id', tripId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function addTripExpense(expense) {
  const { data, error } = await supabase
    .from('hh_trip_expenses')
    .insert(expense)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTripExpense(id, updates) {
  const { data, error } = await supabase
    .from('hh_trip_expenses')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTripExpense(id) {
  const { error } = await supabase.from('hh_trip_expenses').delete().eq('id', id)
  if (error) throw error
}

export async function getTripExpenseSplits(expenseId) {
  const { data, error } = await supabase
    .from('hh_trip_expense_splits')
    .select('*')
    .eq('expense_id', expenseId)
  if (error) throw error
  return data || []
}

export async function setTripExpenseSplits(expenseId, splits) {
  const { error: delError } = await supabase
    .from('hh_trip_expense_splits')
    .delete()
    .eq('expense_id', expenseId)
  if (delError) throw delError

  if (splits.length === 0) return []

  const rows = splits.map(s => ({ expense_id: expenseId, user_id: s.user_id, amount: s.amount }))
  const { data, error } = await supabase
    .from('hh_trip_expense_splits')
    .insert(rows)
    .select()
  if (error) throw error
  return data || []
}
