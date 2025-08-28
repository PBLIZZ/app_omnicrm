import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export interface Workspace {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  color: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWorkspaceData {
  name: string;
  description?: string;
  color: string;
  isDefault?: boolean;
}

// Predefined workspace templates that users can quickly create
export const PREDEFINED_WORKSPACES = [
  {
    name: "Client Focus",
    description: "Deep work zone for client-related tasks and consultations",
    color: "#10b981", // Green
    icon: "👥",
    category: "wellness",
  },
  {
    name: "Creative Flow",
    description: "Content creation, writing, and creative work",
    color: "#8b5cf6", // Purple
    icon: "🎨",
    category: "creative",
  },
  {
    name: "Admin & Operations",
    description: "Administrative tasks, scheduling, and business operations",
    color: "#f59e0b", // Orange
    icon: "📋",
    category: "administrative",
  },
  {
    name: "Personal Wellness",
    description: "Self-care, personal development, and wellness activities",
    color: "#ec4899", // Pink
    icon: "🧘",
    category: "personal",
  },
  {
    name: "Business Development",
    description: "Marketing, networking, and business growth activities",
    color: "#3b82f6", // Blue
    icon: "📈",
    category: "business",
  },
  {
    name: "Learning & Growth",
    description: "Education, training, and professional development",
    color: "#06b6d4", // Cyan
    icon: "📚",
    category: "education",
  },
];

export const useWorkspacesEnhanced = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get all workspaces
  const {
    data: workspacesResponse,
    isLoading: isLoadingWorkspaces,
    error: workspacesError,
  } = useQuery({
    queryKey: ["/api/workspaces"],
    queryFn: async () => {
      const response = await apiRequest("/api/workspaces", { method: "GET" });
      return response;
    },
  });

  const workspaces: Workspace[] =
    workspacesResponse?.workspaces?.map((ws: any) => ({
      id: ws.id,
      userId: ws.userId,
      name: ws.name,
      description: ws.description,
      color: ws.color,
      isDefault: ws.isDefault,
      createdAt: new Date(ws.createdAt),
      updatedAt: new Date(ws.updatedAt),
    })) || [];

  // Create workspace mutation
  const createWorkspaceMutation = useMutation({
    mutationFn: async (data: CreateWorkspaceData) => {
      const response = await apiRequest("/api/workspaces", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return response.workspace;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workspaces"] });
      toast({
        title: "Success",
        description: "Workspace created successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create workspace: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Initialize default workspaces for new users
  const initializeDefaultWorkspacesMutation = useMutation({
    mutationFn: async () => {
      // Only create the essential default workspace
      const defaultWorkspace = {
        name: "Personal Workspace",
        description: "Your default workspace for organizing tasks and projects",
        color: "#6366f1",
        isDefault: true,
      };

      const response = await apiRequest("/api/workspaces", {
        method: "POST",
        body: JSON.stringify(defaultWorkspace),
      });
      return response.workspace;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workspaces"] });
    },
  });

  // Helper functions
  const createWorkspace = (data: CreateWorkspaceData) => {
    createWorkspaceMutation.mutate(data);
  };

  const createPredefinedWorkspace = (predefinedWorkspace: (typeof PREDEFINED_WORKSPACES)[0]) => {
    const workspaceData: CreateWorkspaceData = {
      name: predefinedWorkspace.name,
      description: predefinedWorkspace.description,
      color: predefinedWorkspace.color,
      isDefault: false,
    };
    createWorkspaceMutation.mutate(workspaceData);
  };

  const initializeDefaultWorkspaces = () => {
    if (workspaces.length === 0) {
      initializeDefaultWorkspacesMutation.mutate();
    }
  };

  // Get available predefined workspaces (exclude ones that already exist)
  const availablePredefinedWorkspaces = PREDEFINED_WORKSPACES.filter(
    (predefined) => !workspaces.some((existing) => existing.name === predefined.name),
  );

  return {
    // Data
    workspaces,
    predefinedWorkspaces: PREDEFINED_WORKSPACES,
    availablePredefinedWorkspaces,

    // Loading states
    isLoadingWorkspaces,
    isCreatingWorkspace: createWorkspaceMutation.isPending,
    isInitializing: initializeDefaultWorkspacesMutation.isPending,

    // Errors
    workspacesError,
    createError: createWorkspaceMutation.error,

    // Actions
    createWorkspace,
    createPredefinedWorkspace,
    initializeDefaultWorkspaces,

    // Computed values
    hasWorkspaces: workspaces.length > 0,
    defaultWorkspace: workspaces.find((ws) => ws.isDefault),
  };
};
