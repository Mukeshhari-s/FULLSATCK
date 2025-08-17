# South Indian Restaurant - Full Stack Application

A full-stack restaurant ordering system built with the MERN stack (MongoDB, Express.js, React.js, Node.js).

## 🚀 Features

- **User Authentication**
  - Sign up/Login functionality
  - JWT-based authentication
  - Protected routes

- **Menu Management**
  - Display special dishes
  - Show popular items
  - Complete menu listing

- **Cart System**
  - Add items to cart
  - Remove items from cart
  - Quantity adjustment
  - Price calculation

- **Interactive UI**
  - Responsive design
  - User-friendly interface
  - Loading states
  - Navigation feedback

- **ChatBot Integration**
  - Customer support
  - Order assistance
  - FAQ handling

## 🛠️ Technology Stack

### Frontend
- React.js
- React Router Dom
- Context API for state management
- CSS for styling
- JWT for authentication

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- bcrypt for password hashing

## 📦 Project Structure

```
fullstack-rev/
├── client/                 # Frontend React application
│   ├── public/
│   └── src/
│       ├── components/     # React components
│       │   ├── auth/      # Authentication components
│       │   ├── home/      # Home page components
│       │   ├── cart/      # Cart components
│       │   └── chatbot/   # ChatBot component
│       ├── context/       # React Context files
│       ├── services/      # API services
│       └── App.js         # Main App component
│
└── server/                # Backend Node.js/Express application
    ├── models/           # MongoDB models
    ├── routes/          # API routes
    ├── middleware/      # Custom middleware
    └── server.js        # Express app entry point
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd fullstack-rev
   ```

2. **Install Backend Dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd ../client
   npm install
   ```

4. **Environment Setup**
   - Create .env file in server directory
   ```env
   MONGODB_URI=your_mongodb_uri
   JWT_SECRET=your_jwt_secret
   PORT=5000
   ```

5. **Running the Application**

   Start the backend server:
   ```bash
   cd server
   npm start
   ```

   Start the frontend application (in a new terminal):
   ```bash
   cd client
   npm start
   ```

   The application will be available at:
   - Frontend: http://localhost:3000
   - Backend: http://localhost:5000

## 🔑 API Endpoints

### Authentication
- POST `/api/auth/signup` - Register new user
- POST `/api/auth/login` - Login user
- GET `/api/auth/me` - Get current user

### Cart
- GET `/api/cart` - Get user's cart
- POST `/api/cart/add` - Add item to cart
- PUT `/api/cart/update/:id` - Update cart item
- DELETE `/api/cart/remove/:id` - Remove item from cart

## 👤 User Features

1. **Authentication**
   - Sign up with email and password
   - Login with credentials
   - Automatic token refresh
   - Secure route protection

2. **Menu Navigation**
   - Browse special dishes
   - View popular items
   - Search menu items
   - Filter by categories

3. **Cart Management**
   - Add items to cart
   - Modify quantities
   - Remove items
   - View total price

4. **Order Process**
   - Review cart items
   - Proceed to checkout
   - Order confirmation

## 💻 Development

### Code Style
- ESLint for code linting
- Prettier for code formatting
- React best practices
- Component-based architecture

### State Management
- React Context API for global state
- Local state for component-specific data
- Proper error handling
- Loading state management

## 🔒 Security

- JWT for authentication
- Password hashing
- Protected API endpoints
- Secure HTTP-only cookies
- Input validation
- XSS protection

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- React.js documentation
- MongoDB documentation
- Express.js documentation
- Node.js documentation
- JWT.io
