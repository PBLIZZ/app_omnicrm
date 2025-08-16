# OmniCRM

AI‑first CRM built with Next.js 15 and Supabase. Featuring contact management, Gmail/Calendar sync, AI insights, and background job processing.

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Auth**: Supabase Auth with Google OAuth
- **Styling**: Tailwind CSS + shadcn/ui components
- **AI**: OpenRouter integration for LLM features
- **Testing**: Vitest (unit) + Playwright (E2E)

## Quick Start

```bash
# Install dependencies
pnpm install

# Setup environment
cp docs/ops/env.example .env.local
# Edit .env.local with your Supabase and Google OAuth credentials

# Start development server
pnpm dev
```

## Development Commands

```bash
# Development
pnpm dev              # Start Next.js dev server
pnpm build            # Build for production
pnpm typecheck        # Run TypeScript checks
pnpm lint             # Run ESLint
pnpm format           # Format with Prettier

# Testing
pnpm test             # Run unit tests (Vitest)
pnpm test:watch       # Run tests in watch mode
pnpm e2e              # Run E2E tests (Playwright)

# Pre-commit checks
pnpm typecheck && pnpm lint && pnpm test
```

## Project Structure

```text
src/
├── app/              # Next.js App Router (API routes & pages)
│   ├── api/          # API endpoints (thin handlers)
│   ├── contacts/     # Contact management pages
│   └── layout.tsx    # Root layout with authentication
├── components/       # React components
│   ├── contacts/     # Contact-specific components
│   ├── google/       # Google integration components
│   └── ui/           # shadcn/ui components
├── server/           # Business logic & services
│   ├── ai/           # AI/LLM functionality
│   ├── auth/         # Authentication utilities
│   ├── db/           # Database client & schema
│   ├── google/       # Google APIs integration
│   ├── jobs/         # Background job processing
│   └── sync/         # Data synchronization
└── lib/              # Shared utilities

docs/                 # Project documentation
supabase/            # SQL migration files (source of truth)
e2e/                 # Playwright E2E tests
```

## Key Features

- **Contact Management**: Import and manage contacts with Gmail integration
- **Background Sync**: Automated Gmail/Calendar synchronization with job queues
- **AI Insights**: LLM-generated summaries and recommendations
- **Multi-tenant**: User-scoped data with Row Level Security
- **Type Safety**: Strict TypeScript with Drizzle ORM for type-safe database access

## Documentation

### Core Documentation

- [Project Overview](docs/README.md) - Complete project documentation index
- [Getting Started](docs/getting-started/README.md) - Detailed setup guide
- [Architecture](docs/architecture/README.md) - System design and patterns
- [API Documentation](docs/api/README.md) - API endpoints and contracts

### Operations & Security

- [Security Controls](SECURITY.md) - Authentication, encryption, and security measures
- [Deployment Guide](docs/ops/README.md) - Production deployment and operations
- [Environment Setup](docs/ops/environment-variables.md) - Required environment variables

### Development

- [Testing Guide](docs/qa/README.md) - Unit, integration, and E2E testing
- [Database Doctrine](docs/database/README.md) - Schema management and RLS policies
- [Contributing Guidelines](docs/contributing/README.md) - Development workflow and standards

For AI assistant guidance, see [`CLAUDE.md`](CLAUDE.md).
