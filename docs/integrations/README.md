# Integrations Documentation

This folder contains comprehensive documentation for all external service integrations.

## Available Integrations

### Google Calendar
- **Status**: ✅ Production Ready
- **Documentation**: [google-calendar/](./google-calendar/README.md)
- **OAuth Flow**: Complete with CSRF protection
- **Features**: Event sync, AI embeddings, insights generation
- **Last Updated**: 2025-08-26

### Gmail (Planned)
- **Status**: 🚧 In Development
- **OAuth Reuse**: Will leverage Google Calendar OAuth tokens
- **Features**: Email sync, contact extraction, thread analysis

## Quick Start

Each integration folder contains:
- `README.md` - Complete setup and usage guide
- `oauth-flow.md` - OAuth implementation details
- `troubleshooting.md` - Common issues and solutions
- `api-reference.md` - API endpoints and responses

## Architecture Overview

All integrations follow a consistent pattern:
1. **OAuth Routes**: `/api/{service}/oauth/` and `/api/{service}/oauth/callback/`
2. **Sync Routes**: `/api/{service}/sync/` for data synchronization
3. **Services**: Business logic in `/src/server/services/{service}.service.ts`
4. **Database**: Tokens stored in `user_integrations` table
5. **Security**: CSRF protection, encrypted token storage