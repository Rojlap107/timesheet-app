import { useState, useEffect, useRef } from 'react';
import { timesheetAPI } from '../services/api';

// Combobox Component for Staff Selection
const StaffCombobox = ({ value, onChange, options, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    // Initialize input value based on selected ID (if any) or passed value
    if (value && options) {
      const selected = options.find(opt => opt.id === value);
      if (selected) {
        setInputValue(selected.name);
      }
    }
  }, [value, options]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const text = e.target.value;
    setInputValue(text);
    setIsOpen(true);
    
    // Check for exact match to set ID immediately, or null if custom
    const match = options.find(opt => opt.name.toLowerCase() === text.toLowerCase());
    onChange(match ? match.id : '', text);
  };

  const handleSelectOption = (option) => {
    setInputValue(option.name);
    onChange(option.id, option.name);
    setIsOpen(false);
  };

  const filteredOptions = options.filter(opt => 
    opt.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div className="combobox-wrapper" ref={wrapperRef}>
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className="combobox-input"
        required
      />
      {isOpen && inputValue && (
        <ul className="combobox-dropdown">
          {filteredOptions.length > 0 ? (
            filteredOptions.map(opt => (
              <li key={opt.id} onClick={() => handleSelectOption(opt)}>
                {opt.name} {opt.employee_code ? `(${opt.employee_code})` : ''}
              </li>
            ))
          ) : (
            <li className="no-match">New staff: "{inputValue}"</li>
          )}
        </ul>
      )}
    </div>
  );
};

