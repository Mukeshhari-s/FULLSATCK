# Restaurant Menu App - Backend

This is the backend API for the Restaurant Menu Application built with Node.js and Express.

## Features
- RESTful API endpoints
- User authentication and authorization
- Menu management
- Order processing
- Database integration

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation
```bash
npm install
```

### Development
```bash
npm start
```

The API server will be available at `http://localhost:3000`

### Available Scripts
- `npm start` - Start the development server
- `npm run dev` - Start with nodemon for development

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration

### Menu
- `GET /api/menu` - Get all menu items
- `POST /api/menu` - Add new menu item (Admin/Chef only)
- `PUT /api/menu/:id` - Update menu item (Admin/Chef only)
- `DELETE /api/menu/:id` - Delete menu item (Admin only)

### Orders
- `GET /api/orders` - Get all orders
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id` - Update order status

## Project Structure
- `server.js` - Main server file
- `package.json` - Dependencies and scripts

## Frontend
The frontend application is located in the `../frontend` directory. 