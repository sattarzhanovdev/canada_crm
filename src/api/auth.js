import axios from 'axios';

// Авторизация (JWT)
export const login = (credentials) =>
  axios.post('/token/', credentials);  // ← вот тут путь к JWT

// Получение текущего пользователя
export const fetchMe = () =>
  axios.get('/auth/me/', {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  }).catch(() => axios.post('/token/refresh/', {refresh: localStorage.getItem('refresh')}).then(res => {
    localStorage.setItem('token', res.data.access)
    localStorage.setItem('refresh', res.data.refresh)
  }));

export const resfreshToken = () => {
  return axios.post('/token/refresh/', {refresh: localStorage.getItem('refresh')})
    .then(res => {
      localStorage.setItem('token', res.data.access);
      localStorage.setItem('refresh', res.data.refresh);
      return res.data;
    })
}