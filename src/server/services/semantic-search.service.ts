import { getSupabaseServerClient, type ServerSupabaseClient } from "@/server/db/supabase/server";
import { getOrGenerateEmbedding } from "@/server/lib/embeddings";

export type SearchKind = "traditional" | "semantic" | "hybrid";
export type SearchResultType = "client" | "appointment" | "task" | "note" | "email" | "goal";
export type SearchSource = "traditional" | "semantic" | "hybrid";

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  url: string;
  similarity?: number;
  score?: number;
  source?: SearchSource;
}

interface ClientRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string | null;
}

interface AppointmentRow {
  id: string;
  title: string | null;
  description: string | null;
  date_time: string | null;
  client_id: string | null;
  clients: { name: string | null } | null;
}

interface TaskRow {
  id: string;
  title: string | null;
  description: string | null;
  status: string | null;
  due_date: string | null;
}

interface NoteRow {
  id: string;
  title: string | null;
  content: string | null;
  created_at: string | null;
  client_id: string | null;
  clients: { name: string | null } | null;
}

interface SemanticSearchRow {
  id: string;
  content_id: string | null;
  content_type: string;
  title: string | null;
  content: string | null;
  metadata: Record<string, unknown> | null;
  similarity: number | null;
}

interface SemanticSearchOptions {
  matchCount?: number;
  similarityThreshold?: number;
}

const SEARCH_RESULT_TYPES: ReadonlySet<SearchResultType> = new Set([
  "client",
  "appointment",
  "task",
  "note",
  "email",
  "goal",
]);

const RESULT_ROUTE_MAP: Record<SearchResultType, (id: string) => string> = {
  client: (id) => `/clients/${id}`,
  appointment: (id) => `/appointments/${id}`,
  task: (id) => `/tasks/${id}`,
  note: (id) => `/notes/${id}`,
  email: (id) => `/emails/${id}`,
  goal: (id) => `/goals/${id}`,
};

const DEFAULT_SIMILARITY_THRESHOLD = 0.7;

export function resolveResultUrl(type: SearchResultType, id: string): string {
  const resolver = RESULT_ROUTE_MAP[type];
  return resolver ? resolver(id) : "/";
}

export interface SearchRequest {
  query?: unknown;
  type?: unknown;
  limit?: unknown;
}

