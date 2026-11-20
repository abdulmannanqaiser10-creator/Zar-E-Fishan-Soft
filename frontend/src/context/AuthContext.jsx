import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authAPI } from '../api'

const AuthContext = createContext(null)

const TOKEN_KEY = 'zf_token'
const USER_KEY = 'zf_user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(USER_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(true)

  const persistSession = useCallback((token, nextUser) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
    setUser(nextUser)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }, [])

  const updateUser = useCallback((nextUser) => {
    setUser(nextUser)
    if (nextUser) localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
  }, [])

  const login = useCallback(
    async (email, password) => {
      const res = await authAPI.login({ email, password })
      const body = res.data
      if (!body?.token || !body?.user) {
        throw new Error('Invalid login response')
      }
      persistSession(body.token, body.user)
      return body.user
    },
    [persistSession],
  )

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setLoading(false)
      return
    }

    authAPI
      .me()
      .then((res) => {
        if (res.data?.user) {
          localStorage.setItem(USER_KEY, JSON.stringify(res.data.user))
          setUser(res.data.user)
        }
      })
      .catch(() => logout())
      .finally(() => setLoading(false))
  }, [logout])

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      logout,
      updateUser,
    }),
    [user, loading, login, logout, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}