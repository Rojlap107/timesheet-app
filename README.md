# Timesheet Management System

A full-stack web application for tracking employee timesheets with email notifications and Excel export functionality.

## Features

- User authentication (login/logout)
- Create timesheet entries with multiple time in/out records
- Real-time total hours calculation
- Edit and delete existing entries
- Email notifications when new entries are created
- Export timesheets to Excel with date filtering
- Responsive design for mobile and desktop
- SQLite database for data storage

## Technology Stack

### Backend
- Node.js + Express
- SQLite3 database
- bcrypt for password hashing
- express-session for authentication
- Nodemailer for email notifications
- xlsx for Excel file generation

### Frontend
- React with Vite
- React Router for navigation
- Axios for API calls
- Modern CSS with responsive design

## Project Structure

```
ks-timesheet/
├── backend/
│   ├── config/
│   │   └── database.js         # Database setup and seed data
│   ├── routes/
│   │   ├── auth.js             # Authentication routes
│   │   ├── timesheet.js        # Timesheet CRUD operations
│   │   └── export.js           # Excel export
│   ├── middleware/
│   │   └── auth.js             # Authentication middleware
│   ├── utils/
│   │   ├── email.js            # Email notification utility
│   │   └── excelGenerator.js  # Excel generation utility
│   ├── server.js               # Main server file
│   ├── .env                    # Environment variables
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.jsx
│   │   │   ├── TimesheetForm.jsx
│   │   │   ├── TimeEntryRow.jsx
│   │   │   ├── EditModal.jsx
│   │   │   └── ExportPage.jsx
│   │   ├── services/
│   │   │   └── api.js          # API service layer
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── index.css
│   └── package.json
│
└── README.md
```

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Gmail account with App Password (for email notifications)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
   - Open the `.env` file in the backend directory
   - Update the following variables:

```env
PORT=5000
SESSION_SECRET=your-random-secret-key-here
EMAIL_USER=your-email@gmail.com
EMAIL_APP_PASSWORD=your-gmail-app-password
RECIPIENT_EMAIL=tenzinrojlap@gmail.com
```

4. Set up Gmail App Password:
   - Go to your Google Account settings
   - Enable 2-factor authentication
   - Go to Security > 2-Step Verification > App passwords
   - Generate a new app password for "Mail"
   - Copy the password and paste it in `EMAIL_APP_PASSWORD`

5. Initialize the database:
```bash
npm run setup
```

This will create the SQLite database with the following seed data:
- Default user: username `admin`, password `admin123`
- 4 Companies: KS Construction, Alpine Builders, Mountain Works Inc, Summit Projects
- 5 Work IDs: PRJ-001, PRJ-002, PRJ-003, MAINT-101, MAINT-102
- 5 Employees: John Doe, Jane Smith, Mike Johnson, Sarah Williams, David Brown

6. Start the backend server:
```bash
npm start
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

## Usage

### Login
1. Open your browser and go to `http://localhost:5173`
2. Login with the default credentials:
   - Username: `admin`
   - Password: `admin123`

### Creating a Timesheet Entry
1. After logging in, you'll see the timesheet form
2. Select a company from the dropdown
3. Select a work ID from the dropdown
4. Select an employee from the dropdown
5. Choose the entry date
6. Add time entries (Time In and Time Out)
   - Click "Add Time Entry" to add multiple time slots
   - Click "Remove" to delete a time entry
7. View the total hours calculated automatically
8. Click "Submit Timesheet"
9. An email will be sent to the configured recipient email address

### Editing an Entry
1. In the "Recent Entries" table, click the "Edit" button for any entry
2. Modify the fields as needed in the modal
3. Click "Save Changes"

### Deleting an Entry
1. In the "Recent Entries" table, click the "Delete" button for any entry
2. Confirm the deletion

### Exporting to Excel
1. Click "Export" in the navigation menu
2. (Optional) Select a start date and end date to filter entries
3. Review the preview of entries that will be exported
4. Click "Download Excel"
5. The Excel file will be downloaded to your computer

## Database Schema

### Tables

1. **users** - User authentication
2. **companies** - Company list for dropdown
3. **work_ids** - Work ID list for dropdown
4. **employees** - Employee list for dropdown
5. **timesheet_entries** - Main timesheet records
6. **time_entries** - Individual time in/out records (multiple per timesheet)

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/check` - Check authentication status

### Timesheet
- `GET /api/timesheet/companies` - Get all companies
- `GET /api/timesheet/work-ids` - Get all work IDs
- `GET /api/timesheet/employees` - Get all employees
- `GET /api/timesheet/entries` - Get all timesheet entries (supports date filtering)
- `GET /api/timesheet/entries/:id` - Get single entry
- `POST /api/timesheet/entries` - Create new entry
- `PUT /api/timesheet/entries/:id` - Update entry
- `DELETE /api/timesheet/entries/:id` - Delete entry

### Export
- `GET /api/export/excel` - Download Excel file (supports date filtering)

## Email Notifications

When a new timesheet entry is created, an email is automatically sent to the configured recipient with the following information:
- Entry ID
- Date
- Employee name
- Company
- Work ID
- All time entries (Time In and Time Out)
- Total hours worked

## Security Notes

- Passwords are hashed using bcrypt before storage
- Session-based authentication with HTTP-only cookies
- Environment variables for sensitive data
- CORS configured for frontend-backend communication

## Troubleshooting

### Email not sending
- Verify Gmail App Password is correct
- Ensure 2-factor authentication is enabled on your Google account
- Check that `EMAIL_USER` and `EMAIL_APP_PASSWORD` are set correctly in `.env`

### Database errors
- Run `npm run setup` in the backend directory to reinitialize the database
- Check that the `timesheet.db` file has proper read/write permissions

### CORS errors
- Ensure both backend and frontend are running
- Verify the frontend is running on `http://localhost:5173`
- Check CORS configuration in `backend/server.js`

## Development

### Backend Development
```bash
cd backend
npm run dev  # Uses --watch flag for auto-reload
```

### Frontend Development
```bash
cd frontend
npm run dev  # Vite hot-reload enabled by default
```

## Production Deployment

For production deployment:

1. Update `SESSION_SECRET` to a strong random value
2. Set `cookie.secure` to `true` in `backend/server.js` (requires HTTPS)
3. Update CORS origin to your production frontend URL
4. Use a production-grade database (PostgreSQL/MySQL) instead of SQLite
5. Use environment-specific email service (SendGrid, AWS SES)
6. Build the frontend: `npm run build` in frontend directory
7. Serve the built files with a production server (nginx, Apache)

## License

MIT

## Author

Built with Claude Code
