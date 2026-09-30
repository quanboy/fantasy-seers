import { createContext, useCallback, useContext, useState, useEffect, useRef } from 'react'
import { authApi, SESSION_EXPIRED_EVENT } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const authAttemptRef = useRef(0)
  const sessionVersionRef = useRef(0)

  const cancelPendingAuth = useCallback(() => {
    authAttemptRef.current += 1
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('fs_token')
    const stored = localStorage.getItem('fs_user')
    if (token && stored) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (payload.exp * 1000 < Date.now()) {
          localStorage.removeItem('fs_token')
          localStorage.removeItem('fs_user')
        } else {
          setUser(JSON.parse(stored))
        }
      } catch {
        localStorage.removeItem('fs_token')
        localStorage.removeItem('fs_user')
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const becomeGuest = () => setUser(null)
    window.addEventListener(SESSION_EXPIRED_EVENT, becomeGuest)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, becomeGuest)
  }, [])

  const authenticate = useCallback(async (request) => {
    const attempt = ++authAttemptRef.current
    const { data } = await request()
    if (attempt !== authAttemptRef.current) return null
    sessionVersionRef.current += 1
    localStorage.setItem('fs_token', data.token)
    localStorage.setItem('fs_user', JSON.stringify(data))
    setUser(data)
    return data
  }, [])

  const login = useCallback(
    (credentials) => authenticate(() => authApi.login(credentials)),
    [authenticate]
  )

  const register = useCallback(
    (credentials) => authenticate(() => authApi.register(credentials)),
    [authenticate]
  )

  const logout = async () => {
    cancelPendingAuth()
    const sessionVersion = sessionVersionRef.current
    try {
      await authApi.logout()
    } catch (_) {
      // Best-effort — clear client state regardless
    }
    if (sessionVersion !== sessionVersionRef.current) return
    sessionVersionRef.current += 1
    localStorage.removeItem('fs_token')
    localStorage.removeItem('fs_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, cancelPendingAuth, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
