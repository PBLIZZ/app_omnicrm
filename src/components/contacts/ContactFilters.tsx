"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export type ContactFiltersState = {
  recentlyActive: boolean;
  hasEmail: boolean;
  hasPhone: boolean;
  needsFollowup: boolean;
  sources: string[];
  dateRange: "any" | "today" | "week" | "month" | "quarter" | "year" | "custom";
  aiInsights: {
    highPriority: boolean;
    atRisk: boolean;
    strongRelation: boolean;
  };
};

interface Props {
  filters: ContactFiltersState;
  onChange: (next: ContactFiltersState) => void;
  className?: string;
}

export function ContactFilters({ filters, onChange, className }: Props) {
  function toggle<K extends keyof ContactFiltersState>(key: K) {
    return (value: boolean) => onChange({ ...filters, [key]: value } as ContactFiltersState);
  }

  function toggleSource(source: string, value: boolean) {
    const next = value
      ? Array.from(new Set([...(filters.sources || []), source]))
      : (filters.sources || []).filter((s) => s !== source);
    onChange({ ...filters, sources: next });
  }

  return (
    <div className={className}>
      <div className="p-4 space-y-6">
        <div>
          <h3 className="font-medium mb-3">Filter Contacts</h3>
          <div className="space-y-3">
            <ToggleRow
              label="Recently active"
              checked={filters.recentlyActive}
              onCheckedChange={toggle("recentlyActive")}
            />
            <ToggleRow
              label="Has email"
              checked={filters.hasEmail}
              onCheckedChange={toggle("hasEmail")}
            />
            <ToggleRow
              label="Has phone"
              checked={filters.hasPhone}
              onCheckedChange={toggle("hasPhone")}
            />
            <ToggleRow
              label="Needs follow-up"
              checked={filters.needsFollowup}
              onCheckedChange={toggle("needsFollowup")}
            />
          </div>
        </div>

        <div>
          <h4 className="font-medium text-sm mb-2">Source</h4>
          <div className="space-y-2">
            {["gmail_import", "manual", "upload", "calendar_sync"].map((s) => (
              <ToggleRow
                key={s}
                label={formatSource(s)}
                checked={(filters.sources || []).includes(s)}
                onCheckedChange={(v) => toggleSource(s, v)}
              />
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-medium text-sm mb-2">Last Contact</h4>
          <Select
            value={filters.dateRange}
            onValueChange={(v) =>
              onChange({ ...filters, dateRange: v as ContactFiltersState["dateRange"] })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Any time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This week</SelectItem>
              <SelectItem value="month">This month</SelectItem>
              <SelectItem value="quarter">Last 3 months</SelectItem>
              <SelectItem value="year">This year</SelectItem>
              <SelectItem value="custom">Custom…</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <h4 className="font-medium text-sm mb-2">AI Insights</h4>
          <div className="space-y-2">
            <ToggleRow
              label="High priority"
              checked={filters.aiInsights.highPriority}
              onCheckedChange={(v) =>
                onChange({ ...filters, aiInsights: { ...filters.aiInsights, highPriority: v } })
              }
            />
            <ToggleRow
              label="At risk"
              checked={filters.aiInsights.atRisk}
              onCheckedChange={(v) =>
                onChange({ ...filters, aiInsights: { ...filters.aiInsights, atRisk: v } })
              }
            />
            <ToggleRow
              label="Strong relationship"
              checked={filters.aiInsights.strongRelation}
              onCheckedChange={(v) =>
                onChange({ ...filters, aiInsights: { ...filters.aiInsights, strongRelation: v } })
              }
            />
          </div>
        </div>

        <div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onChange(defaultFilters())}
          >
            Clear Filters
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatSource(source: string): string {
  if (source === "gmail_import") return "Gmail Import";
  if (source === "calendar_sync") return "Calendar Sync";
  return source[0]?.toUpperCase() + source.slice(1);
}

export function defaultFilters(): ContactFiltersState {
  return {
    recentlyActive: false,
    hasEmail: false,
    hasPhone: false,
    needsFollowup: false,
    sources: [],
    dateRange: "any",
    aiInsights: { highPriority: false, atRisk: false, strongRelation: false },
  };
}

interface ToggleRowProps {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function ToggleRow({ label, checked, onCheckedChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm">{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
