# Restaurant Menu App - Frontend

This is the frontend part of the Restaurant Menu Application built with React and Vite.

## Features
- User authentication (Login/Signup)
- Customer dashboard for browsing menu
- Chef dashboard for managing orders
- Admin dashboard for overall management
- Responsive design

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation
```bash
npm install
```

### Environment Variables

Create a `.env` file in the frontend directory with the following variables:

```
VITE_UNSPLASH_ACCESS_KEY=your_unsplash_access_key
VITE_API_BASE_URL=http://localhost:5000/api
VITE_APP_ENV=development
```

Copy the `.env.example` file to `.env` and update the values as needed.

### Development
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build
```bash
npm run build
```

## Project Structure
- `src/components/` - React components
- `src/assets/` - Static assets
- `public/` - Public assets
- `index.html` - Main HTML file

## Backend
The backend API is located in the `../backend` directory.

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
