"use client";

import { TagSelector } from "@/components/TagSelector";
import { Badge } from "@/components/ui/badge";
import { useTags } from "@/hooks/use-tags";

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
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          {visibleTags.map((tag) => (
            <Badge
              key={tag.id}
              className="px-3 py-1 rounded-full text-sm font-medium border-0 cursor-pointer hover:opacity-80 transition-opacity"
              style={{ 
                backgroundColor: tag.color, 
                color: "#fff" 
              }}
              onClick={handleOpenModal}
            >
              {tag.name}
            </Badge>
          ))}
          {hiddenTagsCount > 0 && (
            <button
              onClick={handleOpenModal}
              className="text-xs text-gray-600 hover:text-gray-900 font-medium"
            >
              +{hiddenTagsCount} more
            </button>
          )}
        </div>
      )}

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
        onCreateTag={async (name) => {
          console.log(`🏷️ Creating new tag:`, name);
          // Default to "services_modalities" category - user can change in settings
          const newTag = await createTag({
            name,
            category: "services_modalities",
            color: "#a78bfa"
          });
          return { id: newTag.id, name: newTag.name, color: newTag.color };
        }}
      />
    </>
  );
}
