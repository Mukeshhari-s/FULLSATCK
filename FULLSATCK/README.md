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

## Development

Both frontend and backend can be developed independently. Make sure to:
1. Start the backend server first
2. Configure the frontend to connect to the correct backend URL
3. Handle CORS if needed

For detailed setup instructions, see the README files in the respective directories. 