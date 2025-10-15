# Google OAuth Authentication - Complete Developer Guide

**Last Updated:** 2025-10-15  
**Version:** 2.0  
**Authors:** Development Team

---

## Table of Contents

- [Overview](#overview)
- [Architecture Overview](#architecture-overview)
- [File Structure](#file-structure)
- [Environment Setup](#environment-setup)
- [Authentication Flow](#authentication-flow)
- [Google Integration OAuth Flow (Technical)](#google-integration-oauth-flow-technical)
- [Key Components](#key-components)
- [Troubleshooting Guide](#troubleshooting-guide)
- [Security Considerations](#security-considerations)
- [Recent Fixes](#recent-fixes)
- [Common Issues & Solutions](#common-issues--solutions)

---

## Overview

This document provides a comprehensive guide to the Google OAuth authentication system in OmniCRM. The system uses **Next.js App Router with Supabase Auth** for Google OAuth integration.

### Key Features

- Google OAuth 2.0 integration using Supabase Auth
- Server-side session management with Supabase
- E2E testing mode support
- Client-side authentication state management
- Secure cookie handling
- PKCE flow for enhanced security

---

## Architecture Overview

```mermaid
graph TD
    A[User clicks "Continue with Google"] --> B[Client calls /api/auth/signin/google]
    B --> C[Supabase Auth initiates OAuth flow with PKCE]
    C --> D[Redirect to Google OAuth consent screen]
    D --> E[User authorizes app]
    E --> F[Google redirects to /api/auth/callback]
    F --> G[Supabase exchanges code for session]
    G --> H[Session cookies set securely]
    H --> I[Redirect to dashboard]
    I --> J[Client fetches /api/auth/user]
    J --> K[AuthHeader updates with user data]
```

---

## File Structure

### Authentication Files

```typescript
src/
├── app/
│   ├── api/auth/
│   │   ├── (console_account)/callback/route.ts  # OAuth callback handler
│   │   └── signin/google/route.ts              # OAuth initiation
│   ├── api/google/
│   │   ├── gmail/
│   │   │   ├── connect/route.ts                # Gmail OAuth initiation
│   │   │   └── callback/route.ts               # Gmail OAuth callback
│   │   ├── calendar/
│   │   │   ├── connect/route.ts                # Calendar OAuth initiation
│   │   │   └── callback/route.ts               # Calendar OAuth callback
│   │   └── status/route.ts                     # Integration status
│   └── login/
│       └── page.tsx                            # Login page
├── components/
│   └── layout/
│       ├── MainLayout.tsx                      # App layout wrapper
│       └── UserNav.tsx                         # User navigation component
├── lib/
│   ├── auth-simple.ts                          # Simple auth utilities
│   └── supabase-browser.ts                     # Supabase client setup
└── server/
    ├── auth/
    │   ├── user.ts                             # Server-side user utilities
    │   └── csrf.ts                             # CSRF token management
    └── services/
        ├── supabase-auth.service.ts            # Supabase OAuth service
        └── google-integration.service.ts       # Google integration service
```

---

## Environment Setup

### Required Environment Variables

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-supabase-anon-key
SUPABASE_SECRET_KEY=your-supabase-service-role-key

# Google OAuth Credentials
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_ENCRYPTION_KEY=your-32-byte-encryption-key

# E2E Testing (optional, comment out for normal development)
# ENABLE_E2E_AUTH=true
# E2E_USER_ID=test-user-id-for-e2e-testing
```

### Supabase Dashboard Setup

1. **Go to Authentication > Providers**
2. **Enable Google OAuth provider**
3. **Configure OAuth settings:**
   - Client ID: Your Google OAuth client ID
   - Client Secret: Your Google OAuth client secret
4. **Set Site URL:** `http://localhost:3000` (for development)
5. **Add Redirect URLs:** `http://localhost:3000/api/auth/callback`

### Google Cloud Console Setup

1. **Create Project** in Google Cloud Console
2. **Enable APIs**: Google OAuth2 API
3. **Create OAuth 2.0 Credentials**
   - Application type: Web application
   - Authorized redirect URIs: `https://your-project.supabase.co/auth/v1/callback`
4. **Configure OAuth Consent Screen**
   - Add required scopes: `profile`, `email`

---

## Authentication Flow

### Current Working Flow

1. **User clicks "Continue with Google"** in login page
2. **Browser navigates to** `/api/auth/signin/google`
3. **Server route** calls `initializeGoogleOAuthService()` which uses Supabase OAuth
4. **Supabase redirects** to Google OAuth with PKCE parameters
5. **User authorizes** on Google's consent screen
6. **Google redirects** to Supabase with authorization code
7. **Supabase redirects** to `/api/auth/callback` with session code
8. **Callback route** calls `handleOAuthCallbackService()` which exchanges code for session
9. **Session cookies** are set securely
10. **User redirected** to dashboard (`/`)

### Google Integration OAuth Flow (Separate)

For Gmail and Calendar integrations (after main auth):

1. **User clicks "Connect Gmail/Calendar"** in dashboard
2. **Browser navigates to** `/api/google/gmail/connect` or `/api/google/calendar/connect`
3. **Server generates** CSRF state token and stores in cookie
4. **Redirects to** Google OAuth with service-specific scopes
5. **User authorizes** additional permissions
6. **Google redirects** to service-specific callback
7. **Callback exchanges** code for tokens and stores encrypted in database
8. **Redirects to** dashboard with success status

---

## Key Components

### 1. OAuth Initiation (`/src/app/api/auth/signin/google/route.ts`)

```typescript
export const GET = handleAuthFlow(
  GoogleSignInQuerySchema,
  async (_query, request): Promise<Response> => {
    const result = await initializeGoogleOAuthService(request);
    if (result.success) {
      return result.redirectResponse;
    } else {
      return result.errorResponse;
    }
  },
);
```

### 2. OAuth Callback (`/src/app/api/auth/(console_account)/callback/route.ts`)

```typescript
export const GET = handleAuthFlow(
  OAuthCallbackQuerySchema,
  async (_query, request): Promise<Response> => {
    const result = await handleOAuthCallbackService(request);
    if (result.success) {
      return result.redirectResponse;
    }
    return result.errorResponse;
  },
);
```

### 3. Google Integration OAuth (`/src/app/api/google/gmail/connect/route.ts`)

```typescript
import { cookies } from "next/headers";

export async function GET(): Promise<Response> {
  const userId = await getAuthUserId();
  const oauth2Client = new google.auth.OAuth2(
    process.env["GOOGLE_CLIENT_ID"],
    process.env["GOOGLE_CLIENT_SECRET"],
    `${process.env["NEXT_PUBLIC_APP_URL"]}/api/google/gmail/callback`,
  );
  const state = randomBytes(32).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("gmail_oauth_user", userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  // Store state in cookie and redirect to Google
  return Response.redirect(authUrl);
}
```

**Security Note on OAuth State Cookies**: The `userId` is stored in a secure, short-lived cookie to maintain user context across the OAuth redirect flow, which may outlive the main session during Google's consent screen. This cookie uses `httpOnly` to prevent client-side JavaScript access, `secure` flag in production for HTTPS-only transmission, `sameSite="lax"` to mitigate CSRF in cross-site requests, and a 10-minute `maxAge` to limit exposure. The OAuth `state` parameter provides additional CSRF protection by validating round-trip integrity. For stronger security, consider storing the state-to-userId mapping server-side (e.g., in a temporary Redis cache) or cryptographically binding it to the state token to prevent tampering, rather than relying on client cookies.

### 4. Server Auth Utilities (`/src/server/auth/user.ts`)

```typescript
export async function getServerUserId(cookieStore?: ReadonlyRequestCookies): Promise<string> {
  // E2E mode support
  if (process.env["NODE_ENV"] !== "production" && process.env["ENABLE_E2E_AUTH"] === "true") {
    const eid = process.env["E2E_USER_ID"];
    if (eid && eid.length > 0) {
      return eid;
    }
  }
  // Normal Supabase auth flow
  const supabase = createServerClient(/* ... */);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return (
    user?.id ??
    (() => {
      throw new Error("Unauthorized");
    })()
  );
}
```

### 5. Supabase Auth Service (`/src/server/services/supabase-auth.service.ts`)

```typescript
export async function initializeGoogleOAuthService(request: NextRequest): Promise<OAuthInitResult> {
  const supabase = createServerClient(/* ... */);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/api/auth/callback`,
    },
  });
  // Handle response and cookies
}
```

---

## Recent Fixes

### Issue: OAuth Callback Route Structure

**Problem:** OAuth callback was in wrong directory structure

**Fix:** Moved callback to proper Next.js App Router structure:

```typescript
// Before (incorrect structure)
src / app / api / auth / callback / route.ts;

// After (correct structure)
src / app / api / auth / console_account / callback / route.ts;
```

### Issue: E2E Mode Configuration

**Problem:** E2E mode was controlled by single environment variable

**Fix:** Updated to use explicit E2E enable flag:

```bash
# Before (single variable)
E2E_USER_ID=test-user-id

# After (explicit enable)
ENABLE_E2E_AUTH=true
E2E_USER_ID=test-user-id
```

### Issue: Google Integration OAuth

**Problem:** Google service OAuth was not properly separated from main auth

**Fix:** Created separate OAuth flows for Gmail and Calendar:

- `/api/google/gmail/connect` - Gmail OAuth initiation
- `/api/google/gmail/callback` - Gmail OAuth callback
- `/api/google/calendar/connect` - Calendar OAuth initiation
- `/api/google/calendar/callback` - Calendar OAuth callback

### Issue: CSRF Protection

**Problem:** Missing CSRF protection for OAuth flows

**Fix:** Added CSRF token management:

- `src/server/auth/csrf.ts` - CSRF token generation and validation
- State parameter validation in OAuth callbacks
- Secure cookie handling for OAuth state

---

## Security Considerations

### 1. PKCE Flow Protection

Supabase automatically handles PKCE (Proof Key for Code Exchange) for enhanced OAuth security:

- Prevents authorization code interception attacks
- Uses cryptographically random code verifier
- No client secret exposure on the frontend

### 2. Secure Session Management

```typescript
// Server-side session validation
const { data } = await supabase.auth.getUser();
// Uses secure HTTP-only cookies set by Supabase

// Client-side auth state via secure API
const response = await fetch("/api/auth/user", { credentials: "include" });
// Never exposes sensitive tokens to client JavaScript
```

### 3. E2E Testing Security

```typescript
// E2E mode only active in non-production with explicit enable flag
if (process.env["NODE_ENV"] !== "production" && process.env["ENABLE_E2E_AUTH"] === "true") {
  const eid = process.env["E2E_USER_ID"];
  if (eid && eid.length > 0) {
    return eid; // Return test user ID
  }
}
```

### 4. CSRF Protection

```typescript
// State parameter validation for OAuth flows
const state = randomBytes(32).toString("hex");
cookieStore.set("oauth_state", state, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 600, // 10 minutes
});
```

---

## Troubleshooting Guide

### Common Issues & Solutions

#### Issue: "Invalid redirect URI" Error

**Symptoms:** OAuth fails with redirect URI mismatch error

**Solution:**

1. Check Supabase dashboard **Authentication > URL Configuration**
2. Ensure **Site URL** matches your development environment: `http://localhost:3000`
3. Ensure **Redirect URLs** includes: `http://localhost:3000/api/auth/callback`
4. Verify Google Cloud Console redirect URI matches Supabase callback URL

#### Issue: User Shows as E2E Test User

**Symptoms:** User appears as "ET" or "E2E Test User" instead of real Google account

**Solution:**

```bash
# Comment out E2E variables in .env.local
# ENABLE_E2E_AUTH=true
# E2E_USER_ID=3550f627-dbd7-4c5f-a13f-e59295c14676
```

#### Issue: 404 on OAuth Callback

**Symptoms:** `/auth/callback` returns 404 Not Found

**Solution:**
Verify the callback route exists at `/src/app/api/auth/(console_account)/callback/route.ts` and the redirect URL is correct:

```typescript
redirectTo: `${origin}/api/auth/callback`; // ✅ Correct path
```

#### Issue: Google Integration OAuth Fails

**Symptoms:** Gmail/Calendar OAuth fails with state validation error

**Solution:**
Check that state parameter is properly generated and validated:

```typescript
// Ensure state is generated with sufficient entropy
const state = randomBytes(32).toString("hex");
// Verify state validation in callback
if (storedState !== receivedState) {
  return new Error("Invalid state parameter");
}
```

#### Issue: CSRF Token Errors

**Symptoms:** OAuth flows fail with CSRF validation errors

**Solution:**
Ensure CSRF tokens are properly generated and validated:

```typescript
// Generate CSRF token
const csrfToken = generateCsrfToken();
// Validate in callback
if (!validateCsrfToken(receivedToken)) {
  return new Error("Invalid CSRF token");
}
```

---

## Testing Checklist

### Manual OAuth Flow Testing

1. **Fresh Login Test:**
   - Open incognito/private browser window
   - Navigate to `http://localhost:3000`
   - Should redirect to login page
   - Click "Continue with Google"
   - Should show Google consent screen
   - Authorize → should redirect to dashboard
   - Verify user appears correctly in header

2. **Returning User Test:**
   - Use browser already signed into Google
   - Navigate to `http://localhost:3000`
   - Click "Continue with Google"
   - Should skip consent and go directly to dashboard

3. **Session Persistence Test:**
   - Login successfully
   - Close browser completely
   - Reopen and navigate to app
   - Should remain logged in (session persists)

### API Endpoint Testing

```bash
# Test OAuth initiation (should return 307 redirect)
curl -v http://localhost:3000/api/auth/signin/google

# Test callback without code (should redirect to /)
curl -v http://localhost:3000/api/auth/callback

# Test Google integration OAuth (should return 307 redirect)
curl -v http://localhost:3000/api/google/gmail/connect
curl -v http://localhost:3000/api/google/calendar/connect

# Test integration status (should return JSON)
curl -v http://localhost:3000/api/google/status
```

---

## Environment Validation

Use this checklist to verify your environment is configured correctly:

```bash
# Required environment variables
✅ NEXT_PUBLIC_SUPABASE_URL
✅ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
✅ GOOGLE_CLIENT_ID
✅ GOOGLE_CLIENT_SECRET
✅ APP_ENCRYPTION_KEY

# Optional (comment out for normal development)
❌ ENABLE_E2E_AUTH (should be commented out)
❌ E2E_USER_ID (should be commented out)

# Supabase Dashboard Configuration
✅ Authentication > Providers > Google (enabled)
✅ Authentication > URL Configuration > Site URL: http://localhost:3000
✅ Authentication > URL Configuration > Redirect URLs: includes /api/auth/callback

# Google Cloud Console Configuration
✅ OAuth 2.0 Client ID created
✅ Authorized redirect URIs: https://your-project.supabase.co/auth/v1/callback
✅ OAuth consent screen configured
```

---

**Document Version:** 2.0 - Updated August 2025  
**Status:** ✅ Current and Accurate  
**Next Update:** When authentication system changes

---

## Google Integration OAuth Flow (Technical)

This section covers the technical implementation details for Google service integrations (Gmail and Calendar).

### 1. OAuth Initiation (`/api/google/gmail/connect` or `/api/google/calendar/connect`)

```typescript
export async function GET(): Promise<Response> {
  const userId = await getAuthUserId();
  const oauth2Client = new google.auth.OAuth2(
    process.env["GOOGLE_CLIENT_ID"],
    process.env["GOOGLE_CLIENT_SECRET"],
    `${process.env["NEXT_PUBLIC_APP_URL"]}/api/google/gmail/callback`,
  );

  const state = randomBytes(32).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("gmail_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/gmail.readonly"],
    state,
    prompt: "consent",
  });

  return Response.redirect(authUrl);
}
```

### 2. OAuth Callback (`/api/google/gmail/callback`)

```typescript
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieStore = await cookies();
  const storedState = cookieStore.get("gmail_oauth_state")?.value;
  const userId = cookieStore.get("gmail_oauth_user")?.value;

  if (!code || !state || !storedState || !userId) {
    return Response.redirect(
      `${process.env["NEXT_PUBLIC_APP_URL"]}/omni-connect?error=invalid_request`,
    );
  }

  if (state !== storedState) {
    return Response.redirect(
      `${process.env["NEXT_PUBLIC_APP_URL"]}/omni-connect?error=invalid_state`,
    );
  }

  // Exchange code for tokens and store in database
  const oauth2Client = new google.auth.OAuth2(/* ... */);
  const { tokens } = await oauth2Client.getToken(code);

  await upsertIntegrationService(userId, "gmail", {
    accessToken: tokens.access_token!,
    refreshToken: tokens.refresh_token ?? undefined,
    expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
  });

  return Response.redirect(`${process.env["NEXT_PUBLIC_APP_URL"]}/omni-connect?connected=true`);
}
```

### 3. Token Storage and Encryption

```typescript
// Tokens are encrypted using AES-256-GCM before storage
await upsertIntegrationService(userId, "gmail", {
  accessToken: tokens.access_token!,
  refreshToken: tokens.refresh_token ?? undefined,
  expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
});

// Stored in user_integrations table with encryption
// RLS policies ensure user isolation
```

### 4. Security Features

- **State Parameter Validation**: Prevents CSRF attacks
- **Token Encryption**: AES-256-GCM encryption for stored tokens
- **Row Level Security**: Database-level user isolation
- **Short-lived Cookies**: 10-minute expiry for OAuth state
- **Secure Cookie Settings**: httpOnly, secure, sameSite=lax

### 5. Current Implementation Status (2025-10-15)

**Dashboard Service**: ✅ **Fully Compliant** (Audit Score: 10/10)

Audit conducted on 2025-10-15, evaluated against repository pattern compliance, error handling, security guidelines, and integration completeness. See [OMNICONNECT_DASHBOARD_AUDIT.md](OMNICONNECT_DASHBOARD_AUDIT.md) for the full audit report and scoring rubric.

All OAuth-related dashboard features are working correctly:

- **Token Refresh**: Auto-refresh mechanism working properly

- **OAuth Scopes**: Granted scopes properly extracted and displayed

- **Connection Status**: Accurate real-time connection state

- **Error Handling**: Proper error boundaries and user feedback

- **Repository Pattern**: All database access follows architectural guidelines

**Integration Status**:

- **Gmail**: ✅ Fully implemented with complete dashboard integration

- **Calendar**: ✅ OAuth working, ❌ Sync and AI features pending

- **Main Auth**: ✅ Supabase OAuth working correctly
