"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, patch, del } from "@/lib/api";

interface Tag {
  id: string;
  name: string;
  color: string;
  category?: string;
  usageCount?: number;
}

interface CreateTagInput {
  name: string;
  color: string;
  category?: string;
}

/**
 * Hook to fetch and manage tags
 */
export function useTags() {
  const queryClient = useQueryClient();

  // Fetch all tags for the current user
  const { data: tags = [], isLoading, error } = useQuery<Tag[]>({
    queryKey: ["tags"],
    queryFn: async () => {
      const data = await get<{ items: Tag[] }>("/api/tags");
      return data.items || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create a new tag
  const createTagMutation = useMutation({
    mutationFn: async (input: CreateTagInput) => {
      const data = await post<{ item: Tag }>("/api/tags", input);
      return data.item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });

  // Apply tags to a task
  const applyTagsToTaskMutation = useMutation({
    mutationFn: async ({ taskId, tagIds }: { taskId: string; tagIds: string[] }) => {
      const requestBody = {
        entityType: "task",
        entityId: taskId,
        tagIds,
      };
      console.log("🏷️ Applying tags to task:", requestBody);
      console.log("🏷️ Tag IDs detail:", tagIds, "First ID:", tagIds[0], "Type:", typeof tagIds[0]);

      return await post("/api/tags/apply", requestBody);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["momentum"] });
    },
  });

  // Apply tags to a note
  const applyTagsToNoteMutation = useMutation({
    mutationFn: async ({ noteId, tagIds }: { noteId: string; tagIds: string[] }) => {
      return await post("/api/tags/apply", {
        entityType: "note",
        entityId: noteId,
        tagIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });

  // Apply tags to a goal
  const applyTagsToGoalMutation = useMutation({
    mutationFn: async ({ goalId, tagIds }: { goalId: string; tagIds: string[] }) => {
      return await post("/api/tags/apply", {
        entityType: "goal",
        entityId: goalId,
        tagIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });

  // Apply tags to a contact
  const applyTagsToContactMutation = useMutation({
    mutationFn: async ({ contactId, tagIds }: { contactId: string; tagIds: string[] }) => {
      return await post("/api/tags/apply", {
        entityType: "contact",
        entityId: contactId,
        tagIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });

  // Remove a tag from a task
  const removeTagFromTaskMutation = useMutation({
    mutationFn: async ({ taskId, tagId }: { taskId: string; tagId: string }) => {
      return await post("/api/tags/remove", {
        entityType: "task",
        entityId: taskId,
        tagId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["momentum"] });
    },
  });

  // Update a tag
  const updateTagMutation = useMutation({
    mutationFn: async ({ tagId, updates }: { tagId: string; updates: Partial<CreateTagInput> }) => {
      return await patch(`/api/tags/${tagId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });

  // Delete a tag
  const deleteTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      return await del(`/api/tags/${tagId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });

  return {
    tags,
    isLoading,
    error,
    createTag: createTagMutation.mutateAsync,
    updateTag: async (tagId: string, updates: Partial<CreateTagInput>) =>
      updateTagMutation.mutateAsync({ tagId, updates }),
    deleteTag: deleteTagMutation.mutateAsync,
    applyTagsToTask: applyTagsToTaskMutation.mutateAsync,
    applyTagsToNote: applyTagsToNoteMutation.mutateAsync,
    applyTagsToGoal: applyTagsToGoalMutation.mutateAsync,
    applyTagsToContact: applyTagsToContactMutation.mutateAsync,
    removeTagFromTask: removeTagFromTaskMutation.mutateAsync,
  };
}
