#!/bin/bash

# Backend Test Runner Script
set -e

echo "Running Kubrick HR Backend Tests"
echo "=================================="

# Activate virtual environment
source .venv/bin/activate

# Install test dependencies if not already installed
echo "📦 Installing test dependencies..."
pip install -r test_requirements.txt

# Run tests with coverage
echo "🔬 Running tests with coverage..."
pytest tests/ \
  --cov=app \
  --cov-report=term-missing \
  --cov-report=html:htmlcov \
  --cov-fail-under=80 \
  -v

echo "✅ Backend tests completed!"
echo "📊 Coverage report generated in htmlcov/"