"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { X, Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useToast } from "@/hooks/use-toast";
import { type MomentumWorkspaceDTO, type MomentumProjectDTO, type ContactDTO } from "@omnicrm/contracts";

const createTaskSchema = z.object({
  workspaceId: z.string().optional(),
  projectId: z.string().optional(),
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  dueDate: z.date().optional(),
  estimatedMinutes: z.number().min(0).optional(),
  taggedContacts: z.array(z.string()).optional(),
});

type CreateTaskFormData = z.infer<typeof createTaskSchema>;

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaces: MomentumWorkspaceDTO[];
  projects: MomentumProjectDTO[];
}

export function CreateMomentumDialog({
  open,
  onOpenChange,
  workspaces,
  projects,
}: CreateTaskDialogProps): JSX.Element {
  const [selectedContacts, setSelectedContacts] = useState<ContactDTO[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [showContactSearch, setShowContactSearch] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<CreateTaskFormData>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      priority: "medium",
      taggedContacts: [],
    },
  });

  interface ContactsResponse {
    contacts: ContactDTO[];
  }

  const { data: contactsData } = useQuery<ContactsResponse>({
    queryKey: ["/api/contacts"],
    queryFn: async (): Promise<ContactsResponse> => {
      const response = await fetch("/api/contacts");
      if (!response.ok) throw new Error("Failed to fetch contacts");
      const data = (await response.json()) as ContactsResponse;
      return data;
    },
  });

  const contacts = contactsData?.contacts ?? [];

  const filteredContacts = contacts.filter(
    (contact: ContactDTO) =>
      contact.displayName.toLowerCase().includes(contactSearch.toLowerCase()) ??
      contact.primaryEmail?.toLowerCase().includes(contactSearch.toLowerCase()),
  );

  const createTaskMutation = useMutation({
    mutationFn: async (data: CreateTaskFormData) => {
      return apiClient.post("/api/tasks", {
        ...data,
        workspaceId: data.workspaceId ?? undefined,
        projectId: data.projectId ?? undefined,
        taggedContacts: selectedContacts.map((c) => c.id),
        estimatedMinutes: data.estimatedMinutes ?? undefined,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task Created",
        description: "Your task has been created successfully.",
      });
      handleClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: CreateTaskFormData): void => {
    createTaskMutation.mutate({
      ...data,
      workspaceId: data.workspaceId === "none" ? undefined : data.workspaceId,
      projectId: data.projectId === "none" ? undefined : data.projectId,
    });
  };

  const handleClose = (): void => {
    form.reset();
    setSelectedContacts([]);
    setContactSearch("");
    setShowContactSearch(false);
    onOpenChange(false);
  };

  const addContact = (contact: ContactDTO): void => {
    if (!selectedContacts.find((c) => c.id === contact.id)) {
      setSelectedContacts([...selectedContacts, contact]);
    }
    setContactSearch("");
    setShowContactSearch(false);
  };

  const removeContact = (contactId: string): void => {
    setSelectedContacts(selectedContacts.filter((c) => c.id !== contactId));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="dialog-create-task">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Create a new task. You can optionally assign it to a workspace and project.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workspace">Workspace (Optional)</Label>
            <Select
              value={form.watch("workspaceId") ?? ""}
              onValueChange={(value) =>
                form.setValue("workspaceId", value === "none" ? undefined : value)
              }
            >
              <SelectTrigger data-testid="select-workspace">
                <SelectValue placeholder="No workspace selected" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No workspace</SelectItem>
                {workspaces.map((workspace) => (
                  <SelectItem key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project">Project (Optional)</Label>
            <Select
              value={form.watch("projectId") ?? ""}
              onValueChange={(value) =>
                form.setValue("projectId", value === "none" ? undefined : value)
              }
            >
              <SelectTrigger data-testid="select-project">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Enter task title..."
              {...form.register("title")}
              data-testid="input-task-title"
            />
            {form.formState.errors.title && (
              <p className="text-sm text-red-600">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter task description..."
              rows={3}
              {...form.register("description")}
              data-testid="textarea-task-description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={form.watch("priority")}
                onValueChange={(value) =>
                  form.setValue("priority", value as "low" | "medium" | "high" | "urgent")
                }
              >
                <SelectTrigger data-testid="select-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedMinutes">Estimated Time (minutes)</Label>
              <Input
                id="estimatedMinutes"
                type="number"
                placeholder="60"
                {...form.register("estimatedMinutes", { valueAsNumber: true })}
                data-testid="input-estimated-minutes"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              {...form.register("dueDate", {
                setValueAs: (value) => (value ? new Date(value) : undefined),
              })}
              data-testid="input-due-date"
            />
          </div>

          <div className="space-y-2">
            <Label>Tagged Contacts</Label>
            <div className="space-y-2">
              {selectedContacts.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedContacts.map((contact) => (
                    <Badge key={contact.id} variant="secondary" className="flex items-center gap-1">
                      <Avatar className="h-4 w-4">
                        <AvatarFallback className="text-xs">
                          {contact.displayName
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      {contact.displayName}
                      <button
                        type="button"
                        onClick={() => removeContact(contact.id)}
                        className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                      >
                        <X className="h-2 w-2" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowContactSearch(!showContactSearch)}
                  data-testid="button-add-contacts"
                >
                  <Search className="mr-2 h-4 w-4" />
                  Add contacts...
                </Button>

                {showContactSearch && (
                  <div className="absolute top-full left-0 w-full mt-1 border rounded-md bg-popover shadow-md z-50">
                    <div className="p-2">
                      <Input
                        placeholder="Search contacts..."
                        value={contactSearch}
                        onChange={(e) => setContactSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="max-h-32 overflow-y-auto">
                      {filteredContacts.slice(0, 10).map((contact: ContactDTO) => (
                        <button
                          key={contact.id}
                          type="button"
                          className="w-full px-2 py-2 text-left hover:bg-accent flex items-center gap-2"
                          onClick={() => addContact(contact)}
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {contact.displayName
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm">{contact.displayName}</div>
                            {contact.primaryEmail && (
                              <div className="text-xs text-muted-foreground">
                                {contact.primaryEmail}
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                      {filteredContacts.length === 0 && (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          No contacts found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createTaskMutation.isPending}
              data-testid="button-create-task"
            >
              {createTaskMutation.isPending ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
