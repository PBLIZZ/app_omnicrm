"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { X, Search, Plus, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TAG_CATEGORY_TEXT_COLORS, TAG_CATEGORY_BORDER_COLORS, type TagCategory } from "@/lib/tag-categories";

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
  onCreateTag?: (name: string, category: string) => Promise<Tag>;
  title?: string;
  placeholder?: string;
}

// Tag categories from the schema
const TAG_CATEGORIES = [
  { value: "services_modalities", label: "Services & Modalities" },
  { value: "client_demographics", label: "Client Demographics" },
  { value: "schedule_attendance", label: "Schedule & Attendance" },
  { value: "health_wellness", label: "Health & Wellness" },
  { value: "marketing_engagement", label: "Marketing & Engagement" },
  { value: "emotional_mental", label: "Emotional & Mental" },
];

/**
 * Calculate fuzzy match score (0-1, higher is better)
 * Implements simple fuzzy matching with:
 * - Exact matches get highest score
 * - Case-insensitive substring matches
 * - Character-by-character matching for typos
 */
function fuzzyMatch(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  // Exact match
  if (q === t) return 1;

  // Starts with query
  if (t.startsWith(q)) return 0.9;

  // Contains query
  if (t.includes(q)) return 0.7;

  // Fuzzy character matching for typos
  let score = 0;
  let queryIndex = 0;

  for (let i = 0; i < t.length && queryIndex < q.length; i++) {
    if (t[i] === q[queryIndex]) {
      score += 1;
      queryIndex++;
    }
  }

  // If all query chars found in order, return proportional score
  if (queryIndex === q.length) {
    return 0.5 * (score / t.length);
  }

  return 0;
}

