import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export interface TaskTemplate {
  name: string;
  description?: string;
  priority: "low" | "medium" | "high" | "urgent";
  estimatedMinutes?: number;
  dueOffsetDays: number; // Days from project start
  category?: string;
  subtasks?: Array<{
    name: string;
    order: number;
  }>;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category:
    | "client_onboarding"
    | "content_creation"
    | "program_delivery"
    | "business_development"
    | "custom";
  estimatedDurationDays: number;
  color: string;
  tasks: TaskTemplate[];
}

// Basic wellness business templates
export const BASIC_TEMPLATES: ProjectTemplate[] = [
  {
    id: "client-onboarding",
    name: "Client Onboarding",
    description: "Complete onboarding process for new wellness clients",
    category: "client_onboarding",
    estimatedDurationDays: 14,
    color: "#10b981",
    tasks: [
      {
        name: "Review intake forms and health history",
        description:
          "Thoroughly review client's intake forms, health questionnaire, and any medical clearances",
        priority: "high",
        estimatedMinutes: 60,
        dueOffsetDays: 0,
        category: "client-care",
      },
      {
        name: "Schedule initial consultation call",
        description:
          "Set up 60-90 minute consultation to discuss goals, preferences, and program options",
        priority: "high",
        estimatedMinutes: 30,
        dueOffsetDays: 1,
        category: "client-care",
      },
      {
        name: "Conduct initial consultation",
        description:
          "Comprehensive discussion of client goals, current lifestyle, challenges, and motivation",
        priority: "urgent",
        estimatedMinutes: 90,
        dueOffsetDays: 3,
        category: "client-care",
      },
      {
        name: "Create personalized wellness plan",
        description:
          "Develop customized plan including nutrition, movement, mindfulness, and lifestyle recommendations",
        priority: "high",
        estimatedMinutes: 120,
        dueOffsetDays: 5,
        category: "content-creation",
      },
      {
        name: "Prepare plan presentation materials",
        description: "Create visual presentation and supporting documents for plan delivery",
        priority: "medium",
        estimatedMinutes: 60,
        dueOffsetDays: 7,
        category: "content-creation",
      },
      {
        name: "Present wellness plan to client",
        description:
          "Detailed presentation of personalized plan with opportunity for questions and adjustments",
        priority: "high",
        estimatedMinutes: 60,
        dueOffsetDays: 10,
        category: "client-care",
      },
      {
        name: "Set up client portal access",
        description:
          "Provide login credentials and walk through how to access resources, schedule sessions, and track progress",
        priority: "medium",
        estimatedMinutes: 30,
        dueOffsetDays: 10,
        category: "administrative",
      },
      {
        name: "Schedule first progress check-in",
        description:
          "Book 30-minute follow-up session for 1-2 weeks after plan implementation starts",
        priority: "medium",
        estimatedMinutes: 15,
        dueOffsetDays: 14,
        category: "client-care",
      },
    ],
  },
  {
    id: "content-campaign",
    name: "Content Campaign Creation",
    description: "Develop and launch a comprehensive content marketing campaign",
    category: "content_creation",
    estimatedDurationDays: 21,
    color: "#8b5cf6",
    tasks: [
      {
        name: "Define campaign theme and objectives",
        description: "Establish clear goals, target audience, and key messages for the campaign",
        priority: "high",
        estimatedMinutes: 90,
        dueOffsetDays: 0,
        category: "business-development",
      },
      {
        name: "Research trending topics and keywords",
        description: "Analyze current wellness trends, popular keywords, and competitor content",
        priority: "medium",
        estimatedMinutes: 120,
        dueOffsetDays: 2,
        category: "business-development",
      },
      {
        name: "Create content calendar",
        description: "Plan posting schedule across all platforms with specific topics and formats",
        priority: "high",
        estimatedMinutes: 60,
        dueOffsetDays: 5,
        category: "content-creation",
      },
      {
        name: "Write blog posts or articles",
        description: "Create 3-5 long-form pieces that will anchor the campaign",
        priority: "high",
        estimatedMinutes: 240,
        dueOffsetDays: 10,
        category: "content-creation",
      },
      {
        name: "Design visual content",
        description: "Create graphics, infographics, and visual quotes for social media",
        priority: "medium",
        estimatedMinutes: 180,
        dueOffsetDays: 12,
        category: "content-creation",
      },
      {
        name: "Schedule social media posts",
        description: "Set up automated posting schedule across all social platforms",
        priority: "medium",
        estimatedMinutes: 60,
        dueOffsetDays: 14,
        category: "administrative",
      },
      {
        name: "Launch campaign",
        description: "Execute the campaign launch with announcement and initial content push",
        priority: "urgent",
        estimatedMinutes: 90,
        dueOffsetDays: 21,
        category: "business-development",
      },
    ],
  },
  {
    id: "program-delivery",
    name: "Group Program Delivery",
    description: "End-to-end delivery of a group wellness program",
    category: "program_delivery",
    estimatedDurationDays: 42,
    color: "#f59e0b",
    tasks: [
      {
        name: "Finalize program curriculum",
        description: "Review and polish all session materials, handouts, and resources",
        priority: "high",
        estimatedMinutes: 180,
        dueOffsetDays: 0,
        category: "content-creation",
      },
      {
        name: "Set up group communication platform",
        description: "Create private group space for participants to connect and share",
        priority: "medium",
        estimatedMinutes: 45,
        dueOffsetDays: 3,
        category: "administrative",
      },
      {
        name: "Send welcome package to participants",
        description: "Distribute program materials, schedule, and preparatory resources",
        priority: "high",
        estimatedMinutes: 60,
        dueOffsetDays: 7,
        category: "client-care",
      },
      {
        name: "Conduct program sessions (weekly)",
        description: "Lead weekly group sessions according to curriculum",
        priority: "urgent",
        estimatedMinutes: 120,
        dueOffsetDays: 14,
        category: "client-care",
        subtasks: [
          { name: "Week 1: Program introduction", order: 1 },
          { name: "Week 2: Foundation building", order: 2 },
          { name: "Week 3: Skill development", order: 3 },
          { name: "Week 4: Integration", order: 4 },
          { name: "Week 5: Advanced techniques", order: 5 },
          { name: "Week 6: Troubleshooting", order: 6 },
        ],
      },
      {
        name: "Mid-program individual check-ins",
        description: "Conduct brief one-on-one sessions with each participant",
        priority: "medium",
        estimatedMinutes: 30,
        dueOffsetDays: 21,
        category: "client-care",
      },
      {
        name: "Gather program feedback",
        description: "Collect participant feedback and suggestions for improvement",
        priority: "medium",
        estimatedMinutes: 45,
        dueOffsetDays: 35,
        category: "administrative",
      },
      {
        name: "Program completion celebration",
        description: "Host graduation ceremony or celebration event for participants",
        priority: "medium",
        estimatedMinutes: 90,
        dueOffsetDays: 42,
        category: "client-care",
      },
    ],
  },
];

