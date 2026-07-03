import { createContext, useState, useEffect, useContext } from 'react';
import api, { friendlyError } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await api.get('/auth/status');
        if (response.data.authenticated) {
          setUser(response.data.user);
        }
      } catch (error) {
        console.error("Auth status check failed", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (username, password, remember) => {
    try {
      const response = await api.post('/auth/login', { username, password, remember });
      if (response.data.success) {
        // Re-fetch status to get full user object
        const statusRes = await api.get('/auth/status');
        if (statusRes.data.authenticated) {
          setUser(statusRes.data.user);
          return statusRes.data.user;
        }
        return response.data.user || { is_admin: response.data.is_admin };
      }
      throw new Error(friendlyError({ response: { data: response.data } }, 'Unable to sign in. Please check your credentials and try again.'));
    } catch (error) {
      throw new Error(friendlyError(error, 'Unable to sign in. Please check your credentials and try again.'));
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      if (!response.data.success) {
        throw new Error(friendlyError({ response: { data: response.data } }, 'We could not complete your registration. Please try again.'));
      }
      return true;
    } catch (error) {
      throw new Error(friendlyError(error, 'We could not complete your registration. Please try again.'));
    }
  };

  const verifyEmail = async (code) => {
    try {
      const response = await api.post('/auth/verify-email', { code });
      if (!response.data.success) {
        throw new Error(friendlyError({ response: { data: response.data } }, 'We could not verify your email. Please check the code and try again.'));
      }
      return true;
    } catch (error) {
      throw new Error(friendlyError(error, 'We could not verify your email. Please check the code and try again.'));
    }
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, verifyEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
