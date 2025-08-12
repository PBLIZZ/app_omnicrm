// src/lib/work-bench.ts
export type VariableMap = Record<string, string>;

export type TemplateId = "zero" | "few" | "cot" | "iterative" | "negative" | "hybrid" | "chain";

export type Outcome = { rating: "great" | "needs_work" | "poor"; notes?: string; at: number };

export type PromptRecord = {
  id: string;
  title: string;
  template: TemplateId;
  intent: string;
  role: string;
  task: string;
  context: string;
  audience: string;
  constraints: string;
  format: string;
  style: string;
  tone: string;
  language: string;
  examples: string;
  vars: VariableMap;
  content: string;
  tags: string[];
  usageCount: number;
  model: string;
  lastOutcome?: Outcome;
  fav: boolean;
  createdAt: number;
  updatedAt: number;
};

export type Settings = {
  model: string;
  useProxy: boolean;
};

export type StoreShape = {
  prompts: PromptRecord[];
  varlib: Record<string, VariableMap>;
  settings: Settings;
};

const LS = {
  PROMPTS: "promptWorkbench.prompts",
  VARLIB: "promptWorkbench.varlib",
  SETTINGS: "promptWorkbench.settings",
};

export const emptyPromptFields = () => ({
  template: "zero" as TemplateId,
  intent: "",
  role: "",
  task: "",
  context: "",
  audience: "",
  constraints: "",
  format: "",
  style: "",
  tone: "",
  language: "English",
  examples: "",
  vars: {} as VariableMap,
});

export function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// -------- Storage (client-safe)
const isBrowser = typeof window !== "undefined";

export function loadAll(): StoreShape {
  const prompts = isBrowser ? JSON.parse(localStorage.getItem(LS.PROMPTS) || "[]") : [];
  const varlib = isBrowser ? JSON.parse(localStorage.getItem(LS.VARLIB) || "{}") : {};
  const settings = isBrowser
    ? JSON.parse(localStorage.getItem(LS.SETTINGS) || '{"model":"openrouter/auto","useProxy":true}')
    : { model: "openrouter/auto", useProxy: true };
  return { prompts, varlib, settings };
}

export function persistAll(store: StoreShape) {
  if (!isBrowser) return;
  localStorage.setItem(LS.PROMPTS, JSON.stringify(store.prompts));
  localStorage.setItem(LS.VARLIB, JSON.stringify(store.varlib));
  localStorage.setItem(LS.SETTINGS, JSON.stringify(store.settings));
}

// -------- Prompt compiler
function applyVars(text: string, vars: VariableMap) {
  return text.replace(/\{\{(.*?)\}\}/g, (_, k) => vars[k.trim()] ?? `{{${k}}}`);
}

export function compilePrompt(f: ReturnType<typeof emptyPromptFields>) {
  const vars = f.vars || {};
  const block = (name: string, body?: string) =>
    body?.trim() ? `# ${name}\n${applyVars(body.trim(), vars)}\n\n` : "";

  let preface = "";
  if (f.template === "cot") preface = "Use clear step-by-step reasoning before final answer.\n\n";
  if (f.template === "iterative")
    preface = "Ask 3 clarifying questions first if needed, then proceed.\n\n";
  if (f.template === "negative")
    preface = 'Avoid vague generalities, avoid hallucinations, avoid "as an AI".\n\n';

  let few = "";
  if (f.template === "few" || f.template === "hybrid") {
    if (f.examples?.trim()) {
      const parts = f.examples
        .split(/\n---\n/g)
        .map((s) => s.trim())
        .filter(Boolean);
      few = parts.map((p, i) => `## Example ${i + 1}\n${applyVars(p, vars)}`).join("\n\n") + "\n\n";
    }
  }

  const styleLine =
    f.style || f.tone || f.language
      ? (f.style ? `${f.style}; ` : "") +
        (f.tone ? `Tone: ${f.tone}; ` : "") +
        (f.language ? `Language: ${f.language}` : "")
      : "";

  const out = [
    block("Role", f.role),
    block("Task", f.task || f.intent),
    block("Context", f.context),
    block("Audience", f.audience),
    block("Constraints", f.constraints),
    block("Output Format", f.format),
    block("Style", styleLine.trim()),
    preface ? `# Guidance\n${preface}\n` : "",
    few ? `# Few-Shot\n${few}` : "",
  ]
    .filter(Boolean)
    .join("");

  return out.trim();
}

export function deriveTags(f: ReturnType<typeof emptyPromptFields>) {
  const auto: string[] = [];
  if (f.template) auto.push(f.template);
  if ((f.task || "").match(/next\.js|react|typescript|tailwind/i)) auto.push("dev");
  if ((f.audience || "").match(/wellness|yoga|massage/i)) auto.push("wellness");
  return Array.from(new Set(auto));
}

// -------- LLM client (browser → Next route)
type Msg = { role: "system" | "user" | "assistant"; content: string };

export async function callLLM(
  model: string,
  messages: Msg[],
  opts?: { json?: boolean; temperature?: number },
) {
  const body = {
    model,
    messages,
    ...(opts?.json ? { response_format: { type: "json_object" } } : {}),
    temperature: opts?.temperature ?? 0.3,
  };
  const res = await fetch("/api/openrouter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`LLM error ${res.status}: ${t}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || "";
  return text as string;
}
