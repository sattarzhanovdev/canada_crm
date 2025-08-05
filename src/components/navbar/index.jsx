import React from 'react'
import './navbar.css'
import { Link } from 'react-router-dom'

const Navbar = () => {
  const role = localStorage.getItem('role')
  return (
    <div className='navbar'>
      <ul>
        <li>
          <Link to={role === 'admin' ? '/admin/orders' : role === 'manager' ? '/manager/orders' : '/technician/orders'}>
            Home
          </Link>
        </li>
        <li>
          <Link to={'/salaries'}>
            Salaries
          </Link>
        </li>
      </ul>
    </div>
  )
}

export default Navbar