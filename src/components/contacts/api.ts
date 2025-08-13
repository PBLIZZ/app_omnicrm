export type ContactDTO = {
  id: string;
  displayName: string;
  primaryEmail?: string | null;
  primaryPhone?: string | null;
  createdAt: string;
};

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

export type ContactListResponse = {
  items: ContactDTO[];
  total: number;
};

function getCsrf(): string {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(/(?:^|; )csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1] ?? "") : "";
}

type OkEnvelope<T> = { ok: true; data: T } | { ok: false; error: string; details?: unknown };

export async function fetchContacts(params: FetchContactsParams): Promise<ContactListResponse> {
  const url = new URL("/api/contacts", window.location.origin);
  if (params.search) url.searchParams.set("search", params.search);
  if (params.sort) url.searchParams.set("sort", params.sort);
  if (params.order) url.searchParams.set("order", params.order);
  if (params.page) url.searchParams.set("page", String(params.page));
  if (params.pageSize) url.searchParams.set("pageSize", String(params.pageSize));
  if (params.createdAtFilter)
    url.searchParams.set("createdAtFilter", JSON.stringify(params.createdAtFilter));

  const res = await fetch(url.toString(), {
    credentials: "same-origin",
    headers: { "x-csrf-token": getCsrf() },
  });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  const env = (await res.json()) as OkEnvelope<ContactListResponse>;
  if (!env.ok) throw new Error(env.error);
  return env.data;
}

export type CreateContactInput = {
  displayName: string;
  primaryEmail?: string | null;
  primaryPhone?: string | null;
  tags?: string[];
  notes?: string | null;
  source?: "manual";
};

export async function createContact(input: CreateContactInput): Promise<ContactDTO> {
  const res = await fetch("/api/contacts", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json", "x-csrf-token": getCsrf() },
    body: JSON.stringify({ ...input, source: "manual" }),
  });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  const env = (await res.json()) as OkEnvelope<ContactDTO>;
  if (!env.ok) throw new Error(env.error);
  return env.data;
}

export type UpdateContactInput = {
  displayName?: string;
  primaryEmail?: string | null;
  primaryPhone?: string | null;
  tags?: string[];
  notes?: string | null;
};

export async function updateContact(id: string, input: UpdateContactInput): Promise<ContactDTO> {
  const res = await fetch(`/api/contacts/${id}`, {
    method: "PUT",
    credentials: "same-origin",
    headers: { "content-type": "application/json", "x-csrf-token": getCsrf() },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  const env = (await res.json()) as OkEnvelope<ContactDTO>;
  if (!env.ok) throw new Error(env.error);
  return env.data;
}

export async function deleteContacts(ids: string[]): Promise<number> {
  // Use bulk endpoint when available
  const res = await fetch(`/api/contacts/bulk-delete`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json", "x-csrf-token": getCsrf() },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  const env = (await res.json()) as OkEnvelope<{ deleted: number }>;
  if (!env.ok) throw new Error(env.error);
  return env.data.deleted;
}

export async function fetchContact(id: string): Promise<ContactDTO> {
  const res = await fetch(`/api/contacts/${id}`, {
    credentials: "same-origin",
    headers: { "x-csrf-token": getCsrf() },
  });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  const env = (await res.json()) as OkEnvelope<ContactDTO>;
  if (!env.ok) throw new Error(env.error);
  return env.data;
}
