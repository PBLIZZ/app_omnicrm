import { notFound, redirect } from "next/navigation";
import { ProjectView } from "./_components/ProjectView";
import { getProjectService } from "@/server/services/projects.service";
import { getServerUserId } from "@/server/auth/user";

interface ProjectPageProps {
  params: Promise<{
    projectId: string;
  }>;
}

/**
 * Dynamic Project Detail Page
 *
 * Displays a project with:
 * - Project name, description, and metadata
 * - Task list (similar to subtasks in a task card)
 * - Progress tracking (X of Y tasks completed)
 * - Zone association
 * - Add/edit/delete tasks within the project
 */
export default async function ProjectPage({ params }: ProjectPageProps): Promise<JSX.Element> {
  const { projectId } = await params;

  // Server-side authentication check
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch {
    redirect("/login?next=/omni-momentum");
  }

  // Get project data
  const project = await getProjectService(userId, projectId);

  if (!project) {
    notFound();
  }

  return <ProjectView project={project} />;
}
