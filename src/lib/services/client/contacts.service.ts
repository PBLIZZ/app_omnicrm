// Client-side contact service for API interactions

import type {
  ContactDTO,
  ContactListResponse,
  CreateContactInput,
  UpdateContactInput,
  FetchContactsParams,
} from "@/lib/validation/schemas/omniClients";

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error((await res.text().catch(() => null)) ?? res.statusText);
  const response = (await res.json()) as { ok: boolean; data?: T; error?: string };
  if (response.ok && response.data !== undefined) {
    return response.data;
  }
  throw new Error(response.error ?? "API response not ok");
}

/** ---- CSRF helper ---- */
function getCsrf(): string {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(/(?:^|; )csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1] ?? "") : "";
}

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

  const url = new URL("/api/omni-clients", window.location.origin);
  if (params.search) url.searchParams.set("search", params.search);
  if (params.sort) url.searchParams.set("sort", params.sort);
  if (params.order) url.searchParams.set("order", params.order);
  if (params.page != null) url.searchParams.set("page", String(params.page));
  if (params.pageSize != null) url.searchParams.set("pageSize", String(params.pageSize));
  if (params.createdAtFilter)
    url.searchParams.set("createdAtFilter", JSON.stringify(params.createdAtFilter));

  debugLog("Making request to:", url.toString());

  try {
    const res = await fetch(url.toString(), {
      credentials: "same-origin",
      headers: { "x-csrf-token": getCsrf() },
    });

    debugLog("Response status:", res.status);

    if (res.status === 429) {
      debugLog("Rate limited response");
      throw new Error('{"error":"rate_limited"}');
    }

    const result = await parseJson<ContactListResponse>(res);
    debugLog("Successfully parsed contacts response, items count:", result.items?.length ?? 0);
    return result;
  } catch (error) {
    // Re-throw with more specific error information
    const errorMessage = error instanceof Error ? error.message : String(error);
    debugLog("Contacts fetch error:", errorMessage);

    if (errorMessage.includes("rate_limited")) {
      throw new Error('{"error":"rate_limited"}');
    }
    throw error;
  }
}

export async function createContact(input: CreateContactInput): Promise<ContactDTO> {
  const res = await fetch("/api/omni-clients", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json", "x-csrf-token": getCsrf() },
    body: JSON.stringify({ ...input, source: "manual" }),
  });
  return await parseJson<ContactDTO>(res);
}

export async function updateContact(id: string, input: UpdateContactInput): Promise<ContactDTO> {
  const res = await fetch(`/api/omni-clients/${id}`, {
    method: "PUT",
    credentials: "same-origin",
    headers: { "content-type": "application/json", "x-csrf-token": getCsrf() },
    body: JSON.stringify(input),
  });
  return await parseJson<ContactDTO>(res);
}

export async function deleteContacts(ids: string[]): Promise<number> {
  const res = await fetch(`/api/omni-clients/bulk-delete`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json", "x-csrf-token": getCsrf() },
    body: JSON.stringify({ ids }),
  });
  const result = await parseJson<{ deleted: number }>(res);
  return result.deleted;
}

export async function fetchContact(id: string): Promise<ContactDTO> {
  const res = await fetch(`/api/omni-clients/${id}`, {
    credentials: "same-origin",
    headers: { "x-csrf-token": getCsrf() },
  });
  return await parseJson<ContactDTO>(res);
}
