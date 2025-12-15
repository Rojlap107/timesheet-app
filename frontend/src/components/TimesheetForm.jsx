import { useState, useEffect } from 'react';
import { timesheetAPI } from '../services/api';
import TimeEntryRow from './TimeEntryRow';

function TimesheetForm({ user }) {
  const [companies, setCompanies] = useState([]);
  const [jobTypes, setJobTypes] = useState([]);
  const [crewChiefs, setCrewChiefs] = useState([]);
  const [newCrewChiefName, setNewCrewChiefName] = useState('');

  const [formData, setFormData] = useState({
    company_id: user.role === 'program_manager' ? user.company_id : '',
    crew_chief_id: '',
    entry_date: new Date().toISOString().split('T')[0],
    unique_number: '',
    job_type: ''
  });

  const [timeEntries, setTimeEntries] = useState([
    { time_in: '09:00', time_out: '17:00' }
  ]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadReferenceData();
  }, []);

  useEffect(() => {
    if (formData.company_id) {
      loadCrewChiefs(formData.company_id);
    }
  }, [formData.company_id]);

  const loadReferenceData = async () => {
    try {
      const jobTypesRes = await timesheetAPI.getJobTypes();
      setJobTypes(jobTypesRes.data);

      if (user.role === 'admin') {
        const companiesRes = await timesheetAPI.getCompanies();
        setCompanies(companiesRes.data);
      } else {
        const companiesRes = await timesheetAPI.getCompanies();
        const userCompany = companiesRes.data.find(c => c.id === user.company_id);
        setCompanies(userCompany ? [userCompany] : []);
        if (user.company_id) {
          loadCrewChiefs(user.company_id);
        }
      }
    } catch (error) {
      console.error('Failed to load reference data:', error);
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

  const handleCrewChiefSelection = (value) => {
    if (value === 'new') {
      setFormData({ ...formData, crew_chief_id: 'new' });
    } else {
      setFormData({ ...formData, crew_chief_id: value });
      setNewCrewChiefName('');
    }
  };

  const generateJobIdPreview = () => {
    if (!formData.company_id || !formData.unique_number || !formData.job_type) {
      return 'Job ID will appear here';
    }

    const company = companies.find(c => c.id === parseInt(formData.company_id));
    if (!company) return 'Job ID will appear here';

    const year = new Date(formData.entry_date).getFullYear().toString().slice(-2);
    const num = formData.unique_number.padStart(4, '0');

    return `${company.abbreviation}-${year}-${num}-${formData.job_type}`;
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
    setMessage('');

    try {
      let crewChiefId = formData.crew_chief_id;

      // Create new crew chief if needed
      if (crewChiefId === 'new' && newCrewChiefName) {
        const response = await timesheetAPI.createCrewChief({
          name: newCrewChiefName,
          company_id: formData.company_id
        });
        crewChiefId = response.data.id;

        // Reload crew chiefs
        await loadCrewChiefs(formData.company_id);
      }

      await timesheetAPI.createEntry({
        company_id: formData.company_id,
        crew_chief_id: crewChiefId,
        entry_date: formData.entry_date,
        unique_number: formData.unique_number,
        job_type: formData.job_type,
        time_entries: timeEntries
      });

      setMessage('Timesheet entry created successfully! Email notification sent.');

      // Reset form
      setFormData({
        company_id: user.role === 'program_manager' ? user.company_id : '',
        crew_chief_id: '',
        entry_date: new Date().toISOString().split('T')[0],
        unique_number: '',
        job_type: ''
      });
      setTimeEntries([{ time_in: '09:00', time_out: '17:00' }]);
      setNewCrewChiefName('');

      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to create entry';
      setMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="timesheet-form-container">
      <h2>New Timesheet Entry</h2>

      <form onSubmit={handleSubmit} className="timesheet-form">
        {user.role === 'admin' && (
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
                  {company.name} ({company.abbreviation})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form-row">
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

          <div className="form-group">
            <label htmlFor="uniqueNum">Unique Number (4 digits) *</label>
            <input
              type="text"
              id="uniqueNum"
              value={formData.unique_number}
              onChange={(e) => handleInputChange('unique_number', e.target.value)}
              pattern="[0-9]{1,4}"
              maxLength="4"
              placeholder="0223"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="jobType">Job Type *</label>
            <select
              id="jobType"
              value={formData.job_type}
              onChange={(e) => handleInputChange('job_type', e.target.value)}
              required
            >
              <option value="">Select Type</option>
              {jobTypes.map((type) => (
                <option key={type.code} value={type.code}>
                  {type.name} ({type.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="job-id-preview">
          <strong>Job ID: </strong>
          <span>{generateJobIdPreview()}</span>
        </div>

        <div className="form-group">
          <label htmlFor="crewChief">Crew Chief / Project Manager *</label>
          <select
            id="crewChief"
            value={formData.crew_chief_id}
            onChange={(e) => handleCrewChiefSelection(e.target.value)}
            required
          >
            <option value="">Select Crew Chief</option>
            {crewChiefs.map((cc) => (
              <option key={cc.id} value={cc.id}>
                {cc.name} {cc.employee_code && `(${cc.employee_code})`}
              </option>
            ))}
            <option value="new">+ Add New Crew Chief</option>
          </select>
        </div>

        {formData.crew_chief_id === 'new' && (
          <div className="form-group">
            <label htmlFor="newCrewChief">New Crew Chief Name *</label>
            <input
              type="text"
              id="newCrewChief"
              value={newCrewChiefName}
              onChange={(e) => setNewCrewChiefName(e.target.value)}
              placeholder="Enter name"
              required
            />
          </div>
        )}

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

        {message && (
          <div className={message.includes('success') ? 'success-message' : 'error-message'}>
            {message}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Submitting...' : 'Submit Timesheet'}
        </button>
      </form>
    </div>
  );
}

export default TimesheetForm;
