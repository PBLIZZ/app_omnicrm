"use client";

import { useState, useEffect } from "react";
import { X, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Tag {
  id: string;
  name: string;
  color: string;
  category?: string;
}

interface TagSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTags: Tag[];
  availableTags: Tag[];
  suggestedTags?: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  onCreateTag?: (name: string) => Promise<Tag>;
  title?: string;
  placeholder?: string;
}

/**
 * Tag Selector Component
 * 
 * Matches the design from the provided image:
 * - Modal dialog with "Add Tags" title
 * - Search input at top
 * - "Suggested Tags" section with colored badges
 * - Selected tags shown as badges with remove button
 * - Clean, modern UI with proper spacing
 */
export function TagSelector({
  open,
  onOpenChange,
  selectedTags,
  availableTags,
  suggestedTags = [],
  onTagsChange,
  onCreateTag,
  title = "Add Tags",
  placeholder = "Type to add tags...",
}: TagSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);

  // Filter tags based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTags(availableTags);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = availableTags.filter((tag) =>
      tag.name.toLowerCase().includes(query)
    );
    setFilteredTags(filtered);
  }, [searchQuery, availableTags]);

  // Check if tag is selected
  const isTagSelected = (tagId: string): boolean => {
    return selectedTags.some((t) => t.id === tagId);
  };

  // Toggle tag selection
  const handleTagClick = (tag: Tag): void => {
    if (isTagSelected(tag.id)) {
      // Remove tag
      onTagsChange(selectedTags.filter((t) => t.id !== tag.id));
    } else {
      // Add tag
      onTagsChange([...selectedTags, tag]);
    }
  };

  // Remove tag
  const handleRemoveTag = (tagId: string): void => {
    onTagsChange(selectedTags.filter((t) => t.id !== tagId));
  };

  // Create new tag from search query
  const handleCreateTag = async (): Promise<void> => {
    if (!onCreateTag || !searchQuery.trim()) return;

    try {
      const newTag = await onCreateTag(searchQuery.trim());
      onTagsChange([...selectedTags, newTag]);
      setSearchQuery("");
    } catch (error) {
      console.error("Failed to create tag:", error);
    }
  };

  // Get tags to display in suggested section
  const displayedSuggestedTags = suggestedTags.length > 0 ? suggestedTags : filteredTags.slice(0, 12);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 bg-white/95 backdrop-blur-md">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
        </DialogHeader>

        {/* Content */}
        <div className="px-6 pb-6 space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && onCreateTag && searchQuery.trim()) {
                  handleCreateTag();
                }
              }}
              className="pl-10 pr-4 py-2 w-full border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Suggested Tags Section */}
          {displayedSuggestedTags.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-600">Suggested Tags</h3>
              <div className="flex flex-wrap gap-2">
                {displayedSuggestedTags.map((tag) => (
                  <Badge
                    key={tag.id}
                    onClick={() => handleTagClick(tag)}
                    style={{
                      backgroundColor: isTagSelected(tag.id) ? tag.color : `${tag.color}20`,
                      color: isTagSelected(tag.id) ? "#ffffff" : tag.color,
                      borderColor: tag.color,
                    }}
                    className="cursor-pointer hover:opacity-80 transition-opacity border px-3 py-1.5 text-sm font-medium rounded-full"
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Selected Tags Section */}
          {selectedTags.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-600">Selected Tags</h3>
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                  <Badge
                    key={tag.id}
                    style={{
                      backgroundColor: tag.color,
                      color: "#ffffff",
                    }}
                    className="px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 rounded-full"
                  >
                    {tag.name}
                    <button
                      onClick={() => handleRemoveTag(tag.id)}
                      className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                      aria-label={`Remove ${tag.name} tag`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Create New Tag Button (if search query doesn't match existing) */}
          {onCreateTag && searchQuery.trim() && filteredTags.length === 0 && (
            <Button
              onClick={handleCreateTag}
              variant="outline"
              className="w-full"
            >
              Create tag "{searchQuery}"
            </Button>
          )}

          {/* No Results Message */}
          {searchQuery.trim() && filteredTags.length === 0 && !onCreateTag && (
            <p className="text-sm text-gray-500 text-center py-4">
              No tags found matching "{searchQuery}"
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
