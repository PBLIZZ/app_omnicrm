// Client-side contact service for API interactions

import type {
  ContactDTO,
  ContactListResponse,
  CreateContactInput,
  UpdateContactInput,
  FetchContactsParams,
} from "@/lib/validation/schemas/omniClients";
import { fetchGet, fetchPost, fetchPut, buildUrl } from "@/lib/api";

/** ---- Contact API calls ---- */
// Debug logging helper
function debugLog(message: string, data?: unknown): void {
  if (process.env.NODE_ENV === "development") {
    // Using console.warn instead of console.log for ESLint compliance
    console.warn(`[CONTACTS-DEBUG] ${message}`, data ? data : "");
  }
}

export async function fetchContacts(
  params: FetchContactsParams = {},
): Promise<ContactListResponse> {
  debugLog("Starting fetchContacts with params:", params);

  const url = buildUrl("/api/omni-clients", {
    search: params.search,
    sort: params.sort,
    order: params.order,
    page: params.page,
    pageSize: params.pageSize,
    createdAtFilter: params.createdAtFilter,
  });

  debugLog("Making request to:", url);

  try {
    const result = await fetchGet<ContactListResponse>(url);
    debugLog("Successfully parsed contacts response, items count:", result.items?.length ?? 0);
    return result;
  } catch (error) {
    // Re-throw with more specific error information
    const errorMessage = error instanceof Error ? error.message : String(error);
    debugLog("Contacts fetch error:", errorMessage);
    throw error;
  }
}

export async function createContact(input: CreateContactInput): Promise<ContactDTO> {
  return await fetchPost<ContactDTO>("/api/omni-clients", { ...input, source: "manual" });
}

export async function updateContact(id: string, input: UpdateContactInput): Promise<ContactDTO> {
  return await fetchPut<ContactDTO>(`/api/omni-clients/${id}`, input);
}

export async function deleteContacts(ids: string[]): Promise<number> {
  const result = await fetchPost<{ deleted: number }>(`/api/omni-clients/bulk-delete`, { ids });
  return result.deleted;
}

export async function fetchContact(id: string): Promise<ContactDTO> {
  return await fetchGet<ContactDTO>(`/api/omni-clients/${id}`);
}