/**
 * Tag Selector Component with Enhanced Features:
 * - Fuzzy autocomplete with typo tolerance
 * - Keyboard navigation (Tab/Enter/Esc)
 * - Category selection for new tags
 * - Save/Close buttons
 * - Click outside or ESC to close
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
  placeholder = "Type to search tags...",
}: TagSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newTagCategory, setNewTagCategory] = useState("services_modalities");
  const [pendingChanges, setPendingChanges] = useState<Tag[]>(selectedTags);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Initialize pending changes when dialog opens
  useEffect(() => {
    if (open) {
      setPendingChanges(selectedTags);
      setSearchQuery("");
      setShowCategoryInput(false);
      setHighlightedIndex(0);
      // Focus input after dialog animation
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, selectedTags]);

  // Filter and sort tags with fuzzy matching
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTags([]);
      return;
    }

    const query = searchQuery.trim();

    // Score and filter tags
    const scoredTags = availableTags
      .map((tag) => ({
        tag,
        score: fuzzyMatch(query, tag.name),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5) // Show top 5 matches
      .map(({ tag }) => tag);

    setFilteredTags(scoredTags);
    setHighlightedIndex(0);
  }, [searchQuery, availableTags]);

  // Check if tag is selected in pending changes
  const isTagSelected = (tagId: string): boolean => {
    return pendingChanges.some((t) => t.id === tagId);
  };

  // Toggle tag in pending changes (not saved yet)
  const handleTagToggle = (tag: Tag): void => {
    if (isTagSelected(tag.id)) {
      setPendingChanges(pendingChanges.filter((t) => t.id !== tag.id));
    } else {
      setPendingChanges([...pendingChanges, tag]);
    }
  };

  // Remove tag from pending changes
  const handleRemoveTag = (tagId: string): void => {
    setPendingChanges(pendingChanges.filter((t) => t.id !== tagId));
  };

  // Create new tag with category
  const handleCreateTag = async (): Promise<void> => {
    if (!onCreateTag || !searchQuery.trim()) return;

    try {
      const newTag = await onCreateTag(searchQuery.trim(), newTagCategory);
      setPendingChanges([...pendingChanges, newTag]);
      setSearchQuery("");
      setShowCategoryInput(false);
    } catch (error) {
      console.error("Failed to create tag:", error);
    }
  };

  // Save changes and close
  const handleSave = (): void => {
    onTagsChange(pendingChanges);
    onOpenChange(false);
  };

  // Close without saving (revert to original)
  const handleClose = (): void => {
    setPendingChanges(selectedTags);
    onOpenChange(false);
  };

  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (!searchQuery.trim()) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => Math.min(prev + 1, filteredTags.length - 1));
        break;

      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        break;

      case "Tab":
        e.preventDefault();
        if (filteredTags.length > 0) {
          const selectedTag = filteredTags[highlightedIndex];
          if (selectedTag) {
            handleTagToggle(selectedTag);
            setSearchQuery("");
          }
        }
        break;

      case "Enter":
        e.preventDefault();
        if (filteredTags.length > 0 && highlightedIndex >= 0) {
          // Select highlighted suggestion
          const selectedTag = filteredTags[highlightedIndex];
          handleTagToggle(selectedTag);
          setSearchQuery("");
        } else if (onCreateTag && searchQuery.trim()) {
          // No matches, show category selector for new tag
          setShowCategoryInput(true);
        }
        break;

      case "Escape":
        e.preventDefault();
        if (searchQuery) {
          setSearchQuery("");
        } else {
          handleClose();
        }
        break;
    }
  };

  // Get tags to display in suggested section (frequent or relevant)
  const displayedSuggestedTags = suggestedTags.length > 0
    ? suggestedTags.filter((tag) => !isTagSelected(tag.id)).slice(0, 12)
    : availableTags.filter((tag) => !isTagSelected(tag.id)).slice(0, 12);

  // Check if exact match exists
  const hasExactMatch = filteredTags.some((tag) =>
    tag.name.toLowerCase() === searchQuery.toLowerCase()
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[550px] p-0 bg-white/95 backdrop-blur-md"
        onEscapeKeyDown={handleClose}
        onPointerDownOutside={handleClose}
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 flex flex-row items-center justify-between">
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-8 w-8 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        {/* Content */}
        <div className="px-6 pb-6 space-y-4">
          {/* Search Input with Autocomplete */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
            <Input
              ref={inputRef}
              type="text"
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10 pr-4 py-2 w-full border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              autoComplete="off"
            />

            {/* Autocomplete Dropdown */}
            {searchQuery.trim() && filteredTags.length > 0 && (
              <div
                ref={autocompleteRef}
                className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto"
              >
                {filteredTags.map((tag, index) => (
                  <div
                    key={tag.id}
                    onClick={() => {
                      handleTagToggle(tag);
                      setSearchQuery("");
                    }}
                    className={`px-4 py-2.5 cursor-pointer transition-colors flex items-center justify-between ${
                      index === highlightedIndex
                        ? "bg-blue-50 border-l-2 border-blue-500"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="font-medium">{tag.name}</span>
                      {tag.category && (
                        <span className="text-xs text-gray-500">
                          {TAG_CATEGORIES.find((c) => c.value === tag.category)?.label}
                        </span>
                      )}
                    </div>
                    {isTagSelected(tag.id) && (
                      <Check className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create New Tag with Category */}
          {onCreateTag && searchQuery.trim() && !hasExactMatch && (
            <div className="border border-dashed border-gray-300 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Plus className="w-4 h-4" />
                <span>Create new tag: <strong>{searchQuery}</strong></span>
              </div>

              {showCategoryInput && (
                <div className="space-y-2">
                  <Label htmlFor="tag-category" className="text-sm font-medium">
                    Category <span className="text-red-500">*</span>
                  </Label>
                  <Select value={newTagCategory} onValueChange={setNewTagCategory}>
                    <SelectTrigger id="tag-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TAG_CATEGORIES.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleCreateTag}
                    className="w-full"
                    size="sm"
                  >
                    Create Tag
                  </Button>
                </div>
              )}

              {!showCategoryInput && (
                <Button
                  onClick={() => setShowCategoryInput(true)}
                  variant="outline"
                  className="w-full"
                  size="sm"
                >
                  Select Category & Create
                </Button>
              )}
            </div>
          )}

          {/* Selected Tags Section */}
          {pendingChanges.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-600">
                Selected Tags ({pendingChanges.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {pendingChanges.map((tag) => {
                  // Get text and border colors based on category
                  const textColor = tag.category
                    ? TAG_CATEGORY_TEXT_COLORS[tag.category as TagCategory] || "#334155"
                    : "#334155";
                  const borderColor = tag.category
                    ? TAG_CATEGORY_BORDER_COLORS[tag.category as TagCategory] || "#cbd5e1"
                    : "#cbd5e1";

                  return (
                    <Badge
                      key={tag.id}
                      style={{
                        backgroundColor: tag.color,
                        color: textColor,
                        borderColor: borderColor,
                        borderWidth: "1px",
                        borderStyle: "solid"
                      }}
                      className="px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 rounded-full"
                    >
                      {tag.name}
                      <button
                        onClick={() => handleRemoveTag(tag.id)}
                        className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
                        aria-label={`Remove ${tag.name} tag`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {/* Suggested Tags Section */}
          {!searchQuery && displayedSuggestedTags.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-600">Suggested Tags</h3>
              <div className="flex flex-wrap gap-2">
                {displayedSuggestedTags.map((tag) => {
                  // Get text and border colors based on category
                  const textColor = tag.category
                    ? TAG_CATEGORY_TEXT_COLORS[tag.category as TagCategory] || "#334155"
                    : "#334155";
                  const borderColor = tag.category
                    ? TAG_CATEGORY_BORDER_COLORS[tag.category as TagCategory] || "#cbd5e1"
                    : "#cbd5e1";

                  return (
                    <Badge
                      key={tag.id}
                      onClick={() => handleTagToggle(tag)}
                      style={{
                        backgroundColor: isTagSelected(tag.id) ? tag.color : "#ffffff",
                        color: textColor,
                        borderColor: borderColor,
                        borderWidth: "1px",
                        borderStyle: "solid"
                      }}
                      className="cursor-pointer hover:opacity-80 transition-opacity px-3 py-1.5 text-sm font-medium rounded-full"
                    >
                      {tag.name}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              size="sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Save Tags
            </Button>
          </div>

          {/* Keyboard Hints */}
          <div className="text-xs text-gray-500 text-center pt-2 border-t">
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Tab</kbd> or{" "}
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Enter</kbd> to select •{" "}
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Esc</kbd> to close
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
