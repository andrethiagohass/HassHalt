// @refresh reset
import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, getOrCreateFamily } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null)
  const [familyId, setFamilyId]       = useState(null)
  const [displayName, setDisplayName] = useState(null)
  const [loading, setLoading]         = useState(true)   // auth only — resolves instantly from localStorage
  const [familyLoading, setFamilyLoading] = useState(false) // DB query — can be slow on cold start
  const [familyError, setFamilyError] = useState(null)

  // Effect 1: Auth — reads from localStorage, NO network call, resolves in <100ms
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    }).catch(() => setLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return // handled by getSession above
      if (event === 'TOKEN_REFRESHED') {
        if (session?.user) setUser(session.user)
        return
      }
      if (event === 'SIGNED_IN')  setUser(session?.user ?? null)
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setFamilyId(null)
        setDisplayName(null)
        setFamilyError(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Effect 2: Family data — triggered by user.id change, can be slow (Supabase DB / cold start)
  useEffect(() => {
    if (!user) return
    let cancelled = false

    setFamilyLoading(true)
    setFamilyError(null)

    getOrCreateFamily(user.id, user.email)
      .then(({ familyId: fid, displayName: dn }) => {
        if (!cancelled) { setFamilyId(fid); setDisplayName(dn) }
      })
      .catch(err => {
        if (!cancelled) setFamilyError(err?.message || 'Erro ao conectar ao servidor.')
      })
      .finally(() => {
        if (!cancelled) setFamilyLoading(false)
      })

    return () => { cancelled = true }
  }, [user?.id])

  const retryFamily = () => {
    if (!user) return
    setFamilyError(null)
    setFamilyLoading(true)
    getOrCreateFamily(user.id, user.email)
      .then(({ familyId: fid, displayName: dn }) => { setFamilyId(fid); setDisplayName(dn) })
      .catch(err => setFamilyError(err?.message || 'Erro ao conectar ao servidor.'))
      .finally(() => setFamilyLoading(false))
  }

  const signIn  = (email, password) => supabase.auth.signInWithPassword({ email, password })
  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{
      user, familyId, displayName, setDisplayName,
      loading, familyLoading, familyError,
      signIn, signOut, retryFamily,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
