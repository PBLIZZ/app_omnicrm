# Business Schemas Audit (2025-10-09)

## Scope & Methodology

- **Sources Reviewed**
  - `LAYER_ARCHITECTURE_BLUEPRINT_2025.md`
  - All files under `src/server/db/business-schemas/`
- **Focus Areas**
  - **Architectural adherence** to layered boundaries and naming conventions
  - **Security posture** for sensitive fields and validation rigor
  - **Simplicity & maintainability**, with attention to transforms and nested schemas

## Architectural Adherence Findings

- **[Transform usage outside allowed scope]** `productivity.ts`, `ai-insights.ts`, `interactions.ts`, `raw-events.ts` apply `.transform()` to schema outputs for UI enrichment (e.g., computed flags like `isCompleted`). Blueprint defines business schemas as validation-only with *no transforms*. These enrichments should live in services or view-model helpers.
- **[Schema scope drift]** `productivity.ts` centralizes tasks, projects, inbox, zones, and DTO-style constructs (`InboxProcessingResultDTO`). Splitting per bounded context would better match blueprint guidance for single-purpose modules and reduce cross-domain coupling.
- **[Non-Drizzle base types]** Several schemas rely solely on ad-hoc `z.object` definitions instead of starting from Drizzle infer types (e.g., `calendar.ts` response shapes, `gmail.ts` message payloads). Blueprint states business schemas should wrap database-derived types or straightforward API payloads; ensure types align with service outputs and Drizzle models to avoid divergence.
- **[Barrel export sprawl]** `index.ts` re-exports extensive UI/DTO structures (e.g., `InboxProcessingContext`, `EmailPreviewSchema`). Handlers only need endpoint request/response schemas; UI-only exports should move to client-specific modules.

## Security & Data Exposure

- **[JSONB `unknown` exposures]** Multiple schemas (`contacts.ts`, `ai-insights.ts`, `interactions.ts`, `raw-events.ts`) expose JSONB blobs as `z.unknown()`. Without additional validation/sanitization, sensitive fields (PII, AI payloads) could leak. Recommend scoped parsing (e.g., `z.record(z.string(), z.any())` with refinements) or service-level redaction before response schemas.
- **[OAuth callback validation gaps]** `google-auth.ts` and `gmail.ts` define similar callback schemas with `.optional()` query params. Only `google-auth.ts` enforces XOR constraint (`code` vs `error`). Duplicate definitions risk inconsistent validation. Consolidate and ensure all callback schemas enforce mutual exclusivity plus state integrity.
- **[Drive ingestion defaults]** `google-prefs.ts` and `sync-progress.ts` default Drive ingestion enums but accept arbitrary folder IDs without validation of format/ownership. Consider tighter validation (e.g., regex for Drive IDs) and service-layer permission checks.
- **[Batch operations risk]** `contacts.ts` `BulkDeleteBodySchema` allows large arbitrary ID arrays without rate limits. Blueprint expects middleware-level rate limiting; confirm handler enforces size caps, audit logging, and authorization for bulk destructive actions.

## Complexity & Maintainability

- **[Monolithic schemas file]** `productivity.ts` (~600 lines) intertwines multiple domains with transforms, DTO aliases, discriminated unions, and computed properties. This increases cognitive load. Recommend:
  - Split into per-entity modules (`tasks.schemas.ts`, `inbox.schemas.ts`, etc.)
  - Move UI-only transforms (e.g., computed flags) to view model mappers in service layer.
- **[Repeated schema patterns]** Pagination objects are manually recreated across files. Centralize shared pagination schema in `@/lib/validation` and reuse to maintain consistency.
- **[Optional/default misuse]** Some schemas combine `optional().default(...)` (e.g., `google-prefs.ts` preferences). In Zod 4, default implies value present; verify no service relies on distinguishing undefined vs default, and consider explicit `nullable()` when appropriate.
- **[Legacy comments / deprecated notes]** `calendar.ts` and `index.ts` contain references to deprecated endpoints and TODOs (e.g., “Moved from component types”). Clean up to avoid confusion about active contract surfaces.

