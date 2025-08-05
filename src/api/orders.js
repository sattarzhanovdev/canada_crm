import axios from './axiosInstance';

// export const fetchOrders = () => axios.get('https://api.housecallpro.com/customers', {
//   headers: {
//     'Authorization': `Bearer 68aefa809b9d425c82f942d49286f4e4`
//   }
// });

export const fetchOrders = () => axios.get('/orders/');
export const fetchOrderById = (id) => axios.get(`/orders/${id}/`);
export const markPartUsed = (orderId, partId) =>
  axios.post(`/orders/${orderId}/use-part/`, { part_id: partId });

export const getUsers = () => axios.get('/users/')