function TimesheetForm({ user }) {
  const [companies, setCompanies] = useState([]);
  const [staffList, setStaffList] = useState([]); // Renamed from crewChiefs
  
  // Form State
  const [formData, setFormData] = useState({
    company_id: user.role === 'program_manager' ? user.company_id : '',
    entry_date: new Date().toISOString().split('T')[0],
  });

  // Nested Jobs State
  // crews now includes staffName for manual entry
  const [jobs, setJobs] = useState([
    {
      id: Date.now(),
      jobId: '',
      crews: [{ id: Date.now() + 1, staffId: '', staffName: '', timeIn: '09:00', timeOut: '17:00' }]
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadReferenceData();
  }, []);

  useEffect(() => {
    if (formData.company_id) {
      loadStaff(formData.company_id);
    }
  }, [formData.company_id]);

  const loadReferenceData = async () => {
    try {
      if (user.role === 'admin') {
        const companiesRes = await timesheetAPI.getCompanies();
        setCompanies(companiesRes.data);
      } else {
        const companiesRes = await timesheetAPI.getCompanies();
        const userCompany = companiesRes.data.find(c => c.id === user.company_id);
        setCompanies(userCompany ? [userCompany] : []);
        if (user.company_id) {
          loadStaff(user.company_id);
        }
      }
    } catch (error) {
      console.error('Failed to load reference data:', error);
    }
  };

  const loadStaff = async (companyId) => {
    try {
      const response = await timesheetAPI.getCrewChiefs(companyId); // Backend still calls them crew chiefs
      setStaffList(response.data);
    } catch (error) {
      console.error('Failed to load staff:', error);
    }
  };

  const handleGlobalChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Job Management
  const addJob = () => {
    setJobs(prev => [
      ...prev,
      {
        id: Date.now(),
        jobId: '',
        crews: [{ id: Date.now() + 1, staffId: '', staffName: '', timeIn: '09:00', timeOut: '17:00' }]
      }
    ]);
  };

  const removeJob = (index) => {
    setJobs(prev => prev.filter((_, i) => i !== index));
  };

  const updateJob = (index, field, value) => {
    setJobs(prev => {
      const newJobs = [...prev];
      newJobs[index] = { ...newJobs[index], [field]: value };
      return newJobs;
    });
  };

  // Crew/Staff Management
  const addCrew = (jobIndex) => {
    setJobs(prev => {
      const newJobs = [...prev];
      newJobs[jobIndex] = {
        ...newJobs[jobIndex],
        crews: [
          ...newJobs[jobIndex].crews,
          { id: Date.now(), staffId: '', staffName: '', timeIn: '09:00', timeOut: '17:00' }
        ]
      };
      return newJobs;
    });
  };

  const removeCrew = (jobIndex, crewIndex) => {
    setJobs(prev => {
      const newJobs = [...prev];
      newJobs[jobIndex] = {
        ...newJobs[jobIndex],
        crews: newJobs[jobIndex].crews.filter((_, i) => i !== crewIndex)
      };
      return newJobs;
    });
  };

  const updateCrew = (jobIndex, crewIndex, field, value, extraValue) => {
    setJobs(prev => {
      const newJobs = [...prev];
      const newCrews = [...newJobs[jobIndex].crews];
      
      if (field === 'staff') {
        // Special case for combobox
        newCrews[crewIndex].staffId = value; // ID
        newCrews[crewIndex].staffName = extraValue; // Name text
      } else {
        newCrews[crewIndex] = { ...newCrews[crewIndex], [field]: value };
      }
      
      newJobs[jobIndex] = { ...newJobs[jobIndex], crews: newCrews };
      return newJobs;
    });
  };

  const calculateDuration = (timeIn, timeOut) => {
    if (!timeIn || !timeOut) return '0.00';
    const [startH, startM] = timeIn.split(':').map(Number);
    const [endH, endM] = timeOut.split(':').map(Number);
    let duration = (endH + endM / 60) - (startH + startM / 60);
    if (duration < 0) duration += 24; // Handle overnight
    return duration.toFixed(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (!formData.company_id || !formData.entry_date) {
        throw new Error('Company and Date are required');
      }

      // Process Jobs: Create new staff if needed
      const processedJobs = await Promise.all(jobs.map(async (job) => {
        const processedCrews = await Promise.all(job.crews.map(async (crew) => {
          let finalStaffId = crew.staffId;

          // If no ID but name exists, create new staff
          if (!finalStaffId && crew.staffName) {
            try {
              const res = await timesheetAPI.createCrewChief({
                name: crew.staffName,
                company_id: formData.company_id
              });
              finalStaffId = res.data.id;
            } catch (err) {
              // If it failed because it exists (race condition), try to find it?
              // Or just fail. API returns { existed: true, id } if name matches.
              if (err.response?.data?.existed) {
                finalStaffId = err.response.data.id;
              } else {
                throw new Error(`Failed to create staff: ${crew.staffName}`);
              }
            }
          }

          if (!finalStaffId) throw new Error('Staff selection is required');

          return {
            crew_chief_id: finalStaffId, // Backend uses this name
            time_in: crew.timeIn,
            time_out: crew.timeOut
          };
        }));

        return {
          job_id: job.jobId,
          crews: processedCrews
        };
      }));

      const payload = {
        company_id: formData.company_id,
        entry_date: formData.entry_date,
        jobs: processedJobs
      };

      await timesheetAPI.createEntry(payload);

      setMessage('Timesheet entries submitted successfully!');
      
      // Reload staff list to include newly created ones
      loadStaff(formData.company_id);

      // Reset form
      setJobs([{
        id: Date.now(),
        jobId: '',
        crews: [{ id: Date.now() + 1, staffId: '', staffName: '', timeIn: '09:00', timeOut: '17:00' }]
      }]);
      
      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      console.error(error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to create entries';
      setMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="timesheet-form-container">
      <h2>New Timesheet Entry</h2>

      <form onSubmit={handleSubmit} className="timesheet-form">
        {/* Global Fields */}
        <div className="form-section global-section">
          {user.role === 'admin' && (
            <div className="form-group">
              <label htmlFor="company">Company *</label>
              <select
                id="company"
                value={formData.company_id}
                onChange={(e) => handleGlobalChange('company_id', e.target.value)}
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

          <div className="form-group">
            <label htmlFor="date">Date *</label>
            <input
              type="date"
              id="date"
              value={formData.entry_date}
              onChange={(e) => handleGlobalChange('entry_date', e.target.value)}
              required
            />
          </div>
        </div>

        {/* Jobs List */}
        <div className="jobs-list">
          {jobs.map((job, jobIndex) => (
            <div key={job.id} className="job-block">
              <div className="job-header">
                <div className="form-group job-id-input">
                  <label>Job ID *</label>
                  <input
                    type="text"
                    value={job.jobId}
                    onChange={(e) => updateJob(jobIndex, 'jobId', e.target.value)}
                    placeholder="Enter Job ID manually"
                    required
                  />
                </div>
                {jobs.length > 1 && (
                  <button type="button" onClick={() => removeJob(jobIndex)} className="btn-remove-job">
                    Remove Job
                  </button>
                )}
              </div>

              <div className="crews-list">
                {/* Header Row for Staff */}
                <div className="crew-row-header desktop-only">
                  <span>Staff</span>
                  <span>Time In</span>
                  <span>Time Out</span>
                  <span>Total</span>
                  <span>Action</span>
                </div>

                {job.crews.map((crew, crewIndex) => (
                  <div key={crew.id} className="crew-row">
                    <div className="form-group staff-input-group">
                      <StaffCombobox
                        value={crew.staffId}
                        options={staffList}
                        onChange={(id, name) => updateCrew(jobIndex, crewIndex, 'staff', id, name)}
                        placeholder="Search or add new staff"
                      />
                    </div>

                    <div className="time-inputs">
                      <div className="form-group">
                        <input
                          type="time"
                          value={crew.timeIn}
                          onChange={(e) => updateCrew(jobIndex, crewIndex, 'timeIn', e.target.value)}
                          required
                          aria-label="Time In"
                        />
                      </div>
                      <div className="form-group">
                        <input
                          type="time"
                          value={crew.timeOut}
                          onChange={(e) => updateCrew(jobIndex, crewIndex, 'timeOut', e.target.value)}
                          required
                          aria-label="Time Out"
                        />
                      </div>
                    </div>

                    <div className="total-display">
                      <span className="mobile-label">Total: </span>
                      {calculateDuration(crew.timeIn, crew.timeOut)} hrs
                    </div>

                    <div className="action-col">
                      {job.crews.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => removeCrew(jobIndex, crewIndex)}
                          className="btn-remove-crew"
                          aria-label="Remove staff"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button type="button" onClick={() => addCrew(jobIndex)} className="btn-add-crew">
                + Add Staff
              </button>
            </div>
          ))}
        </div>

        <div className="form-actions-main">
          <button type="button" onClick={addJob} className="btn-add-job">
            + Add Another Job ID
          </button>
          
          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Submitting...' : 'Submit Timesheet'}
          </button>
        </div>

        {message && <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>{message}</div>}
      </form>
    </div>
  );
}

export default TimesheetForm;
