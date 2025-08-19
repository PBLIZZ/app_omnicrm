// src/contacts/api.ts

// Define types locally since schemas are not available
export interface ContactDTO {
  id: string;
  displayName: string;
  primaryEmail?: string;
  primaryPhone?: string;
  createdAt: string;
  avatar?: string;
  tags?: string[];
  lifecycleStage?: "lead" | "prospect" | "customer" | "advocate";
  lastContactDate?: string;
  notes?: string;
  company?: string;
}

export interface ContactListResponse {
  items: ContactDTO[];
  total: number;
}

export type CreateContactInput = {
  displayName: string;
  primaryEmail?: string;
  primaryPhone?: string;
  company?: string;
  notes?: string;
  tags?: string[];
  lifecycleStage?: "lead" | "prospect" | "customer" | "advocate";
};

export type UpdateContactInput = Partial<CreateContactInput> & {
  id: string;
};

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error((await res.text().catch(() => null)) ?? res.statusText);
  const envelope = (await res.json()) as { ok: boolean; data?: T; error?: string };
  if (envelope.ok && envelope.data !== undefined) {
    return envelope.data;
  }
  throw new Error(envelope.error ?? "API response not ok");
}

/** ---- CSRF helper ---- */
function getCsrf(): string {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(/(?:^|; )csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1] ?? "") : "";
}

/** ---- Filters/params ---- */
export type CreatedAtFilter =
  | { mode: "any" }
  | { mode: "today" | "week" | "month" | "quarter" | "year" }
  | { mode: "range"; from?: string; to?: string };

export type FetchContactsParams = {
  search?: string;
  sort?: "displayName" | "createdAt";
  order?: "asc" | "desc";
  createdAtFilter?: CreatedAtFilter;
  page?: number;
  pageSize?: number;
};

/** ---- Calls ---- */
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

  const res = await fetch(url.toString(), {
    credentials: "same-origin",
    headers: { "x-csrf-token": getCsrf() },
  });
  return await parseJson<ContactListResponse>(res);
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
