#!/bin/bash

# Full Test Suite Runner
set -e

echo "Kubrick HR Full Test Suite"
echo "============================"

# Function to print colored output
print_status() {
    echo "$(tput setaf 2)✅ $1$(tput sgr0)"
}

print_error() {
    echo "$(tput setaf 1)❌ $1$(tput sgr0)"
}

# Test Backend
echo "🐍 Running Backend Tests..."
cd backend
if ./test.sh; then
    print_status "Backend tests passed!"
else
    print_error "Backend tests failed!"
    exit 1
fi

# Test Frontend
echo
echo "⚛️  Running Frontend Tests..."
cd ../frontend
if npm test -- --run; then
    print_status "Frontend tests passed!"
else
    print_error "Frontend tests failed!"
    exit 1
fi

cd ..

print_status "All tests passed! 🎉"
echo
echo "📊 Test Results:"
echo "  Backend: Coverage report in backend/htmlcov/"
echo "  Frontend: Test results displayed above"
echo
echo "💡 To run tests individually:"
echo "  Backend:  cd backend && ./test.sh"
echo "  Frontend: cd frontend && npm test"