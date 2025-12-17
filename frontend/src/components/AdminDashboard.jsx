import { useState, useEffect } from 'react';
import { userAPI, timesheetAPI } from '../services/api';
import UserManagement from './UserManagement';

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('users');

  return (
    <div className="admin-dashboard">
      <div className="admin-tabs">
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
          {showForm ? 'Cancel' : '+ Add Company'}
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

      <table className="admin-table">
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
        <h3>Job Type Management</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : '+ Add Job Type'}
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

      <table className="admin-table">
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
        <h3>Crew Chief Management</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : '+ Add Crew Chief'}
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

      <table className="admin-table">
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
    </div>
  );
}

export default AdminDashboard;

