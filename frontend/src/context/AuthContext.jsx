import { createContext, useContext, useState, useEffect } from 'react'
import { authApi } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('fs_token')
    const stored = localStorage.getItem('fs_user')
    if (token && stored) setUser(JSON.parse(stored))
    setLoading(false)
  }, [])

  const login = async (credentials) => {
    const { data } = await authApi.login(credentials)
    localStorage.setItem('fs_token', data.token)
    localStorage.setItem('fs_user', JSON.stringify(data))
    setUser(data)
    return data
  }

  const register = async (credentials) => {
    const { data } = await authApi.register(credentials)
    localStorage.setItem('fs_token', data.token)
    localStorage.setItem('fs_user', JSON.stringify(data))
    setUser(data)
    return data
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch (_) {
      // Best-effort — clear client state regardless
    }
    localStorage.removeItem('fs_token')
    localStorage.removeItem('fs_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
