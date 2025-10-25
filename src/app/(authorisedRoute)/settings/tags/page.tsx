"use client";

import { useState } from "react";
import { useTags } from "@/hooks/use-tags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, X, Palette } from "lucide-react";
import { TAG_CATEGORIES, TAG_CATEGORY_BORDER_COLORS, TAG_CATEGORY_TEXT_COLORS, TAG_CATEGORY_CARD_BORDER_COLORS, type TagCategory } from "@/lib/tag-categories";
import { cn } from "@/lib/utils";

interface Tag {
  id: string;
  name: string;
  color: string;
  category?: string;
  usageCount?: number;
}

const PRESET_COLORS = [
  { hex: "#f5f3ff", name: "Violet Mist" },
  { hex: "#f0f9ff", name: "Sky Light" },
  { hex: "#f0fdfa", name: "Teal Breeze" },
  { hex: "#fefce8", name: "Sunlit Yellow" },
  { hex: "#ffedd5", name: "Warm Orange" },
  { hex: "#fff1f2", name: "Rose Petal" },
  { hex: "#ecfdf5", name: "Emerald Glow" },
  { hex: "#f8fafc", name: "Soft Slate" },
  { hex: "#fdf2f8", name: "Pink Blush" },
  { hex: "#eef2ff", name: "Indigo Dream" },
];

/**
 * Tag Management Settings Page - Pure DB-Driven UI
 *
 * Displays all tags from database grouped by category
 */
export default function TagsSettingsPage() {
  const { tags, createTag, updateTag, deleteTag } = useTags();
  const [newTagName, setNewTagName] = useState("");
  const [creatingInCategory, setCreatingInCategory] = useState<TagCategory | null>(null);
  const [openPopover, setOpenPopover] = useState<string | null>(null);

  // Group tags by category from database
  const tagsByCategory = tags.reduce((acc, tag) => {
    const category = (tag.category as TagCategory) || "services_modalities";
    if (!acc[category]) acc[category] = [];
    acc[category].push(tag);
    return acc;
  }, {} as Record<TagCategory, Tag[]>);

  const handleCreateTag = async (category: TagCategory) => {
    if (!newTagName.trim()) return;

    // Get the first tag in this category to use its color, or use default
    const existingTagsInCategory = tagsByCategory[category];
    const firstColor = PRESET_COLORS[0];
    if (!firstColor) return; // Safety check, should never happen
    const defaultColor = existingTagsInCategory?.[0]?.color ?? firstColor.hex;

    await createTag({ name: newTagName.trim(), color: defaultColor, category });

    setNewTagName("");
    setCreatingInCategory(null);
  };

  const handleDeleteTag = async (tag: Tag) => {
    if (!confirm(`Delete tag "${tag.name}"?`)) return;
    await deleteTag(tag.id);
  };

  const handleUpdateCategoryColor = async (category: TagCategory, color: string) => {
    // Update all tags in this category to the new color
    const tagsInCategory = tagsByCategory[category] || [];

    // Update tags sequentially to avoid race conditions
    for (const tag of tagsInCategory) {
      await updateTag(tag.id, { color });
    }

    // Close the popover after updating
    setOpenPopover(null);
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
                <Palette className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-blue-900">About Tag Colors</p>
                  <p className="text-xs text-blue-800">
                    You can customize the <strong>background color</strong> of tags in each category. The border colors and text colors are chakra-aligned and fixed per category to maintain visual consistency across your wellness practice.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tags by Category - Each in a card */}
          <div className="space-y-6">
            {Object.entries(TAG_CATEGORIES).map(([categoryKey, categoryConfig]) => {
              const categoryTags = tagsByCategory[categoryKey as TagCategory] || [];
              // Get the current color from the first tag in category, or use default
              const firstPresetColor = PRESET_COLORS[0];
              if (!firstPresetColor) return null;
              const currentCategoryColor = categoryTags[0]?.color || firstPresetColor.hex;

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
                      {/* Color Picker */}
                      <Popover
                        open={openPopover === categoryKey}
                        onOpenChange={(open) => setOpenPopover(open ? categoryKey : null)}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <PopoverTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 gap-2 hover:bg-white"
                              >
                                <Palette
                                  className="w-4 h-4"
                                  style={{ color: TAG_CATEGORY_TEXT_COLORS[categoryKey as TagCategory] }}
                                />
                                <div
                                  className="w-5 h-5 rounded-full border-2 border-gray-300"
                                  style={{ backgroundColor: currentCategoryColor }}
                                />
                              </Button>
                            </PopoverTrigger>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Change category color</p>
                          </TooltipContent>
                        </Tooltip>
                        <PopoverContent className="w-auto p-4">
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold">Category Color</p>
                              <p className="text-xs text-gray-500">
                                Note: Border and text colors are fixed per category
                              </p>
                            </div>
                            <div className="grid grid-cols-5 gap-2">
                              {PRESET_COLORS.map((colorObj) => (
                                <Tooltip key={colorObj.hex}>
                                  <TooltipTrigger asChild>
                                    <button
                                      className={cn(
                                        "w-10 h-10 rounded-full border-2 transition-all hover:scale-110",
                                        currentCategoryColor === colorObj.hex
                                          ? "border-gray-900 ring-2 ring-gray-300"
                                          : "border-gray-200 hover:border-gray-400"
                                      )}
                                      style={{ backgroundColor: colorObj.hex }}
                                      onClick={() => handleUpdateCategoryColor(categoryKey as TagCategory, colorObj.hex)}
                                    />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{colorObj.name}</p>
                                  </TooltipContent>
                                </Tooltip>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>

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
