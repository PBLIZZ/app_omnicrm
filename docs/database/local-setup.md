# Local PostgreSQL Database Setup

This guide explains how to set up a local PostgreSQL database for development and testing.

## Quick Setup

The easiest way to get started is using Docker Compose:

```bash
# Start local PostgreSQL via Docker
pnpm db:start

# Copy environment template and update DATABASE_URL
cp docs/ops/env.example .env.local

# Start development server
pnpm dev
```

Your `.env.local` should include:

```ini
DATABASE_URL=postgresql://postgres:password@localhost:5432/omnicrm_dev
```

## Manual PostgreSQL Setup

If you prefer to install PostgreSQL directly on your system:

### 1. Install PostgreSQL

**macOS:**

```bash
brew install postgresql
brew services start postgresql
```

**Ubuntu/Debian:**

```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Set up Database

Run the setup script:

```bash
pnpm db:setup
```

Or manually:

```bash
# Connect as postgres user
psql -h localhost -U postgres

# Create database and user
CREATE DATABASE omnicrm_dev;
CREATE USER omnicrm_user WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE omnicrm_dev TO omnicrm_user;
ALTER USER omnicrm_user CREATEDB;
```

### 3. Update Environment

Add to your `.env.local`:

```ini
DATABASE_URL=postgresql://omnicrm_user:password@localhost:5432/omnicrm_dev
```

## Testing with Local Database

Run tests against the local database:

```bash
pnpm test:local
```

This uses the local PostgreSQL connection instead of mocked database calls.

## Docker Compose Services

The `docker-compose.yml` includes:

- **postgres**: PostgreSQL 15 with persistent volume
- **web**: Next.js app connected to local PostgreSQL

### Commands

- `pnpm db:start` - Start PostgreSQL only
- `pnpm db:stop` - Stop all services
- `docker-compose up` - Start both web and database
- `docker-compose down -v` - Stop and remove volumes (fresh start)

## Database Initialization

SQL files in `supabase/sql/` are automatically executed when the PostgreSQL container starts for the first time. This ensures your local database has the same schema as production.

## Troubleshooting

### Connection Issues

- Ensure PostgreSQL is running: `pg_isready -h localhost -p 5432`
- Check if port 5432 is available: `lsof -i :5432`
- Verify credentials in `.env.local`

### Permission Issues

- Make sure the database user has proper permissions
- Re-run `pnpm db:setup` to fix permissions

### Docker Issues

- Reset everything: `docker-compose down -v && pnpm db:start`
- Check logs: `docker-compose logs postgres`
