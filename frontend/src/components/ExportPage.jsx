import { useState, useEffect, useRef } from 'react';
import { exportAPI, timesheetAPI } from '../services/api';

function ExportPage({ user }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [previewEntries, setPreviewEntries] = useState([]);
  
  // Filtering & Search State
  const [searchText, setSearchText] = useState('');
  const [activeFilters, setActiveFilters] = useState({}); // { key: Set(values) }
  const [openFilter, setOpenFilter] = useState(null); // 'company_name', 'job_id', etc.
  
  const filterRef = useRef(null);

  useEffect(() => {
    loadPreview();
  }, [startDate, endDate]);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setOpenFilter(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadPreview = async () => {
    try {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await timesheetAPI.getEntries(params);
      setPreviewEntries(response.data);
    } catch (error) {
      console.error('Failed to load preview:', error);
    }
  };

  const handleDownload = async () => {
    setLoading(true);
    setMessage('');

    try {
      const response = await exportAPI.downloadExcel(startDate, endDate);

      // Create blob and download
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `timesheets_${startDate || 'all'}_to_${endDate || 'all'}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setMessage('Excel file downloaded successfully!');
      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to download Excel file');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalHours = (timeEntries) => {
    if (!timeEntries || timeEntries.length === 0) return '0h 0m';

    let totalMinutes = 0;
    timeEntries.forEach((entry) => {
      const [inHour, inMin] = entry.time_in.split(':').map(Number);
      const [outHour, outMin] = entry.time_out.split(':').map(Number);
      let diff = (outHour * 60 + outMin) - (inHour * 60 + inMin);
      if (diff < 0) diff += 24 * 60; // Handle overnight
      totalMinutes += diff;
    });

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  // --- Filtering Logic ---

  const getUniqueValues = (key) => {
    const values = new Set();
    previewEntries.forEach(entry => {
      if (entry[key]) values.add(entry[key]);
    });
    return Array.from(values).sort();
  };

  const toggleFilter = (key, value) => {
    setActiveFilters(prev => {
      const currentSet = new Set(prev[key] || []);
      if (currentSet.has(value)) {
        currentSet.delete(value);
      } else {
        currentSet.add(value);
      }
      
      const newFilters = { ...prev };
      if (currentSet.size === 0) {
        delete newFilters[key];
      } else {
        newFilters[key] = currentSet;
      }
      return newFilters;
    });
  };

  const clearFilter = (key) => {
    setActiveFilters(prev => {
      const newState = { ...prev };
      delete newState[key];
      return newState;
    });
  };

  const isFiltered = (key) => !!activeFilters[key];

  const filteredEntries = previewEntries.filter(entry => {
    // Search
    if (searchText) {
      const lowerSearch = searchText.toLowerCase();
      const match = (
        (entry.job_id && entry.job_id.toLowerCase().includes(lowerSearch)) ||
        (entry.company_name && entry.company_name.toLowerCase().includes(lowerSearch)) ||
        (entry.crew_chief_name && entry.crew_chief_name.toLowerCase().includes(lowerSearch)) ||
        (entry.unique_id && entry.unique_id.toLowerCase().includes(lowerSearch))
      );
      if (!match) return false;
    }

    // Column Filters
    for (const key in activeFilters) {
      if (!activeFilters[key].has(entry[key])) {
        return false;
      }
    }

    return true;
  });

  const renderHeader = (label, key) => (
    <th>
      <div className="th-content" onClick={(e) => { e.stopPropagation(); setOpenFilter(openFilter === key ? null : key); }}>
        {label}
        <span className={`filter-icon ${isFiltered(key) ? 'active' : ''}`}>
           ▼
        </span>
        
        {openFilter === key && (
          <div className="filter-dropdown" ref={filterRef} onClick={(e) => e.stopPropagation()}>
            <div className="filter-options-list">
                {getUniqueValues(key).map(val => (
                    <label key={val} className="filter-option">
                        <input 
                            type="checkbox" 
                            checked={activeFilters[key]?.has(val) || false}
                            onChange={() => toggleFilter(key, val)}
                        />
                        {val}
                    </label>
                ))}
            </div>
            {getUniqueValues(key).length === 0 && <div className="no-matches">No options</div>}
            <div className="filter-actions">
                <button onClick={() => clearFilter(key)} className="btn-filter-link">Clear</button>
            </div>
          </div>
        )}
      </div>
    </th>
  );

  return (
    <div className="export-page">
      <h2>Export Timesheets</h2>

      <div className="export-controls">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="startDate">Start Date</label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="endDate">End Date</label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <button
          onClick={handleDownload}
          disabled={loading || previewEntries.length === 0}
          className="btn-primary"
        >
          {loading ? 'Downloading...' : 'Download Excel'}
        </button>

        {message && (
          <div className={message.includes('success') ? 'success-message' : 'error-message'}>
            {message}
          </div>
        )}
      </div>

      <div className="preview-section">
        <h3>Preview ({filteredEntries.length} entries)</h3>
        
        {/* Search Bar */}
        <div className="search-container">
            <input 
                type="text" 
                placeholder="Search by Job ID, Company, Staff..." 
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="search-input"
            />
        </div>

        {previewEntries.length === 0 ? (
          <p>No entries found for the selected date range</p>
        ) : filteredEntries.length === 0 ? (
          <p>No entries match your search/filters</p>
        ) : (
          <div className="entries-container">
            {/* Desktop Table */}
            <table className="entries-table desktop-only">
              <thead>
                <tr>
                  {renderHeader('Unique ID', 'unique_id')}
                  <th>Date</th>
                  {renderHeader('Company', 'company_name')}
                  {renderHeader('Job ID', 'job_id')}
                  {renderHeader('Staff', 'crew_chief_name')}
                  <th>Time Entries</th>
                  <th>Total Hours</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.unique_id}</td>
                    <td>{entry.entry_date}</td>
                    <td>{entry.company_name}</td>
                    <td>{entry.job_id}</td>
                    <td>{entry.crew_chief_name}</td>
                    <td>
                      {entry.time_entries?.map((te, idx) => (
                        <div key={idx}>
                          {te.time_in} - {te.time_out}
                        </div>
                      ))}
                    </td>
                    <td>{calculateTotalHours(entry.time_entries)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Card View */}
            <div className="mobile-entries-list">
              {filteredEntries.map((entry) => (
                <div key={entry.id} className="entry-card">
                  <div className="entry-card-header">
                    <h3>{entry.job_id}</h3>
                  </div>
                  <div className="entry-card-meta">
                    created on {entry.entry_date}
                  </div>
                  <div className="entry-card-details">
                    <span className="crew-name">{entry.crew_chief_name}</span>
                    <span className="total-hours">{calculateTotalHours(entry.time_entries)}</span>
                  </div>
                  <div className="entry-card-footer" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div><strong>Company:</strong> {entry.company_name}</div>
                    <div><strong>Unique ID:</strong> {entry.unique_id}</div>
                    <div>
                      <strong>Times:</strong>
                      {entry.time_entries?.map((te, idx) => (
                        <span key={idx} style={{ marginLeft: '0.5rem' }}>
                          {te.time_in} - {te.time_out}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExportPage;
