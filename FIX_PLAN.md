# Fix Plan - Multiple Module Issues

## Current Branch: `fix/multiple-module-issues`

## Critical Issues to Fix

### 1. 🔴 Clients Module Display Issues

**Problem**: The clients module isn't displaying everything it should
**Symptoms**:

- [ ] Missing fields in client list view
- [ ] Slug field not showing in details
- [ ] Stage/tags/confidence score not rendering
      **Files to Check**:
- `/src/app/(authorisedRoute)/omni-clients/page.tsx`
- `/src/app/(authorisedRoute)/omni-clients/_components/`
- `/src/server/adapters/omni-client.adapter.ts`
  **Fix Priority**: HIGH

### 2. 🔴 AI Processes Not Working

**Problem**: AI processes aren't working as planned
**Symptoms**:

- [ ] AI insights not generating
- [ ] Contact enrichment failing
- [ ] Email suggestions not working
      **Files to Check**:
- `/src/server/ai/`
- `/src/app/api/omni-clients/[clientId]/ai-insights/`
- API keys in `.env.local`
  **Fix Priority**: HIGH

### 3. 🔴 Calendar Connection UI Missing

**Problem**: Calendar stopped showing the connected conditional UI
**Symptoms**:

- [ ] Connection status not displaying
- [ ] Sync button missing/not working
- [ ] Calendar events not showing
      **Files to Check**:
- `/src/app/(authorisedRoute)/settings/integrations/`
- `/src/hooks/use-calendar-connection.ts`
- `/src/server/google/calendar.ts`
  **Fix Priority**: HIGH

### 4. 🟡 Momentum Module Needs Development

**Problem**: Momentum module needs total development
**Status**: Not yet implemented
**Required Features**:

- [ ] Workspace creation/management
- [ ] Project creation within workspaces
- [ ] Task (momentum) creation and management
- [ ] AI-suggested tasks
- [ ] Drag-and-drop organization
      **Files to Create**:
- `/src/app/(authorisedRoute)/momentum/`
- `/src/server/services/momentum.service.ts`
- `/src/server/repositories/momentum.repository.ts`
  **Fix Priority**: MEDIUM (new feature)

### 5. 🔴 Connect Not Generating Contacts

**Problem**: Connect feature isn't generating contacts
**Symptoms**:

- [ ] Import from Gmail not creating contacts
- [ ] Calendar attendees not being added
- [ ] Duplicate detection not working
      **Files to Check**:
- `/src/app/(authorisedRoute)/connect/`
- `/src/server/jobs/processors/sync.ts`
- `/src/server/services/contact-generation.service.ts`
  **Fix Priority**: HIGH

## Fix Order (by priority and dependencies)

### Phase 1: Core Data Flow (Day 1)

1. **Fix Clients Module Display**
   - Verify database queries include all fields
   - Check adapter mappings
   - Fix component rendering

2. **Fix Connect Contact Generation**
   - Debug sync job processor
   - Fix contact creation from raw events
   - Test duplicate detection

### Phase 2: Integrations (Day 2)

3. **Fix Calendar UI**
   - Restore connection status component
   - Fix conditional rendering logic
   - Test Google Calendar API connection

4. **Fix AI Processes**
   - Verify API keys are set
   - Check rate limiting
   - Debug AI service calls
   - Test with mock data first

### Phase 3: New Features (Day 3-4)

5. **Develop Momentum Module**
   - Create basic UI structure
   - Implement CRUD operations
   - Add drag-and-drop
   - Integrate AI suggestions

## Testing Checklist

### Before Starting Each Fix

- [ ] Run `pnpm dev` and check console for errors
- [ ] Check browser DevTools Network tab for failed requests
- [ ] Review recent commits for breaking changes

### After Each Fix

- [ ] Write/update tests for the fixed feature
- [ ] Test manually in development
- [ ] Commit with descriptive message
- [ ] Document any API changes

## Environment Variables to Verify

```env
# AI Services
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Google Services
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_GMAIL_REDIRECT_URI=
GOOGLE_CALENDAR_REDIRECT_URI=

# Database
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Encryption
APP_ENCRYPTION_KEY=
```

## Git Workflow

```bash
# For each major fix, create a sub-branch
git checkout -b fix/clients-display
# Make fixes
git add .
git commit -m "fix: restore all fields in clients module display"
git push origin fix/clients-display

# Create PR to merge into fix/multiple-module-issues
# After all fixes are complete, create PR from fix/multiple-module-issues to main
```

## Quick Debug Commands

```bash
# Check for TypeScript errors
pnpm typecheck

# Check for linting issues
pnpm lint

# Run specific test suites
pnpm test src/app/omni-clients
pnpm test src/server/ai

# Check database schema
pnpm drizzle-kit studio

# View application logs
pnpm dev 2>&1 | grep -E "ERROR|WARN"
```

## Success Criteria

- [ ] All client fields display correctly
- [ ] AI insights generate for new interactions
- [ ] Calendar shows connection status and syncs events
- [ ] Momentum module has basic CRUD functionality
- [ ] Connect generates contacts from emails/calendar
- [ ] All tests pass
- [ ] No console errors in development

## Notes

- Main branch is now up-to-date on remote
- Working on feature branch `fix/multiple-module-issues`
- Can create sub-branches for each fix if needed
- Consider deploying to staging after each phase