export interface SearchResponse {
  results: SearchResult[];
  searchType: SearchKind;
  query: string;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MIN_LIMIT = 1;

const SEARCH_TYPES: readonly SearchKind[] = ["traditional", "semantic", "hybrid"] as const;

/**
 * Process search request with validation and normalization
 */
export async function processSearchRequest(
  request: SearchRequest,
  client?: ServerSupabaseClient,
): Promise<SearchResponse> {
  // Normalize and validate query
  const query = typeof request.query === "string" ? request.query.trim() : "";
  if (!query) {
    return {
      results: [],
      searchType: "hybrid",
      query: "",
    };
  }

  // Normalize and validate search type
  const requestedType = typeof request.type === "string" ? (request.type as SearchKind) : "hybrid";
  const searchType: SearchKind = SEARCH_TYPES.includes(requestedType) ? requestedType : "hybrid";

  // Normalize and validate limit
  const rawLimit = typeof request.limit === "number" ? request.limit : DEFAULT_LIMIT;
  const limit = clamp(Math.floor(rawLimit), MIN_LIMIT, MAX_LIMIT);

  // Perform search
  const results = await performSearch(query, searchType, limit, client);

  return {
    results,
    searchType,
    query,
  };
}

export async function performSearch(
  query: string,
  type: SearchKind,
  limit: number,
  client?: ServerSupabaseClient,
): Promise<SearchResult[]> {
  switch (type) {
    case "traditional":
      return searchTraditional(query, limit, client);
    case "semantic":
      return searchSemantic(query, limit, client);
    case "hybrid":
      return searchHybrid(query, limit, client);
    default:
      return searchHybrid(query, limit, client);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export async function searchTraditional(
  query: string,
  limit: number,
  client?: ServerSupabaseClient,
): Promise<SearchResult[]> {
  const supabase = client ?? getSupabaseServerClient();
  const effectiveLimit = Math.max(1, limit);
  const limitPerCollection = Math.max(1, Math.ceil(effectiveLimit / 4));
  const searchTerm = `%${query}%`;

  const [clientsResponse, appointmentsResponse, tasksResponse, notesResponse] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, email, phone, created_at")
      .or(`name.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm}`)
      .limit(limitPerCollection),
    supabase
      .from("appointments")
      .select("id, title, description, date_time, client_id, clients(name)")
      .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
      .limit(limitPerCollection),
    supabase
      .from("tasks")
      .select("id, title, description, status, due_date")
      .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
      .limit(limitPerCollection),
    supabase
      .from("notes")
      .select("id, title, content, created_at, client_id, clients(name)")
      .or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`)
      .limit(limitPerCollection),
  ]);

  if (clientsResponse.error) {
    throw new Error(`Traditional search (clients) failed: ${clientsResponse.error.message}`);
  }
  if (appointmentsResponse.error) {
    throw new Error(
      `Traditional search (appointments) failed: ${appointmentsResponse.error.message}`,
    );
  }
  if (tasksResponse.error) {
    throw new Error(`Traditional search (tasks) failed: ${tasksResponse.error.message}`);
  }
  if (notesResponse.error) {
    throw new Error(`Traditional search (notes) failed: ${notesResponse.error.message}`);
  }

  const results: SearchResult[] = [];

  for (const row of clientsResponse.data ?? []) {
    results.push(mapClientRow(row));
  }

  for (const row of appointmentsResponse.data ?? []) {
    results.push(mapAppointmentRow(row));
  }

  for (const row of tasksResponse.data ?? []) {
    results.push(mapTaskRow(row));
  }

  for (const row of notesResponse.data ?? []) {
    results.push(mapNoteRow(row));
  }

  return results.slice(0, effectiveLimit);
}

export async function searchSemantic(
  query: string,
  limit: number,
  client?: ServerSupabaseClient,
): Promise<SearchResult[]> {
  const embedding = await getOrGenerateEmbedding(query);
  return searchSemanticByEmbedding(embedding, { matchCount: limit }, client);
}

export async function searchSemanticByEmbedding(
  embedding: number[],
  options?: SemanticSearchOptions,
  client?: ServerSupabaseClient,
): Promise<SearchResult[]> {
  const supabase = client ?? getSupabaseServerClient();
  const matchCount = Math.max(1, options?.matchCount ?? 10);
  const similarityThreshold = options?.similarityThreshold ?? DEFAULT_SIMILARITY_THRESHOLD;

  const { data, error } = await supabase.rpc<SemanticSearchRow>("semantic_search", {
    query_embedding: embedding,
    similarity_threshold: similarityThreshold,
    match_count: matchCount,
  });

  if (error) {
    throw new Error(`Semantic search failed: ${error.message}`);
  }

  return (data ?? []).map(mapSemanticRow).slice(0, matchCount);
}

export async function searchHybrid(
  query: string,
  limit: number,
  client?: ServerSupabaseClient,
): Promise<SearchResult[]> {
  const supabase = client ?? getSupabaseServerClient();
  const effectiveLimit = Math.max(1, limit);
  const traditionalLimit = Math.max(1, Math.ceil(effectiveLimit * 0.6));
  const semanticLimit = Math.max(1, Math.ceil(effectiveLimit * 0.4));

  const [traditionalResults, semanticResults] = await Promise.all([
    searchTraditional(query, traditionalLimit, supabase),
    searchSemantic(query, semanticLimit, supabase),
  ]);

  const merged = new Map<string, SearchResult>();

  const addResult = (result: SearchResult) => {
    const key = `${result.type}:${result.id}`;
    merged.set(key, result);
  };

  traditionalResults.forEach((result) => {
    addResult({ ...result, score: result.score ?? 1, source: "traditional" });
  });

  semanticResults.forEach((result) => {
    const key = `${result.type}:${result.id}`;
    const existing = merged.get(key);
    const semanticScore = result.similarity ?? 0.5;

    if (existing) {
      merged.set(key, {
        ...existing,
        similarity: result.similarity ?? existing.similarity,
        score: Math.min((existing.score ?? 1) + semanticScore, 2),
        source: "hybrid",
      });
    } else {
      addResult({ ...result, score: semanticScore, source: "semantic" });
    }
  });

  return Array.from(merged.values())
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, effectiveLimit);
}

function mapClientRow(row: ClientRow): SearchResult {
  const metadata: Record<string, unknown> = {};
  if (row.email) metadata.email = row.email;
  if (row.phone) metadata.phone = row.phone;
  if (row.created_at) metadata.created = row.created_at;

  return {
    id: row.id,
    type: "client",
    title: row.name ?? "Unnamed Client",
    content: [row.email, row.phone].filter(Boolean).join(" ").trim(),
    metadata,
    url: resolveResultUrl("client", row.id),
    score: 1,
    source: "traditional",
  };
}

function mapAppointmentRow(row: AppointmentRow): SearchResult {
  const metadata: Record<string, unknown> = {};
  if (row.date_time) metadata.date = row.date_time;
  if (row.clients?.name) metadata.client = row.clients.name;

  return {
    id: row.id,
    type: "appointment",
    title: row.title ?? "Appointment",
    content: row.description ?? "",
    metadata,
    url: resolveResultUrl("appointment", row.id),
    score: 1,
    source: "traditional",
  };
}

function mapTaskRow(row: TaskRow): SearchResult {
  const metadata: Record<string, unknown> = {};
  if (row.status) metadata.status = row.status;
  if (row.due_date) metadata.due = row.due_date;

  return {
    id: row.id,
    type: "task",
    title: row.title ?? "Task",
    content: row.description ?? "",
    metadata,
    url: resolveResultUrl("task", row.id),
    score: 1,
    source: "traditional",
  };
}

function mapNoteRow(row: NoteRow): SearchResult {
  const metadata: Record<string, unknown> = {};
  if (row.clients?.name) metadata.client = row.clients.name;
  if (row.created_at) metadata.created = row.created_at;

  return {
    id: row.id,
    type: "note",
    title: row.title ?? "Note",
    content: row.content ?? "",
    metadata,
    url: resolveResultUrl("note", row.id),
    score: 1,
    source: "traditional",
  };
}

function mapSemanticRow(row: SemanticSearchRow): SearchResult {
  const type = toSearchResultType(row.content_type);
  const identifier = row.content_id ?? row.id;
  const metadata = normalizeMetadata(row.metadata);

  return {
    id: identifier,
    type,
    title: row.title ?? "Untitled",
    content: row.content ?? "",
    metadata,
    similarity: row.similarity ?? undefined,
    score: row.similarity ?? undefined,
    url: resolveResultUrl(type, identifier),
    source: "semantic",
  };
}

function toSearchResultType(value: string): SearchResultType {
  if (SEARCH_RESULT_TYPES.has(value as SearchResultType)) {
    return value as SearchResultType;
  }
  return "note";
}

function normalizeMetadata(metadata: Record<string, unknown> | null): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }
  return metadata;
}
