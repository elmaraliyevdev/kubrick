# Kubrick HR Testing Guide

This document outlines the comprehensive testing setup for Kubrick HR, including both backend and frontend tests.

## 🧪 Test Structure

### Backend Tests (Python/FastAPI)
- **Framework**: pytest with asyncio support
- **Location**: `backend/tests/`
- **Coverage**: Includes unit tests for API endpoints, authentication flow, and database operations

### Frontend Tests (React/TypeScript)
- **Framework**: Vitest + React Testing Library
- **Location**: `frontend/src/**/__tests__/` and `frontend/src/test/`
- **Coverage**: Component tests, hook tests, integration tests, and Redux store tests

## 🚀 Running Tests

### Quick Start - Run All Tests
```bash
./test-all.sh
```

### Backend Only
```bash
cd backend
./test.sh
```

### Frontend Only
```bash
cd frontend
npm test
```

## 📊 Test Categories

### Backend Tests

#### Authentication Tests (`test_auth.py`)
- ✅ User registration with email verification
- ✅ Email verification code handling
- ✅ Complete profile flow
- ✅ Password login
- ✅ Error handling for various scenarios
- ✅ Email sending mocks
- ✅ Database persistence

#### Key Test Features:
- In-memory SQLite database for isolated tests
- Email sending mocks to verify notifications
- JWT token validation
- Rate limiting testing
- Input validation testing

### Frontend Tests

#### Component Tests
- **RegisterForm**: Form validation, submission, error display
- **VerifyEmailForm**: Code input, resend functionality, navigation
- **CompleteProfileForm**: Profile completion flow

#### Hook Tests  
- **useAuth**: Registration, login, verification, logout flows
- **API integration**: HTTP requests, error handling, state updates

#### Store Tests
- **authSlice**: Redux state management, localStorage persistence
- **Action creators**: Login, logout, error handling

#### Integration Tests
- **auth-flow**: Full end-to-end authentication flows
- **Route protection**: Authenticated route access
- **Error scenarios**: Failed requests, invalid data

## 🛡️ Test Coverage

### Backend Coverage Goals
- **Minimum**: 80% line coverage
- **Focus Areas**: Critical auth flows, API endpoints, database operations

### Frontend Coverage Goals  
- **Components**: All user interactions and state changes
- **Hooks**: API calls and state management
- **Integration**: Complete user journeys

## 🔧 Test Configuration

### Backend (`pytest.ini`)
```ini
[tool:pytest]
testpaths = tests
addopts = -v --tb=short --strict-config
asyncio_mode = auto
```

### Frontend (`vitest.config.ts`)
```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  }
})
```

## 🎭 Mocking Strategy

### Backend Mocks
- **Email Service**: Mock Postmark API calls
- **Database**: In-memory SQLite for isolation
- **External APIs**: Mock HTTP clients

### Frontend Mocks
- **API Calls**: MSW (Mock Service Worker) for HTTP mocking
- **Navigation**: React Router mocks
- **LocalStorage**: Automatic cleanup between tests

## 🚨 Test Data Management

### Backend
- Fresh database per test with automatic cleanup
- Factory pattern for creating test data
- Isolated test environment

### Frontend  
- Clean localStorage between tests
- Mock API responses for consistency
- Redux store isolation per test

## 📈 Continuous Integration

Tests are designed to run in CI/CD environments:

```bash
# Backend
cd backend && python -m pytest tests/ --cov=app --cov-fail-under=80

# Frontend  
cd frontend && npm test -- --run --coverage
```

## 🐛 Debugging Tests

### Backend
```bash
cd backend
pytest tests/test_auth.py::TestRegistration::test_register_success -v -s
```

### Frontend
```bash
cd frontend
npm test -- --run RegisterForm.test.tsx
```

## 📝 Test Writing Guidelines

### Backend
1. Use descriptive test names
2. Test both success and failure scenarios  
3. Mock external dependencies
4. Use database transactions for cleanup
5. Test rate limiting and validation

### Frontend
1. Test user interactions, not implementation details
2. Use screen queries that match user behavior
3. Test error states and loading states
4. Mock API calls consistently
5. Test accessibility where relevant

## 🔍 Coverage Reports

### Backend
- HTML Report: `backend/htmlcov/index.html`
- Terminal output with missing lines

### Frontend
- Terminal coverage summary
- Can be configured for HTML reports

## 📚 Debugging Common Issues

### Backend Issues
- **Database conflicts**: Ensure proper cleanup in conftest.py
- **Async/await**: Use proper asyncio markers
- **Email mocks**: Verify mock_email_send fixture usage

### Frontend Issues  
- **Component not rendering**: Check providers in test utils
- **API calls not mocked**: Verify MSW handlers
- **State not updating**: Ensure proper async/await in tests

## 🎯 Test Quality Metrics

- **Coverage**: Minimum 80% for backend
- **Speed**: Tests should run in under 30 seconds
- **Reliability**: Tests should be deterministic
- **Maintainability**: Clear, readable test code

---

**Remember**: These tests caught the bugs we experienced during development:
- Authentication token storage mismatch
- SQLAlchemy session management issues  
- API URL configuration problems
- Type import errors with verbatimModuleSyntax

Good tests prevent regressions and make refactoring safe! 🛡️