## Actionable Recommendations

- **[Refactor UI transforms]** Relocate `.transform()` logic from business schemas to service-layer mappers, keeping schemas pure validators per blueprint.
- **[Modularize productivity schemas]** Split `productivity.ts` into smaller files aligning to task/project/inbox/zone bounded contexts; update `index.ts` exports accordingly.
- **[Harden JSONB handling]** Introduce explicit validation or redaction helpers for JSONB fields prior to passing into response schemas. Consider typed helper functions in `@/lib/validation/json`.
- **[Deduplicate OAuth schemas]** Create shared OAuth query schema with XOR constraint under `google-auth.ts` and reuse via imports to eliminate inconsistent validation.
- **[Introduce shared pagination schema]** Add `PaginationSchema` in `@/lib/validation/common.ts` and replace duplicated pagination objects across business schemas.
- **[Audit bulk operations]** Document rate limits and authorization checks for `BulkDeleteBodySchema` consumers; consider enforcing max array length in schema.
- **[Enhance Drive ID validation]** Add regex or service-level verification for `driveFolderIds` and similar fields to prevent arbitrary path injection.
- **[Prune barrel exports]** Limit `business-schemas/index.ts` to route-facing schemas; move UI-specific exports to dedicated client packages to maintain clear layering.
- **[Update documentation]** Reflect schema reorganizations and validation policies in `docs/architecture/` and API docs to keep blueprint synchronized.

## Next Steps

1. Prioritize refactoring of `productivity.ts` and transform usage to restore blueprint compliance.
2. Align OAuth and JSONB handling for security consistency across integrations.
3. Schedule follow-up review after implementing shared helpers and module splits to verify no regressions.

### Code removed from Business Schemas

