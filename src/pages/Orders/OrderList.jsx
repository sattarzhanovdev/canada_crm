// CustomerList.jsx
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './orderList.css'; // переиспользуем стили таблицы/пагинации

const CustomerList = () => {
  const [customers, setCustomers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const authHeader = useMemo(() => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  }), []);

  const getCustomers = async (pageNumber) => {
    setLoading(true);
    try {
      const res = await axios.get(`/orders/${pageNumber}/`, { headers: authHeader });
      const data = res.data || {};
      const items = Array.isArray(data?.customers) ? data.customers : [];
      setCustomers(items);
      setTotalPages(Number(data?.total_pages) > 0 ? Number(data.total_pages) : 1);
    } catch (e) {
      console.error('Ошибка при загрузке клиентов:', e);
      setCustomers([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCustomers(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handlePrev = () => page > 1 && setPage(p => p - 1);
  const handleNext = () => page < totalPages && setPage(p => p + 1);

  const fmtDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '—' : d.toLocaleString();
  };

  const pickAddress = (addresses) => {
    if (!Array.isArray(addresses) || !addresses.length) return '—';
    // приоритет billing, иначе первый
    const billing = addresses.find(a => a?.type === 'billing');
    const a = billing || addresses[0];
    // пробуем разные поля
    return a?.street || a?.line1 || a?.full || '—';
  };

  return (
    <div className="order-container">
      <h2 className="order-title">👥 Customers — page {page} of {totalPages}</h2>

      {loading ? (
        <div className="loader">Loading...</div>
      ) : (
        <>
          <div className="order-table-wrapper">
            <table className="order-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>First name</th>
                  <th>Last name</th>
                  <th>Email</th>
                  <th>Mobile</th>
                  <th>Home</th>
                  <th>Work</th>
                  <th>Company</th>
                  <th>Tags</th>
                  <th>Address</th>
                  <th>Created</th>
                  <th>Updated</th>
                  <th>Notifications</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td>{c.first_name || '—'}</td>
                    <td>{c.last_name || '—'}</td>
                    <td>{c.email || '—'}</td>
                    <td>{c.mobile_number || '—'}</td>
                    <td>{c.home_number || '—'}</td>
                    <td>{c.work_number || '—'}</td>
                    <td>{c.company_name || '—'}</td>
                    <td>{Array.isArray(c.tags) && c.tags.length ? c.tags.join(', ') : '—'}</td>
                    <td>{pickAddress(c.addresses)}</td>
                    <td>{fmtDate(c.created_at)}</td>
                    <td>{fmtDate(c.updated_at)}</td>
                    <td>{c.notifications_enabled ? 'on' : 'off'}</td>
                  </tr>
                ))}
                {!customers.length && (
                  <tr><td colSpan={13} style={{ textAlign: 'center' }}>Нет клиентов</td></tr>
                )}
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

export default CustomerList;