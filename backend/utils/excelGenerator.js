import xlsx from 'xlsx';

// Calculate total hours for time entries
function calculateTotalHours(timeEntries) {
  let totalMinutes = 0;

  timeEntries.forEach((entry) => {
    const [inHour, inMin] = entry.time_in.split(':').map(Number);
    const [outHour, outMin] = entry.time_out.split(':').map(Number);

    const inTotalMin = inHour * 60 + inMin;
    const outTotalMin = outHour * 60 + outMin;

    totalMinutes += outTotalMin - inTotalMin;
  });

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m`;
}

// Generate Excel file from timesheet data
export function generateExcelFile(timesheetEntries) {
  const rows = [];

  // Add header row
  rows.push([
    'Unique ID',
    'Date',
    'Company',
    'Work ID',
    'Employee',
    'Employee Code',
    'Time In',
    'Time Out',
    'Total Hours'
  ]);

  // Add data rows
  timesheetEntries.forEach((entry) => {
    const totalHours = calculateTotalHours(entry.time_entries);

    // If there are multiple time entries, create a row for each
    if (entry.time_entries && entry.time_entries.length > 0) {
      entry.time_entries.forEach((timeEntry, index) => {
        rows.push([
          index === 0 ? entry.unique_id : '', // Only show unique_id on first row
          index === 0 ? entry.entry_date : '',
          index === 0 ? entry.company_name : '',
          index === 0 ? entry.work_id : '',
          index === 0 ? entry.employee_name : '',
          index === 0 ? entry.employee_code : '',
          timeEntry.time_in,
          timeEntry.time_out,
          index === 0 ? totalHours : '' // Only show total on first row
        ]);
      });
    } else {
      // Entry with no time entries
      rows.push([
        entry.unique_id,
        entry.entry_date,
        entry.company_name,
        entry.work_id,
        entry.employee_name,
        entry.employee_code,
        '',
        '',
        '0h 0m'
      ]);
    }
  });

  // Create workbook and worksheet
  const workbook = xlsx.utils.book_new();
  const worksheet = xlsx.utils.aoa_to_sheet(rows);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 15 }, // Unique ID
    { wch: 12 }, // Date
    { wch: 20 }, // Company
    { wch: 12 }, // Work ID
    { wch: 20 }, // Employee
    { wch: 15 }, // Employee Code
    { wch: 10 }, // Time In
    { wch: 10 }, // Time Out
    { wch: 12 }  // Total Hours
  ];

  // Add worksheet to workbook
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Timesheets');

  // Generate buffer
  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
