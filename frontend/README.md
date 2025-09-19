# PipLine Frontend - Production Ready

A modern, professional React frontend for the PipLine Treasury Management System.

## 🚀 Features

- **Modern React 18** with TypeScript
- **Professional UI/UX** with Tailwind CSS
- **Real-time Data** with SWR and React Query
- **Responsive Design** for all devices
- **Authentication & Authorization**
- **Multi-language Support** (English/Turkish)
- **Advanced Analytics** with Recharts
- **Performance Optimized** with lazy loading
- **Error Boundaries** and comprehensive error handling
- **Accessibility** compliant

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Backend API running on port 5000

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Copy environment file
   cp env.development .env.local
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

## 🏗️ Build for Production

```bash
# Build the application
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
├── contexts/           # React contexts (Auth, Language)
├── hooks/              # Custom React hooks
├── pages/              # Page components
├── services/           # API services
├── utils/              # Utility functions
├── config/             # Configuration files
├── styles/             # Global styles
└── types/              # TypeScript type definitions
```

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file:

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_APP_NAME=PipLine Treasury
VITE_APP_VERSION=1.0.0
```

### API Configuration

The frontend is configured to proxy API requests to the backend:

```typescript
// vite.config.ts
proxy: {
  '/api': {
    target: 'http://127.0.0.1:5000',
    changeOrigin: true,
    secure: false,
  },
}
```

## 🎨 UI Components

### Core Components
- `Layout` - Main application layout
- `ProtectedRoute` - Authentication wrapper
- `ErrorBoundary` - Error handling
- `LoadingSpinner` - Loading states

### Enhanced Components
- `EnhancedCard` - Professional card component
- `EnhancedButton` - Button with variants
- `EnhancedForm` - Form components
- `DataVisualization` - Charts and graphs

## 🔐 Authentication

The application uses a robust authentication system:

```typescript
// AuthContext provides:
- login(username, password)
- logout()
- checkAuth()
- user state management
- CSRF token handling
```

## 📊 Data Management

### SWR Configuration
- Automatic revalidation
- Error retry with exponential backoff
- Cache deduplication
- Focus revalidation

### API Client
- Centralized API client with CSRF handling
- Automatic token refresh
- Error handling and retry logic
- Request/response logging

## 🌐 Internationalization

Supports multiple languages with context-based translation:

```typescript
const { t } = useLanguage();
// Usage: t('clients.title')
```

## 📈 Analytics & Charts

Built with Recharts for professional data visualization:

- Line charts for trends
- Bar charts for comparisons
- Pie charts for distributions
- Area charts for volume analysis

## 🎯 Performance Features

- **Code Splitting** - Lazy loaded pages
- **Virtual Scrolling** - For large datasets
- **Image Optimization** - Lazy loading and placeholders
- **Memoization** - React.memo and useMemo
- **Debounced Inputs** - Performance optimization

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test suites
npm run test:auth
npm run test:api
```

## 📦 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run lint:strict  # Run ESLint with strict rules
npm run type-check   # TypeScript type checking
npm test             # Run tests
npm run format       # Format code with Prettier
```

## 🔧 Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow ESLint and Prettier configuration
- Use functional components with hooks
- Implement proper error boundaries

### Component Structure
```typescript
interface ComponentProps {
  // Define props interface
}

const Component: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  // Component logic
  return (
    // JSX
  );
};

export default Component;
```

### State Management
- Use React Context for global state
- Use local state for component-specific data
- Use SWR for server state management

## 🚀 Deployment

### Build Process
1. Run `npm run build`
2. The build output will be in `dist/` directory
3. Serve the static files from your web server

### Environment Configuration
- Set production environment variables
- Configure API endpoints
- Set up proper CORS headers

## 🔍 Troubleshooting

### Common Issues

1. **CSRF Token Errors**
   - Clear browser cache and cookies
   - Restart development server
   - Check backend CSRF configuration

2. **API Connection Issues**
   - Verify backend is running on port 5000
   - Check proxy configuration in vite.config.ts
   - Verify CORS settings on backend

3. **Build Errors**
   - Run `npm run type-check` to identify TypeScript issues
   - Fix linting errors with `npm run lint:strict`
   - Ensure all dependencies are installed

## 📄 License

This project is proprietary software. All rights reserved.

## 🤝 Contributing

1. Follow the established code style
2. Write tests for new features
3. Update documentation as needed
4. Ensure all tests pass before submitting

## 📞 Support

For technical support or questions:
- Check the troubleshooting section
- Review the code documentation
- Contact the development team
