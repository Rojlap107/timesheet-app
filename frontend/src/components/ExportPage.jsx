import { useState, useEffect } from 'react';
import { exportAPI, timesheetAPI } from '../services/api';

function ExportPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [previewEntries, setPreviewEntries] = useState([]);

  useEffect(() => {
    loadPreview();
  }, [startDate, endDate]);

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
      totalMinutes += (outHour * 60 + outMin) - (inHour * 60 + inMin);
    });

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

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
        <h3>Preview ({previewEntries.length} entries)</h3>

        {previewEntries.length === 0 ? (
          <p>No entries found for the selected date range</p>
        ) : (
          <div className="entries-container">
            {/* Desktop Table */}
            <table className="entries-table desktop-only">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Date</th>
                  <th>Company</th>
                  <th>Job ID</th>
                  <th>Crew Chief</th>
                  <th>Time Entries</th>
                  <th>Total Hours</th>
                </tr>
              </thead>
              <tbody>
                {previewEntries.map((entry) => (
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
              {previewEntries.map((entry) => (
                <div key={entry.id} className="entry-card">
                  <div className="entry-card-header">
                    <h3>{entry.job_id}</h3>
                    <span className="entry-id-badge" style={{ fontSize: '0.8rem', color: '#888' }}>{entry.unique_id}</span>
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
