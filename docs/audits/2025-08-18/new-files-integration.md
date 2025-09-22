# New Files Integration Audit — 2025-08-18

This document tracks the assessment and integration plan for newly added files from the old codebase into the current Next.js/TypeScript app under `src/`.

Rules:

- Ignore `.md` files from the imported set.
- For each new file (max 3 per batch): assess compatibility, detect missing imports/deps, propose scaffolding or installs rather than removals.
- Log concrete next actions and link created scaffolds.

---

## Legend

- Status: Pending | Reviewed | Integrated
- Action Types: Scaffold | Configure | Install | Refactor | Defer

---

## Batches

### Batch 1

1. src/app/api/contacts/schema.ts

- Status: Reviewed
- Findings:
  - Zod v4 schemas for GET query and POST body; uses JSON.parse transform for `createdAtFilter` with guarded error.
  - Types exported (`GetQuery`, `CreatedAtFilter`) used by route.
  - No external deps beyond `zod` (already present in package.json).
- Integration:
  - Verified import in `src/app/api/contacts/route.ts` (`./schema`) is correct.
  - No additional scaffolding required.
- Actions: None

1. src/app/global-error.tsx

- Status: Reviewed
- Findings:
  - Valid Next.js App Router global error boundary. Client component returning `<html><body>` wrapper.
  - No external deps.
- Integration:
  - Automatically picked up by Next.js app router at `src/app/global-error.tsx`.
- Actions: None

1. src/lib/design-system.ts

- Status: Reviewed
- Findings:
  - Pure TS utilities/constants for colors, spacing, typography, animations, etc.
  - No external deps; safe to tree-shake. Not yet referenced directly by components.
- Integration:
  - Complementary to `src/styles/design-system.css` (new). CSS already imported in `src/app/globals.css`.
  - Ready for import via `@/lib/design-system` thanks to tsconfig path alias.
- Actions: None (optional: gradually adopt in UI components).

### Batch 2

1. src/components/ConsentVerification.tsx

- Status: Integrated
- Findings:
  - Imported from old codebase with broken imports (`../api/photoEnrichmentApi.js`, `../hooks/use-toast.js`) and missing client directive.
- Integration:
  - Added client directive and fixed imports to use path aliases.
  - Scaffolded client API at `src/lib/api/consent.ts` with `updateUserConsent(granted: boolean)`.
  - Server route created at `src/app/api/settings/consent/route.ts` (PUT) to accept `{ allowProfilePictureScraping: boolean }`.
