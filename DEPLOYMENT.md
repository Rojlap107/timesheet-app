# Deployment Guide

This guide will help you deploy your timesheet application online.

## Architecture

- **Frontend**: Netlify (static hosting)
- **Backend**: Render/Railway (Node.js hosting)
- **Database**: SQLite (for small scale) or PostgreSQL (recommended for production)

## Option 1: Deploy to Render (Recommended - Free Tier Available)

### Step 1: Deploy Backend to Render

1. **Create a Render account**: Go to https://render.com and sign up

2. **Create a new Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub repository (or deploy from this directory)
   - Configure:
     - **Name**: `timesheet-backend`
     - **Environment**: `Node`
     - **Build Command**: `cd backend && npm install`
     - **Start Command**: `cd backend && npm start`
     - **Plan**: Free

3. **Set Environment Variables** in Render dashboard:
   ```
   PORT=5000
   SESSION_SECRET=your-strong-random-secret-here
   EMAIL_USER=karmastaff-timesheet@gmail.com
   EMAIL_APP_PASSWORD=your-gmail-app-password
   RECIPIENT_EMAIL=tenzinrojlap@gmail.com
   ALLOWED_ORIGINS=https://your-app.netlify.app
   ```

4. **Deploy**: Render will automatically deploy your backend

5. **Get your backend URL**: It will be something like `https://timesheet-backend.onrender.com`

### Step 2: Deploy Frontend to Netlify

1. **Create a Netlify account**: Go to https://netlify.com and sign up

2. **Deploy your site**:
   - Drag and drop the `frontend` folder to Netlify, OR
   - Connect your GitHub repository

3. **Configure Build Settings**:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`

4. **Set Environment Variable** in Netlify dashboard:
   - Go to Site settings → Environment variables
   - Add: `VITE_API_URL` = `https://timesheet-backend.onrender.com/api`

5. **Redeploy**: Trigger a new deployment to apply the environment variable

6. **Get your frontend URL**: It will be something like `https://your-app.netlify.app`

### Step 3: Update Backend CORS

1. Go back to Render dashboard
2. Update `ALLOWED_ORIGINS` environment variable:
   ```
   ALLOWED_ORIGINS=https://your-app.netlify.app
   ```
3. Render will automatically redeploy

## Option 2: Deploy to Railway

### Backend on Railway

1. Go to https://railway.app and sign up
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Configure:
   - **Root Directory**: `backend`
   - **Start Command**: `npm start`
5. Add environment variables (same as above)
6. Deploy and get your backend URL

### Frontend on Netlify (same as Option 1)

## Option 3: All-in-One with Vercel

### Deploy Both Frontend and Backend to Vercel

1. Go to https://vercel.com and sign up
2. Import your project
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
4. Add Serverless Functions for backend (requires code restructuring)

**Note**: This option requires converting your Express backend to Vercel serverless functions, which is more complex.

## Important Notes

### Database Considerations

**For Small Scale (< 100 users)**:
- SQLite works fine on Render/Railway
- Make sure to use persistent storage (Render's persistent disk)

**For Production Scale**:
- Switch to PostgreSQL (free tier on Render)
- Update your code to use PostgreSQL instead of SQLite
- Install `pg` package: `npm install pg`

### Gmail App Password

Make sure your Gmail App Password is set correctly in the environment variables for email notifications to work.

### HTTPS & Cookies

In production, update `backend/server.js` session configuration:
```javascript
cookie: {
  secure: true,  // Require HTTPS
  httpOnly: true,
  sameSite: 'none', // Allow cross-site cookies
  maxAge: 1000 * 60 * 60 * 24
}
```

## Quick Deployment Checklist

- [ ] Backend deployed to Render/Railway
- [ ] Backend environment variables configured
- [ ] Backend URL obtained
- [ ] Frontend environment variable (`VITE_API_URL`) set to backend URL
- [ ] Frontend deployed to Netlify
- [ ] Frontend URL obtained
- [ ] Backend `ALLOWED_ORIGINS` updated with frontend URL
- [ ] Test login functionality
- [ ] Test creating a timesheet entry
- [ ] Test email notification
- [ ] Test Excel export

## Troubleshooting

### CORS Errors
- Make sure `ALLOWED_ORIGINS` in backend includes your frontend URL
- Ensure URLs don't have trailing slashes

### Login Not Working
- Check that cookies are allowed in production
- Update session `sameSite` setting to `'none'` for cross-domain

### Email Not Sending
- Verify Gmail App Password is correct
- Check that 2FA is enabled on your Google account

### Database Errors
- For Render, enable persistent disk storage
- Consider upgrading to PostgreSQL for production

## Cost

**Free Tier Options**:
- Render: Free for web services (with 750 hours/month)
- Netlify: Free for static sites (100GB bandwidth/month)
- Railway: $5 credit per month (covers small usage)

**Total**: $0-5/month for small scale usage

## Support

For issues or questions, check the main README.md or create an issue on GitHub.
