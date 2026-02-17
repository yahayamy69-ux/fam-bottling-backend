# FAM Bottling Co - Backend

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Create .env file
Copy `.env.example` to `.env` and update with your MongoDB Atlas credentials:
```
MONGODB_URI=mongodb+srv://your_username:your_password@cluster.mongodb.net/fam_bottling
JWT_SECRET=your_super_secret_jwt_key
PORT=5000
```

### 3. Run Server
```bash
# Development (with hot reload)
npm run dev

# Production
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (protected)

### Supply Management
- `POST /api/supply` - Submit new supply (protected)
- `GET /api/supply/my` - Get user's supplies (protected)
- `GET /api/supply/:id` - Get specific supply (protected)

### Admin
- `GET /api/admin/supplies` - View all supplies (admin only)
- `PATCH /api/admin/supply/:id` - Update supply status (admin only)
- `PATCH /api/admin/user/:userId/returning` - Toggle returning customer (admin only)
- `GET /api/admin/user/:userId` - Get user details (admin only)

## Database Models

### User
- name, email, password (hashed)
- isReturning (Boolean)
- totalCashback (Number)
- role (user/admin)

### Supply
- userId, bottleSize, quantity, pricePerUnit
- totalAmount, cashback, status
- createdAt, updatedAt

## Key Features
✅ JWT Authentication
✅ Cashback Logic (10% for returning customers)
✅ Admin Management Dashboard
✅ Secure Password Hashing
✅ Error Handling
✅ CORS Enabled
