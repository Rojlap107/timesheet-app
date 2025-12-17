import { useState, useEffect } from 'react';
import { userAPI, timesheetAPI } from '../services/api';
import UserManagement from './UserManagement';

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('users');

  return (
    <div className="admin-dashboard">
      {/* Desktop Tabs */}
      <div className="admin-tabs desktop-only">
        <button 
          className={activeTab === 'users' ? 'active' : ''} 
          onClick={() => setActiveTab('users')}
        >
          Program Managers
        </button>
        <button 
          className={activeTab === 'companies' ? 'active' : ''} 
          onClick={() => setActiveTab('companies')}
        >
          Companies
        </button>
        <button 
          className={activeTab === 'crew' ? 'active' : ''} 
          onClick={() => setActiveTab('crew')}
        >
          Crew Chiefs
        </button>
        <button 
          className={activeTab === 'jobs' ? 'active' : ''} 
          onClick={() => setActiveTab('jobs')}
        >
          Job Types
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'companies' && <CompanyManagement />}
        {activeTab === 'crew' && <CrewManagement />}
        {activeTab === 'jobs' && <JobTypeManagement />}
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="mobile-bottom-nav">
        <button 
          className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            <path d="M20 18v-3h-2v3h-3v2h3v3h2v-3h3v-2z" fill="none"/>
            <path d="M4 18v-3h2v3h3v2H6v3H4v-3H1v-2h3z"/> 
          </svg>
          <span>Users</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'companies' ? 'active' : ''}`}
          onClick={() => setActiveTab('companies')}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/>
          </svg>
          <span>Companies</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'crew' ? 'active' : ''}`}
          onClick={() => setActiveTab('crew')}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
          <span>Crew</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'jobs' ? 'active' : ''}`}
          onClick={() => setActiveTab('jobs')}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
          </svg>
          <span>Jobs</span>
        </button>
      </div>
    </div>
  );
}

function CompanyManagement() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', abbreviation: '', email: '', email_enabled: true });
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const response = await timesheetAPI.getCompanies();
      setCompanies(response.data);
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await timesheetAPI.createCompany(formData);
      setMessage('Company created successfully');
      setFormData({ name: '', abbreviation: '', email: '', email_enabled: true });
      setShowForm(false);
      loadCompanies();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to create company');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure? This might affect existing records.')) return;
    try {
      await timesheetAPI.deleteCompany(id);
      loadCompanies();
    } catch (error) {
      alert('Failed to delete company');
    }
  };

  return (
    <div className="management-section">
      <div className="section-header">
        <h3>Company Management</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : '+ New Company'}
        </button>
      </div>

      {message && <div className="message">{message}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <label>Name</label>
            <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          </div>
          <div className="form-group">
            <label>Abbreviation</label>
            <input value={formData.abbreviation} onChange={e => setFormData({...formData, abbreviation: e.target.value})} required maxLength="5" />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>
          <div className="form-group checkbox-group">
            <label>
              <input 
                type="checkbox" 
                checked={formData.email_enabled} 
                onChange={e => setFormData({...formData, email_enabled: e.target.checked})} 
              />
              Enable Email Notifications
            </label>
          </div>
          <button type="submit" className="btn-primary">Save</button>
        </form>
      )}

      <table className="admin-table desktop-only">
        <thead>
          <tr>
            <th>Name</th>
            <th>Abbr</th>
            <th>Email</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {companies.map(c => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{c.abbreviation}</td>
              <td>{c.email || '-'}</td>
              <td>
                <button onClick={() => handleDelete(c.id)} className="btn-delete">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile Card View */}
      <div className="mobile-list">
        <h3 className="mobile-section-title">EXISTING COMPANIES</h3>
        {companies.map(c => (
          <div key={c.id} className="mobile-card">
            <div className="mobile-card-header">
              <h4>{c.name}</h4>
            </div>
            <div className="mobile-card-content">
              <p>Abbreviation: {c.abbreviation}</p>
              <p>Email: {c.email || '-'}</p>
            </div>
            <div className="mobile-card-actions">
              <button className="btn-edit-sm">Edit</button>
              <button onClick={() => handleDelete(c.id)} className="btn-delete-sm">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function JobTypeManagement() {
  const [jobTypes, setJobTypes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ code: '', name: '', description: '' });

  useEffect(() => {
    loadJobTypes();
  }, []);

  const loadJobTypes = async () => {
    try {
      const response = await timesheetAPI.getJobTypes();
      setJobTypes(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await timesheetAPI.createJobType(formData);
      setFormData({ code: '', name: '', description: '' });
      setShowForm(false);
      loadJobTypes();
    } catch (error) {
      alert('Failed to create job type');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure?')) return;
    try {
      await timesheetAPI.deleteJobType(id);
      loadJobTypes();
    } catch (error) {
      alert('Failed to delete job type');
    }
  };

  return (
    <div className="management-section">
      <div className="section-header">
        <h3>Job Types</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : '+ New Job Type'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <label>Code (e.g., WTR)</label>
            <input value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} required maxLength="5" />
          </div>
          <div className="form-group">
            <label>Name</label>
            <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          </div>
          <button type="submit" className="btn-primary">Save</button>
        </form>
      )}

      <table className="admin-table desktop-only">
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {jobTypes.map(j => (
            <tr key={j.id || j.code}>
              <td>{j.code}</td>
              <td>{j.name}</td>
              <td>
                {j.id && <button onClick={() => handleDelete(j.id)} className="btn-delete">Delete</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile Card View */}
      <div className="mobile-list">
        <h3 className="mobile-section-title">EXISTING JOB TYPES</h3>
        {jobTypes.map(j => (
          <div key={j.id || j.code} className="mobile-card">
            <div className="mobile-card-header">
              <h4>{j.name}</h4>
            </div>
            <div className="mobile-card-content">
              <p>Code: {j.code}</p>
            </div>
            {j.id && (
              <div className="mobile-card-actions">
                <button className="btn-edit-sm">Edit</button>
                <button onClick={() => handleDelete(j.id)} className="btn-delete-sm">Delete</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CrewManagement() {
  const [crews, setCrews] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', employee_code: '', company_id: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [crewRes, compRes] = await Promise.all([
        timesheetAPI.getCrewChiefs(),
        timesheetAPI.getCompanies()
      ]);
      setCrews(crewRes.data);
      setCompanies(compRes.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await timesheetAPI.createCrewChief(formData);
      setFormData({ name: '', employee_code: '', company_id: '' });
      setShowForm(false);
      loadData();
    } catch (error) {
      alert('Failed to create crew chief');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure?')) return;
    try {
      await timesheetAPI.deleteCrewChief(id);
      loadData();
    } catch (error) {
      alert('Failed to delete crew chief');
    }
  };

  return (
    <div className="management-section">
      <div className="section-header">
        <h3>Crew Chiefs</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : '+ New Crew Chief'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <label>Name</label>
            <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          </div>
          <div className="form-group">
            <label>Code (Optional)</label>
            <input value={formData.employee_code} onChange={e => setFormData({...formData, employee_code: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Company</label>
            <select value={formData.company_id} onChange={e => setFormData({...formData, company_id: e.target.value})} required>
              <option value="">Select Company</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary">Save</button>
        </form>
      )}

      <table className="admin-table desktop-only">
        <thead>
          <tr>
            <th>Name</th>
            <th>Code</th>
            <th>Company</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {crews.map(c => {
            const company = companies.find(comp => comp.id === c.company_id);
            return (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.employee_code || '-'}</td>
                <td>{company ? company.name : '-'}</td>
                <td>
                  <button onClick={() => handleDelete(c.id)} className="btn-delete">Delete</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Mobile Card View */}
      <div className="mobile-list">
        <h3 className="mobile-section-title">EXISTING CHIEFS</h3>
        {crews.map(c => {
          const company = companies.find(comp => comp.id === c.company_id);
          return (
            <div key={c.id} className="mobile-card">
              <div className="mobile-card-header">
                <h4>{c.name}</h4>
              </div>
              <div className="mobile-card-content">
                <p>Code: {c.employee_code || '-'}</p>
                <p>Company: {company ? company.name : '-'}</p>
                <p className="created-at">created on 15/12/2025</p>
              </div>
              <div className="mobile-card-actions">
                <button className="btn-edit-sm">Edit</button>
                <button onClick={() => handleDelete(c.id)} className="btn-delete-sm">Delete</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AdminDashboard;
