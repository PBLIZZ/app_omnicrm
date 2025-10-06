"use client";

import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AvatarImage } from "@/components/ui/avatar-image";
import {
  Clock,
  Calendar,
  Edit,
  Trash2,
  NotebookPen,
  Mail,
  Phone,
} from "lucide-react";
import type { ContactWithNotes } from "@/server/db/schema";

interface ContactHeaderProps {
  contact: ContactWithNotes;
  lastInteraction: { date: Date; type: string } | null;
  nextEvent: { date: Date } | null;
  onEdit: () => void;
  onDelete: () => void;
  onAddNote: () => void;
}

export function ContactHeader({
  contact,
  lastInteraction,
  nextEvent,
  onEdit,
  onDelete,
  onAddNote,
}: ContactHeaderProps): JSX.Element {
  return (
    <div className="border-b pb-6 mb-6">
      <div className="flex items-start justify-between gap-6">
        {/* Left: Photo + Name + Metadata */}
        <div className="flex items-start gap-6 flex-1">
          <AvatarImage
            src={contact.photoUrl}
            alt={contact.displayName}
            size="xl"
            className="h-24 w-24"
          />
          <div className="flex-1 space-y-3">
            {/* Name */}
            <h1 className="text-3xl font-bold tracking-tight">{contact.displayName}</h1>

            {/* Quick Contact Info */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              {contact.primaryEmail && (
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="truncate max-w-[200px]">{contact.primaryEmail}</span>
                </div>
              )}
              {contact.primaryPhone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{contact.primaryPhone}</span>
                </div>
              )}
            </div>

            {/* Timeline Signals */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              {lastInteraction && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    Last contact: {formatDistanceToNow(lastInteraction.date, { addSuffix: true })}
                  </span>
                </div>
              )}
              {nextEvent && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Next: {formatDistanceToNow(nextEvent.date, { addSuffix: false })}</span>
                </div>
              )}
              {!lastInteraction && !nextEvent && contact.createdAt && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Added {new Date(contact.createdAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {/* Tags + Lifecycle Stage + Referral Source */}
            <div className="flex flex-wrap items-center gap-2">
              {contact.lifecycleStage && (
                <Badge variant="secondary" className="text-xs font-medium">
                  {contact.lifecycleStage}
                </Badge>
              )}
              {contact.referralSource && (
                <Badge variant="outline" className="text-xs">
                  Referred by: {contact.referralSource}
                </Badge>
              )}
              {contact.tags && Array.isArray(contact.tags) && contact.tags.length > 0 && (
                <>
                  {(contact.tags as string[]).map((tag: string, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onAddNote}>
              <NotebookPen className="h-4 w-4 mr-2" />
              Add Note
            </Button>
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="h-3.5 w-3.5 mr-1.5" />
              Edit
            </Button>
            <Button variant="destructive" size="sm" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
