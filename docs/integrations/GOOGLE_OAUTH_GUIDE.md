# Google OAuth Authentication - Complete Developer Guide

**Last Updated:** August 2025  
**Version:** 2.0  
**Authors:** Development Team

---

## Table of Contents

- [Overview](#overview)
- [Architecture Overview](#architecture-overview)
- [File Structure](#file-structure)
- [Environment Setup](#environment-setup)
- [Authentication Flow](#authentication-flow)
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
│   │   ├── callback/route.ts      # OAuth callback handler
│   │   ├── signin/google/route.ts # OAuth initiation
│   │   └── user/route.ts          # Current user endpoint
│   ├── login/
│   │   └── page.tsx               # Login page
│   └── layout.tsx                 # Root layout with auth
├── components/
│   ├── AuthHeader.tsx             # User authentication UI
│   └── layout/
│       ├── MainLayout.tsx         # App layout wrapper
│       └── UserNav.tsx            # User navigation component
├── lib/
│   ├── auth/
│   │   └── use-auth-actions.ts    # Client auth actions
│   ├── supabase-browser.ts        # Supabase client setup
│   └── env.ts                     # Environment validation
└── server/
    └── auth/
        └── user.ts                # Server-side user utilities
```

---

## Environment Setup

### Required Environment Variables

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-supabase-anon-key
SUPABASE_SECRET_KEY=your-supabase-service-role-key

# Google OAuth Credentials (configured in Supabase dashboard)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/oauth/callback
GOOGLE_CALLBACK_URL=https://your-project.supabase.co/auth/v1/callback

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_ENCRYPTION_KEY=your-32-byte-encryption-key

# E2E Testing (optional, comment out for normal development)
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

### Current Working Flow (After Fixes)

1. **User clicks "Continue with Google"** in AuthHeader or login page
2. **Client calls** `signInWithGoogle()` from `use-auth-actions.ts`
3. **Browser navigates to** `/api/auth/signin/google`
4. **Server route** calls `supabase.auth.signInWithOAuth()` with `redirectTo: /api/auth/callback`
5. **Supabase redirects** to Google OAuth with PKCE parameters
6. **User authorizes** on Google's consent screen
7. **Google redirects** to Supabase with authorization code
8. **Supabase redirects** to `/api/auth/callback` with session code
9. **Callback route** exchanges code for session using `supabase.auth.exchangeCodeForSession()`
10. **Session cookies** are set securely
11. **User redirected** to dashboard (`/`)
12. **Client-side** auth state updates via `/api/auth/user` endpoint

---

## Key Components

### 1. OAuth Initiation (`/src/app/api/auth/signin/google/route.ts`)

```typescript
export async function GET(request: NextRequest): Promise<NextResponse> {
  const origin = new URL(request.url).origin;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/api/auth/callback`, // ✅ Fixed path
    },
  });
  return NextResponse.redirect(data.url);
}
```

### 2. OAuth Callback (`/src/app/api/auth/callback/route.ts`)

```typescript
export async function GET(request: NextRequest): Promise<NextResponse> {
  const code = requestUrl.searchParams.get("code");
  const res = NextResponse.redirect(`${origin}/`);

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    // Session cookies automatically set by Supabase
  }
  return res;
}
```

### 3. User Data Endpoint (`/src/app/api/auth/user/route.ts`)

```typescript
export async function GET(): Promise<NextResponse> {
  const userId = await getServerUserId(); // Handles E2E mode

  // For real auth, get full user data from Supabase
  const { data, error } = await supabase.auth.getUser();

  return NextResponse.json({
    id: data.user.id,
    email: data.user.email,
    user_metadata: data.user.user_metadata,
  });
}
```

### 4. Client Auth Actions (`/src/lib/auth/use-auth-actions.ts`)

```typescript
const signInWithGoogle = async (): Promise<void> => {
  setIsGoogle(true);
  // Direct navigation to server-initiated OAuth flow
  window.location.assign(`/api/auth/signin/google`); // ✅ Fixed path
};
```

### 5. Auth State Management (`/src/components/AuthHeader.tsx`)

```typescript
useEffect(() => {
  const initAuth = async (): Promise<void> => {
    try {
      // Use secure server-side endpoint instead of client getSession()
      const response = await fetch("/api/auth/user", { credentials: "include" });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch {
      setUser(null);
    }
  };
  void initAuth();
}, []);
```

---

## Recent Fixes

### Issue: OAuth Redirect 404 Error

**Problem:** OAuth callback was redirecting to `/auth/callback` but the route was at `/api/auth/callback`

**Fix:** Updated `redirectTo` in signin route:

```typescript
// Before (404 error)
redirectTo: `${origin}/auth/callback`;

// After (working)
redirectTo: `${origin}/api/auth/callback`;
```

**Files Changed:**

- `/src/app/api/auth/signin/google/route.ts` (line 36)

### Issue: Client-Side Auth Detection Failing

**Problem:** AuthHeader was using unsafe `getSession()` which could return false positives

**Fix:** Created secure `/api/auth/user` endpoint and updated client to use it:

```typescript
// Before (unsafe)
const {
  data: { session },
} = await supabase.auth.getSession();

// After (secure)
const response = await fetch("/api/auth/user", { credentials: "include" });
```

**Files Changed:**

- `/src/app/api/auth/user/route.ts` (new file)
- `/src/components/AuthHeader.tsx` (updated auth detection)

### Issue: E2E Mode Stuck Active

**Problem:** `E2E_USER_ID` environment variable was keeping the app in test mode

**Fix:** Commented out E2E variables in `.env.local`:

```bash
# Before (E2E mode active)
E2E_USER_ID=3550f627-dbd7-4c5f-a13f-e59295c14676

# After (normal mode)
# E2E_USER_ID=3550f627-dbd7-4c5f-a13f-e59295c14676
```

### Issue: Supabase Site URL Configuration

**Problem:** Site URL pointed to Vercel production instead of localhost development

**Fix:** Updated Supabase dashboard settings:

- **Site URL:** Changed from `https://app-omnicrm-pblizzs-projects.vercel.app/` to `http://localhost:3000`
- **Redirect URLs:** Ensured `http://localhost:3000/api/auth/callback` was included

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
// E2E mode only active in non-production with explicit env var
if (process.env["NODE_ENV"] !== "production" && process.env["E2E_USER_ID"]) {
  return NextResponse.json({
    /* test user data */
  });
}
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
# E2E_USER_ID=3550f627-dbd7-4c5f-a13f-e59295c14676
```

#### Issue: 404 on OAuth Callback

**Symptoms:** `/auth/callback` returns 404 Not Found

**Solution:**
Verify the callback route exists at `/src/app/api/auth/callback/route.ts` and the redirect URL is correct:

```typescript
redirectTo: `${origin}/api/auth/callback`; // ✅ Correct path
```

#### Issue: Authentication State Not Updating

**Symptoms:** User appears signed out in UI but can access dashboard

**Solution:**
Ensure AuthHeader uses the secure `/api/auth/user` endpoint:

```typescript
const response = await fetch("/api/auth/user", { credentials: "include" });
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
# Test user endpoint without auth (should return 401)
curl -v http://localhost:3000/api/auth/user

# Test OAuth initiation (should return 307 redirect)
curl -v http://localhost:3000/api/auth/signin/google

# Test callback without code (should redirect to /)
curl -v http://localhost:3000/api/auth/callback
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
