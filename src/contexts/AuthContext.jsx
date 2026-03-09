// @refresh reset
import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, getOrCreateFamily } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [familyId, setFamilyId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [familyError, setFamilyError] = useState(null)

  useEffect(() => {
    // Safety net: if loading stays true for 30s, something is wrong (DB paused, network, etc.)
    const safetyTimer = setTimeout(() => {
      setLoading(prev => {
        if (prev) {
          setFamilyError('Tempo de conexão excedido. Verifique sua internet e tente novamente.')
        }
        return false
      })
    }, 30000)

    // Use ONLY onAuthStateChange — it fires INITIAL_SESSION on load, equivalent to getSession.
    // Having both causes concurrent getOrCreateFamily calls that fight over the Supabase auth lock.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // TOKEN_REFRESHED just updates the user object — no need to re-query the family
      if (event === 'TOKEN_REFRESHED') {
        if (session?.user) setUser(session.user)
        return
      }

      try {
        if (session?.user) {
          setUser(session.user)
          const fid = await getOrCreateFamily(session.user.id, session.user.email)
          setFamilyId(fid)
          setFamilyError(null)
        } else {
          setUser(null)
          setFamilyId(null)
          setFamilyError(null)
        }
      } catch (err) {
        console.error('HassHalt auth error:', err?.message, err)
        setFamilyError(err?.message || 'Erro desconhecido')
      } finally {
        setLoading(false)
      }
    })

    return () => { clearTimeout(safetyTimer); subscription.unsubscribe() }
  }, [])

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ user, familyId, loading, familyError, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
