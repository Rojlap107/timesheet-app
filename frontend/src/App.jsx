import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { authAPI } from './services/api';
import Login from './components/Login';
import TimesheetForm from './components/TimesheetForm';
import EntriesPage from './components/EntriesPage';
import ExportPage from './components/ExportPage';
import AdminDashboard from './components/AdminDashboard';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
      setIsMenuOpen(false);
      // Force redirect to home page and clear history
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
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
          <Link to="/" className="nav-brand" style={{ textDecoration: 'none', color: 'inherit' }}>
            <img src="/karmastaff logo.png" alt="Karma Staff Logo" className="nav-logo" />
            <h1>Timesheet System</h1>
          </Link>
          
          <button className="hamburger-menu" onClick={toggleMenu}>
            <span></span>
            <span></span>
            <span></span>
          </button>

          <div className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
            <Link to="/" onClick={() => setIsMenuOpen(false)}>Home</Link>
            <Link to="/entries" onClick={() => setIsMenuOpen(false)}>Entries</Link>
            <Link to="/export" onClick={() => setIsMenuOpen(false)}>Export</Link>
            {user.role === 'admin' && (
              <Link to="/admin" onClick={() => setIsMenuOpen(false)}>Admin Dashboard</Link>
            )}
            <div className="nav-user-mobile">
              <span>{user.username} ({user.role})</span>
              <button onClick={handleLogout} className="btn-logout">Logout</button>
            </div>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<TimesheetForm user={user} />} />
            <Route path="/entries" element={<EntriesPage user={user} />} />
            <Route path="/export" element={<ExportPage user={user} />} />
            {user.role === 'admin' && <Route path="/admin" element={<AdminDashboard />} />}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
