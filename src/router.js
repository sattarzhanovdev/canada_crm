import { Navigate, BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import OrderList from './pages/Orders/OrderList';
import UserList from './pages/Users/UserList';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/navbar';
import Salaries from './pages/Salaries';
import JobsList from './pages/Jobs';

const AppRouter = () => (
  <>
    <Navbar />
    <Routes>
      {/* Стартовая страница — редирект на /login */}
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<Login />} />
      <Route path="/salaries" element={<Salaries />} />

      {/* Админ */}
      <Route element={<PrivateRoute role="admin" />}>
        <Route path="/admin/orders" element={<OrderList />} />
        <Route path="/admin/jobs" element={<JobsList />} />
        <Route path="/admin/users" element={<UserList />} />
      </Route>

      {/* Менеджер */}
      <Route element={<PrivateRoute role="manager" />}>
        <Route path="/manager/orders" element={<OrderList />} />
        <Route path="/manager/jobs" element={<JobsList />} />
      </Route>

      {/* Техник */}
      <Route element={<PrivateRoute role="technician" />}>
        <Route path="/technician/orders" element={<OrderList />} />
        <Route path="/technician/jobs" element={<JobsList />} />
      </Route>

      {/* Fallback — неизвестный маршрут */}
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  </>
);

export default AppRouter;