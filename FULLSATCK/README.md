# Restaurant Menu Application

A full-stack restaurant menu application with separate frontend and backend components.

## Project Structure

```
restaurant-menu-app/
├── frontend/          # React frontend application
│   ├── src/          # React components and source code
│   ├── public/       # Public assets
│   ├── package.json  # Frontend dependencies
│   └── README.md     # Frontend documentation
├── backend/          # Node.js backend API
│   ├── server.js     # Main server file
│   ├── package.json  # Backend dependencies
│   └── README.md     # Backend documentation
└── README.md         # This file
```

## Quick Start

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend will be available at: http://localhost:5173

### Backend
```bash
cd backend
npm install
npm start
```
Backend API will be available at: http://localhost:3000

## Features

### Frontend
- User authentication (Login/Signup)
- Customer dashboard for browsing menu
- Chef dashboard for managing orders
- Admin dashboard for overall management
- Responsive design

### Backend
- RESTful API endpoints
- User authentication and authorization
- Menu management
- Order processing
- Database integration

## Technology Stack

### Frontend
- React
- Vite
- CSS3

### Backend
- Node.js
- Express.js

## Environment Variables

Both frontend and backend require environment variables to be configured. Copy the `.env.example` files to `.env` in each directory and update the values as needed.

### Backend
Create a `.env` file in the `backend/` directory with the following variables:
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT token generation
- `PORT`: Server port (default: 5000)
- `RAZORPAY_KEY_ID`: Razorpay API key ID
- `RAZORPAY_KEY_SECRET`: Razorpay API key secret
- `FRONTEND_URL`: Frontend application URL for CORS

### Frontend
Create a `.env` file in the `frontend/` directory with the following variables:
- `VITE_UNSPLASH_ACCESS_KEY`: Unsplash API key for dish images
- `VITE_API_BASE_URL`: Backend API base URL
- `VITE_APP_ENV`: Application environment (development/production)

## Development

Both frontend and backend can be developed independently. Make sure to:
1. Start the backend server first
2. Configure the frontend to connect to the correct backend URL
3. Handle CORS if needed

For detailed setup instructions, see the README files in the respective directories. 