```typescript
Update(src/server/services/productivity.service.ts)
  ⎿  Updated src/server/services/productivity.service.ts with 2 additions and 7 removals
       869          const db = await getDb();
       870          const zones = await ZonesRepository.listZones(db);
       871    
       872 -        const zonesWithUI = zones.map((zone) => ({
       873 -          ...zone,
       874 -          icon: zone.iconName,
       875 -          displayName: zone.name,
       876 -          hasIcon: !!zone.iconName,
       877 -          hasColor: !!zone.color,
       878 -        }));
       872 +        // Use mapper function to enrich zones with UI fields
       873 +        const zonesWithUI = zones.map(mapToZoneWithUI);
       874    
       875          return ok({
       876            items: zonesWithUI,

Update(src/server/db/business-schemas/gmail.ts)
  ⎿  Updated src/server/db/business-schemas/gmail.ts with 9 additions and 12 removals            
        1    /**
        2     * Gmail-specific schemas
        3     *
        4 -   * All Gmail API route validation schemas and types
        4 +   * All Gmail API route validation schemas and types.
        5 +   * OAuth callback schemas imported from centralized google-auth module.
        6     */
        7    
        8    import { z } from "zod";
        9    
       10 +  // Re-export OAuth schemas from centralized source
       11 +  export {
       12 +    GmailOAuthCallbackQuerySchema,
       13 +    type GmailOAuthCallbackQuery,
       14 +    GmailStatusQuerySchema,
       15 +  } from "./google-auth";
       16 +  
       17    // ============================================================================
       18    // GMAIL-SPECIFIC SCHEMAS
       19    // ============================================================================
       20    
       21    /**
       22 -   * Gmail OAuth Callback Query Schema
       23 -   */
       24 -  export const GmailOAuthCallbackQuerySchema = z.object({
       25 -    code: z.string().optional(),
       26 -    state: z.string().optional(),
       27 -    error: z.string().optional(),
       28 -  });
       29 -  
       30 -  export type GmailOAuthCallbackQuery = z.infer<typeof GmailOAuthCallbackQuerySchema>;
       31 -  
       32 -  /**
       22     * Gmail OAuth Start Response Schema
       23     */

Update(src/server/db/business-schemas/interactions.ts)
  ⎿  Updated src/server/db/business-schemas/interactions.ts with 19 additions and 54 removals               
        5     * - Interaction (select type)
        6     * - CreateInteraction (insert type)
        7     * - UpdateInteraction (partial insert type)
        8 +   *
        9 +   * Per architecture blueprint: JSONB fields use validated schemas from @/lib/validation/jsonb
       10     */
       11    
       12    import { createSelectSchema } from "drizzle-zod";
       13    import { z } from "zod";
       14    
       15    import { interactions } from "@/server/db/schema";
       16 +  import {
       17 +    SourceMetaSchema,
       18 +    GmailSourceMetaSchema,
       19 +    CalendarSourceMetaSchema,
       20 +    GenericSourceMetaSchema,
       21 +    type SourceMeta,
       22 +    type GmailSourceMeta,
       23 +    type CalendarSourceMeta,
       24 +  } from "@/lib/validation/jsonb";
       25 +  import { PaginationQuerySchema, createPaginatedResponseSchema } from "@/lib/validation/common";
       26    
       27    export type { Interaction, CreateInteraction, UpdateInteraction } from "@/server/db/schema";
       28    
       29 -  // ============================================================================
       30 -  // SOURCE METADATA SCHEMAS
       31 -  // ============================================================================
       32 -  
       33 -  export const GmailSourceMetaSchema = z.object({
       34 -    from: z.string().optional(),
       35 -    to: z.array(z.string()).optional(),
       36 -    cc: z.array(z.string()).optional(),
       37 -    bcc: z.array(z.string()).optional(),
       38 -    subject: z.string().optional(),
       39 -    threadId: z.string().optional(),
       40 -    messageId: z.string().optional(),
       41 -    labelIds: z.array(z.string()).optional(),
       42 -    fetchedAt: z.string().optional(),
       43 -    matchedQuery: z.string().optional(),
       44 -  });
       45 -  
       46 -  export const CalendarSourceMetaSchema = z.object({
       47 -    attendees: z
       48 -      .array(
       49 -        z.object({
       50 -          email: z.string(),
       51 -          name: z.string().optional(),
       52 -          responseStatus: z.string().optional(),
       53 -        }),
       54 -      )
       55 -      .optional(),
       56 -    organizer: z
       57 -      .object({
       58 -        email: z.string(),
       59 -        name: z.string().optional(),
       60 -      })
       61 -      .optional(),
       62 -    eventId: z.string().optional(),
       63 -    calendarId: z.string().optional(),
       64 -    summary: z.string().optional(),
       65 -    description: z.string().optional(),
       66 -    location: z.string().optional(),
       67 -    startTime: z.string().optional(),
       68 -    endTime: z.string().optional(),
       69 -    isAllDay: z.boolean().optional(),
       70 -    recurring: z.boolean().optional(),
       71 -    status: z.string().optional(),
       72 -    fetchedAt: z.string().optional(),
       73 -  });
       74 -  
       75 -  export const GenericSourceMetaSchema = z.record(z.string(), z.unknown());
       76 -  
       77 -  export const SourceMetaSchema = z.union([
       29 +  // Re-export source metadata schemas
       30 +  export {
       31 +    SourceMetaSchema,
       32      GmailSourceMetaSchema,
       33      CalendarSourceMetaSchema,
       34      GenericSourceMetaSchema,
       35 -  ]);
       35 +    type SourceMeta,
       36 +    type GmailSourceMeta,
       37 +    type CalendarSourceMeta,
       38 +  };
       39    
       40 -  export type GmailSourceMeta = z.infer<typeof GmailSourceMetaSchema>;
       41 -  export type CalendarSourceMeta = z.infer<typeof CalendarSourceMetaSchema>;
       42 -  export type SourceMeta = z.infer<typeof SourceMetaSchema>;
       43 -  
       40    // ============================================================================
       41    // BASE SCHEMAS
       42    // ================================

Update(src/server/db/business-schemas/interactions.ts)
  ⎿  Updated src/server/db/business-schemas/interactions.ts with 2 additions and 9 removals                    
        98    
        99    export type UpdateInteractionBody = z.infer<typeof UpdateInteractionBodySchema>;
       100    
       101 -  export const GetInteractionsQuerySchema = z.object({
       102 -    page: z.coerce.number().int().min(1).default(1),
       103 -    pageSize: z.coerce
       104 -      .number()
       105 -      .int()
       106 -      .min(1)
       107 -      .max(100)
       108 -      .default(20),
       101 +  export const GetInteractionsQuerySchema = PaginationQuerySchema.extend({
       102 +    pageSize: z.coerce.number().int().min(1).max(100).default(20), // Override max for interactions
       103      sort: z.enum(["occurredAt", "createdAt"]).default("occurredAt"),
       104 -    order: z.enum(["asc", "desc"]).default("desc"),
       104      contactId: z.string().uuid().optional(),
       105      type: z.array(z.string()).optional(),
       106      source: z.array(z.string()).optional(),

Update(src/server/db/business-schemas/interactions.ts)
  ⎿  Updated src/server/db/business-schemas/interactions.ts with 6 additions and 38 removals                
       113    // RESPONSE SCHEMAS
       114    // ============================================================================
       115    
       116 -  export const InteractionWithUISchema = InteractionSchema.transform((data) => ({
       117 -    ...data,
       118 -    hasContent: Boolean(data.bodyText || data.subject),
       119 -    contentPreview: data.bodyText
       120 -      ? data.bodyText.slice(0, 150) + (data.bodyText.length > 150 ? "..." : "")
       121 -      : data.subject || "No content",
       122 -    isEmail: data.type === "email",
       123 -    isCall: data.type === "call",
       124 -    isMeeting: data.type === "meeting",
       125 -    isCalendarEvent: data.type === "calendar_event",
       126 -  })) satisfies z.ZodType<
       127 -    InteractionDTO & {
       128 -      hasContent: boolean;
       129 -      contentPreview: string;
       130 -      isEmail: boolean;
       131 -      isCall: boolean;
       132 -      isMeeting: boolean;
       133 -      isCalendarEvent: boolean;
       134 -    }
       135 -  >;
       116 +  /**
       117 +   * Interaction List Response Schema
       118 +   * Note: Per architecture blueprint, transforms removed. UI enrichment should happen
       119 +   * in service layer mappers (e.g., `mapToInteractionWithUI()` helper function).
       120 +   */
       121 +  export const InteractionListResponseSchema = createPaginatedResponseSchema(InteractionSchema);
       122    
       123 -  export type InteractionWithUI = z.infer<typeof InteractionWithUISchema>;
       124 -  
       125 -  // ============================================================================
       126 -  // RESPONSE SCHEMAS
       127 -  // ============================================================================
       128 -  
       129 -  export const InteractionListResponseSchema = z.object({
       130 -    items: z.array(InteractionWithUISchema),
       131 -    pagination: z.object({
       132 -      page: z.number(),
       133 -      pageSize: z.number(),
       134 -      total: z.number(),
       135 -      totalPages: z.number(),
       136 -      hasNext: z.boolean(),
       137 -      hasPrev: z.boolean(),
       138 -    }),
       139 -  });
       140 -  
       123    export type InteractionListResponse = z.infer<typeof InteractionListResponseSchema>;
       124    
       125    export const InteractionResponseSchema = z.object({

Update(src/server/db/business-schemas/ai-insights.ts)
  ⎿  Updated src/server/db/business-schemas/ai-insights.ts with 3 additions and 10 removals  
       53    
       54    export type UpdateAiInsightBody = z.infer<typeof UpdateAiInsightBodySchema>;
       55    
       56 -  export const AiInsightsQuerySchema = z.object({
       56 +  export const AiInsightsQuerySchema = PaginationQuerySchema.extend({
       57 +    pageSize: z.coerce.number().int().min(1).max(200).default(20), // Override max
       58 +    sort: z.enum(["createdAt"]).default("createdAt"),
       59      subjectType: z.string().optional(),
       60      subjectId: z.string().uuid().optional(),
       61      kind: z.array(z.string()).optional(),
       62      search: z.string().optional(),
       63 -    page: z.coerce.number().int().min(1).default(1),
       64 -    pageSize: z.coerce
       65 -      .number()
       66 -      .int()
       67 -      .min(1)
       68 -      .max(200)
       69 -      .default(20),
       70 -    order: z.enum(["asc", "desc"]).default("desc"),
       71 -    sort: z.enum(["createdAt"]).default("createdAt"),
       63    });
       64    
       65    export type AiInsightsQuery = z.infer<typeof AiInsightsQuerySchema>;

⏺ Update(src/server/db/business-schemas/ai-insights.ts)
  ⎿  Updated src/server/db/business-schemas/ai-insights.ts with 6 additions and 30 removals                    
        68    // RESPONSE SCHEMAS
        69    // ============================================================================
        70    
        71 -  export const AiInsightsListResponseSchema = z.object({
        72 -    items: z.array(AiInsightSchema),
        73 -    pagination: z.object({
        74 -      page: z.number(),
        75 -      pageSize: z.number(),
        76 -      total: z.number(),
        77 -      totalPages: z.number(),
        78 -      hasNext: z.boolean(),
        79 -      hasPrev: z.boolean(),
        80 -    }),
        81 -  });
        71 +  /**
        72 +   * AI Insights List Response Schema
        73 +   * Note: Per architecture blueprint, transforms removed. UI enrichment (isRecent, contentPreview)
        74 +   * should happen in service layer mappers.
        75 +   */
        76 +  export const AiInsightsListResponseSchema = createPaginatedResponseSchema(AiInsightSchema);
        77    
        78    export type AiInsightsListResponse = z.infer<typeof AiInsightsListResponseSchema>;
        79    
        80    export const AiInsightResponseSchema = z.object({
        81      item: AiInsightSchema,
        82    });
        83 -  
        84 -  // ============================================================================
        85 -  // UI SCHEMAS
        86 -  // ============================================================================
        87 -  
        88 -  export const AiInsightWithUISchema = AiInsightSchema.transform((data) => ({
        89 -    ...data,
        90 -    isRecent: data.createdAt
        91 -      ? new Date(data.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
        92 -      : false,
        93 -    contentPreview:
        94 -      typeof data.content === "string"
        95 -        ? data.content.slice(0, 100) + (data.content.length > 100 ? "..." : "")
        96 -        : data.content && typeof data.content === "object"
        97 -          ? JSON.stringify(data.content).slice(0, 100) + "..."
        98 -          : "No content",
        99 -  })) satisfies z.ZodType<AiInsightDTO & { isRecent: boolean; contentPreview: string }>;
       100 -  
       101 -  export type AiInsightWithUI = z.infer<typeof AiInsightWithUISchema>;

Update(src/server/db/business-schemas/productivity.ts)
  ⎿  Updated src/server/db/business-schemas/productivity.ts with 3 additions and 17 removals         
       116    // ============================================================================
       117    
       118    /**
       119 -   * UI-Enhanced Task Schema
       120 -   * Extends base Task with computed fields for UI display
       119 +   * Task Schema (Pure Validation)
       120 +   * Note: UI enrichment moved to service layer mapper (mapToTaskWithUI)
       121 +   * Per architecture blueprint: No transforms in business schemas
       122     */
       123 -  export const TaskWithUISchema = selectTaskSchema.transform((data) => {
       124 -    const dueDate = data["dueDate"] ? new Date(data["dueDate"]) : null;
       125 -    return {
       126 -      ...data,
       127 -      dueDate,
       128 -      // UI computed fields
       129 -      isCompleted: data["status"] === "done",
       130 -      isOverdue: dueDate ? dueDate < new Date() && data["status"] !== "done" : false,
       131 -      isDueToday: dueDate ? dueDate.toDateString() === new Date().toDateString() : false,
       132 -      isHighPriority: ["high", "urgent"].includes(data["priority"]),
       133 -      hasSubtasks: false, // Would be computed via join query
       134 -    };
       135 -  });
       123    
       124 -  export type TaskWithUI = z.infer<typeof TaskWithUISchema>;
       125 -  
       124    /**
       125     * Task filters for search/filtering
       126     */
```
