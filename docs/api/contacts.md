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

## Future (not required today)

- PUT /api/contacts/:id — update contact fields
- DELETE /api/contacts/:id — delete contact
- Bulk operations endpoints (email, tag, export)
