import { createContext, useContext, useEffect, useState } from 'react';
import { login, fetchMe, resfreshToken } from '../api/auth';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      resfreshToken()
      fetchMe().then(res => {
        setUser(res.data)
        if(res.data.role === 'admin'){
          navigate('/admin/orders/')
        }else if(res.data.role === 'manager'){
          navigate('/manager/orders/')
        }else if(res.data.role === 'technician'){
          navigate('/technician/orders/')
        }
      });
    }
  }, []);

  const signIn = async (credentials) => {
    const res = await login(credentials);  // POST /api/token/
    localStorage.setItem('token', res.data.access);
    localStorage.setItem('refresh', res.data.refresh);

    const me = await fetchMe(); // GET /api/auth/me/
    setUser(me.data);

    localStorage.setItem('role', me.data.role); // ✅ это нужно!
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, signIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);