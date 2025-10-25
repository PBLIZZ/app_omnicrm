"use client";

import { TagSelector } from "@/components/TagSelector";
import { Badge } from "@/components/ui/badge";
import { useTags } from "@/hooks/use-tags";
import { TAG_CATEGORY_COLORS, TAG_CATEGORY_BORDER_COLORS, TAG_CATEGORY_TEXT_COLORS, type TagCategory } from "@/lib/tag-categories";

interface Tag {
  id: string;
  name: string;
  color: string;
  category?: string;
}

interface TagManagerProps {
  /** Current tags on the entity */
  tags: Tag[];
  /** Type of entity (task, note, goal, contact) */
  entityType: "task" | "note" | "goal" | "contact";
  /** ID of the entity */
  entityId: string;
  /** Maximum number of tags to show before "+X more" */
  maxVisible?: number;
  /** Callback when tags modal is opened (optional) */
  onOpenModal?: () => void;
  /** Show the tag selector modal */
  showModal: boolean;
  /** Callback to control modal visibility */
  onModalChange: (open: boolean) => void;
}


/**
 * TagManager - Reusable component for managing tags on any entity
 * 
 * Used across tasks, notes, goals, and contacts.
 * Handles tag display, selection, creation, and persistence.
 * 
 * @example
 * ```tsx
 * const [showTagModal, setShowTagModal] = useState(false);
 * 
 * <TagManager
 *   tags={task.tags}
 *   entityType="task"
 *   entityId={task.id}
 *   showModal={showTagModal}
 *   onModalChange={setShowTagModal}
 * />
 * ```
 */
export function TagManager({
  tags,
  entityType,
  entityId,
  maxVisible = 3,
  onOpenModal,
  showModal,
  onModalChange,
}: TagManagerProps) {
  const { tags: allTags, createTag, applyTagsToTask, applyTagsToNote, applyTagsToGoal, applyTagsToContact } = useTags();

  // Visible tags (max 3 by default)
  const visibleTags = tags.slice(0, maxVisible);
  const hiddenTagsCount = Math.max(0, tags.length - maxVisible);

  // Get the appropriate apply function based on entity type
  const applyTags = async (newTags: Tag[]) => {
    const tagIds = newTags.map(t => t.id);

    // Empty arrays are valid - means "remove all tags"
    // The repo now handles this properly with DELETE + INSERT pattern

    switch (entityType) {
      case "task":
        await applyTagsToTask({ taskId: entityId, tagIds });
        break;
      case "note":
        await applyTagsToNote?.({ noteId: entityId, tagIds });
        break;
      case "goal":
        await applyTagsToGoal?.({ goalId: entityId, tagIds });
        break;
      case "contact":
        await applyTagsToContact?.({ contactId: entityId, tagIds });
        break;
    }
  };

  const handleOpenModal = () => {
    onOpenModal?.();
    onModalChange(true);
  };

  return (
    <>
      {/* Tag Display */}
      <div className="flex flex-wrap gap-2 items-center">
        {tags.length === 0 ? (
          // Show "Add tags" button when no tags exist
          <button
            onClick={handleOpenModal}
            className="text-xs text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1"
          >
            <span>+ Add tags</span>
          </button>
        ) : (
          // Show existing tags
          <>
            {visibleTags.map((tag) => {
              // Use fixed category colors - no dynamic calculation
              const category = (tag.category as TagCategory) || "services_modalities";
              const bgColor = TAG_CATEGORY_COLORS[category];
              const textColor = TAG_CATEGORY_TEXT_COLORS[category];
              const borderColor = TAG_CATEGORY_BORDER_COLORS[category];

              return (
                <Badge
                  key={tag.id}
                  className="px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity"
                  style={{
                    backgroundColor: bgColor,
                    color: textColor,
                    borderColor: borderColor,
                    borderWidth: "1px",
                    borderStyle: "solid"
                  }}
                  onClick={handleOpenModal}
                >
                  {tag.name}
                </Badge>
              );
            })}
            {hiddenTagsCount > 0 && (
              <button
                onClick={handleOpenModal}
                className="text-xs text-gray-600 hover:text-gray-900 font-medium"
              >
                +{hiddenTagsCount} more
              </button>
            )}
          </>
        )}
      </div>

      {/* Tag Selector Modal */}
      <TagSelector
        open={showModal}
        onOpenChange={onModalChange}
        selectedTags={tags}
        availableTags={allTags}
        suggestedTags={allTags.slice(0, 6)}
        onTagsChange={async (newTags) => {
          console.log(`🏷️ ${entityType} tags changed:`, newTags);
          await applyTags(newTags);
        }}
        onCreateTag={async (name, category) => {
          console.log(`🏷️ Creating new tag:`, name, "in category:", category);
          // Use fixed category color from tag-categories.ts
          const categoryColor = TAG_CATEGORY_COLORS[category as TagCategory] || TAG_CATEGORY_COLORS.services_modalities;
          const newTag = await createTag({
            name,
            category,
            color: categoryColor
          });
          return { id: newTag.id, name: newTag.name, color: categoryColor, category: category };
        }}
      />
    </>
  );
}
