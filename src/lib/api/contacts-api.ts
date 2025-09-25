// Client-side contact API for HTTP interactions
//
// Features:
// - Uses unified types from @omnicrm/contracts
// - Descriptive function names with 'api' prefix
// - Proper error handling with CSRF protection
// - HTTP client calls only, no business logic

import type {
  ContactDTO,
  CreateContactDTO,
  UpdateContactDTO,
  PaginatedResponse,
  PaginationParams,
  ContactFilters,
} from "@omnicrm/contracts";
import { get, post, put, buildUrl } from "@/lib/api/client";
import { logger } from "@/lib/observability";

/** ---- Contact API Types ---- */

export interface ApiFetchContactsParams extends PaginationParams, ContactFilters {
  search?: string;
  sort?: string;
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  createdAtFilter?: {
    start?: string;
    end?: string;
  };
}

export interface ApiContactsListResponse extends PaginatedResponse<ContactDTO> {
  total: number;
  items: ContactDTO[];
}

export interface ApiContactResponse {
  item: ContactDTO;
}

export interface ApiBulkDeleteResponse {
  deleted: number;
}

/** ---- Debug Logging ---- */

function debugLog(message: string, data?: unknown): void {
  const context: { operation: string; additionalData?: Record<string, unknown> } = {
    operation: "contacts_api",
  };

  if (data) {
    context.additionalData = data as Record<string, unknown>;
  }

  logger.debug(`[CONTACTS-API] ${message}`, context).catch((error) => {
    if (process.env.NODE_ENV !== "production") {
      console.error("Logging failure in contacts-api:", error, { message, context });
    }
  }); // Fire-and-forget logging
}

/** ---- Contact API Methods ---- */

/**
 * Fetch paginated list of contacts with optional filters
 */
export async function apiFetchContacts(
  params: ApiFetchContactsParams = {},
): Promise<ApiContactsListResponse> {
  debugLog("Starting apiFetchContacts with params:", params);

  const url = buildUrl("/api/omni-clients", {
    search: params.search,
    sort: params.sort,
    order: params.order,
    page: params.page,
    pageSize: params.pageSize,
    createdAtFilter: params.createdAtFilter ? JSON.stringify(params.createdAtFilter) : undefined,
  });

  debugLog("Making request to:", url);

  try {
    const result = await get<ApiContactsListResponse>(url);
    debugLog("Successfully parsed contacts response, items count:", result.items?.length ?? 0);
    return result;
  } catch (error) {
    // Re-throw with more specific error information
    const errorMessage = error instanceof Error ? error.message : String(error);
    debugLog("Contacts fetch error:", errorMessage);
    throw error;
  }
}

/**
 * Create a new contact
 */
export async function apiCreateContact(input: CreateContactDTO): Promise<ContactDTO> {
  const result = await post<ApiContactResponse>("/api/omni-clients", {
    ...input,
    source: input.source ?? "manual",
  });
  return result.item;
}

/**
 * Update an existing contact
 */
export async function apiUpdateContact(id: string, input: UpdateContactDTO): Promise<ContactDTO> {
  const result = await put<ApiContactResponse>(`/api/omni-clients/${id}`, input);
  return result.item;
}

/**
 * Delete multiple contacts by IDs
 */
export async function apiDeleteContacts(ids: string[]): Promise<number> {
  const result = await post<ApiBulkDeleteResponse>(`/api/omni-clients/bulk-delete`, { ids });
  return result.deleted;
}

/**
 * Fetch a single contact by ID
 */
export async function apiFetchContact(id: string): Promise<ContactDTO> {
  const result = await get<ApiContactResponse>(`/api/omni-clients/${id}`);
  return result.item;
}

/** ---- Legacy Function Aliases (for backward compatibility) ---- */

/**
 * @deprecated Use apiFetchContacts instead
 */
export const fetchContacts = apiFetchContacts;

/**
 * @deprecated Use apiCreateContact instead
 */
export const createContact = apiCreateContact;

/**
 * @deprecated Use apiUpdateContact instead
 */
export const updateContact = apiUpdateContact;

/**
 * @deprecated Use apiDeleteContacts instead
 */
export const deleteContacts = apiDeleteContacts;

/**
 * @deprecated Use apiFetchContact instead
 */
export const fetchContact = apiFetchContact;
