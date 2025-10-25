"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { Target } from "lucide-react";
import { TaskCard } from "./TaskCard";
import { useMomentum } from "@/hooks/use-momentum";
import type { TaskListItem } from "packages/repo/src/types/productivity.types";
import { AnimatePresence, motion } from "framer-motion";

interface Top3TasksResponse {
  tasks: TaskListItem[];
  summary: string;
}

/**
 * TodaysFocusSection - Shows top 3 priority tasks selected by AI
 *
 * Uses LLM to analyze all tasks and select the top 3 based on value to user's life/business
 */
export function TodaysFocusSection(): JSX.Element {
  const queryClient = useQueryClient();
  const { projects } = useMomentum(); // Get projects for the dropdown
  const { data, isLoading, error, refetch } = useQuery<Top3TasksResponse>({
    queryKey: ["momentum", "top3-tasks"],
    queryFn: async () => {
      const result = await apiClient.get<Top3TasksResponse>("/api/omni-momentum/tasks/top3");

      // Cache the full ranked list in localStorage
      if (result.tasks && result.tasks.length > 0) {
        localStorage.setItem("momentum-ranked-tasks", JSON.stringify(result.tasks));
      }

      return result;
    },
    staleTime: Infinity, // Never consider stale - we'll update optimistically
    refetchInterval: false, // No polling
    refetchOnWindowFocus: false, // No refetch on focus
    retry: 1,
  });

  const handleToggleComplete = async (taskId: string): Promise<void> => {
    try {
      // Mark task as done using PUT method
      await apiClient.put(`/api/omni-momentum/tasks/${taskId}`, {
        status: "done",
      });

      // Get the cached ranked list
      const cached = localStorage.getItem("momentum-ranked-tasks");
      if (cached) {
        const rankedTasks: TaskListItem[] = JSON.parse(cached);
        // Filter out the completed task and get next 3
        const remainingTasks = rankedTasks.filter((t) => t.id !== taskId);
        const next3 = remainingTasks.slice(0, 3);

        // Update cache with remaining tasks
        localStorage.setItem("momentum-ranked-tasks", JSON.stringify(remainingTasks));

        // Update the query data directly without refetching
        queryClient.setQueryData<Top3TasksResponse>(["momentum", "top3-tasks"], {
          tasks: next3,
          summary: data?.summary || "Your next priorities",
        });

        console.log("Updated top 3 from cache:", next3);
      } else {
        // If no cache, refetch
        await refetch();
      }
    } catch (err) {
      console.error("Error completing task:", err);
    }
  };

  const handleExpand = (taskId: string): void => {
    // TODO: Implement task expansion
    console.log("Expand task:", taskId);
  };

  if (isLoading) {
    return (
      <Card className="h-[400px] flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            Today&apos;s Focus
          </CardTitle>
          <CardDescription>AI is selecting your top 3 priorities...</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-32 bg-gray-100 rounded-lg" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-[400px] flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            Today&apos;s Focus
          </CardTitle>
          <CardDescription>Unable to load your focus tasks</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          <div className="text-center py-8">
            <p className="text-sm text-gray-600">Error loading tasks. Please try again later.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const tasks = data?.tasks ?? [];
  const summary = data?.summary ?? "";

  console.log("TodaysFocusSection render:", {
    isLoading,
    error,
    tasksCount: tasks.length,
    dataKeys: data ? Object.keys(data) : null,
    fullData: data,
  });

  return (
    <Card className="h-[400px] bg-gradient-to-br from-sky-50 via-emerald-50 to-teal-50 border-sky-200 flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-500" />
          Today&apos;s Focus
        </CardTitle>
        <CardDescription>
          {summary ||
            "Your top 3 priorities selected by AI based on value to your life and business"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="text-center py-8">
            <Target className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">Ready to focus?</h3>
            <p className="text-gray-500 text-sm">
              Complete some tasks or add new ones to see your AI-selected priorities here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {tasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  layout
                >
                  <TaskCard task={task} projects={projects} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
