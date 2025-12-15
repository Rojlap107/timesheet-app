import { useState, useEffect } from 'react';
import { timesheetAPI } from '../services/api';
import TimeEntryRow from './TimeEntryRow';

function EditModal({ entry, user, onClose, onSave }) {
  const [companies, setCompanies] = useState([]);
  const [crewChiefs, setCrewChiefs] = useState([]);

  const [formData, setFormData] = useState({
    company_id: '',
    crew_chief_id: '',
    entry_date: ''
  });

  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (entry) {
      setFormData({
        company_id: entry.company_id,
        crew_chief_id: entry.crew_chief_id,
        entry_date: entry.entry_date
      });
      setTimeEntries(entry.time_entries || [{ time_in: '09:00', time_out: '17:00' }]);

      if (entry.company_id) {
        loadCrewChiefs(entry.company_id);
      }
    }
  }, [entry]);

  useEffect(() => {
    if (formData.company_id) {
      loadCrewChiefs(formData.company_id);
    }
  }, [formData.company_id]);

  const loadCompanies = async () => {
    try {
      const response = await timesheetAPI.getCompanies();
      setCompanies(response.data);
    } catch (error) {
      console.error('Failed to load companies:', error);
    }
  };

  const loadCrewChiefs = async (companyId) => {
    try {
      const response = await timesheetAPI.getCrewChiefs(companyId);
      setCrewChiefs(response.data);
    } catch (error) {
      console.error('Failed to load crew chiefs:', error);
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
    }
  };

  const calculateTotalHours = () => {
    let totalMinutes = 0;

    timeEntries.forEach((entry) => {
      if (entry.time_in && entry.time_out) {
        const [inHour, inMin] = entry.time_in.split(':').map(Number);
        const [outHour, outMin] = entry.time_out.split(':').map(Number);
        totalMinutes += (outHour * 60 + outMin) - (inHour * 60 + inMin);
      }
    });

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await timesheetAPI.updateEntry(entry.id, {
        ...formData,
        time_entries: timeEntries
      });

      onSave();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Timesheet Entry</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Job ID</label>
            <input
              type="text"
              value={entry.job_id}
              disabled
              className="readonly-field"
            />
            <small>Job ID cannot be changed after creation</small>
          </div>

          {user.role === 'admin' && (
            <div className="form-group">
              <label htmlFor="edit-company">Company *</label>
              <select
                id="edit-company"
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
          )}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="edit-crewChief">Crew Chief *</label>
              <select
                id="edit-crewChief"
                value={formData.crew_chief_id}
                onChange={(e) => handleInputChange('crew_chief_id', e.target.value)}
                required
              >
                <option value="">Select Crew Chief</option>
                {crewChiefs.map((cc) => (
                  <option key={cc.id} value={cc.id}>
                    {cc.name} {cc.employee_code && `(${cc.employee_code})`}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="edit-date">Date *</label>
              <input
                type="date"
                id="edit-date"
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

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditModal;
