function TimeEntryRow({ timeEntry, index, onChange, onRemove }) {
  return (
    <div className="time-entry-row">
      <div className="time-entry-inputs">
        <div className="form-group">
          <label>Time In</label>
          <input
            type="time"
            value={timeEntry.time_in}
            onChange={(e) => onChange(index, 'time_in', e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Time Out</label>
          <input
            type="time"
            value={timeEntry.time_out}
            onChange={(e) => onChange(index, 'time_out', e.target.value)}
            required
          />
        </div>

        <button
          type="button"
          onClick={() => onRemove(index)}
          className="btn-remove"
          title="Remove this time entry"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

export default TimeEntryRow;
