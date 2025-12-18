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

  // Role-based Access Helpers
  const isAccountant = user.role === 'accountant';
  const isAdmin = user.role === 'admin';
  const isProgramManager = user.role === 'program_manager';

  // Determine default redirect for root path
  const getDefaultRedirect = () => {
    if (isAccountant) return "/export";
    return "/"; // Home for admin and pm
  };

  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <Link to={isAccountant ? "/export" : "/"} className="nav-brand" style={{ textDecoration: 'none', color: 'inherit' }}>
            <img src="/karmastaff logo.png" alt="Karma Staff Logo" className="nav-logo" />
            <h1>Timesheet System</h1>
          </Link>
          
          <button className="hamburger-menu" onClick={toggleMenu}>
            <span></span>
            <span></span>
            <span></span>
          </button>

          <div className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
            {!isAccountant && (
              <>
                <Link to="/" onClick={() => setIsMenuOpen(false)}>Home</Link>
                <Link to="/entries" onClick={() => setIsMenuOpen(false)}>Entries</Link>
              </>
            )}
            
            {(isAdmin || isAccountant) && (
              <Link to="/export" onClick={() => setIsMenuOpen(false)}>Export</Link>
            )}
            
            {isAdmin && (
              <Link to="/admin" onClick={() => setIsMenuOpen(false)}>Admin Dashboard</Link>
            )}
            
            <div className="nav-user">
              <span>{user.username} ({user.role})</span>
              <button onClick={handleLogout} className="btn-logout">Logout</button>
            </div>

            <div className="nav-user-mobile">
              <span>{user.username} ({user.role})</span>
              <button onClick={handleLogout} className="btn-logout">Logout</button>
            </div>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            {/* Home (Timesheet Form) - Admin & PM only */}
            <Route 
              path="/" 
              element={
                !isAccountant ? <TimesheetForm user={user} /> : <Navigate to="/export" replace />
              } 
            />
            
            {/* Entries - Admin & PM only */}
            <Route 
              path="/entries" 
              element={
                !isAccountant ? <EntriesPage user={user} /> : <Navigate to="/export" replace />
              } 
            />
            
            {/* Export - Admin & Accountant only */}
            <Route 
              path="/export" 
              element={
                (isAdmin || isAccountant) ? <ExportPage user={user} /> : <Navigate to="/" replace />
              } 
            />
            
            {/* Admin Dashboard - Admin only */}
            <Route 
              path="/admin" 
              element={
                isAdmin ? <AdminDashboard /> : <Navigate to="/" replace />
              } 
            />
            
            <Route path="*" element={<Navigate to={getDefaultRedirect()} replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
