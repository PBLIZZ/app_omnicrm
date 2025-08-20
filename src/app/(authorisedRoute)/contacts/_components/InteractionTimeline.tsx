"use client";

import { useMemo, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
} from "@/components/ui";

type InteractionType = "email" | "call" | "meeting" | "note";

export interface InteractionItem {
  id: string;
  type: InteractionType;
  subject?: string;
  occurredAt: string; // ISO
}

interface Props {
  contactId: string;
  items?: InteractionItem[];
}

export function InteractionTimeline({ contactId, items }: Props): JSX.Element {
  const [filter, setFilter] = useState<"all" | InteractionType>("all");
  const [desc, setDesc] = useState(true);

  const data = useMemo<InteractionItem[]>(() => {
    const seed: InteractionItem[] = items ?? [
      { id: "1", type: "email", subject: "Welcome", occurredAt: new Date().toISOString() },
      {
        id: "2",
        type: "note",
        subject: "Intro call notes",
        occurredAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
    const filtered = filter === "all" ? seed : seed.filter((i) => i.type === filter);
    return filtered.sort((a, b) =>
      desc
        ? +new Date(b.occurredAt) - +new Date(a.occurredAt)
        : +new Date(a.occurredAt) - +new Date(b.occurredAt),
    );
  }, [items, filter, desc]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Interaction Timeline</CardTitle>
            <CardDescription>History for contact {contactId}</CardDescription>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center border rounded-lg p-1">
              {(
                [
                  { key: "all", label: "All" },
                  { key: "email", label: "Email" },
                  { key: "call", label: "Calls" },
                  { key: "meeting", label: "Meetings" },
                  { key: "note", label: "Notes" },
                ] as Array<{ key: "all" | InteractionType; label: string }>
              ).map((t) => (
                <Button
                  key={t.key}
                  size="sm"
                  variant={filter === t.key ? "default" : "ghost"}
                  onClick={() => setFilter(t.key)}
                  className="h-8"
                >
                  {t.label}
                </Button>
              ))}
            </div>
            <Button size="sm" variant="outline" onClick={() => setDesc((v) => !v)}>
              {desc ? "Newest" : "Oldest"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-sm text-muted-foreground">No interactions</div>
        ) : (
          <div className="space-y-4">
            {data.map((i) => (
              <div key={i.id} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium truncate">{i.subject ?? i.type}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(i.occurredAt).toLocaleDateString("en-GB")} • {i.type}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          ⋯
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem disabled>Edit</DropdownMenuItem>
                        <DropdownMenuItem disabled>Reply</DropdownMenuItem>
                        <DropdownMenuItem disabled>Copy Link</DropdownMenuItem>
                        <DropdownMenuItem disabled>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
