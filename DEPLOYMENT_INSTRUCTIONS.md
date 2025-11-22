# Deployment Instructions for Render

This guide provides step-by-step instructions for deploying the AfroGazette platform to Render.

## Prerequisites

- GitHub account
- Render account (free tier available)
- All code files ready

## Step 1: Prepare Code for GitHub

1. Create a new repository on GitHub:
   - Go to github.com
   - Click "New repository"
   - Name it `afrogazette-platform`
   - Make it Private
   - Don't initialize with README

2. Upload files via GitHub web interface:
   - Go to your repository
   - Click "uploading an existing file"
   - Drag and drop the entire project folder
   - Commit changes

## Step 2: Deploy PostgreSQL Database

1. Log in to Render Dashboard
2. Click "New +" button → "PostgreSQL"
3. Configure database:
   - Name: `afrogazette-db`
   - Database: `afrogazette_db`
   - User: `afrogazette_user`
   - Region: Choose closest to you
   - Instance Type: Free (or paid for better performance)
4. Click "Create Database"
5. Wait for database to be created (1-2 minutes)
6. Once created, click on the database
7. Note the "Internal Database URL" - you'll need this
8. Go to "Shell" tab in database dashboard
9. Copy the entire contents of `database/schema.sql`
10. Paste into the shell and press Enter
11. Verify success message

## Step 3: Deploy Backend API

1. In Render Dashboard, click "New +" → "Web Service"
2. Connect your GitHub repository:
   - Click "Connect account" if first time
   - Authorize Render
   - Select `afrogazette-platform` repository
3. Configure service:
   - Name: `afrogazette-backend`
   - Region: Same as database
   - Branch: `main` (or your default branch)
   - Root Directory: `backend`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: Free (or paid)
4. Click "Advanced" to add Environment Variables:
   ```
   DATABASE_URL
   Value: [Paste Internal Database URL from Step 2]

   JWT_SECRET
   Value: [Generate a random 32-character string, or use: AfroG4z3tt3S3cur3JWT$ecr3tK3y2025!]

   NODE_ENV
   Value: production

   PORT
   Value: 10000
   ```
5. Click "Create Web Service"
6. Wait for deployment (5-10 minutes)
7. Once deployed, note the service URL (e.g., `https://afrogazette-backend.onrender.com`)

## Step 4: Deploy Frontend

1. In Render Dashboard, click "New +" → "Static Site"
2. Connect same GitHub repository
3. Configure site:
   - Name: `afrogazette-frontend`
   - Branch: `main`
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
4. Add Environment Variable:
   ```
   VITE_API_URL
   Value: [Your backend URL from Step 3]
   Example: https://afrogazette-backend.onrender.com
   ```
5. Click "Create Static Site"
6. Wait for deployment (5-10 minutes)
7. Once deployed, note the frontend URL

## Step 5: Update Backend CORS Settings

1. Go back to backend service in Render
2. Click "Environment" tab
3. Add new environment variable:
   ```
   FRONTEND_URL
   Value: [Your frontend URL from Step 4]
   ```
4. Click "Save Changes"
5. Backend will automatically redeploy

## Step 6: Test the Application

1. Open your frontend URL in browser
2. You should see the login page
3. Log in with default credentials:
   - Email: `admin@afrogazette.com`
   - Password: `Admin123!`
4. Test all features:
   - Dashboard loads with data
   - Can create users
   - Can add clients
   - Can create sales
   - Charts display correctly

## Troubleshooting

### Backend not connecting to database
- Verify DATABASE_URL is correct (Internal URL, not External)
- Check database shell for schema execution errors
- View backend logs in Render dashboard

### Frontend not connecting to backend
- Verify VITE_API_URL points to correct backend URL
- Check browser console for CORS errors
- Verify backend FRONTEND_URL is set correctly

### Login not working
- Check backend logs for authentication errors
- Verify database schema was executed correctly
- Try default credentials exactly as shown

### 502 Bad Gateway
- Backend is still deploying - wait a few more minutes
- Check backend logs for startup errors
- Verify all environment variables are set

## Post-Deployment

1. Change default admin password:
   - Log in as admin
   - Go to user profile
   - Change password

2. Add real users:
   - Go to Users page
   - Add journalists and admins

3. Configure settings:
   - Go to Settings page
   - Update company information

4. Monitor usage:
   - Check Render dashboard for metrics
   - Monitor database usage
   - Check for errors in logs

## Maintenance

### Updating Code
1. Push changes to GitHub
2. Render will auto-deploy (if enabled)
3. Or manually deploy from Render dashboard

### Database Backups
1. Go to database in Render
2. Enable backups (paid plan required)
3. Or export data regularly via CSV

### Scaling
1. Upgrade instance type in Render
2. Consider paid plans for:
   - Better performance
   - More database storage
   - Custom domains
   - SSL certificates

## Support

If you encounter issues:
1. Check Render documentation
2. View service logs in dashboard
3. Contact Render support (paid plans)

## Security Notes

- Change JWT_SECRET in production
- Use strong passwords
- Enable HTTPS (automatic on Render)
- Regularly update dependencies
- Monitor access logs

---

**Deployment Complete!** Your AfroGazette platform is now live.

Remember to:
- ✅ Change default passwords
- ✅ Add real users
- ✅ Test all features
- ✅ Configure settings
- ✅ Monitor performance
