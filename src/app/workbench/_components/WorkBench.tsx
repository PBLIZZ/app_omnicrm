// src/app/workbench/WorkBench.tsx
"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  type PromptRecord,
  type Settings,
  type VariableMap,
  compilePrompt,
  deriveTags,
  emptyPromptFields,
  loadAll,
  persistAll,
  uuid,
} from "@/lib/work-bench";
import { callLLM } from "@/lib/work-bench"; // client wrapper that hits /api/openrouter

// shadcn/ui (adjust paths if your setup differs)
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

type PromptFields = ReturnType<typeof emptyPromptFields>;
type Rating = "" | "great" | "needs_work" | "poor";
function isTemplateId(v: string): v is PromptFields["template"] {
  return ["zero", "few", "cot", "iterative", "negative", "hybrid", "chain"].includes(v);
}
function isRating(v: string): v is Exclude<Rating, ""> | "" {
  return ["", "great", "needs_work", "poor"].includes(v);
}

type FieldName =
  | "intent"
  | "role"
  | "task"
  | "context"
  | "audience"
  | "constraints"
  | "format"
  | "examples";

const templates = [
  { id: "zero", label: "Zero-Shot" },
  { id: "few", label: "Few-Shot" },
  { id: "cot", label: "Chain-of-Thought" },
  { id: "iterative", label: "Iterative" },
  { id: "negative", label: "Negative" },
  { id: "hybrid", label: "Hybrid" },
  { id: "chain", label: "Prompt Chaining" },
] as const;

