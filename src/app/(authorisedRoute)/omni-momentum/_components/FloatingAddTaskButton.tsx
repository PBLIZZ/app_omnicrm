"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { Plus } from "lucide-react";
import { TaskDetailSheet } from "./TaskDetailSheet";

/**
 * FloatingAddTaskButton - Global floating action button for quick task creation
 *
 * Available anywhere within the OmniMomentum suite. Positioned in bottom-right corner
 * following Trello/Todoist patterns for familiarity.
 */
export function FloatingAddTaskButton(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Action Button */}
      <Button
        size="icon"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white z-50 transition-all hover:scale-110"
        onClick={() => setIsOpen(true)}
        aria-label="Add new task"
      >
        <Plus className="w-8 h-8" />
      </Button>

      {/* Task Creation Sheet */}
      <TaskDetailSheet isOpen={isOpen} onClose={() => setIsOpen(false)} mode="create" />
    </>
  );
}


