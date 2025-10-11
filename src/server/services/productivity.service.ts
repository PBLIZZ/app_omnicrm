// OmniMomentum business logic service
import type { Project } from "@/server/db/business-schemas/projects";
import type { Task } from "@/server/db/business-schemas/tasks";
import type { Zone } from "@/server/db/business-schemas/zones";

export interface TaskWithRelationsDTO extends Task {
  project?: Project | null;
  parentTask?: Task | null;
  subtasks: Task[];
  taggedContacts: Array<{ id: string; name: string }>;
  zone?: Zone | null;
}

export const productivityService = new ProductivityService();
