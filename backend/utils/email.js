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
  const {
    unique_id,
    job_id,
    crew_chief_name,
    company_name,
    company_email,
    email_enabled,
    entry_date,
    time_entries
  } = timesheetData;

  // Check if email is enabled for this company
  if (!email_enabled || !company_email) {
    console.log(`Email notifications disabled for ${company_name}`);
    return;
  }

  const totalHours = calculateTotalHours(time_entries);
  const timeEntriesFormatted = formatTimeEntries(time_entries);

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: company_email,
    subject: `New Timesheet Entry - ${job_id} - ${entry_date}`,
    text: `
New Timesheet Entry Submitted
==============================

Entry ID: ${unique_id}
Job ID: ${job_id}
Date: ${entry_date}

Crew Chief: ${crew_chief_name}
Company: ${company_name}

Time Entries:
${timeEntriesFormatted}

Total Hours: ${totalHours}

---
This is an automated notification from the Timesheet Management System.
    `.trim()
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${company_email} for timesheet entry ${unique_id}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}
