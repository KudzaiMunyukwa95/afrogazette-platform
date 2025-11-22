# AfroGazette Sales & Commission Platform

A complete, enterprise-grade sales and commission management platform built for AfroGazette Media & Advertising.

## Features

✅ User authentication with JWT
✅ Role-based access control (Admin/Journalist)
✅ Client management with search
✅ Sales tracking with approval workflow
✅ Automatic 10% commission calculation
✅ Invoice generation (PDF)
✅ Dashboard with real-time statistics
✅ Interactive charts and analytics
✅ Commission payment tracking
✅ Data export (CSV)
✅ Mobile responsive design
✅ Production-ready code

## Tech Stack

### Backend
- Node.js 18+ with Express 4.18
- PostgreSQL 14+
- JWT authentication
- bcrypt password hashing
- PDFKit for invoice generation
- Multer for file uploads

### Frontend
- React 18 with Vite 5
- TailwindCSS 3.4
- React Router 6.20
- Heroicons 2.1
- Recharts 2.10
- Axios for API calls

## Quick Start

### Prerequisites
- Node.js 18 or higher
- PostgreSQL 14 or higher
- npm or yarn

### 1. Database Setup

```bash
# Create PostgreSQL database
createdb afrogazette_db

# Run schema
psql -d afrogazette_db -f database/schema.sql
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your database credentials
# DATABASE_URL=postgresql://username:password@localhost:5432/afrogazette_db
# JWT_SECRET=your-secret-key-minimum-32-characters

# Start server
npm start
```

Backend will run on http://localhost:10000

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file (optional for local development)
echo "VITE_API_URL=http://localhost:10000" > .env

# Start development server
npm run dev
```

Frontend will run on http://localhost:3000

### 4. Login

Use default credentials:
- Email: `admin@afrogazette.com`
- Password: `Admin123!`

## Deployment to Render

### Database Deployment

1. Go to Render Dashboard
2. Click "New +" → "PostgreSQL"
3. Configure:
   - Name: `afrogazette-db`
   - Database: `afrogazette_db`
   - User: `afrogazette_user`
4. After creation, go to "Shell" tab
5. Run the contents of `database/schema.sql`

### Backend Deployment

1. Create new GitHub repository
2. Upload backend folder
3. In Render Dashboard: "New +" → "Web Service"
4. Connect your repository
5. Configure:
   - Name: `afrogazette-backend`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: Free or paid
6. Add Environment Variables:
   ```
   DATABASE_URL=[Copy Internal Database URL from PostgreSQL service]
   JWT_SECRET=[Generate random 32-character string]
   NODE_ENV=production
   FRONTEND_URL=[Your frontend URL after deployment]
   ```
7. Click "Create Web Service"

### Frontend Deployment

1. Upload frontend folder to GitHub
2. In Render Dashboard: "New +" → "Static Site"
3. Connect your repository
4. Configure:
   - Name: `afrogazette-frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
5. Add Environment Variable:
   ```
   VITE_API_URL=[Your backend URL]/api
   ```
6. Click "Create Static Site"

## Project Structure

```
afrogazette-platform/
├── backend/
│   ├── src/
│   │   ├── config/         # Database configuration
│   │   ├── middleware/     # Auth & error handling
│   │   ├── models/         # Data models
│   │   ├── routes/         # API endpoints
│   │   └── server.js       # Express server
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── context/        # React context (Auth)
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   └── App.jsx         # Main app component
│   └── package.json
└── database/
    └── schema.sql          # PostgreSQL schema
```

## User Roles

### Admin
- Full system access
- Manage users (create, edit, delete)
- Approve/reject sales
- Generate invoices
- View all data and reports
- Manage settings

### Journalist
- Add clients
- Log sales
- Upload proof of payment
- View own sales
- View own commissions
- Cannot approve sales

## API Documentation

See `API_DOCUMENTATION.md` for complete API reference.

## Support

For issues or questions:
- Email: support@afrogazette.com
- Phone: +263 XXX XXXX

## License

© 2025 AfroGazette Media & Advertising. All rights reserved.
