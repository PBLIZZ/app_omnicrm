"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Note } from "@/server/db/schema";

interface NotesDateIndexProps {
  notes: Note[];
  onDateClick: (date: Date) => void;
  className?: string;
}

interface DateGroup {
  date: Date;
  monthYear: string;
  count: number;
}

export function NotesDateIndex({ notes, onDateClick, className }: NotesDateIndexProps) {
  const dateGroups = useMemo(() => {
    const groups = new Map<string, DateGroup>();

    notes.forEach((note) => {
      const noteDate = new Date(note.createdAt);
      const monthYear = format(noteDate, "MMM yyyy");

      if (groups.has(monthYear)) {
        groups.get(monthYear)!.count++;
      } else {
        groups.set(monthYear, {
          date: noteDate,
          monthYear,
          count: 1,
        });
      }
    });

    // Sort by date descending (most recent first)
    return Array.from(groups.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [notes]);

  if (dateGroups.length === 0) {
    return null;
  }

  return (
    <div className={cn("w-48 border-r bg-muted/30", className)}>
      <div className="p-4 border-b">
        <h3 className="text-sm font-medium text-muted-foreground">Date Index</h3>
      </div>
      <ScrollArea className="h-full">
        <div className="p-2 space-y-1">
          {dateGroups.map((group) => (
            <Button
              key={group.monthYear}
              variant="ghost"
              size="sm"
              className="w-full justify-between text-xs"
              onClick={() => onDateClick(group.date)}
            >
              <span>{group.monthYear}</span>
              <span className="text-muted-foreground">{group.count}</span>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
