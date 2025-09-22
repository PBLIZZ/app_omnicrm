// Client-side contact service for API interactions

import type {
  OmniClientsListResponseDTO,
  CreateOmniClientInput,
  UpdateOmniClientInput,
  FetchContactsParams,
  OmniClientDTO,
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
): Promise<OmniClientsListResponseDTO> {
  debugLog("Starting fetchContacts with params:", params);

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
    const result = await fetchGet<OmniClientsListResponseDTO>(url);
    debugLog("Successfully parsed contacts response, items count:", result.items?.length ?? 0);
    return result;
  } catch (error) {
    // Re-throw with more specific error information
    const errorMessage = error instanceof Error ? error.message : String(error);
    debugLog("Contacts fetch error:", errorMessage);
    throw error;
  }
}

export async function createContact(input: CreateOmniClientInput): Promise<OmniClientDTO> {
  const result = await fetchPost<{ item: OmniClientDTO }>("/api/omni-clients", { ...input, source: "manual" });
  return result.item;
}

export async function updateContact(id: string, input: UpdateOmniClientInput): Promise<OmniClientDTO> {
  const result = await fetchPut<{ item: OmniClientDTO }>(`/api/omni-clients/${id}`, input);
  return result.item;
}

export async function deleteContacts(ids: string[]): Promise<number> {
  const result = await fetchPost<{ deleted: number }>(`/api/omni-clients/bulk-delete`, { ids });
  return result.deleted;
}

export async function fetchContact(id: string): Promise<OmniClientDTO> {
  const result = await fetchGet<{ item: OmniClientDTO }>(`/api/omni-clients/${id}`);
  return result.item;
}
