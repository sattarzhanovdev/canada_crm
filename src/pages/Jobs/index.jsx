// JobsList.jsx
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './orderList.css';

const JobsList = () => {
  const [jobs, setJobs] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const authHeader = useMemo(() => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  }), []);

  const fetchJobs = async (pageNumber) => {
    setLoading(true);
    try {
      // бэк: router.register('jobs', ...).list -> /jobs/?page=1
      const res = await axios.get('/jobs/', { headers: authHeader, params: { page }});
      const data = res.data || {};
      const items = Array.isArray(data?.jobs) ? data.jobs : [];
      setJobs(items);
      setTotalPages(Number(data?.total_pages) > 0 ? Number(data.total_pages) : 1);
    } catch (e) {
      console.error('Ошибка при загрузке jobs:', e);
      setJobs([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handlePrev = () => page > 1 && setPage(p => p - 1);
  const handleNext = () => page < totalPages && setPage(p => p + 1);

  const fmtDateTime = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
  };

  const pickCustomerName = (job) => {
    // пробуем разные варианты структуры
    const c = job.customer || job.client || {};
    const first = c.first_name || c.firstName || job.customer_first_name || '';
    const last  = c.last_name || c.lastName || job.customer_last_name || '';
    const full  = c.name || `${first} ${last}`.trim();
    return full || '—';
  };

  const pickPhones = (job) => {
    const c = job.customer || job.client || {};
    const phones = [
      c.mobile_number || c.mobileNumber,
      c.home_number || c.homeNumber,
      c.work_number || c.workNumber,
      job.phone,
    ].filter(Boolean);
    return phones.length ? phones.join(', ') : '—';
  };

  const pickAddress = (job) => {
    // иногда адрес лежит в job.address, иногда в customer.addresses[0]
    const a = job.address || job.service_address || job.location || {};
    const fromCustomer =
      (job.customer && Array.isArray(job.customer.addresses) && job.customer.addresses[0]) || null;

    const addr = a || fromCustomer || {};
    return addr.street || addr.line1 || addr.full || addr.address || '—';
  };

  const pickScheduled = (job) => {
    // варианты названий: scheduled_start_at / scheduled_start / start_at
    return (
      job.scheduled_start_at ||
      job.scheduled_start ||
      job.start_at ||
      job.startAt ||
      null
    );
  };

  const pickStatus = (job) =>
    job.status || job.state || '—';

  const pickTotal = (job) => {
    // total / total_price / amount / grand_total
    const val =
      job.total ||
      job.total_price ||
      job.amount ||
      job.grand_total ||
      (job.invoice && job.invoice.total);
    return typeof val === 'number' ? val.toFixed(2) : (val || '—');
  };

  const pickEmployees = (job) => {
    const ids = job.assigned_employee_ids || job.assignedEmployees || job.employees || [];
    if (Array.isArray(ids)) return ids.length ? `${ids.length}` : '0';
    return '—';
  };

  return (
    <div className="order-container">
      <h2 className="order-title">🧾 Jobs — page {page} of {totalPages}</h2>

      {loading ? (
        <div className="loader">Loading...</div>
      ) : (
        <>
          <div className="order-table-wrapper">
            <table className="order-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Status</th>
                  <th>Customer</th>
                  <th>Phones</th>
                  <th>Address</th>
                  <th>Scheduled</th>
                  <th>Employees</th>
                  <th>Total</th>
                  <th>Created</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(job => (
                  <tr key={job.id}>
                    <td>{job.id}</td>
                    <td>{pickStatus(job)}</td>
                    <td>{pickCustomerName(job)}</td>
                    <td>{pickPhones(job)}</td>
                    <td>{pickAddress(job)}</td>
                    <td>{fmtDateTime(pickScheduled(job))}</td>
                    <td>{pickEmployees(job)}</td>
                    <td>{pickTotal(job)}</td>
                    <td>{fmtDateTime(job.created_at || job.createdAt)}</td>
                    <td>{fmtDateTime(job.updated_at || job.updatedAt)}</td>
                  </tr>
                ))}
                {!jobs.length && (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center' }}>Нет заказов</td>
                  </tr>
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

export default JobsList;