# Tables

- Layout: use `src/components/ui/table.tsx` (shadcn)
- Data: TanStack Table for sorting, filtering, pagination
- Accessibility: headings, role attributes; rows clickable via button with ARIA label

Pattern:

- Column definitions with accessors and cell renderers
- Server-driven sorting/filtering where available; client-side as fallback
- Provide `data-testid` hooks for E2E on row buttons
