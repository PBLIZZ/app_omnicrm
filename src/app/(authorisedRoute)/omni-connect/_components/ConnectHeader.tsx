"use client";

import { Search, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface ConnectHeaderProps {
  onLoadInsights: () => void;
  onSearch?: (query: string) => void;
}

export function ConnectHeader({ onLoadInsights, onSearch }: ConnectHeaderProps): JSX.Element {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">OmniConnect</h1>
        <p className="text-muted-foreground">
          Gmail intelligencea and smart email digests for intelligent client your wellness practice
        </p>
      </div>
      <div className="flex items-center gap-3">
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search themes, emails, topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-64"
          />
        </form>

        {/* Insights Button */}
        {onLoadInsights && (
          <Button onClick={onLoadInsights} variant="outline">
            <Zap className="h-4 w-4 mr-2" />
            Insights
          </Button>
        )}
      </div>
    </div>
  );
}
