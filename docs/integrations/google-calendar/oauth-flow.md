# Google Calendar OAuth Flow - Technical Implementation

## Overview

This document details the technical implementation of Google Calendar OAuth 2.0 authorization code flow with CSRF protection and secure token management.

## Flow Sequence

### 1. OAuth Initiation (`/api/calendar/oauth`)

```typescript
// Generate cryptographically secure nonce
const nonce = randomNonce(18);
const state = JSON.stringify({ n: nonce, s: "calendar" });

// Create HMAC signature for CSRF protection
const sig = hmacSign(state);

// Build Google OAuth URL
const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

// Set secure cookie and redirect
res.cookies.set("calendar_auth", `${sig}.${nonce}`, {
  httpOnly: true,
  sameSite: "lax", 
  secure: isProd,
  path: "/",
  maxAge: 5 * 60 // 5 minutes
});

return NextResponse.redirect(authUrl);
```

### 2. Google Authorization Server
- User grants calendar permissions
- Google redirects to callback URL with authorization code and state

### 3. OAuth Callback (`/api/calendar/oauth/callback`)

```typescript
// Extract and validate parameters
const code = searchParams.get("code");
const stateRaw = searchParams.get("state");

// Parse and validate state
const parsed = JSON.parse(stateRaw);
if (parsed.s !== "calendar") return err(400, "invalid_state");

// Validate CSRF cookie
const cookieVal = req.cookies.get("calendar_auth")?.value;
const [sig, cookieNonce] = cookieVal.split(".");
const expectedState = JSON.stringify({ n: cookieNonce, s: parsed.s });

if (!hmacVerify(expectedState, sig) || parsed.n !== cookieNonce) {
  return err(400, "invalid_state");
}

// Exchange code for tokens
const oauth2 = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALENDAR_REDIRECT_URI
);

const { tokens } = await oauth2.getToken(code);
```

### 4. Token Storage

```typescript
// Encrypt tokens before database storage
const encryptedAccess = encryptString(tokens.access_token);
const encryptedRefresh = tokens.refresh_token ? encryptString(tokens.refresh_token) : null;

// Store in database with composite primary key
await db.execute(sql`
  INSERT INTO user_integrations (user_id, provider, service, access_token, refresh_token, expiry_date, created_at, updated_at)
  VALUES (${userId}, 'google', 'calendar', ${encryptedAccess}, ${encryptedRefresh}, ${expiryDate}, ${new Date()}, ${new Date()})
  ON CONFLICT (user_id, provider, service) 
  DO UPDATE SET 
    access_token = EXCLUDED.access_token,
    refresh_token = EXCLUDED.refresh_token,
    expiry_date = EXCLUDED.expiry_date,
    updated_at = EXCLUDED.updated_at
`);
```

## Security Measures

### CSRF Protection
- **State Parameter**: Contains signed nonce to prevent state fixation attacks
- **Cookie Validation**: Verifies state matches expected cookie value
- **HMAC Signature**: Prevents tampering with state parameter
- **Short Expiry**: Cookie expires in 5 minutes to minimize attack window

### Token Security  
- **Encryption at Rest**: All tokens encrypted with AES-256-GCM
- **No Plain Text**: Tokens never stored in plain text
- **Row Level Security**: Database policies ensure user data isolation
- **Secure Transport**: HTTPS enforced in production

### Environment Security
```env
# Required OAuth credentials
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALENDAR_REDIRECT_URI=https://yourdomain.com/api/calendar/oauth/callback

# Required encryption key (32 bytes, base64 encoded)
APP_ENCRYPTION_KEY=base64_encoded_32byte_key
```

## Error Handling

### OAuth Errors
```typescript
// Handle common OAuth errors
switch (error.code) {
  case 'access_denied':
    return redirect('/calendar?error=access_denied');
  case 'invalid_request':
    return err(400, 'invalid_oauth_request');
  case 'server_error':
    return err(503, 'google_server_error');
  default:
    return err(500, 'oauth_error');
}
```

### CSRF Errors
- `invalid_state`: State parameter missing or malformed
- `csrf_mismatch`: State doesn't match cookie value
- `expired_nonce`: Cookie expired before callback

### Token Errors
- `missing_code`: Authorization code not received
- `token_exchange_failed`: Cannot exchange code for tokens
- `encryption_failed`: Cannot encrypt tokens for storage

## Testing OAuth Flow

### Manual Testing
1. **Initiation**: Navigate to `/api/calendar/oauth`
2. **Consent**: Complete Google OAuth consent screen
3. **Callback**: Verify successful redirect to `/calendar?connected=true`
4. **Database**: Confirm encrypted tokens stored in `user_integrations`

### Automated Testing
```typescript
// Test CSRF protection
it('should reject invalid state parameter', async () => {
  const response = await fetch('/api/calendar/oauth/callback?code=test&state=invalid');
  expect(response.status).toBe(400);
});

// Test token encryption
it('should store encrypted tokens', async () => {
  // Mock OAuth flow
  // Verify tokens are encrypted in database
});
```

## Production Considerations

### Google Cloud Console Setup
1. Create OAuth 2.0 Client ID
2. Add authorized redirect URIs
3. Configure consent screen
4. Request production verification if needed

### Rate Limiting
- Google APIs have rate limits
- Implement exponential backoff
- Cache tokens to minimize API calls

### Monitoring
- Track OAuth success/failure rates
- Monitor token refresh patterns
- Alert on authentication errors

## Troubleshooting

### Common Issues

#### Redirect URI Mismatch
**Error**: `redirect_uri_mismatch`
**Solution**: Ensure `GOOGLE_CALENDAR_REDIRECT_URI` exactly matches Google Console configuration

#### Invalid Client
**Error**: `invalid_client` 
**Solution**: Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct

#### Expired Authorization Code
**Error**: `invalid_grant`
**Solution**: Authorization codes expire quickly; ensure minimal delay between redirect and exchange

#### CSRF Validation Failure
**Error**: `invalid_state`
**Solution**: Check cookie settings, ensure proper domain/path configuration

### Debug Mode
Enable detailed logging for OAuth debugging:
```typescript
console.log("OAuth initiation:", {
  clientId: process.env.GOOGLE_CLIENT_ID?.substring(0, 10) + "...",
  redirectUri: process.env.GOOGLE_CALENDAR_REDIRECT_URI,
  state: state.substring(0, 20) + "...",
  nonce: nonce.substring(0, 10) + "..."
});
```

## Security Audit Checklist

- [ ] CSRF protection implemented correctly
- [ ] State parameter validation working
- [ ] Tokens encrypted before storage
- [ ] HTTPS enforced in production
- [ ] Cookie security flags set properly
- [ ] Rate limiting configured
- [ ] Error messages don't leak sensitive data
- [ ] Database RLS policies active
- [ ] Environment variables secured
- [ ] OAuth scopes minimized to requirements