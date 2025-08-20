# Contacts API - Frontend Expectations (for Backend Wiring)

This note describes the minimal API shape expected by the frontend for the Contacts list and creation flows. Keep types aligned with `src/server/db/schema.ts` contact fields.

## Endpoints

- GET /api/contacts
  - Query params (optional):
    - search: string — free-text search across displayName, primaryEmail, primaryPhone
    - sort: string — key (e.g. `displayName`, `createdAt`)
    - order: string — `asc` | `desc`
    - createdAtFilter: JSON string — `{ mode: 'any'|'today'|'week'|'month'|'quarter'|'year'|'range', from?: 'YYYY-MM-DD', to?: 'YYYY-MM-DD' }`
    - page, pageSize — standard pagination
  - Response 200 JSON:

    ```json
    {
      "items": [
        {
          "id": "uuid",
          "displayName": "string",
          "primaryEmail": "string | null",
          "primaryPhone": "string | null",
          "createdAt": "ISO8601"
        }
      ],
      "total": 123
    }
    ```

- GET /api/contacts/:id
  - Path params:
    - id: uuid — must be a valid UUID
  - Responses:
    - 200 JSON:

      ```json
      {
        "id": "uuid",
        "displayName": "string",
        "primaryEmail": "string | null",
        "primaryPhone": "string | null",
        "createdAt": "ISO8601"
      }
      ```

    - 400 `invalid_id` — when `id` is not a valid UUID
    - 404 `not_found` — when the contact does not exist or is not owned by user

- POST /api/contacts
  - Request JSON:

    ```json
    {
      "displayName": "string",
      "primaryEmail": "string | null",
      "primaryPhone": "string | null",
      "tags": ["string"],
      "notes": "string | null",
      "source": "manual"
    }
    ```

  - Response 201 JSON:

    ```json
    {
      "id": "uuid",
      "displayName": "string",
      "primaryEmail": "string | null",
      "primaryPhone": "string | null",
      "createdAt": "ISO8601"
    }
    ```

## Notes

- Dates: return ISO strings; UI formats to en-GB.
- Search is server-side; client will debounce and pass `search`.
- Sorting/filtering handled server-side when parameters are provided; UI also supports client-side sorting/filtering when needed.
- Manual adds use `source: 'manual'`.
- Auth scoping: only return contacts for current user (handled in middleware/server).
- Path param validation: `/api/contacts/:id` validates `id` with `z.string().uuid()` and returns `400 invalid_id` before any DB query.

## Layered implementation

- Controller (route): `src/app/api/contacts/route.ts` — auth, validation, delegates to service
- Schema (Zod): `src/app/api/contacts/schema.ts` — query/body validation and types
- Service: `src/server/services/contacts.service.ts` — business logic and mapping
- Repository: `src/server/repositories/contacts.repo.ts` — Drizzle queries (search, sort, paginate; create)

Routes are intentionally thin; no direct Drizzle queries or complex logic live in routes.

## Future (not required today)

- PUT /api/contacts/:id — update contact fields (implemented)
- DELETE /api/contacts/:id — delete contact (implemented)
- Bulk operations endpoints (email, tag, export)