export default function WorkBench() {
  const [{ prompts, varlib, settings }, setStore] = useState(loadAll);
  const [fields, setFields] = useState(emptyPromptFields());
  const [compiled, setCompiled] = useState("");
  const [testOutput, setTestOutput] = useState("");
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [onlyFav, setOnlyFav] = useState(false);
  const [rate, setRate] = useState<"" | "great" | "needs_work" | "poor">("");
  const [notes, setNotes] = useState("");

  // hydrate from localStorage once on mount
  useEffect(() => {
    const fresh = loadAll();
    setStore(fresh);
  }, []);

  // compile on change
  useEffect(() => {
    setCompiled(compilePrompt(fields));
  }, [fields]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const t = tagFilter.replace("#", "").toLowerCase();
    let items = [...prompts].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
    if (q) {
      items = items.filter(
        (p) =>
          (p.title ?? "").toLowerCase().includes(q) ||
          (p.content ?? "").toLowerCase().includes(q) ||
          (p.tags ?? []).some((x) => x.toLowerCase().includes(q)),
      );
    }
    if (t) items = items.filter((p) => (p.tags ?? []).map((x) => x.toLowerCase()).includes(t));
    if (onlyFav) items = items.filter((p) => !!p.fav);
    return items;
  }, [prompts, search, tagFilter, onlyFav]);

  // -------- Handlers
  const setField = <K extends keyof PromptFields>(key: K, value: PromptFields[K]) =>
    setFields((f) => ({ ...f, [key]: value }));

  const setVar = (name: string, value: string) =>
    setFields((f) => ({ ...f, vars: { ...f.vars, [name]: value } }));

  const removeVar = (name: string) =>
    setFields((f) => {
      const next = { ...f.vars };
      delete next[name];
      return { ...f, vars: next };
    });

  const addVar = () => {
    const key = prompt("Variable name (snake_case):");
    if (!key) return;
    setVar(key, "");
  };

  const loadVarSet = () => {
    const names = Object.keys(varlib);
    if (!names.length) {
      alert("Variable library is empty.");
      return;
    }
    const pick = prompt(`Enter variable set name:\n${names.join(", ")}`);
    if (!pick || !varlib[pick]) return;
    setFields((f) => ({ ...f, vars: { ...varlib[pick], ...f.vars } }));
  };

  const saveVarSet = () => {
    const name = prompt("Save current variables as:");
    if (!name) return;
    const next = { ...varlib, [name]: fields.vars };
    const storeNext = { prompts, varlib: next, settings };
    persistAll(storeNext);
    setStore(storeNext);
    alert("Saved variable set.");
  };

  const saveToLibrary = () => {
    const now = Date.now();
    const existingPrompt = currentId ? prompts.find((p) => p.id === currentId) : null;
    const payload: PromptRecord = {
      id: currentId ?? uuid(),
      title: fields.task?.slice(0, 80) || fields.intent?.slice(0, 80) || "Untitled",
      template: fields.template,
      intent: fields.intent,
      role: fields.role,
      task: fields.task,
      context: fields.context,
      audience: fields.audience,
      constraints: fields.constraints,
      format: fields.format,
      style: fields.style,
      tone: fields.tone,
      language: fields.language || "English",
      examples: fields.examples,
      vars: fields.vars,
      content: compiled,
      tags: deriveTags(fields),
      usageCount: 0,
      model: settings.model,
      ...(existingPrompt?.lastOutcome && { lastOutcome: existingPrompt.lastOutcome }),
      fav: false,
      createdAt: currentId ? (existingPrompt?.createdAt ?? now) : now,
      updatedAt: now,
    };

    const list = [...prompts];
    if (currentId) {
      const i = list.findIndex((p) => p.id === currentId);
      if (i >= 0) list[i] = payload;
    } else {
      list.unshift(payload);
      setCurrentId(payload.id);
    }
    const storeNext = { prompts: list, varlib, settings };
    persistAll(storeNext);
    setStore(storeNext);
    alert("Saved.");
  };

  const editPrompt = (id: string) => {
    const p = prompts.find((x) => x.id === id);
    if (!p) return;
    setFields({
      template: p.template,
      intent: p.intent,
      role: p.role,
      task: p.task,
      context: p.context,
      audience: p.audience,
      constraints: p.constraints,
      format: p.format,
      style: p.style,
      tone: p.tone,
      language: p.language,
      examples: p.examples,
      vars: p.vars ?? {},
    });
    setCurrentId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleFav = (id: string) => {
    const list = prompts.map((p) => (p.id === id ? { ...p, fav: !p.fav } : p));
    const storeNext = { prompts: list, varlib, settings };
    persistAll(storeNext);
    setStore(storeNext);
  };

  const deletePrompt = (id: string) => {
    if (!confirm("Delete this prompt?")) return;
    const list = prompts.filter((p) => p.id !== id);
    const storeNext = { prompts: list, varlib, settings };
    persistAll(storeNext);
    setStore(storeNext);
    if (currentId === id) {
      setCurrentId(null);
      setFields(emptyPromptFields());
    }
  };

  const exportAll = () => {
    const blob = new Blob([JSON.stringify(prompts, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "prompts.json";
    a.click();
  };

  const importAll = async (file: File) => {
    const text = await file.text();
    let arr: PromptRecord[];
    try {
      arr = JSON.parse(text);
    } catch {
      alert("Invalid JSON");
      return;
    }
    if (!Array.isArray(arr)) return alert("Expected an array of prompts");

    const key = (p: PromptRecord) => `${p.title ?? ""}|${p.content ?? ""}`;
    const map = new Map(prompts.map((p) => [key(p), p]));
    arr.forEach((p) =>
      map.set(key(p), {
        ...p,
        id: uuid(),
        createdAt: p.createdAt ?? Date.now(),
        updatedAt: Date.now(),
      }),
    );
    const list = Array.from(map.values());
    const storeNext = { prompts: list, varlib, settings };
    persistAll(storeNext);
    setStore(storeNext);
  };

  // -------- AI helpers
  const aiFill = async (field: FieldName) => {
    const sys = `You are an expert prompt engineer assisting a developer building a personal prompt.
Return only the content for the requested section: ${field}. Keep it concise but specific. Avoid meta explanations.`;
    const user = {
      template: fields.template,
      intent: fields.intent,
      role: fields.role,
      task: fields.task,
      context: fields.context,
      audience: fields.audience,
      constraints: fields.constraints,
      format: fields.format,
      style: fields.style,
      tone: fields.tone,
      language: fields.language,
    };
    const out = await callLLM(settings.model, [
      { role: "system", content: sys },
      {
        role: "user",
        content: `Here is what I have so far (JSON):\n${JSON.stringify(user, null, 2)}\n\nReturn only the ${field} text.`,
      },
    ]);
    const text = out.trim();
    setFields((f) => ({ ...f, [field]: text }) as typeof f);
    if (field === "intent" && !fields.task) setField("task", text);
  };

  const extractVariables = async () => {
    if (!fields.context.trim()) {
      alert("Add some context first.");
      return;
    }
    const sys =
      'Extract reusable variable placeholders from the user context. Respond as JSON: {"variables": {"var_name": "example value"}}. Use snake_case names.';
    const raw = await callLLM(settings.model, [
      { role: "system", content: sys },
      { role: "user", content: fields.context },
    ]);
    try {
      const json = JSON.parse(raw);
      const vars: VariableMap = json.variables ?? {};
      setFields((f) => ({ ...f, vars: { ...vars, ...f.vars } }));
    } catch {
      alert("Could not parse variables JSON.");
    }
  };

  const enhance = async () => {
    const sys =
      "Improve the prompt to be clearer, more specific, with crisp constraints. Return ONLY the improved prompt text.";
    const out = await callLLM(settings.model, [
      { role: "system", content: sys },
      { role: "user", content: compiled },
    ]);
    setCompiled(out.trim());
  };

  const suggestTemplate = async () => {
    if (!fields.intent.trim()) {
      alert("Add an intent first.");
      return;
    }
    const sys =
      "Choose the best prompt methodology for the user intent. Answer with one token from this set: zero|few|cot|iterative|negative|hybrid|chain.";
    const out = (
      await callLLM(settings.model, [
        { role: "system", content: sys },
        { role: "user", content: fields.intent },
      ])
    )
      .toLowerCase()
      .trim();

    const match = templates.find((t) => out.includes(t.id as string));
    setField("template", match?.id ?? "zero");
  };

  const runTest = async () => {
    setTestOutput("Running…");
    try {
      const out = await callLLM(settings.model, [
        { role: "system", content: "You are the target model. Obey the prompt as written." },
        { role: "user", content: compiled },
      ]);
      setTestOutput(out.trim());
      // record outcome, bump usage
      if (currentId) {
        const list = prompts.map((p) =>
          p.id === currentId
            ? {
                ...p,
                usageCount: (p.usageCount ?? 0) + 1,
                ...(rate
                  ? { lastOutcome: { rating: rate, notes, at: Date.now() } }
                  : p.lastOutcome
                    ? { lastOutcome: p.lastOutcome }
                    : {}),
                updatedAt: Date.now(),
              }
            : p,
        );
        const storeNext = { prompts: list, varlib, settings };
        persistAll(storeNext);
        setStore(storeNext);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Error";
      setTestOutput(message);
    }
  };

  // -------- Settings
  const setModel = (m: string) => {
    const storeNext = { prompts, varlib, settings: { ...settings, model: m } as Settings };
    persistAll(storeNext);
    setStore(storeNext);
  };
  const setUseProxy = (v: boolean) => {
    const storeNext = { prompts, varlib, settings: { ...settings, useProxy: v } as Settings };
    persistAll(storeNext);
    setStore(storeNext);
  };

  // -------- UI
  return (
    <div className="container mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Builder */}
      <div className="lg:col-span-7 space-y-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3">
            <CardTitle>Prompt Builder</CardTitle>
            <div className="flex items-center gap-2">
              <Select
                value={fields.template}
                onValueChange={(v) => {
                  if (isTemplateId(v)) setField("template", v);
                }}
              >
                <SelectTrigger className="w-[190px]">
                  <SelectValue placeholder="Template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="secondary" size="sm" onClick={suggestTemplate}>
                Suggest template
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Intent */}
            <div className="grid gap-2">
              <Label>Intent</Label>
              <div className="flex gap-2">
                <Input
                  value={fields.intent}
                  onChange={(e) => setField("intent", e.target.value)}
                  placeholder="e.g., Generate a Next.js app with Tailwind and shadcn"
                  className="flex-1"
                />
                <Button size="sm" onClick={() => aiFill("intent")}>
                  ✨ AI
                </Button>
              </div>
            </div>

            {/* Role / Task / Context / Audience / Constraints / Format */}
            {(
              [
                ["role", "Role", "You are a senior full-stack engineer…"],
                ["task", "Task", "Clearly describe what the model should do…"],
                ["context", "Context", "Background, constraints, repos, brand voice…"],
                ["audience", "Audience", "Wellness solopreneurs, non-admin developers"],
                ["constraints", "Constraints", "Must be TypeScript-strict, avoid any…"],
                ["format", "Output Format", "JSON schema, Markdown structure, file tree…"],
              ] as const
            ).map(([k, label, ph]) => (
              <div key={k} className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>{label}</Label>
                  <div className="flex gap-2">
                    {k === "context" && (
                      <Button variant="secondary" size="sm" onClick={extractVariables}>
                        ▣ Extract variables
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" onClick={() => aiFill(k as FieldName)}>
                      ✨ AI
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={fields[k]}
                  onChange={(e) => setField(k, e.target.value)}
                  rows={k === "task" || k === "context" ? 4 : 3}
                  placeholder={ph}
                />
              </div>
            ))}

            {/* Style / Tone / Language */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="grid gap-2">
                <Label>Style</Label>
                <Input
                  value={fields.style}
                  onChange={(e) => setField("style", e.target.value)}
                  placeholder="Linear/Notion vibe, concise"
                />
              </div>
              <div className="grid gap-2">
                <Label>Tone</Label>
                <Input
                  value={fields.tone}
                  onChange={(e) => setField("tone", e.target.value)}
                  placeholder="professional, practical"
                />
              </div>
              <div className="grid gap-2">
                <Label>Language</Label>
                <Input
                  value={fields.language}
                  onChange={(e) => setField("language", e.target.value)}
                  placeholder="English"
                />
              </div>
            </div>

            {/* Few-shot */}
            {(fields.template === "few" || fields.template === "hybrid") && (
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Few-Shot Examples</Label>
                  <Button size="sm" variant="secondary" onClick={() => aiFill("examples")}>
                    ✨ AI
                  </Button>
                </div>
                <Textarea
                  value={fields.examples}
                  onChange={(e) => setField("examples", e.target.value)}
                  rows={4}
                  placeholder={`Example pairs. Use delimiter \\n---\\n between examples.`}
                />
              </div>
            )}

            <Separator />

            {/* Variables */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Variables</h3>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={addVar}>
                    + Add
                  </Button>
                  <Button size="sm" variant="secondary" onClick={loadVarSet}>
                    Load from library
                  </Button>
                  <Button size="sm" variant="secondary" onClick={saveVarSet}>
                    Save to library
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                {Object.entries(fields.vars).length === 0 && (
                  <p className="text-sm text-muted-foreground">No variables yet.</p>
                )}
                {Object.entries(fields.vars).map(([name, value]) => (
                  <div key={name} className="grid grid-cols-12 gap-2 items-center">
                    <Input
                      className="col-span-4"
                      value={name}
                      readOnly
                      aria-label="variable name"
                    />
                    <Input
                      className="col-span-7"
                      value={value}
                      onChange={(e) => setVar(name, e.target.value)}
                      aria-label="variable value"
                    />
                    <Button
                      className="col-span-1"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeVar(name)}
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button onClick={enhance}>✨ Enhance Prompt</Button>
              <Button variant="secondary" onClick={() => setCompiled(compilePrompt(fields))}>
                Compile
              </Button>
              <Button onClick={runTest}>Run Test</Button>
              <Button variant="default" onClick={saveToLibrary}>
                Save to Library
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Compiled & Test */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Compiled Prompt</CardTitle>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  navigator.clipboard.writeText(compiled);
                }}
              >
                Copy
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-60">
                <pre className="text-sm whitespace-pre-wrap">{compiled}</pre>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2">
              <CardTitle>Test Output</CardTitle>
              <div className="flex items-center gap-2">
                <Select
                  value={rate}
                  onValueChange={(v) => {
                    setRate(isRating(v) ? v : "");
                  }}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Rate…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="great">✅ Great</SelectItem>
                    <SelectItem value="needs_work">⚠️ Needs work</SelectItem>
                    <SelectItem value="poor">❌ Poor</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Outcome notes…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-48"
                />
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-60">
                <pre className="text-sm whitespace-pre-wrap">{testOutput}</pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Library */}
      <div className="lg:col-span-5 space-y-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3">
            <CardTitle>Prompt Library</CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={exportAll}>
                Export JSON
              </Button>
              <Label
                className="text-sm px-3 py-2 rounded-md border cursor-pointer"
                htmlFor="import-file"
              >
                Import JSON
              </Label>
              <input
                id="import-file"
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importAll(f);
                  e.currentTarget.value = "";
                }}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Search prompts…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="#tag…"
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="w-36"
              />
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border">
                <Label htmlFor="favs" className="cursor-pointer">
                  Favs
                </Label>
                <Switch id="favs" checked={onlyFav} onCheckedChange={setOnlyFav} />
              </div>
            </div>

            <Separator />
            <ScrollArea className="h-[600px] pr-2">
              <div className="grid gap-2">
                {filtered.length === 0 && (
                  <p className="text-sm text-muted-foreground">No prompts yet.</p>
                )}
                {filtered.map((p) => (
                  <Card key={p.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold truncate">
                              {p.title ?? "Untitled prompt"}
                            </h4>
                            {p.fav && <Badge variant="secondary">★</Badge>}
                            {p.template && <Badge variant="outline">{p.template}</Badge>}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                            {p.content.slice(0, 180)}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {(p.tags ?? []).map((t) => (
                              <Badge key={t} variant="outline">
                                #{t}
                              </Badge>
                            ))}
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            Used {p.usageCount ?? 0}× {p.model ? `· ${p.model}` : ""}{" "}
                            {p.lastOutcome ? `· ${p.lastOutcome.rating}` : ""}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          <Button size="sm" variant="secondary" onClick={() => editPrompt(p.id)}>
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant={p.fav ? "default" : "secondary"}
                            onClick={() => toggleFav(p.id)}
                          >
                            {p.fav ? "Unfav" : "Fav"}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deletePrompt(p.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Model & Proxy</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Select value={settings.model} onValueChange={(v) => setModel(v)}>
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openrouter/auto">openrouter/auto</SelectItem>
                <SelectItem value="openai/gpt-4o-mini">openai/gpt-4o-mini</SelectItem>
                <SelectItem value="openai/gpt-4o">openai/gpt-4o</SelectItem>
                <SelectItem value="anthropic/claude-3.5-sonnet">
                  anthropic/claude-3.5-sonnet
                </SelectItem>
                <SelectItem value="google/gemini-1.5-pro">google/gemini-1.5-pro</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 px-3 py-2 rounded-md border">
              <Label htmlFor="proxy">Use server proxy</Label>
              <Switch id="proxy" checked={settings.useProxy} onCheckedChange={setUseProxy} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
