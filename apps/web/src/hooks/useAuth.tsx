import React, { createContext, useContext, useState, useEffect } from 'react'

interface User {
  id: string
  phone: string
  username: string
  isVip: boolean
  isPermanentVip: boolean
  vipEndDate?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (phone: string, username: string, password: string, code: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  const login = async (username: string, password: string) => {
    const { login: loginApi } = await import('../services/api')
    const response = await loginApi(username, password)
    const userData = response.user
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const register = async (phone: string, username: string, password: string, code: string) => {
    const { register: registerApi } = await import('../services/api')
    const response = await registerApi(phone, username, password, code)
    const userData = response.user
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('user')
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
