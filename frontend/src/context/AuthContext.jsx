import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [state, setState] = useState('loading');
  async function restore() {
    setState('loading');
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      setState('ready');
    } catch (error) {
      setUser(null);
      setState(error.response?.status === 401 ? 'ready' : 'offline');
    }
  }
  useEffect(() => {
    const interceptor = api.interceptors.response.use(undefined, error => {
      if (error.response?.status === 401 && error.config?.url !== '/auth/login') {
        setUser(null);
        setState('ready');
      }
      return Promise.reject(error);
    });
    restore();
    return () => api.interceptors.response.eject(interceptor);
  }, []);
  async function login(values) {
    const { data } = await api.post('/auth/login', values);
    setUser(data.user);
  }
  async function logout() {
    try { await api.post('/auth/logout'); }
    catch (error) { if (error.response?.status !== 401) throw error; }
    setUser(null);
  }
  return <AuthContext.Provider value={{ user, state, restore, login, logout }}>{children}</AuthContext.Provider>;
}
