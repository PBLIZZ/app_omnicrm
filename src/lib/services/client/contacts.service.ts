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
export async function fetchContacts(
  params: FetchContactsParams = {},
): Promise<ContactListResponse> {
  const url = new URL("/api/contacts", window.location.origin);
  if (params.search) url.searchParams.set("search", params.search);
  if (params.sort) url.searchParams.set("sort", params.sort);
  if (params.order) url.searchParams.set("order", params.order);
  if (params.page != null) url.searchParams.set("page", String(params.page));
  if (params.pageSize != null) url.searchParams.set("pageSize", String(params.pageSize));
  if (params.createdAtFilter)
    url.searchParams.set("createdAtFilter", JSON.stringify(params.createdAtFilter));

  try {
    const res = await fetch(url.toString(), {
      credentials: "same-origin",
      headers: { "x-csrf-token": getCsrf() },
    });

    if (res.status === 429) {
      throw new Error('{"error":"rate_limited"}');
    }

    return await parseJson<ContactListResponse>(res);
  } catch (error) {
    // Re-throw with more specific error information
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("rate_limited")) {
      throw new Error('{"error":"rate_limited"}');
    }
    throw error;
  }
}

export async function createContact(input: CreateContactInput): Promise<ContactDTO> {
  const res = await fetch("/api/contacts", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json", "x-csrf-token": getCsrf() },
    body: JSON.stringify({ ...input, source: "manual" }),
  });
  return await parseJson<ContactDTO>(res);
}

export async function updateContact(id: string, input: UpdateContactInput): Promise<ContactDTO> {
  const res = await fetch(`/api/contacts/${id}`, {
    method: "PUT",
    credentials: "same-origin",
    headers: { "content-type": "application/json", "x-csrf-token": getCsrf() },
    body: JSON.stringify(input),
  });
  return await parseJson<ContactDTO>(res);
}

export async function deleteContacts(ids: string[]): Promise<number> {
  const res = await fetch(`/api/contacts/bulk-delete`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json", "x-csrf-token": getCsrf() },
    body: JSON.stringify({ ids }),
  });
  const result = await parseJson<{ deleted: number }>(res);
  return result.deleted;
}

export async function fetchContact(id: string): Promise<ContactDTO> {
  const res = await fetch(`/api/contacts/${id}`, {
    credentials: "same-origin",
    headers: { "x-csrf-token": getCsrf() },
  });
  return await parseJson<ContactDTO>(res);
}
