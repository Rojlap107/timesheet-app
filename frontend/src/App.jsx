import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { authAPI } from './services/api';
import Login from './components/Login';
import TimesheetForm from './components/TimesheetForm';
import EntriesPage from './components/EntriesPage';
import ExportPage from './components/ExportPage';
import UserManagement from './components/UserManagement';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.checkAuth();
      if (response.data.authenticated) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.log('Not authenticated');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <div className="nav-brand">
            <h1>Timesheet System</h1>
          </div>
          <div className="nav-links">
            <Link to="/">Home</Link>
            <Link to="/entries">Entries</Link>
            <Link to="/export">Export</Link>
            {user.role === 'admin' && <Link to="/users">Users</Link>}
          </div>
          <div className="nav-user">
            <span>Welcome, {user.username} ({user.role})</span>
            <button onClick={handleLogout} className="btn-logout">
              Logout
            </button>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<TimesheetForm user={user} />} />
            <Route path="/entries" element={<EntriesPage user={user} />} />
            <Route path="/export" element={<ExportPage user={user} />} />
            {user.role === 'admin' && <Route path="/users" element={<UserManagement />} />}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
