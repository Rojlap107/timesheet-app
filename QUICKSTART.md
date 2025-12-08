# Quick Start Guide

## Get Started in 3 Steps

### Step 1: Setup Gmail for Email Notifications

1. Go to your Google Account: https://myaccount.google.com/
2. Navigate to **Security** > **2-Step Verification** (enable if not already)
3. Navigate to **Security** > **2-Step Verification** > **App passwords**
4. Create a new app password for "Mail"
5. Copy the 16-character password

### Step 2: Start the Backend

Open a terminal and run:

```bash
cd backend

# Edit the .env file and add your Gmail credentials:
# EMAIL_USER=your-email@gmail.com
# EMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx

# Initialize the database
npm run setup

# Start the backend server
npm start
```

You should see: `Server is running on port 5000`

### Step 3: Start the Frontend

Open a **new terminal** and run:

```bash
cd frontend

# Start the frontend development server
npm run dev
```

You should see: `Local: http://localhost:5173/`

## Access the Application

1. Open your browser and go to: http://localhost:5173
2. Login with:
   - **Username:** `admin`
   - **Password:** `admin123`

## Test the Application

### Create a Timesheet Entry

1. Select a company (e.g., "KS Construction")
2. Select a work ID (e.g., "PRJ-001")
3. Select an employee (e.g., "John Doe")
4. Choose today's date
5. Add time entries:
   - Time In: 09:00
   - Time Out: 17:00
6. Click "Add Time Entry" to add more time slots if needed
7. View the total hours calculated automatically
8. Click "Submit Timesheet"
9. You should receive an email at `tenzinrojlap@gmail.com`

### Edit an Entry

1. Find the entry in the "Recent Entries" table
2. Click "Edit"
3. Make your changes
4. Click "Save Changes"

### Export to Excel

1. Click "Export" in the navigation
2. (Optional) Select start and end dates to filter
3. Click "Download Excel"
4. Open the downloaded file to see all your entries

## Troubleshooting

### Email not working?
- Check your Gmail App Password is correct in `backend/.env`
- Make sure 2-factor authentication is enabled
- Try generating a new app password

### Can't connect to backend?
- Make sure the backend is running on port 5000
- Check that you're in the `backend` directory when running `npm start`

### Frontend not loading?
- Make sure frontend is running on port 5173
- Check that you're in the `frontend` directory when running `npm run dev`

## Need Help?

Check the full README.md for detailed documentation and API endpoints.
