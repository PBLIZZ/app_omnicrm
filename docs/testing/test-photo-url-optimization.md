# Testing Photo URL Optimization

## Manual Testing Guide

### 1. Test in Browser (Recommended)

**Open the contacts page with DevTools:**

```bash
# 1. Start dev server (if not running)
pnpm dev

# 2. Open browser to http://localhost:3000/contacts

# 3. Open DevTools (F12) → Network tab → Clear → Refresh page
```

**What to look for:**

✅ **SUCCESS Indicators:**
- **Only 1 API call** to `/api/contacts?page=1&pageSize=25`
- **NO calls** to `/api/storage/file-url`
- **Photos load instantly** (no progressive loading)
- **photoUrl fields** in response contain full signed URLs like:
  ```
  "photoUrl": "https://abc123.supabase.co/storage/v1/object/sign/client-photos/..."
  ```

❌ **FAILURE Indicators:**
- Multiple calls to `/api/storage/file-url` (old behavior)
- photoUrl contains storage paths like: `"client-photos/user-id/photo.webp"`
- Photos fail to load or show broken image icons

### 2. Inspect API Response

**In DevTools Network tab:**

1. Click on the `/api/contacts` request
2. Click "Response" or "Preview" tab
3. Expand `items[0]` → Check `photoUrl` field

**Expected format:**
```json
{
  "items": [
    {
      "id": "uuid-here",
      "displayName": "Jane Doe",
      "photoUrl": "https://abc123.supabase.co/storage/v1/object/sign/client-photos/user-id/photo.webp?token=eyJhbG...",
      "primaryEmail": "jane@example.com",
      ...
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "total": 100,
    "totalPages": 4,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 3. Verify Audit Logging

**After loading the contacts page, check the database:**

```sql
-- In Supabase SQL Editor:
SELECT
  user_id,
  contact_id,
  photo_path,
  accessed_at,
  ip_address
FROM photo_access_audit
ORDER BY accessed_at DESC
LIMIT 10;
```

**Expected results:**
- One row per contact photo loaded
- All rows have same `user_id` (your authenticated user)
- `accessed_at` matches when you loaded the page
- `photo_path` matches the storage paths

### 4. Test Pagination

**Test that each page only fetches its own photos:**

```bash
# In browser DevTools → Network tab:

# Page 1 (contacts 1-25)
Navigate to /contacts?page=1
→ Should see API call with page=1&pageSize=25
→ Response contains 25 items (or fewer if less data)

# Page 2 (contacts 26-50)
Click "Next" or navigate to /contacts?page=2
→ New API call with page=2&pageSize=25
→ Response contains next 25 items

# Verify: Each page fetches ONLY its own photos
→ No duplicate photo URL requests
→ Each page generates new signed URLs
```

### 5. Test Caching (4-Hour Stale Time)

**Verify React Query caching:**

```bash
# 1. Load contacts page (first time)
→ Network: 1 API call to /api/contacts

# 2. Navigate away (e.g., to /calendar)

# 3. Navigate back to /contacts (within 4 hours)
→ Network: 0 API calls (served from cache)
→ Photos still load instantly

# 4. Wait 4+ hours OR clear React Query cache
→ Network: 1 new API call
→ New signed URLs generated
```

### 6. Verify Photo Loading Performance

**Use Lighthouse or Performance tab:**

```bash
# In DevTools → Performance tab:
1. Click Record
2. Refresh contacts page
3. Stop recording

# Look for:
✅ Photos load in < 100ms (cached) or < 500ms (uncached)
✅ No waterfall of sequential requests
✅ All photos start loading simultaneously
```

### 7. Test Error Handling

**Test graceful degradation:**

```javascript
// In browser console while on /contacts page:

// 1. Check for errors in batch URL generation
// (Should see in StorageService logs if any paths failed)
console.log("Check Network tab for any errors");

// 2. Verify photos still show for contacts without errors
// (Contacts with photo URL errors should fall back to initials avatar)
```

## Console Logging to Watch

**Server logs (terminal running `pnpm dev`):**

Look for these log messages:

```
✅ GOOD:
[StorageService] Creating signed URL: { bucket: 'client-photos', ... }
[StorageService] Successfully created signed URL

❌ BAD:
[StorageService] Supabase Storage API error: ...
[StorageService] Failed to batch log photo access: ...
```

**Browser console:**

Should be **silent** (no errors). If you see:

```
❌ Failed to load image: ...
❌ TypeError: Cannot read photoUrl of undefined
```

These indicate problems with the implementation.

## Quick Verification Checklist

- [ ] Server is running (`pnpm dev`)
- [ ] Migration applied (table `photo_access_audit` exists)
- [ ] Navigate to http://localhost:3000/contacts
- [ ] Open DevTools → Network tab
- [ ] Clear network log
- [ ] Refresh page
- [ ] **Verify: Only 1 request to `/api/contacts`**
- [ ] **Verify: 0 requests to `/api/storage/file-url`**
- [ ] **Verify: Photos load instantly**
- [ ] Inspect API response → `photoUrl` contains signed URLs
- [ ] Query database → Audit logs created

## Performance Comparison

### Before Optimization
```
Network Tab:
1. GET /contacts → 200ms
2. GET /api/contacts?page=1&pageSize=100 → 1500ms
3. GET /api/storage/file-url?path=... → 50ms
4. GET /api/storage/file-url?path=... → 50ms
5. GET /api/storage/file-url?path=... → 50ms
... (100 more requests) ...

Total: ~3000ms, 101 requests
```

### After Optimization
```
Network Tab:
1. GET /contacts → 200ms
2. GET /api/contacts?page=1&pageSize=25 → 300ms

Total: ~500ms, 1 request (98% faster!)
```

## Troubleshooting

### Photos not loading?

**Check 1: Are signed URLs in the response?**
```javascript
// In browser console on /contacts page:
fetch('/api/contacts?page=1&pageSize=5')
  .then(r => r.json())
  .then(data => console.log(data.items[0]?.photoUrl));

// Should output: "https://..." (signed URL)
// NOT: "client-photos/..." (storage path)
```

**Check 2: Is the migration applied?**
```sql
SELECT COUNT(*) FROM photo_access_audit;
-- Should succeed (not error)
```

**Check 3: Is StorageService working?**
```bash
# Check server logs for errors
grep -i "storag" logs/dev.log
```

### Audit logs not created?

**Check RLS policies:**
```sql
-- Verify policies exist
SELECT * FROM pg_policies WHERE tablename = 'photo_access_audit';
-- Should show 2 policies
```

**Check for silent errors:**
```bash
# In server logs, look for:
"[StorageService] Failed to batch log photo access"
```

## Expected Results Summary

| Aspect | Expected | Actual |
|--------|----------|--------|
| API calls per page | 1 | _____ |
| Signed URLs in response | Yes | _____ |
| Photos load instantly | Yes | _____ |
| Audit logs created | Yes | _____ |
| Page load time | <500ms | _____ |
| Cached page load | <50ms | _____ |

Fill in "Actual" column during testing to verify implementation.
