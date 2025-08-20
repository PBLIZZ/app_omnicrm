#!/bin/bash
set -e

echo "Setting up local PostgreSQL database for development..."

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "PostgreSQL is not installed. Please install it first:"
    echo "  macOS: brew install postgresql"
    echo "  Ubuntu: sudo apt-get install postgresql postgresql-contrib"
    exit 1
fi

# Check if PostgreSQL service is running
if ! pg_isready -h localhost -p 5432 &> /dev/null; then
    echo "PostgreSQL service is not running. Please start it:"
    echo "  macOS: brew services start postgresql"
    echo "  Ubuntu: sudo systemctl start postgresql"
    exit 1
fi

# Create database and user
echo "Creating database and user..."
psql -h localhost -U postgres -c "CREATE DATABASE omnicrm_dev;" 2>/dev/null || echo "Database omnicrm_dev already exists"
psql -h localhost -U postgres -c "CREATE USER omnicrm_user WITH PASSWORD 'password';" 2>/dev/null || echo "User omnicrm_user already exists"
psql -h localhost -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE omnicrm_dev TO omnicrm_user;"
psql -h localhost -U postgres -c "ALTER USER omnicrm_user CREATEDB;" # Allow user to create test databases

echo "Local PostgreSQL database setup complete!"
echo "Database: omnicrm_dev"
echo "Connection string: postgresql://omnicrm_user:password@localhost:5432/omnicrm_dev"
echo ""
echo "To connect manually: psql -h localhost -U omnicrm_user -d omnicrm_dev"
echo ""
echo "Update your .env.local with:"
echo "DATABASE_URL=postgresql://omnicrm_user:password@localhost:5432/omnicrm_dev"
