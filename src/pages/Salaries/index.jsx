// Salaries.jsx
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './Salaries.css';

const fmt = (n) => (typeof n === 'number' && !Number.isNaN(n) ? `$${n.toFixed(2)}` : '$0.00');

const getAuthHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
});

async function fetchUsers() {
  const res = await axios.get('/users/', { headers: getAuthHeader() });
  return res.data; // ожидается массив пользователей
}

async function fetchAllJobs() {
  // БЭК должен поддерживать /api/jobs/?all=1 и возвращать { jobs: [...] }
  const res = await axios.get('/jobs/', {
    headers: getAuthHeader(),
    params: { all: 1 },
  });
  return Array.isArray(res.data?.jobs) ? res.data.jobs : [];
}

// === Настройки, какие даты брать из job ===
// Приоритет: completed_at -> scheduled_start_at -> start_at -> created_at
const getJobDateISO = (job) =>
  job.completed_at || job.completedAt ||
  job.scheduled_start_at || job.scheduled_start ||
  job.start_at || job.startAt ||
  job.created_at || job.createdAt || null;

// сумма запчастей по job (пока 0, вот сюда подставишь API при необходимости)
const partsCostByJobId = new Map(); // jobId -> number

const Salaries = () => {
  const [users, setUsers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // фильтр по периодам
  const [fromDate, setFromDate] = useState(''); // 'YYYY-MM-DD'
  const [toDate, setToDate] = useState('');     // 'YYYY-MM-DD'

  useEffect(() => {
    (async () => {
      try {
        const [usersData, jobsData] = await Promise.all([fetchUsers(), fetchAllJobs()]);
        setUsers(Array.isArray(usersData) ? usersData : []);
        setJobs(Array.isArray(jobsData) ? jobsData : []);
      } catch (e) {
        console.error('Ошибка загрузки данных:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // --- пресеты периода ---
  const setToday = () => {
    const d = new Date();
    const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
    const iso = `${y}-${m}-${day}`;
    setFromDate(iso); setToDate(iso);
  };
  const setThisWeek = () => {
    const now = new Date();
    const day = now.getDay() || 7; // 1..7, где 1-пн, 7-вс
    const monday = new Date(now); monday.setDate(now.getDate() - (day - 1));
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    const f = monday.toISOString().slice(0,10);
    const t = sunday.toISOString().slice(0,10);
    setFromDate(f); setToDate(t);
  };
  const setThisMonth = () => {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth(); // 0..11
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    setFromDate(first.toISOString().slice(0,10));
    setToDate(last.toISOString().slice(0,10));
  };
  const setLastMonth = () => {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    const first = new Date(y, m - 1, 1);
    const last = new Date(y, m, 0);
    setFromDate(first.toISOString().slice(0,10));
    setToDate(last.toISOString().slice(0,10));
  };
  const clearRange = () => { setFromDate(''); setToDate(''); };

  // --- фильтрация jobs по диапазону дат ---
  const filteredJobs = useMemo(() => {
    if (!fromDate && !toDate) return jobs;
    const fromTs = fromDate ? new Date(fromDate + 'T00:00:00').getTime() : -Infinity;
    const toTs   = toDate   ? new Date(toDate   + 'T23:59:59').getTime() :  Infinity;

    return jobs.filter(j => {
      const iso = getJobDateISO(j);
      if (!iso) return false;
      const ts = new Date(iso).getTime();
      if (Number.isNaN(ts)) return false;
      return ts >= fromTs && ts <= toTs;
    });
  }, [jobs, fromDate, toDate]);

  // нормализатор имени для фолбэка
  const norm = (s) => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();

  // индексы пользователей (hcp_employee_id/имя)
  const { byHcpId, byName } = useMemo(() => {
    const _byHcp = new Map();
    const _byName = new Map();
    for (const u of users) {
      const name = norm(u.full_name || u.username || '');
      if (u.hcp_employee_id != null) _byHcp.set(String(u.hcp_employee_id), u);
      if (name) _byName.set(name, u);
    }
    return { byHcpId: _byHcp, byName: _byName };
  }, [users]);

  // вытаскиваем сотрудников/суммы из job
  const getAssignedEmployeeIds = (job) => {
    if (Array.isArray(job.assigned_employee_ids)) return job.assigned_employee_ids;
    if (Array.isArray(job.assigned_employees)) return job.assigned_employees.map(e => e.id).filter(Boolean);
    return [];
  };
  const getJobTotal = (job) => {
    const v = job.total ?? job.total_price ?? job.amount ?? job.grand_total ?? job.total_amount;
    return typeof v === 'number' ? v : Number(v) || 0;
  };

  // --- основной расчёт ЗП по техникам в выбранном диапазоне ---
  const salaries = useMemo(() => {
    const bucket = new Map(); // userId -> { user, jobs: [], totalAmount, partsCost }

    const pushToUser = (user, job) => {
      if (!user) return;
      if (!bucket.has(user.id)) {
        bucket.set(user.id, { user, jobs: [], totalAmount: 0, partsCost: 0 });
      }
      const entry = bucket.get(user.id);
      entry.jobs.push(job);
      entry.totalAmount += getJobTotal(job);
      entry.partsCost += (partsCostByJobId.get(job.id) || 0);
    };

    for (const job of filteredJobs) {
      let matched = false;

      // 1) по hcp_employee_id
      for (const id of getAssignedEmployeeIds(job).map(String)) {
        const user = byHcpId.get(id);
        if (user && user.role === 'technician') {
          pushToUser(user, job);
          matched = true;
        }
      }
      if (matched) continue;

      // 2) фолбэк по имени (если пришёл массив объектов assigned_employees)
      if (Array.isArray(job.assigned_employees) && job.assigned_employees.length) {
        for (const emp of job.assigned_employees) {
          const name = norm(`${emp.first_name || ''} ${emp.last_name || ''}`);
          const user = byName.get(name);
          if (user && user.role === 'technician') {
            pushToUser(user, job);
          }
        }
      }
    }

    return Array.from(bucket.values()).map((row) => {
      const salaryBase = Math.max(0, row.totalAmount - row.partsCost);
      const percent = Number(row.user.salary_percent) || 0;
      const salary = (salaryBase * percent) / 100;
      return {
        id: row.user.id,
        name: row.user.full_name || row.user.username,
        percent,
        totalAmount: row.totalAmount,
        partsCost: row.partsCost,
        salaryBase,
        salary,
        jobsCount: row.jobs.length,
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredJobs, byHcpId, byName]);

  // --- агрегаты по дням и по месяцам (для выбранного диапазона) ---
  const { byDay, byMonth } = useMemo(() => {
    // посчитаем общий фонд зарплат (сумма across users) по дням/месяцам
    const dayMap = new Map();   // 'YYYY-MM-DD' -> { total, parts, base, salary }
    const monthMap = new Map(); // 'YYYY-MM'    -> { ... }

    // Чтобы знать зарплату "по дню", посчитаем долю каждого job в сумме для своего техника.
    // Но проще и корректнее — сразу моделировать формулу на уровне job:
    // зарплата по job для техника = (jobTotal - partsCostForThisJob) * percent/100
    // если job назначен нескольким техникам — в этом примере ЗП не делим (нужны правила).
    // Допущение: job учитывается каждому назначенному технику по его проценту.
    const pushAgg = (key, map, add) => {
      const cur = map.get(key) || { total: 0, parts: 0, base: 0, salary: 0 };
      map.set(key, {
        total:  cur.total  + add.total,
        parts:  cur.parts  + add.parts,
        base:   cur.base   + add.base,
        salary: cur.salary + add.salary,
      });
    };

    for (const job of filteredJobs) {
      const iso = getJobDateISO(job);
      if (!iso) continue;
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) continue;

      const dayKey = d.toISOString().slice(0,10);         // YYYY-MM-DD
      const monthKey = dayKey.slice(0,7);                 // YYYY-MM
      const jobTotal = getJobTotal(job);
      const parts = partsCostByJobId.get(job.id) || 0;

      // найдём всех техников, кому засчитать job
      const matchedUsers = [];
      for (const id of getAssignedEmployeeIds(job).map(String)) {
        const u = byHcpId.get(id);
        if (u && u.role === 'technician') matchedUsers.push(u);
      }
      if (!matchedUsers.length && Array.isArray(job.assigned_employees)) {
        for (const emp of job.assigned_employees) {
          const name = norm(`${emp.first_name || ''} ${emp.last_name || ''}`);
          const u = byName.get(name);
          if (u && u.role === 'technician') matchedUsers.push(u);
        }
      }
      if (!matchedUsers.length) continue;

      // Добавляем вклад для каждого техника отдельно
      for (const u of matchedUsers) {
        const percent = Number(u.salary_percent) || 0;
        const base = Math.max(0, jobTotal - parts);
        const sal = (base * percent) / 100;

        pushAgg(dayKey, dayMap,   { total: jobTotal, parts, base, salary: sal });
        pushAgg(monthKey, monthMap, { total: jobTotal, parts, base, salary: sal });
      }
    }

    // отсортируем
    const sortEntries = (map) =>
      Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? -1 : 1))
        .map(([k, v]) => ({ key: k, ...v }));

    return { byDay: sortEntries(dayMap), byMonth: sortEntries(monthMap) };
  }, [filteredJobs, byHcpId, byName]);

  if (loading) return <div>Загрузка…</div>;

  return (
    <div className="salaries">
      <h1>Зарплатная система</h1>

      {/* Панель фильтра по периоду */}
      <div className="filters" style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:12}}>
        <label>От:
          <input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} />
        </label>
        <label>До:
          <input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} />
        </label>
        <button onClick={setToday}>Сегодня</button>
        <button onClick={setThisWeek}>Эта неделя</button>
        <button onClick={setThisMonth}>Этот месяц</button>
        <button onClick={setLastMonth}>Прошлый месяц</button>
        <button onClick={clearRange}>Сброс</button>
      </div>

      {/* Таблица по сотрудникам в выбранном диапазоне */}
      <table>
        <thead>
          <tr>
            <th>Сотрудник</th>
            <th>Кол-во заказов</th>
            <th>Общая сумма</th>
            <th>Стоимость запчастей</th>
            <th>Зарплатная база</th>
            <th>Процент</th>
            <th>Зарплата</th>
          </tr>
        </thead>
        <tbody>
          {salaries.map(row => (
            <tr key={row.id}>
              <td>{row.name}</td>
              <td>{row.jobsCount}</td>
              <td>{fmt(row.totalAmount)}</td>
              <td>{fmt(row.partsCost)}</td>
              <td>{fmt(row.salaryBase)}</td>
              <td>{row.percent}%</td>
              <td><strong>{fmt(row.salary)}</strong></td>
            </tr>
          ))}
          {!salaries.length && (
            <tr><td colSpan={7} style={{textAlign: 'center'}}>Нет данных</td></tr>
          )}
        </tbody>
      </table>

      {/* Сводка по дням */}
      <h3 style={{marginTop:24}}>Сводка по дням (выбранный период)</h3>
      <table>
        <thead>
          <tr>
            <th>День</th>
            <th>Общая сумма</th>
            <th>Запчасти</th>
            <th>База</th>
            <th>ЗП (сумма по всем)</th>
          </tr>
        </thead>
        <tbody>
          {byDay.map(row => (
            <tr key={row.key}>
              <td>{row.key}</td>
              <td>{fmt(row.total)}</td>
              <td>{fmt(row.parts)}</td>
              <td>{fmt(row.base)}</td>
              <td><strong>{fmt(row.salary)}</strong></td>
            </tr>
          ))}
          {!byDay.length && (
            <tr><td colSpan={5} style={{textAlign:'center'}}>Нет данных</td></tr>
          )}
        </tbody>
      </table>

      {/* Сводка по месяцам */}
      <h3 style={{marginTop:24}}>Сводка по месяцам (выбранный период)</h3>
      <table>
        <thead>
          <tr>
            <th>Месяц</th>
            <th>Общая сумма</th>
            <th>Запчасти</th>
            <th>База</th>
            <th>ЗП (сумма по всем)</th>
          </tr>
        </thead>
        <tbody>
          {byMonth.map(row => (
            <tr key={row.key}>
              <td>{row.key}</td>
              <td>{fmt(row.total)}</td>
              <td>{fmt(row.parts)}</td>
              <td>{fmt(row.base)}</td>
              <td><strong>{fmt(row.salary)}</strong></td>
            </tr>
          ))}
          {!byMonth.length && (
            <tr><td colSpan={5} style={{textAlign:'center'}}>Нет данных</td></tr>
          )}
        </tbody>
      </table>

      <p style={{marginTop: 8, fontSize: 12, opacity: 0.7}}>
        Дата берётся из: <code>completed_at → scheduled_start_at → start_at → created_at</code>.
        Если job назначен нескольким техникам — в сводке по дням/месяцам вклад считается для каждого отдельно (нужны правила, если хочешь делить).
      </p>
    </div>
  );
};

export default Salaries;