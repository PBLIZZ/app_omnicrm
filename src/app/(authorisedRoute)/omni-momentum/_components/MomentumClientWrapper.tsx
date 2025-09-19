"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus,
  List,
  LayoutGrid,
  Search,
  Filter,
  Clock,
  CheckSquare,
  AlertCircle,
  Bot,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { MomentumListView } from "./momentum-list-view";
import { MomentumKanbanView } from "./momentum-kanban-view";
import { CreateMomentumDialog } from "./create-momentum-dialog";
import { ApprovalQueue } from "./approval-queue";
import { type MomentumDTO, type MomentumWorkspaceDTO, type MomentumProjectDTO } from "@omnicrm/contracts";

// Type definitions for API responses - using proper DTO types
type Workspace = MomentumWorkspaceDTO;
type Project = MomentumProjectDTO;

// Specific API response interfaces for better type safety
interface WorkspacesApiResponse {
  workspaces: Workspace[];
}

interface ProjectsApiResponse {
  projects: Project[];
}

interface MomentumsApiResponse {
  momentums: MomentumDTO[];
}

export default function MomentumClientWrapper(): JSX.Element {
  const [view, setView] = useState<"list" | "kanban">("list");
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedAssignee, setSelectedAssignee] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showApprovalQueue, setShowApprovalQueue] = useState(false);

  // Fetch workspaces
  const { data: workspacesData } = useQuery({
    queryKey: ["/api/workspaces"],
    queryFn: async (): Promise<WorkspacesApiResponse> => {
      const response = await fetch("/api/workspaces");
      if (!response.ok) throw new Error("Failed to fetch workspaces");
      return response.json() as Promise<WorkspacesApiResponse>;
    },
  });

  // Fetch projects (filtered by workspace)
  const { data: projectsData } = useQuery({
    queryKey: ["/api/projects", selectedWorkspace !== "all" ? selectedWorkspace : undefined],
    queryFn: async (): Promise<ProjectsApiResponse> => {
      const url =
        selectedWorkspace !== "all"
          ? `/api/projects?workspaceId=${selectedWorkspace}`
          : "/api/projects";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch projects");
      return response.json() as Promise<ProjectsApiResponse>;
    },
    enabled: selectedWorkspace !== "all",
  });

  // Fetch momentums with filters
  const { data: momentumsData, isLoading } = useQuery({
    queryKey: [
      "/api/omni-momentum",
      {
        workspaceId: selectedWorkspace !== "all" ? selectedWorkspace : undefined,
        projectId: selectedProject !== "all" ? selectedProject : undefined,
        status: selectedStatus !== "all" ? selectedStatus : undefined,
        assignee: selectedAssignee !== "all" ? selectedAssignee : undefined,
        withContacts: true,
      },
    ],
    queryFn: async (): Promise<MomentumsApiResponse> => {
      const params = new URLSearchParams();
      if (selectedWorkspace !== "all") params.append("workspaceId", selectedWorkspace);
      if (selectedProject !== "all") params.append("projectId", selectedProject);
      if (selectedStatus !== "all") params.append("status", selectedStatus);
      if (selectedAssignee !== "all") params.append("assignee", selectedAssignee);
      params.append("withContacts", "true");

      const response = await fetch(`/api/omni-momentum?${params}`);
      if (!response.ok) throw new Error("Failed to fetch momentums");
      return response.json() as Promise<MomentumsApiResponse>;
    },
  });

  // Fetch pending approval momentums
  const { data: pendingMomentumsData } = useQuery({
    queryKey: ["/api/omni-momentum/pending-approval"],
    queryFn: async (): Promise<MomentumsApiResponse> => {
      const response = await fetch("/api/omni-momentum/pending-approval");
      if (!response.ok) throw new Error("Failed to fetch pending momentums");
      return response.json() as Promise<MomentumsApiResponse>;
    },
  });

  const workspaces = workspacesData?.workspaces ?? [];
  const projects = projectsData?.projects ?? [];
  const momentums = momentumsData?.momentums ?? [];
  const pendingMomentums = pendingMomentumsData?.momentums ?? [];

  // Filter momentums by search query
  const filteredMomentums = momentums.filter(
    (momentum: MomentumDTO) =>
      momentum.title?.toLowerCase().includes(searchQuery.toLowerCase()) ??
      momentum.description?.toLowerCase().includes(searchQuery.toLowerCase()) ??
      false,
  );

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "todo", label: "To Do" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const assigneeOptions = [
    { value: "all", label: "All Assignees" },
    { value: "user", label: "Me" },
    { value: "ai", label: "AI Generated" },
  ];

  return (
    <div className="py-6">
      <div className="flex flex-col space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Momentum</h1>
            <p className="text-muted-foreground mt-1">
              Manage your projects, momentums, and data-driven insights generated suggestions
            </p>
          </div>

          <div className="flex items-center gap-2">
            {pendingMomentums.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setShowApprovalQueue(true)}
                className="relative"
                data-testid="button-approval-queue"
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                AI Suggestions
                <Badge variant="destructive" className="ml-2">
                  {pendingMomentums.length}
                </Badge>
              </Button>
            )}

            <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-momentum">
              <Plus className="h-4 w-4 mr-2" />
              New Momentum
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card data-testid="card-total-momentums">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Momentum</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{momentums.length}</div>
              <p className="text-xs text-muted-foreground">Across all workspaces</p>
            </CardContent>
          </Card>

          <Card data-testid="card-in-progress">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {momentums.filter((m: MomentumDTO) => m.status === "in_progress").length}
              </div>
              <p className="text-xs text-muted-foreground">Currently active</p>
            </CardContent>
          </Card>

          <Card data-testid="card-ai-generated">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Generated</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {momentums.filter((m: MomentumDTO) => m.source === "ai_generated").length}
              </div>
              <p className="text-xs text-muted-foreground">Approved suggestions</p>
            </CardContent>
          </Card>

          <Card data-testid="card-pending-approval">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingMomentums.length}</div>
              <p className="text-xs text-muted-foreground">Awaiting review</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex flex-1 items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search momentum..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
              data-testid="input-search-momentum"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />

            {/* Workspace Filter */}
            <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
              <SelectTrigger className="w-40" data-testid="select-workspace">
                <SelectValue placeholder="Workspace" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workspaces</SelectItem>
                {workspaces.map((workspace: Workspace) => (
                  <SelectItem key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Project Filter */}
            {selectedWorkspace !== "all" && (
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="w-32" data-testid="select-project">
                  <SelectValue placeholder="Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((project: Project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Status Filter */}
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-32" data-testid="select-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Assignee Filter */}
            <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
              <SelectTrigger className="w-32" data-testid="select-assignee">
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                {assigneeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* View Toggle and Content */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {selectedWorkspace !== "all"
                  ? (workspaces.find((w: Workspace) => w.id === selectedWorkspace)?.name ??
                    "Momentum")
                  : "All Momentum"}
              </CardTitle>

              <Tabs value={view} onValueChange={(value) => setView(value as "list" | "kanban")}>
                <TabsList className="grid w-fit grid-cols-2" data-testid="tabs-view-toggle">
                  <TabsTrigger value="list" className="flex items-center gap-2">
                    <List className="h-4 w-4" />
                    List
                  </TabsTrigger>
                  <TabsTrigger value="kanban" className="flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4" />
                    Kanban
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <Tabs value={view} className="w-full">
              <TabsContent value="list" className="mt-0">
                <MomentumListView momentums={filteredMomentums} isLoading={isLoading} />
              </TabsContent>
              <TabsContent value="kanban" className="mt-0">
                <MomentumKanbanView momentums={filteredMomentums} isLoading={isLoading} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <CreateMomentumDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        workspaces={workspaces}
        projects={projects}
      />

      <ApprovalQueue
        open={showApprovalQueue}
        onOpenChange={setShowApprovalQueue}
        pendingTasks={pendingMomentums}
      />
    </div>
  );
}
