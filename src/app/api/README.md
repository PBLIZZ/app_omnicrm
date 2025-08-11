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
/** POST /api/example — short purpose (auth required). Errors: 400 invalid_body, 401 Unauthorized */
import { getServerUserId } from "@/server/auth/user";
import { ok, err, safeJson } from "@/server/http/responses";
import { z } from "zod";

const Body = z.object({ name: z.string().min(1) }).strict();

export async function POST(req: Request) {
  // Optional: basic requestId logging if you propagate it from middleware
  const requestId = (req.headers as any)?.get?.("x-request-id");
  try {
    await getServerUserId();
  } catch (e: any) {
    return err(e?.status ?? 401, e?.message ?? "Unauthorized");
  }
  const body = (await safeJson(req)) ?? {};
  const parsed = Body.safeParse(body);
  if (!parsed.success) return err(400, "invalid_body");
  return ok({ greeting: `Hello ${parsed.data.name}` });
}
```

Key files:

- `health/route.ts`, `db-ping/route.ts`
- `google/oauth` (init + callback)
- `settings/sync/*`, `sync/*`, `jobs/runner`
