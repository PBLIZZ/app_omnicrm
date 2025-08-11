# API Routes

- Purpose: User-facing HTTP handlers. Keep thin; delegate to `src/server/*` modules.
- Auth: Use `getServerUserId()` for authenticated routes.
- Responses: Use `ok()` / `err()` from `src/server/http/responses.ts`.
- CSRF: Mutating routes require `x-csrf-token` (issued by middleware).

Add a new endpoint:

- Create `src/app/api/<segment>/route.ts`
- Validate input (Zod if needed)
- Use helpers for consistent responses
- Keep business logic in `src/server/...`
- Logging: include a brief structured log where useful (avoid PII)

How to add a new API route (template)

```ts
/** POST /api/example — short purpose (auth required). Errors: 400 invalid_body, 401 unauthorized */
import { getServerUserId } from "@/server/auth/user";
import { ok, err, safeJson } from "@/server/http/responses";
import { z } from "zod";

const Body = z.object({ name: z.string().min(1) }).strict();

export async function POST(req: Request) {
  try {
    await getServerUserId();
  } catch (e) {
    const error = e as { status?: number; message?: string };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }

  const body = (await safeJson<{ name?: string }>(req)) ?? {};
  const parsed = Body.safeParse(body);
  if (!parsed.success) return err(400, "invalid_body", parsed.error.flatten());
  return ok({ greeting: `Hello ${parsed.data.name}` });
}
```

Testing examples:

- See `src/app/api/db-ping/route.test.ts` and `src/app/api/settings/sync/prefs/route.test.ts` for request/response patterns.
- End-to-end examples in `e2e/health.spec.ts` and `e2e/sync.spec.ts`.

Key files:

- `health/route.ts`, `db-ping/route.ts`
- `google/oauth` (init + callback)
- `settings/sync/*`, `sync/*`, `jobs/runner`
