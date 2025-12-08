import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
  }
});

// Calculate total hours from time entries
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

// Format time entries for email
function formatTimeEntries(timeEntries) {
  return timeEntries
    .map((entry, index) => {
      return `    ${index + 1}. Time In: ${entry.time_in} | Time Out: ${entry.time_out}`;
    })
    .join('\n');
}

// Send timesheet email notification
export async function sendTimesheetEmail(timesheetData) {
  const { unique_id, employee_name, company_name, work_id, work_description, entry_date, time_entries } = timesheetData;

  const totalHours = calculateTotalHours(time_entries);
  const timeEntriesFormatted = formatTimeEntries(time_entries);

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.RECIPIENT_EMAIL,
    subject: `New Timesheet Entry - ${entry_date}`,
    text: `
New Timesheet Entry Submitted
==============================

Entry ID: ${unique_id}
Date: ${entry_date}

Employee: ${employee_name}
Company: ${company_name}
Work ID: ${work_id}
Project: ${work_description}

Time Entries:
${timeEntriesFormatted}

Total Hours: ${totalHours}

---
This is an automated notification from the Timesheet Management System.
    `.trim()
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent for timesheet entry ${unique_id}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}
