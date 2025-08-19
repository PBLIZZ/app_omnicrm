"use client";

import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

interface Props {
  id: string;
  displayName: string;
  primaryEmail?: string | undefined;
  primaryPhone?: string | undefined;
  onOpen?: (id: string) => void;
}

export function ContactListItem({
  id,
  displayName,
  primaryEmail,
  primaryPhone,
  onOpen,
}: Props): JSX.Element {
  return (
    <div
      className={cn(
        "flex items-center p-4 gap-3 cursor-pointer transition-colors hover:bg-muted/50",
      )}
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen?.(id);
        }
      }}
    >
      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
        {displayName.slice(0, 1)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{displayName}</div>
        <div className="text-sm text-muted-foreground truncate">
          {primaryEmail ?? primaryPhone ?? "No contact info"}
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onOpen?.(id);
        }}
      >
        Open
      </Button>
    </div>
  );
}
