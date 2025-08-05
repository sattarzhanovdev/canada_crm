import { AuthProvider } from './context/AuthContext';
import AppRouter from './router';
import axios from 'axios';
import './App.css'
import { BrowserRouter as Router } from 'react-router-dom';

axios.defaults.baseURL = 'https://canadacrm.pythonanywhere.com/api'; // Set your API base URL here

const App = () => (
  <Router>
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  </Router>
);

export default App;
