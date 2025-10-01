"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Filter } from "lucide-react";
import { CONTACT_STAGES } from "@/constants/contactStages";
import type { ContactSearchFilters } from "./types";

interface ContactFilterDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  filters: ContactSearchFilters;
  onFiltersChange: (filters: ContactSearchFilters) => void;
  activeFiltersCount: number;
  onClearAll: () => void;
}

export function ContactFilterDialog({
  isOpen,
  onOpenChange,
  filters,
  onFiltersChange,
  activeFiltersCount,
  onClearAll,
}: ContactFilterDialogProps) {
  const [localFilters, setLocalFilters] = useState<ContactSearchFilters>(filters);

  // Sync local filters with parent filters when they change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleStageChange = (stage: string, checked: boolean) => {
    const currentStages = localFilters.stage ?? [];
    const newStages = checked
      ? [...currentStages, stage]
      : currentStages.filter((s: string) => s !== stage);

    const updatedFilters: ContactSearchFilters = { ...localFilters };
    if (newStages.length > 0) {
      updatedFilters.stage = newStages;
    } else {
      delete updatedFilters.stage;
    }
    setLocalFilters(updatedFilters);
  };

  const handleSourceChange = (source: string, checked: boolean) => {
    const currentSources = localFilters.source ?? [];
    const newSources = checked
      ? [...currentSources, source]
      : currentSources.filter((s: string) => s !== source);

    const updatedFilters: ContactSearchFilters = { ...localFilters };
    if (newSources.length > 0) {
      updatedFilters.source = newSources;
    } else {
      delete updatedFilters.source;
    }
    setLocalFilters(updatedFilters);
  };

  const handleDataPresenceChange = (
    field: keyof Pick<ContactSearchFilters, "hasNotes">,
    checked: boolean,
  ) => {
    setLocalFilters({
      ...localFilters,
      [field]: checked || undefined,
    });
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    onOpenChange(false);
  };

  const handleClearAll = () => {
    setLocalFilters({});
    onClearAll();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          Filter
          {activeFiltersCount > 0 && (
            <Badge
              variant="destructive"
              className="ml-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Filter Clients</span>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="text-muted-foreground hover:text-foreground"
              >
                Clear all
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Stage filter */}
          <div className="space-y-2">
            <Label>Contact Stage</Label>
            <div className="grid grid-cols-2 gap-2">
              {CONTACT_STAGES.map((stage) => (
                <div key={stage} className="flex items-center space-x-2">
                  <Checkbox
                    id={`stage-${stage}`}
                    checked={localFilters.stage?.includes(stage) ?? false}
                    onCheckedChange={(checked) => handleStageChange(stage, checked as boolean)}
                  />
                  <Label htmlFor={`stage-${stage}`} className="text-sm">
                    {stage}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Source filter */}
          <div className="space-y-2">
            <Label>Source</Label>
            <div className="grid grid-cols-2 gap-2">
              {["manual", "gmail_import", "upload", "calendar_import"].map((source) => (
                <div key={source} className="flex items-center space-x-2">
                  <Checkbox
                    id={`source-${source}`}
                    checked={localFilters.source?.includes(source) ?? false}
                    onCheckedChange={(checked) => handleSourceChange(source, checked as boolean)}
                  />
                  <Label htmlFor={`source-${source}`} className="text-sm capitalize">
                    {source.replaceAll("_", " ")}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Data presence filters */}
          <div className="space-y-2">
            <Label>Data Presence</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has-notes"
                  checked={localFilters.hasNotes ?? false}
                  onCheckedChange={(checked) =>
                    handleDataPresenceChange("hasNotes", checked as boolean)
                  }
                />
                <Label htmlFor="has-notes" className="text-sm">
                  Has Notes
                </Label>
              </div>
            </div>
          </div>

          {/* Apply button */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply}>Apply Filters</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
