import React, { createContext, useContext, useState, useEffect } from 'react';
const AuthContext = createContext(undefined);
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);
    const login = async (username, password) => {
        const { login: loginApi } = await import('../services/api');
        const response = await loginApi(username, password);
        const userData = response.user;
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
    };
    const register = async (phone, username, password, code) => {
        const { register: registerApi } = await import('../services/api');
        const response = await registerApi(phone, username, password, code);
        const userData = response.user;
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
    };
    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
    };
    return (<AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>);
};
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