interface CreateProjectFromTemplateData {
  templateId: string;
  projectName: string;
  workspaceId: string;
  startDate?: Date;
  description?: string;
}

export function useProjectTemplates() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createProjectFromTemplateMutation = useMutation({
    mutationFn: async (data: CreateProjectFromTemplateData) => {
      const template = BASIC_TEMPLATES.find((t) => t.id === data.templateId);
      if (!template) {
        throw new Error("Template not found");
      }

      const startDate = data.startDate || new Date();

      // Create the project
      const project = await apiRequest("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: data.projectName,
          workspaceId: data.workspaceId,
          description: data.description || template.description,
          color: template.color,
          status: "active",
        }),
      });

      // Create tasks from template
      const taskPromises = template.tasks.map(async (taskTemplate) => {
        const dueDate = new Date(startDate);
        dueDate.setDate(dueDate.getDate() + taskTemplate.dueOffsetDays);

        return apiRequest("/api/tasks", {
          method: "POST",
          body: JSON.stringify({
            workspaceId: data.workspaceId,
            projectId: project.project.id,
            title: taskTemplate.name,
            description: taskTemplate.description,
            priority: taskTemplate.priority,
            estimatedMinutes: taskTemplate.estimatedMinutes,
            dueDate: dueDate.toISOString(),
            status: "todo",
            assignee: "user",
            source: "template",
          }),
        });
      });

      await Promise.all(taskPromises);

      return { project: project.project, tasksCreated: template.tasks.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Project Created from Template",
        description: `Successfully created "${data.project.name}" with ${data.tasksCreated} tasks.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to create project from template: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  return {
    templates: BASIC_TEMPLATES,
    createProjectFromTemplate: createProjectFromTemplateMutation.mutate,
    isCreating: createProjectFromTemplateMutation.isPending,
  };
}
