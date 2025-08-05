import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './orderList.css';

const OrderList = () => {
  const [orders, setOrders] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState('');
  const userId = localStorage.getItem('user_id');
  const fetchRole = async () => {
    try {
      const res = await axios.get('/me/', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      setRole(res.data.role);
      localStorage.setItem('user_id', res.data.id);
    } catch (err) {
      console.error('Ошибка при получении роли:', err);
    }
  };

  // ✅ Получение списка сотрудников
  const fetchEmployees = async () => {
    try {
      const res = await axios.get('/employees/', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      setEmployees(res.data);
    } catch (err) {
      console.error('Ошибка при получении сотрудников:', err);
    }
  };

  const getOrders = async (pageNumber) => {
    setLoading(true);
    try {
      const res = await axios.get(`/orders/${page}/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = res.data;
      setOrders(data?.jobs);
      setTotalPages(data?.total_pages);
    } catch (error) {
      console.error('Ошибка при загрузке заказов:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getOrders(page);
    fetchEmployees();
    fetchRole();
  }, [page]);

  const handlePrev = () => page > 1 && setPage((p) => p - 1);
  const handleNext = () => page < totalPages && setPage((p) => p + 1);

  // ✅ Изменение статуса
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await axios.patch(`/jobs/${orderId}/update/`, {
        status: newStatus,
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      getOrders(page);
    } catch (err) {
      console.error('Ошибка при обновлении статуса:', err);
    }
  };

  // ✅ Изменение назначенных техников
  const handleEmployeeChange = async (orderId, employeeIds) => {
    try {
      await axios.patch(`/jobs/${orderId}/update/`, {
        assigned_employee_ids: employeeIds,
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      getOrders(page);
    } catch (err) {
      console.error('Ошибка при назначении сотрудника:', err);
    }
  };

  console.log(role);
  

  return (
    <div className="order-container">
      <h2 className="order-title">📦 Список заказов — страница {page} из {totalPages}</h2>

      {loading ? (
        <div className="loader">Загрузка...</div>
      ) : (
        <>
          <div className="order-table-wrapper">
            <table className="order-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Invoice #</th>
                  <th>Описание</th>
                  <th>Клиент</th>
                  <th>Техник</th>
                  <th>Дата</th>
                  <th>Адрес</th>
                  <th>Сумма</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {orders?.filter(order => {
                  if (role === 'technician') {
                    return order.assigned_employees.some(emp => String(emp.id) === String(userId));
                  }
                  return true;
                }).map((order) => (
                  <tr key={order.id}>
                    <td>{order.id}</td>
                    <td>{order.invoice_number}</td>
                    <td>{order.description || '—'}</td>
                    <td>{order.customer.first_name} {order.customer.last_name}</td>

                    {/* ✅ Смена назначенных */}
                    <td>
                      {order.assigned_employees.map(item => item.first_name + ' ' + item.last_name)}
                    </td>

                    <td>{new Date(order.created_at).toLocaleDateString()}</td>
                    <td>{order.address?.street || '—'}</td>
                    <td>{order.total_amount}</td>
                    {
                      localStorage.getItem('role') === 'admin' ?
                        <td>
                        <select
                          value={order.work_status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        >
                          <option value="pro canceled">pro canceled</option>
                          <option value="scheduled">scheduled</option>
                          <option value="in_progress">in_progress</option>
                          <option value="completed">completed</option>
                        </select>
                      </td> :
                      <td>{order.work_status}</td>
                    }
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <button onClick={handlePrev} disabled={page === 1}>← Назад</button>
            <span>{page} / {totalPages}</span>
            <button onClick={handleNext} disabled={page === totalPages}>Вперёд →</button>
          </div>
        </>
      )}
    </div>
  );
};

export default OrderList;