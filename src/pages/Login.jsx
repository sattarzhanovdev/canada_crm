import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './login.css'; // Подключаем стили

const Login = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.username || !form.password) {
      setError('Заполните все поля');
      return;
    }

    try {
      await signIn(form);
      const role = localStorage.getItem('role');

      if (role === 'admin') navigate('/admin/orders');
      else if (role === 'manager') navigate('/manager/orders');
      else if (role === 'technician') navigate('/technician/orders');
      else navigate('/login');
    } catch {
      setError('Неверный логин или пароль');
    }
  };

  return (
    <div className="login-wrapper">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2 className="login-title">🔐 Вход в систему</h2>

        {error && <div className="login-error">{error}</div>}

        <input
          type="text"
          placeholder="Логин"
          value={form.username}
          onChange={e => setForm({ ...form, username: e.target.value })}
        />
        <input
          type="password"
          placeholder="Пароль"
          value={form.password}
          onChange={e => setForm({ ...form, password: e.target.value })}
        />
        <button type="submit">Войти</button>
      </form>
    </div>
  );
};

export default Login;