"use client";

import { useState } from "react";
import { useTags } from "@/hooks/use-tags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, X } from "lucide-react";
import { TAG_CATEGORIES, TAG_CATEGORY_COLORS, TAG_CATEGORY_BORDER_COLORS, TAG_CATEGORY_TEXT_COLORS, TAG_CATEGORY_CARD_BORDER_COLORS, type TagCategory } from "@/lib/tag-categories";
import { cn } from "@/lib/utils";

interface Tag {
  id: string;
  name: string;
  color: string;
  category?: string;
  usageCount?: number;
}


/**
 * Tag Management Settings Page - Pure DB-Driven UI
 *
 * Displays all tags from database grouped by category
 */
export default function TagsSettingsPage() {
  const { tags, createTag, deleteTag } = useTags();
  const [newTagName, setNewTagName] = useState("");
  const [creatingInCategory, setCreatingInCategory] = useState<TagCategory | null>(null);

  // Group tags by category from database
  const tagsByCategory = tags.reduce((acc, tag) => {
    const category = (tag.category as TagCategory) || "services_modalities";
    if (!acc[category]) acc[category] = [];
    acc[category].push(tag);
    return acc;
  }, {} as Record<TagCategory, Tag[]>);

  const handleCreateTag = async (category: TagCategory) => {
    if (!newTagName.trim()) return;

    // Use fixed category color from tag-categories.ts
    const categoryColor = TAG_CATEGORY_COLORS[category];

    await createTag({ name: newTagName.trim(), color: categoryColor, category });

    setNewTagName("");
    setCreatingInCategory(null);
  };

  const handleDeleteTag = async (tag: Tag) => {
    if (!confirm(`Delete tag "${tag.name}"?`)) return;
    await deleteTag(tag.id);
  };


  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-emerald-50 to-sky-50">
        <div className="container max-w-6xl mx-auto py-8 px-6">
          {/* Header */}
          <div className="mb-8 space-y-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-850 mb-2">Tag Management</h1>
              <p className="text-gray-600 text-sm max-w-3xl">
                Organize your wellness practice with meaningful labels. Adding tags to your Tasks, Contacts, Goals, and Notes helps you manage data more effectively—making it easier to search, sort, segment, and find exactly what you need when you need it.
              </p>
            </div>

            {/* Color System Explanation */}
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg max-w-3xl">
              <div className="flex items-start gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-blue-900">About Tag Colors</p>
                  <p className="text-xs text-blue-800">
                    Tag colors are chakra-aligned and fixed per category to maintain visual consistency across your wellness practice. Each category has its own unique color scheme.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tags by Category - Each in a card */}
          <div className="space-y-6">
            {Object.entries(TAG_CATEGORIES).map(([categoryKey, categoryConfig]) => {
              const categoryTags = tagsByCategory[categoryKey as TagCategory] || [];

              return (
                <div
                  key={categoryKey}
                  className="bg-gray-50 rounded-xl border-2 border-l-[6px] p-6 shadow-sm"
                  style={{
                    borderColor: TAG_CATEGORY_CARD_BORDER_COLORS[categoryKey as TagCategory],
                  }}
                >
                  {/* Category Header */}
                  <div className="flex items-center justify-between mb-5">
                    <h2
                      className="text-xl font-normal"
                      style={{
                        color: TAG_CATEGORY_TEXT_COLORS[categoryKey as TagCategory],
                      }}
                    >
                      {categoryConfig.name}
                    </h2>
                    <div className="flex items-center gap-3">
                      {/* Add Tag Button */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setCreatingInCategory(categoryKey as TagCategory)}
                            className="h-8 hover:bg-white"
                          >
                            <Plus
                              className="w-4 h-4"
                              style={{ color: TAG_CATEGORY_TEXT_COLORS[categoryKey as TagCategory] }}
                            />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Add tag</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  {/* Tag Cloud */}
                  <div className="flex flex-wrap gap-3">
                    {categoryTags.map((tag) => (
                      <div
                        key={tag.id}
                        className="group relative"
                      >
                        <button
                          className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                            "hover:shadow-lg hover:-translate-y-0.5 hover:scale-105",
                            "focus:outline-none focus:ring-2 focus:ring-offset-2",
                            "border-2"
                          )}
                          style={{
                            backgroundColor: tag.color,
                            borderColor: TAG_CATEGORY_BORDER_COLORS[categoryKey as TagCategory],
                            color: TAG_CATEGORY_TEXT_COLORS[categoryKey as TagCategory],
                          }}
                        >
                          {tag.name}
                        </button>

                        {/* Delete X - all tags can be deleted */}
                        <button
                          onClick={() => handleDeleteTag(tag)}
                          className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600 shadow-md"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {/* Inline Create Tag */}
                    {creatingInCategory === categoryKey && (
                      <div className="flex items-center gap-2 animate-in fade-in duration-200">
                        <Input
                          autoFocus
                          placeholder="Tag name..."
                          value={newTagName}
                          onChange={(e) => setNewTagName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleCreateTag(categoryKey as TagCategory);
                            } else if (e.key === "Escape") {
                              setCreatingInCategory(null);
                              setNewTagName("");
                            }
                          }}
                          className="w-48 h-10 border-2 focus:ring-2"
                          style={{
                            borderColor: TAG_CATEGORY_BORDER_COLORS[categoryKey as TagCategory],
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={() => handleCreateTag(categoryKey as TagCategory)}
                          disabled={!newTagName.trim()}
                          className="text-white"
                          style={{
                            backgroundColor: TAG_CATEGORY_TEXT_COLORS[categoryKey as TagCategory],
                          }}
                        >
                          Add
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setCreatingInCategory(null);
                            setNewTagName("");
                          }}
                          style={{
                            color: TAG_CATEGORY_TEXT_COLORS[categoryKey as TagCategory],
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
