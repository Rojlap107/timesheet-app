import { useState, useEffect } from 'react';
import { timesheetAPI } from '../services/api';
import TimeEntryRow from './TimeEntryRow';
import EditModal from './EditModal';

function TimesheetForm() {
  const [companies, setCompanies] = useState([]);
  const [workIds, setWorkIds] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [entries, setEntries] = useState([]);

  const [formData, setFormData] = useState({
    company_id: '',
    work_id: '',
    employee_id: '',
    entry_date: new Date().toISOString().split('T')[0]
  });

  const [timeEntries, setTimeEntries] = useState([
    { time_in: '09:00', time_out: '17:00' }
  ]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [editingEntry, setEditingEntry] = useState(null);

  useEffect(() => {
    loadReferenceData();
    loadEntries();
  }, []);

  const loadReferenceData = async () => {
    try {
      const [companiesRes, workIdsRes, employeesRes] = await Promise.all([
        timesheetAPI.getCompanies(),
        timesheetAPI.getWorkIds(),
        timesheetAPI.getEmployees()
      ]);

      setCompanies(companiesRes.data);
      setWorkIds(workIdsRes.data);
      setEmployees(employeesRes.data);
    } catch (error) {
      console.error('Failed to load reference data:', error);
    }
  };

  const loadEntries = async () => {
    try {
      const response = await timesheetAPI.getEntries();
      setEntries(response.data);
    } catch (error) {
      console.error('Failed to load entries:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleTimeEntryChange = (index, field, value) => {
    const updated = [...timeEntries];
    updated[index][field] = value;
    setTimeEntries(updated);
  };

  const addTimeEntry = () => {
    setTimeEntries([...timeEntries, { time_in: '09:00', time_out: '17:00' }]);
  };

  const removeTimeEntry = (index) => {
    if (timeEntries.length > 1) {
      setTimeEntries(timeEntries.filter((_, i) => i !== index));
    } else {
      setMessage('At least one time entry is required');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const calculateTotalHours = () => {
    let totalMinutes = 0;

    timeEntries.forEach((entry) => {
      if (entry.time_in && entry.time_out) {
        const [inHour, inMin] = entry.time_in.split(':').map(Number);
        const [outHour, outMin] = entry.time_out.split(':').map(Number);

        const inTotalMin = inHour * 60 + inMin;
        const outTotalMin = outHour * 60 + outMin;

        totalMinutes += outTotalMin - inTotalMin;
      }
    });

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}h ${minutes}m`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await timesheetAPI.createEntry({
        ...formData,
        time_entries: timeEntries
      });

      setMessage('Timesheet entry created successfully! Email notification sent.');

      // Reset form
      setFormData({
        company_id: '',
        work_id: '',
        employee_id: '',
        entry_date: new Date().toISOString().split('T')[0]
      });
      setTimeEntries([{ time_in: '09:00', time_out: '17:00' }]);

      // Reload entries
      loadEntries();

      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to create entry');
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
      setMessage('Failed to delete entry');
    }
  };

  const handleEditSave = async () => {
    loadEntries();
    setEditingEntry(null);
    setMessage('Entry updated successfully');
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="timesheet-form-container">
      <h2>New Timesheet Entry</h2>

      <form onSubmit={handleSubmit} className="timesheet-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="company">Company *</label>
            <select
              id="company"
              value={formData.company_id}
              onChange={(e) => handleInputChange('company_id', e.target.value)}
              required
            >
              <option value="">Select Company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="workId">Work ID *</label>
            <select
              id="workId"
              value={formData.work_id}
              onChange={(e) => handleInputChange('work_id', e.target.value)}
              required
            >
              <option value="">Select Work ID</option>
              {workIds.map((work) => (
                <option key={work.id} value={work.id}>
                  {work.work_id} - {work.description}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="employee">Employee *</label>
            <select
              id="employee"
              value={formData.employee_id}
              onChange={(e) => handleInputChange('employee_id', e.target.value)}
              required
            >
              <option value="">Select Employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} ({employee.employee_code})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="date">Date *</label>
            <input
              type="date"
              id="date"
              value={formData.entry_date}
              onChange={(e) => handleInputChange('entry_date', e.target.value)}
              required
            />
          </div>
        </div>

        <div className="time-entries-section">
          <h3>Time Entries</h3>

          {timeEntries.map((entry, index) => (
            <TimeEntryRow
              key={index}
              timeEntry={entry}
              index={index}
              onChange={handleTimeEntryChange}
              onRemove={removeTimeEntry}
            />
          ))}

          <button type="button" onClick={addTimeEntry} className="btn-secondary">
            + Add Time Entry
          </button>
        </div>

        <div className="total-hours">
          <strong>Total Hours: {calculateTotalHours()}</strong>
        </div>

        {message && <div className={message.includes('success') ? 'success-message' : 'error-message'}>{message}</div>}

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Submitting...' : 'Submit Timesheet'}
        </button>
      </form>

      <div className="entries-list">
        <h2>Recent Entries</h2>

        {entries.length === 0 ? (
          <p>No entries yet</p>
        ) : (
          <table className="entries-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Company</th>
                <th>Work ID</th>
                <th>Employee</th>
                <th>Total Hours</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const totalHours = entry.time_entries?.length > 0 ? (() => {
                  let totalMinutes = 0;
                  entry.time_entries.forEach((te) => {
                    const [inHour, inMin] = te.time_in.split(':').map(Number);
                    const [outHour, outMin] = te.time_out.split(':').map(Number);
                    totalMinutes += (outHour * 60 + outMin) - (inHour * 60 + inMin);
                  });
                  const hours = Math.floor(totalMinutes / 60);
                  const minutes = totalMinutes % 60;
                  return `${hours}h ${minutes}m`;
                })() : '0h 0m';

                return (
                  <tr key={entry.id}>
                    <td>{entry.unique_id}</td>
                    <td>{entry.entry_date}</td>
                    <td>{entry.company_name}</td>
                    <td>{entry.work_id}</td>
                    <td>{entry.employee_name}</td>
                    <td>{totalHours}</td>
                    <td>
                      <button onClick={() => handleEdit(entry)} className="btn-edit">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(entry.id)} className="btn-delete">
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {editingEntry && (
        <EditModal
          entry={editingEntry}
          companies={companies}
          workIds={workIds}
          employees={employees}
          onClose={() => setEditingEntry(null)}
          onSave={handleEditSave}
        />
      )}
    </div>
  );
}

export default TimesheetForm;