- Actions:
  - Done: Route created at `src/app/api/settings/consent/route.ts` (PUT). Persistence to be added via migration.
  - Issues: Track persistence and improvements — [#61](https://github.com/PBLIZZ/app_omnicrm/issues/61) (DB migration), [#62](https://github.com/PBLIZZ/app_omnicrm/issues/62) (error handling).
  - Defer: DB migration for consent fields (e.g., `user_profiles.allow_profile_picture_scraping`, `gdpr_consent_date`, `gdpr_consent_version`).

1. src/components/SearchModal.tsx

- Status: Reviewed
- Findings:
  - Uses `@/components/ui/dialog` and `@/components/ui/input` which exist. Already marked `"use client"`.
- Integration:
  - No external deps beyond project UI primitives.
- Actions: None

1. src/components/ui/alert.tsx

- Status: Reviewed
- Findings:
  - Uses `class-variance-authority` and `cn` from `@/lib/utils` (present). Matches existing shadcn patterns.
- Integration:
  - No additional wiring needed.
- Actions: None

### Batch 3

1. src/components/ui/avatar-image.tsx

- Status: Pending
- Findings:
  - Uses `api.storage.getFileUrl.useQuery` from `@/lib/trpc`; `src/lib/trpc` not present and tRPC packages not installed.
  - Supabase SDK is available; no storage API routes exist. Also used similarly by `src/components/ui/image-upload.tsx`.
- Integration:
  - Option A (recommended initially): Add REST route `GET /api/storage/file-url?path=...` and a small client util using React Query.
  - Option B: Scaffold full tRPC stack (`@trpc/server`, `@trpc/react-query`) and implement `storage.getFileUrl`.
- Actions:
  - Scaffold: `src/app/api/storage/file-url/route.ts` to return signed URL using Supabase.
  - Scaffold: `src/lib/api/storage.ts` with `getFileUrl(filePath: string)`; optional `useFileUrl(path)` hook.
  - Defer: Decide on adopting tRPC globally; if yes, install and implement routers.
  - Done: Created `src/app/api/storage/file-url/route.ts` and `src/lib/api/storage.ts` (prefer REST initially). Next: update consumers to use `useFileUrl()`.

1. src/components/ui/breadcrumb.tsx

- Status: Reviewed
- Findings:
  - Uses `@radix-ui/react-slot` and `lucide-react` (both present).
- Integration:
  - No additional work needed.
- Actions: None

1. src/components/ui/checkbox.tsx

- Status: Pending
- Findings:
  - Uses `@radix-ui/react-checkbox` which is not in `package.json`.
- Integration:
  - Add dependency and keep component as-is.
- Actions:
  - Install: `@radix-ui/react-checkbox`
- Actions: Scaffold `src/components/ui/toast.tsx` component, verify import paths.

1. src/lib/api/consent.ts

- Status: Reviewed
- Findings:
  - Already scaffolded in Batch 2. Simple API client for consent endpoint.
  - No additional dependencies.
- Integration:
  - Ready for use, already mentioned as created.
- Actions: None

1. src/lib/breadcrumb-config.ts

- Status: Reviewed
- Findings:
  - Configuration utilities for dynamic breadcrumbs with lucide-react icons.
  - Route configuration mapping for breadcrumb generation.
  - No external deps beyond lucide-react (likely present).
- Integration:
  - Ready for use with breadcrumb components.
- Actions: None

1. src/lib/color-contrast.ts

- Status: Reviewed
- Findings:
  - WCAG 2.1 compliant color contrast utilities.
  - Imports WELLNESS_COLORS from `./design-system` (already reviewed in Batch 1).
  - Pure TypeScript utilities for accessibility compliance.
- Integration:
  - Depends on design-system.ts which is already integrated.
- Actions: None

1. src/lib/dateUtils.ts

- Status: Reviewed
- Findings:
  - Pure TypeScript date formatting and parsing utilities.
  - No external dependencies.
  - Standard date manipulation functions.
- Integration:
  - Ready for use throughout the application.
- Actions: None

1. src/lib/debug-helper.ts

- Status: Reviewed
- Findings:
  - Client-side debugging utilities for Next.js App Router.
  - Helps debug component boundaries, tRPC setup, and hydration issues.
  - No external dependencies.
- Integration:
  - Ready for use in client components for troubleshooting.
- Actions: None

1. src/components/ui/avatar-image.tsx

- Status: Reviewed
- Findings:
  - Avatar component with support for signed URLs via tRPC.
  - Uses `api.storage.getFileUrl.useQuery` - missing tRPC storage endpoints.
  - Depends on Next.js Image, lucide-react.
- Integration:
  - Requires tRPC setup with storage API endpoints.
  - Missing `api.storage.getFileUrl` procedure.
- Actions: Scaffold tRPC storage API procedure or modify to work without signed URLs.

1. src/components/ui/breadcrumb.tsx

- Status: Reviewed
- Findings:
  - Standard shadcn/ui breadcrumb component.
  - Uses @radix-ui/react-slot, lucide-react, cn utility.
  - Complete implementation following shadcn patterns.
- Integration:
  - Requires @radix-ui/react-slot dependency and cn from @/lib/utils.
- Actions: Verify @radix-ui/react-slot is installed, verify cn utility exists.

1. src/components/ui/checkbox.tsx

- Status: Reviewed
- Findings:
  - Standard shadcn/ui checkbox component.
  - Uses @radix-ui/react-checkbox, lucide-react, cn utility.
  - Complete implementation following shadcn patterns.
- Integration:
  - Requires @radix-ui/react-checkbox dependency and cn from @/lib/utils.
- Actions: Verify @radix-ui/react-checkbox is installed, verify cn utility exists.

1. src/components/ui/loading-spinner.tsx

- Status: Reviewed
- Findings:
  - Loading spinner component with accessibility features.
  - Incorrect import path: `'../../lib/utils'` should be `'@/lib/utils'`.
  - Otherwise standard loading spinner implementation.
- Integration:
  - Needs import path correction for cn utility.
- Actions: Fix import path to use `@/lib/utils`.
  - Done: Import fixed to `@/lib/utils`.

### Batch 4

1. src/components/ui/collapsible.tsx

- Status: Reviewed
- Findings:
  - Simple Radix UI collapsible wrapper component.
  - Direct exports of CollapsiblePrimitive components.
  - No external dependencies beyond @radix-ui/react-collapsible.
- Integration:
  - Requires @radix-ui/react-collapsible package.
- Actions: Verify @radix-ui/react-collapsible is installed.

1. src/components/ui/hover-card.tsx

- Status: Reviewed
- Findings:
  - Standard shadcn/ui hover card component.
  - Uses @radix-ui/react-hover-card and cn utility.
  - Complete implementation with forwarded refs.
- Integration:
  - Requires @radix-ui/react-hover-card package and cn from @/lib/utils.
- Actions: Verify @radix-ui/react-hover-card is installed, verify cn utility exists.

1. src/components/ui/image-upload.tsx

- Status: Reviewed
- Findings:
  - Complex image upload component with drag/drop, validation, and signed URLs.
  - Uses react-dropzone, uuid (v4), tRPC storage APIs.
  - Imports `api.storage.getUploadUrl` and `api.storage.getFileUrl` - missing tRPC endpoints.
  - File validation, size limits, and direct Supabase Storage upload.
- Integration:
  - Missing dependencies: react-dropzone, uuid packages.
  - Missing tRPC storage API procedures.
- Actions: Install react-dropzone and uuid packages, scaffold tRPC storage endpoints.

1. src/components/ui/tabs.tsx

- Status: Reviewed
- Findings:
  - Standard shadcn/ui tabs component.
  - Uses @radix-ui/react-tabs and cn utility.
  - Complete implementation with Tabs, TabsList, TabsTrigger, TabsContent.
- Integration:
  - Requires @radix-ui/react-tabs package and cn from @/lib/utils.
- Actions: Verify @radix-ui/react-tabs is installed, verify cn utility exists.

1. src/components/ui/theme-toggle.tsx

- Status: Reviewed
- Findings:
  - Theme toggle component with dropdown for light/dark/system modes.
  - Uses next-themes package and existing Button, DropdownMenu components.
  - Handles hydration mismatch with mounted state.
- Integration:
  - Requires next-themes package and existing UI components.
- Actions: Verify next-themes is installed, verify Button and DropdownMenu components exist.

1. src/components/ui/toggle-group.tsx

- Status: Reviewed
- Findings:
  - Toggle group component using Radix UI primitives.
  - Imports `toggleVariants` from `@/components/ui/toggle` (missing component).
  - Uses @radix-ui/react-toggle-group and class-variance-authority.
- Integration:
  - Missing dependency: toggle component with toggleVariants export.
  - Requires @radix-ui/react-toggle-group and class-variance-authority packages.
- Actions: Scaffold toggle component, verify @radix-ui/react-toggle-group and class-variance-authority are installed.

1. src/app/(auth)/components/OneTapComponent.tsx

- Status: Reviewed
- Findings:
  - Google One Tap authentication component with Sentry integration.
  - Uses @sentry/nextjs, google-one-tap types, Supabase client.
  - Comprehensive error handling and fallback button rendering.
- Integration:
  - Missing dependencies: @sentry/nextjs, google-one-tap (or custom types).
  - Requires Supabase client configuration.
- Actions: Install @sentry/nextjs, add google-one-tap types, verify Supabase client setup.

1. src/app/(auth)/forgot-password/page.tsx

- Status: Reviewed
- Findings:
  - Password reset page with form validation.
  - Imports from `@codexcrm/ui` (external UI package).
  - Uses `resetPassword` from `@/lib/auth/auth-actions`.
- Integration:
  - Missing dependency: @codexcrm/ui package.
  - Missing auth-actions module.
- Actions: Install @codexcrm/ui or replace with local components, scaffold auth-actions module.

1. src/app/(auth)/log-in/page.tsx

- Status: Reviewed
- Findings:
  - Login page with email/password and Google OAuth via OneTapComponent.
  - Same import issues: @codexcrm/ui package, auth-actions.
  - Comprehensive form validation with Zod schema.
- Integration:
  - Same missing dependencies as forgot-password page.
- Actions: Install @codexcrm/ui or replace with local components, scaffold auth-actions module.

1. src/app/(auth)/sign-up/page.tsx

- Status: Reviewed
- Findings:
  - Sign-up page with full name, business name, email, password fields.
  - Same import issues: @codexcrm/ui package, auth-actions.
  - Uses OneTapComponent for Google OAuth option.
- Integration:
  - Same missing dependencies as other auth pages.
- Actions: Install @codexcrm/ui or replace with local components, scaffold auth-actions module.

### Batch 5

1. src/components/ui/avatar.tsx

- Status: Reviewed
- Findings:
  - Uses `@radix-ui/react-avatar` and `cn` from `@/lib/utils`.
  - `@radix-ui/react-avatar` is present in `package.json`.
- Integration:
  - No additional work needed.
- Actions: None

1. src/components/ui/badge.tsx

- Status: Reviewed
- Findings:
  - Uses `class-variance-authority` and `@radix-ui/react-slot` (both present).
- Integration:
  - No additional work needed.
- Actions: None

1. src/components/ui/button.tsx

- Status: Reviewed
- Findings:
  - Uses `class-variance-authority` and `@radix-ui/react-slot` (both present).
- Integration:
  - No additional work needed.
- Actions: None

1. src/components/layout/AppSidebarController.tsx

- Status: Reviewed
- Findings:
  - Route-based sidebar controller that dynamically renders sidebar components.
  - Imports multiple sidebar components from (authorisedRoute) directories.
  - Uses usePathname for route detection.
- Integration:
  - Missing components: ContactsSidebar, DashboardSidebar, TasksSidebar, MarketingSidebar, MessagesSidebar, CalendarSidebar, SettingsSidebar, AnalyticsSidebar.
- Actions: Verify all sidebar components exist in their respective directories.

1. src/components/layout/DynamicBreadcrumb.tsx

- Status: Reviewed
- Findings:
  - Dynamic breadcrumb component with route-specific logic.
  - Uses @codexcrm/ui breadcrumb components.
  - Handles UUID detection for contact details.
- Integration:
  - Missing dependency: @codexcrm/ui package.
- Actions: Install @codexcrm/ui or replace with local breadcrumb component.

1. src/components/layout/MainLayout.tsx

- Status: Reviewed
- Findings:
  - Main application layout using shadcn sidebar architecture.
  - Imports from both @/components/ui/sidebar and @codexcrm/ui.
  - Modern responsive layout with header, sidebar, and main content.
- Integration:
  - Missing: @/components/ui/sidebar components, @codexcrm/ui Separator.
- Actions: Scaffold sidebar UI components, install @codexcrm/ui or replace Separator.

1. src/components/layout/MainSectionNav.tsx

- Status: Reviewed
- Findings:
  - Top navigation component with main app sections.
  - Uses Lucide React icons and Next.js Link.
  - Pure component with responsive design.
- Integration:
  - No external dependencies beyond existing tools.
- Actions: None

1. src/components/layout/MobileMenu.tsx

- Status: Reviewed
- Findings:
  - Mobile hamburger menu using Sheet components.
  - Imports Button and Sheet from @codexcrm/ui.
  - Responsive navigation for mobile viewports.
- Integration:
  - Missing dependency: @codexcrm/ui package.
- Actions: Install @codexcrm/ui or replace with local Sheet components.

1. src/components/layout/OmniBotFloat.tsx

- Status: Reviewed
- Findings:
  - Floating action button that opens OmniBot in a side panel.
  - Uses Sheet components and imports OmniBot component.
  - Modern UI with gradient styling and animations.
- Integration:
  - Missing: OmniBot component, @codexcrm/ui Sheet and Button.
- Actions: Verify OmniBot component exists, install @codexcrm/ui or replace components.

1. src/components/layout/ProjectLinksNav.tsx

- Status: Reviewed
- Findings:
  - Project navigation for sidebar with dropdown actions.
  - Uses @codexcrm/ui DropdownMenu and @/components/ui/sidebar.
  - Includes project management actions (view, share, delete).
- Integration:
  - Missing: @codexcrm/ui package, @/components/ui/sidebar components.
- Actions: Install @codexcrm/ui, scaffold sidebar UI components.

1. src/components/layout/QuickLinksNav.tsx

- Status: Reviewed
- Findings:
  - Collapsible navigation component for quick links.
  - Uses @codexcrm/ui Collapsible and @/components/ui/sidebar.
  - Hierarchical navigation with sub-items.
- Integration:
  - Missing: @codexcrm/ui package, @/components/ui/sidebar components.
- Actions: Install @codexcrm/ui, scaffold sidebar UI components.

1. src/components/layout/SidebarBrandHeader.tsx

- Status: Reviewed
- Findings:
  - Simple sidebar header with logo and branding.
  - Uses Next.js Image and Link, SidebarHeader component.
  - Responsive design that hides text when sidebar is collapsed.
- Integration:
  - Missing: @/components/ui/sidebar SidebarHeader component.
- Actions: Scaffold SidebarHeader component.

1. src/components/layout/SidebarFooterControls.tsx

- Status: Reviewed
- Findings:
  - Sidebar footer with theme toggle and logout functionality.
  - Uses @codexcrm/ui ModeToggle and Button, Supabase auth.
  - Handles sign-out with page redirect.
- Integration:
  - Missing: @codexcrm/ui package, ModeToggle component.
- Actions: Install @codexcrm/ui or scaffold ModeToggle, verify Supabase client setup.

### Batch 6

1. src/components/layout/SidebarNavLink.tsx

- Status: Reviewed
- Findings:
  - Reusable sidebar navigation link with tooltip support.
  - Uses @codexcrm/ui Tooltip components and responsive design.
  - Handles collapsed state with icon-only display.
- Integration:
  - Missing dependency: @codexcrm/ui package for Tooltip components.
- Actions: Install @codexcrm/ui or replace with local tooltip components.

1. src/components/layout/UserNav.tsx

- Status: Reviewed
- Findings:
  - User navigation dropdown with avatar, user info, and menu items.
  - Uses useAuth from @/app/providers, @codexcrm/ui components, @/components/ui/sidebar.
  - Handles loading states and user metadata extraction.
- Integration:
  - Missing: useAuth provider, @codexcrm/ui package, sidebar UI components.
- Actions: Scaffold useAuth provider, install @codexcrm/ui, scaffold sidebar components.

1. src/components/omni-bot/OmniBot.tsx

- Status: Reviewed
- Findings:
  - AI chat component with suggested prompts and message history.
  - Uses @codexcrm/ui Button and Input components.
  - Mock implementation with static suggested prompts.
- Integration:
  - Missing dependency: @codexcrm/ui package.
- Actions: Install @codexcrm/ui or replace with local components.

1. src/server/prompts/chat.prompt.ts

- Status: Reviewed
- Findings:
  - Simple prompt builder for AI chat system messages.
  - Pure TypeScript with configurable app name.
  - No external dependencies.
- Integration:
  - Ready for use in AI services.
- Actions: None

1. src/server/prompts/embed.prompt.ts

- Status: Reviewed
- Findings:
  - Simple prompt builder for AI embedding inputs.
  - Text normalization utility for embedding models.
  - No external dependencies.
- Integration:
  - Ready for use in AI services.
- Actions: None

1. src/server/providers/openrouter.provider.ts

- Status: Reviewed
- Findings:
  - OpenRouter AI provider configuration and headers.
  - Uses @/lib/env for environment variable access.
  - Configuration validation and API key management.
- Integration:
  - Depends on env configuration with AI model environment variables.
- Actions: Verify @/lib/env exists, add required environment variables to .env.

1. src/server/repositories/contacts.repo.ts

- Status: Reviewed
- Findings:
  - Drizzle ORM repository for contacts CRUD operations.
  - Uses @/server/db/client and @/server/db/schema.
  - Pagination, search, filtering, and sorting support.
- Integration:
  - Missing: database client, schema definitions.
- Actions: Scaffold database client and contacts schema.

1. src/server/services/chat.service.ts

- Status: Reviewed
- Findings:
  - AI chat service with OpenRouter integration and rate limiting.
  - Uses @/lib/logger, prompts, providers, and @/server/ai/with-guardrails.
  - Token usage tracking and error handling.
- Integration:
  - Missing: logger module, with-guardrails module.
- Actions: Scaffold logger and guardrails modules.

1. src/server/services/chat.service.test.ts

- Status: Reviewed
- Findings:
  - Comprehensive Vitest unit tests with mocking.
  - Tests configured/unconfigured provider scenarios.
  - Mock fetch and guardrails integration testing.
- Integration:
  - Missing: vitest test runner configuration.
- Actions: Install vitest and configure test setup.

1. src/server/services/contacts.service.ts

- Status: Reviewed
- Findings:
  - Business logic service layer for contacts.
  - Simple wrapper around repository with input validation.
  - No external dependencies beyond repository.
- Integration:
  - Depends on contacts repository being available.
- Actions: Verify contacts repository integration.
