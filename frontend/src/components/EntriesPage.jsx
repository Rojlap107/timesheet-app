import { useState, useEffect } from 'react';
import { timesheetAPI } from '../services/api';
import EditModal from './EditModal';

function EntriesPage({ user }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [editingEntry, setEditingEntry] = useState(null);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const response = await timesheetAPI.getEntries();
      setEntries(response.data);
    } catch (error) {
      console.error('Failed to load entries:', error);
      setMessage('Failed to load entries');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this entry?')) {
      return;
    }

    try {
      await timesheetAPI.deleteEntry(id);
      setMessage('Entry deleted successfully');
      loadEntries();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to delete entry';
      setMessage(errorMsg);
    }
  };

  const handleEditSave = () => {
    loadEntries();
    setEditingEntry(null);
    setMessage('Entry updated successfully');
    setTimeout(() => setMessage(''), 3000);
  };

  const calculateTotalHours = (timeEntries) => {
    if (!timeEntries || timeEntries.length === 0) return '0h 0m';

    let totalMinutes = 0;
    timeEntries.forEach((te) => {
      const [inHour, inMin] = te.time_in.split(':').map(Number);
      const [outHour, outMin] = te.time_out.split(':').map(Number);
      totalMinutes += (outHour * 60 + outMin) - (inHour * 60 + inMin);
    });

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="entries-page">
      <h2>Timesheet Entries</h2>

      {message && (
        <div className={message.includes('success') ? 'success-message' : 'error-message'}>
          {message}
        </div>
      )}

      {loading ? (
        <p>Loading entries...</p>
      ) : entries.length === 0 ? (
        <p>No entries found</p>
      ) : (
        <table className="entries-table">
          <thead>
            <tr>
              <th>Job ID</th>
              <th>Date</th>
              <th>Company</th>
              <th>Crew Chief</th>
              <th>Total Hours</th>
              {user.role === 'admin' && <th>Created By</th>}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.job_id}</td>
                <td>{entry.entry_date}</td>
                <td>{entry.company_name}</td>
                <td>{entry.crew_chief_name}</td>
                <td>{calculateTotalHours(entry.time_entries)}</td>
                {user.role === 'admin' && <td>{entry.created_by}</td>}
                <td>
                  <button onClick={() => handleEdit(entry)} className="btn-edit">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(entry.id)} className="btn-delete">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editingEntry && (
        <EditModal
          entry={editingEntry}
          user={user}
          onClose={() => setEditingEntry(null)}
          onSave={handleEditSave}
        />
      )}
    </div>
  );
}

export default EntriesPage;
