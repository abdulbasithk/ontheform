# OnTheForm Backend API

Express.js backend API for the OnTheForm application with PostgreSQL database.

## Features

- **Authentication**: JWT-based authentication with bcrypt password hashing
- **Forms Management**: CRUD operations for forms with field validation
- **Form Submissions**: Public form submission endpoint with validation
- **Data Export**: CSV export functionality for form responses
- **Security**: Rate limiting, CORS, helmet security headers
- **Database**: PostgreSQL with UUID primary keys and JSONB field storage

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Database Setup

1. Create a PostgreSQL database:
```sql
CREATE DATABASE ontheform_db;
```

2. Execute the schema file:
```bash
psql -U your_username -d ontheform_db -f database/schema.sql
```

### 3. Environment Configuration

1. Copy `.env.local` and update with your database credentials:
```bash
cp .env.local .env.local
```

2. Update the `DATABASE_URL` in `.env.local`:
```
DATABASE_URL=postgresql://username:password@localhost:5432/ontheform_db
```

3. Update other environment variables as needed:
- `JWT_SECRET`: Change to a secure random string
- `FRONTEND_URL`: Update if frontend runs on different port
- `PORT`: Backend server port (default: 3001)

### 4. Start the Server

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:3001` (or your configured port).

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/logout` - User logout
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password

### Forms (Admin)
- `GET /api/forms` - Get all forms (paginated)
- `GET /api/forms/:id` - Get single form
- `POST /api/forms` - Create new form
- `PUT /api/forms/:id` - Update form
- `DELETE /api/forms/:id` - Delete form
- `PATCH /api/forms/:id/toggle` - Toggle form active status
- `POST /api/forms/:id/duplicate` - Duplicate form

### Submissions
- `POST /api/submissions` - Submit form (public)
- `GET /api/submissions` - Get all submissions (admin)
- `GET /api/submissions/form/:formId` - Get form submissions (admin)
- `GET /api/submissions/:id` - Get single submission (admin)
- `DELETE /api/submissions/:id` - Delete submission (admin)
- `GET /api/submissions/export/form/:formId` - Export submissions as CSV (admin)

### Health Check
- `GET /health` - Server health status

## Database Schema

### Tables
- `users` - User accounts with authentication
- `forms` - Form definitions with JSONB fields
- `form_submissions` - Form submission responses
- `user_sessions` - JWT session management (optional)

### Key Features
- UUID primary keys for all tables
- JSONB storage for flexible form fields and responses
- Automatic timestamp updates
- Foreign key constraints with cascade deletes
- Indexes for performance optimization

## Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS**: Configured for frontend domain
- **Helmet**: Security headers
- **JWT**: Secure token-based authentication
- **bcrypt**: Password hashing with configurable salt rounds
- **Input Validation**: Express-validator for all endpoints
- **SQL Injection Protection**: Parameterized queries

## Default Admin Account

**Email**: `admin@ontheform.com`  
**Password**: `admin123`

⚠️ **Important**: Change the default admin password after first login!

## Development

### Running Tests
```bash
npm test
```

### Code Structure
```
src/
├── config/
│   └── database.js          # Database connection
├── middleware/
│   ├── auth.js              # Authentication middleware
│   └── errorHandler.js      # Error handling
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── forms.js             # Forms management
│   └── submissions.js       # Form submissions
└── server.js                # Main server file
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRES_IN` | JWT expiration time | `7d` |
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment mode | `development` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5174` |
| `BCRYPT_SALT_ROUNDS` | Password hashing rounds | `12` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |

## Deployment

1. Set `NODE_ENV=production`
2. Update `DATABASE_URL` for production database
3. Set secure `JWT_SECRET`
4. Configure `FRONTEND_URL` for production domain
5. Enable SSL for database connection if required

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check database credentials in `.env.local`
- Ensure database exists and schema is applied
- Check firewall/network connectivity

### Authentication Issues
- Verify JWT_SECRET is set
- Check token expiration settings
- Ensure user account is active

### CORS Issues
- Update `FRONTEND_URL` in environment variables
- Check browser console for CORS errors
- Verify frontend is running on expected port

## License

MIT License