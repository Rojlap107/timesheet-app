import { useState, useEffect } from 'react';
import { userAPI, timesheetAPI } from '../services/api';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    company_id: '',
    role: 'program_manager'
  });

  useEffect(() => {
    loadUsers();
    loadCompanies();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getUsers();
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to load users:', error);
      setMessage('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    try {
      const response = await timesheetAPI.getCompanies();
      setCompanies(response.data);
    } catch (error) {
      console.error('Failed to load companies:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      if (editingUser) {
        await userAPI.updateUser(editingUser.id, formData);
        setMessage('User updated successfully');
      } else {
        await userAPI.createUser(formData);
        setMessage('User created successfully');
      }

      setFormData({ username: '', password: '', full_name: '', email: '', company_id: '', role: 'program_manager' });
      setShowForm(false);
      setEditingUser(null);
      loadUsers();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Operation failed';
      setMessage(errorMsg);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      full_name: user.full_name || '',
      email: user.email || '',
      company_id: user.company_id || '',
      role: user.role || 'program_manager'
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await userAPI.deleteUser(id);
      setMessage('User deleted successfully');
      loadUsers();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to delete user';
      setMessage(errorMsg);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingUser(null);
    setFormData({ username: '', password: '', full_name: '', email: '', company_id: '', role: 'program_manager' });
  };

  const formatRole = (role) => {
    switch (role) {
      case 'program_manager': return 'Program Manager';
      case 'admin': return 'Admin';
      case 'accountant': return 'Accountant';
      default: return role;
    }
  };

  return (
    <div className="user-management">
      <div className="section-header">
        <h3>User Management</h3>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + Create New User
          </button>
        )}
      </div>

      {message && (
        <div className={message.includes('success') ? 'success-message' : 'error-message'}>
          {message}
        </div>
      )}

      {showForm && (
        <div className="user-form-container">
          <h3>{editingUser ? 'Edit User' : 'Create New User'}</h3>
          <form onSubmit={handleSubmit} className="admin-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="username">Username *</label>
                <input
                  type="text"
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="full_name">Full Name</label>
                <input
                  type="text"
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="role">Role *</label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  required
                >
                  <option value="program_manager">Program Manager</option>
                  <option value="admin">Admin</option>
                  <option value="accountant">Accountant</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="company">Company *</label>
              <select
                id="company"
                value={formData.company_id}
                onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                required
              >
                <option value="">Select Company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name} ({company.abbreviation})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="password">
                Password {editingUser ? '(leave blank to keep current)' : '*'}
              </label>
              <input
                type="password"
                id="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!editingUser}
              />
            </div>

            <div className="form-actions">
              <button type="button" onClick={handleCancel} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {editingUser ? 'Update User' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p>Loading users...</p>
      ) : users.length === 0 ? (
        <p>No users found</p>
      ) : (
        <>
          {/* Desktop Table */}
          <table className="admin-table desktop-only">
            <thead>
              <tr>
                <th>Username</th>
                <th>Role</th>
                <th>Full Name</th>
                <th>Company</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{formatRole(user.role)}</td>
                  <td>{user.full_name || '-'}</td>
                  <td>{user.company_name} ({user.company_abbr})</td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td>
                    <button onClick={() => handleEdit(user)} className="btn-edit">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(user.id)} className="btn-delete">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile Card View */}
          <div className="mobile-list">
            <h3 className="mobile-section-title">EXISTING USERS</h3>
            {users.map((user) => (
              <div key={user.id} className="mobile-card">
                <div className="mobile-card-header">
                  <h4>{user.full_name || user.username}</h4>
                </div>
                <div className="mobile-card-content">
                  <p>Username: {user.username}</p>
                  <p>Role: {formatRole(user.role)}</p>
                  <p>Company: {user.company_name} ({user.company_abbr})</p>
                  <p className="created-at">created on {new Date(user.created_at).toLocaleDateString()}</p>
                </div>
                <div className="mobile-card-actions">
                  <button onClick={() => handleEdit(user)} className="btn-edit-sm">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(user.id)} className="btn-delete-sm">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default UserManagement;
