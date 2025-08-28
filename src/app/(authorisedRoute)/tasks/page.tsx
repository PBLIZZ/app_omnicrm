"use client";

import { TaskManager } from "@/components/TaskManager/TaskManager";

export default function TasksPage() {
  return (
    <div className="container mx-auto py-8">
      <TaskManager className="max-w-7xl" />
    </div>
  );
}
