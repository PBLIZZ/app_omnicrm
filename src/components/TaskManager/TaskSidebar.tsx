import { TaskFilters, TASK_CATEGORIES } from "./types";
import { Workspace, Project, Contact } from "@/hooks/use-tasks-enhanced";
import { WorkspaceCreateDialog } from "./WorkspaceCreateDialog";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Briefcase, Folder, Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TaskSidebarProps {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
  workspaces: Workspace[];
  projects: Project[];
  contacts: Contact[];
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
}

export function TaskSidebar({
  filters,
  onFiltersChange,
  workspaces,
  projects,
  contacts,
  totalTasks,
  completedTasks,
  pendingTasks,
}: TaskSidebarProps) {
  const [isWorkspaceDialogOpen, setIsWorkspaceDialogOpen] = useState(false);

  const handleSearchChange = (searchQuery: string) => {
    onFiltersChange({ ...filters, searchQuery });
  };

  const handleCategoryChange = (selectedCategory: string) => {
    onFiltersChange({
      ...filters,
      selectedCategory,
    });
  };

  const handleStatusChange = (selectedStatus: "all" | "pending" | "completed") => {
    onFiltersChange({ ...filters, selectedStatus });
  };

  const handleWorkspaceChange = (selectedWorkspace: string) => {
    onFiltersChange({
      ...filters,
      selectedWorkspace,
      selectedProject: "all", // Reset project when workspace changes
    });
  };

  const handleProjectChange = (selectedProject: string) => {
    onFiltersChange({
      ...filters,
      selectedProject,
    });
  };

  const handleClientChange = (selectedClient: string) => {
    onFiltersChange({
      ...filters,
      selectedClient,
    });
  };

  return (
    <>
      <Card className="sticky top-4">
        <CardHeader>
          <CardTitle className="text-lg">Filters & Search</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search">Search tasks</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search"
                type="text"
                placeholder="Search tasks..."
                value={filters.searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
                data-testid="input-search-tasks"
              />
            </div>
          </div>

          {/* Workspace Filter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Workspace
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsWorkspaceDialogOpen(true)}
                className="flex items-center gap-1 text-xs"
              >
                <Plus className="h-3 w-3" />
                New
              </Button>
            </div>
            <Select value={filters.selectedWorkspace} onValueChange={handleWorkspaceChange}>
              <SelectTrigger data-testid="select-workspace-filter">
                <SelectValue placeholder="All workspaces" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workspaces</SelectItem>
                {workspaces.map((workspace) => (
                  <SelectItem key={workspace.id} value={workspace.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: workspace.color }}
                      />
                      {workspace.name}
                      {workspace.isDefault && (
                        <Badge variant="secondary" className="text-xs">
                          Default
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Project Filter */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Folder className="h-4 w-4" />
              Project
            </Label>
            <Select
              value={filters.selectedProject}
              onValueChange={handleProjectChange}
              disabled={filters.selectedWorkspace === "all"}
            >
              <SelectTrigger data-testid="select-project-filter">
                <SelectValue
                  placeholder={
                    filters.selectedWorkspace !== "all" ? "All projects" : "Select workspace first"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects
                  .filter(
                    (project) =>
                      filters.selectedWorkspace === "all" ||
                      project.workspaceId === filters.selectedWorkspace,
                  )
                  .map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: project.color }}
                        />
                        {project.name}
                        <Badge variant="outline" className="text-xs">
                          {project.status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client Filter */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Client
            </Label>
            <Select value={filters.selectedClient} onValueChange={handleClientChange}>
              <SelectTrigger data-testid="select-client-filter">
                <SelectValue placeholder="All clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {contacts
                  .filter((contact) => contact.stage !== "Lost Client") // Filter out lost clients
                  .sort((a, b) => a.displayName.localeCompare(b.displayName))
                  .map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                          {contact.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{contact.displayName}</div>
                          {contact.stage && (
                            <Badge variant="outline" className="text-xs">
                              {contact.stage}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category Filter */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={filters.selectedCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger data-testid="select-category-filter">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {TASK_CATEGORIES.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={filters.selectedStatus} onValueChange={handleStatusChange}>
              <SelectTrigger data-testid="select-status">
                <SelectValue placeholder="Select status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Task Stats */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">Quick Stats</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Tasks</span>
                <span className="font-medium" data-testid="text-total-tasks">
                  {totalTasks}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-medium text-green-600" data-testid="text-completed-tasks">
                  {completedTasks}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pending</span>
                <span className="font-medium text-orange-600" data-testid="text-pending-tasks">
                  {pendingTasks}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <WorkspaceCreateDialog open={isWorkspaceDialogOpen} onOpenChange={setIsWorkspaceDialogOpen} />
    </>
  );
}
