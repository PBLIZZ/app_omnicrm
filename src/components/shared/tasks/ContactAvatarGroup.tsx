"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Contact {
  id: string;
  displayName: string;
}

interface ContactAvatarGroupProps {
  contacts: Contact[];
  maxDisplay?: number;
  size?: "sm" | "default" | "lg";
  showTooltip?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map(n => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function AvatarWithTooltip({ 
  contact, 
  size, 
  showTooltip 
}: { 
  contact: Contact; 
  size: "sm" | "default" | "lg";
  showTooltip: boolean;
}) {
  const sizeClass = {
    sm: "h-5 w-5",
    default: "h-6 w-6",
    lg: "h-8 w-8",
  }[size];

  const textClass = {
    sm: "text-xs",
    default: "text-xs", 
    lg: "text-sm",
  }[size];

  const avatar = (
    <Avatar className={sizeClass}>
      <AvatarFallback className={textClass}>
        {getInitials(contact.displayName)}
      </AvatarFallback>
    </Avatar>
  );

  if (!showTooltip) return avatar;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {avatar}
      </TooltipTrigger>
      <TooltipContent>
        <p>{contact.displayName}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function ContactAvatarGroup({
  contacts,
  maxDisplay = 3,
  size = "default",
  showTooltip = true,
}: ContactAvatarGroupProps) {
  if (contacts.length === 0) {
    return (
      <span className="text-muted-foreground text-xs">—</span>
    );
  }

  const displayedContacts = contacts.slice(0, maxDisplay);
  const remainingCount = contacts.length - maxDisplay;

  const TooltipWrapper = showTooltip ? TooltipProvider : "div";

  return (
    <TooltipWrapper>
      <div className="flex items-center gap-1">
        {displayedContacts.map((contact) => (
          <AvatarWithTooltip
            key={contact.id}
            contact={contact}
            size={size}
            showTooltip={showTooltip}
          />
        ))}
        
        {remainingCount > 0 && (
          <Badge variant="secondary" className="text-xs h-5 px-2">
            +{remainingCount}
          </Badge>
        )}
      </div>
    </TooltipWrapper>
  );
}