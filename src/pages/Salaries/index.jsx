import React, { use, useEffect, useState } from 'react'
import './Salaries.css'
import { fetchOrderById, fetchOrders, getUsers } from '../../api/orders'

const Salaries = () => {
  const [users, setUsers] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const usersRes = await getUsers()
        const ordersRes = await fetchOrderById(1) // если пагинация, можешь циклом добрать

        setUsers(usersRes.data)
        setOrders(ordersRes.data.jobs) // orders.jobs из HousecallPro API
        setLoading(false)
      } catch (error) {
        console.error('Ошибка загрузки данных:', error)
      }
    }

    fetchData()
  }, [])

  const calculateSalary = (user) => {
    // Фильтруем заказы, где этот техник был назначен
    const userOrders = orders.filter(order =>
      order.assigned_employees.some(emp => `${emp.first_name} ${emp.last_name}`.toLowerCase() === user.full_name.toLowerCase())
    )
    
    const totalAmount = userOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0)

    const partsCost = 0 // TODO: сюда подставь стоимость запчастей из order.notes или отдельного поля

    const salaryBase = totalAmount - partsCost
    const salary = salaryBase * (user.salary_percent / 100)

    return {
      totalAmount,
      partsCost,
      salaryBase,
      salary: Math.round(salary),
    }
  }

  if (loading) return <div>Загрузка...</div>
  console.log(users);
  

  return (
    <div className="salaries">
      <h1>Зарплатная система</h1>
      <table>
        <thead>
          <tr>
            <th>Имя</th>
            <th>Общая сумма заказов</th>
            <th>Стоимость запчастей</th>
            <th>Зарплатная база</th>
            <th>Процент</th>
            <th>Зарплата</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => {
            if (user.role !== 'technician') return null
            const { totalAmount, partsCost, salaryBase, salary } = calculateSalary(user)
            return (
              <tr key={user.id}>
                <td>{user.full_name || user.username}</td>
                <td>${totalAmount}</td>
                <td>${partsCost}</td>
                <td>${salaryBase}</td>
                <td>{user.salary_percent}%</td>
                <td><strong>${salary}</strong></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default Salaries