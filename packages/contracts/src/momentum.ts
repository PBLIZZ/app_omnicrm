import { z } from "zod";

/**
 * Momentum Workspace DTO Schema
 *
 * Stable UI-focused contract for workspace data.
 */
export const MomentumWorkspaceDTOSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  color: z.string().default("#6366f1"),
  isDefault: z.boolean().default(false),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type MomentumWorkspaceDTO = z.infer<typeof MomentumWorkspaceDTOSchema>;

/**
 * Momentum Project DTO Schema
 *
 * Stable UI-focused contract for project data.
 */
export const MomentumProjectDTOSchema = z.object({
  id: z.string().uuid(),
  momentumWorkspaceId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  color: z.string().default("#10b981"),
  status: z.enum(["active", "completed", "on_hold", "cancelled"]).default("active"),
  dueDate: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type MomentumProjectDTO = z.infer<typeof MomentumProjectDTOSchema>;

/**
 * Momentum Task DTO Schema
 *
 * Stable UI-focused contract for momentum task data.
 */
export const MomentumDTOSchema = z.object({
  id: z.string().uuid(),
  momentumWorkspaceId: z.string().uuid().nullable(),
  momentumProjectId: z.string().uuid().nullable(),
  parentMomentumId: z.string().uuid().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(["todo", "in_progress", "waiting", "done", "cancelled"]).default("todo"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  assignee: z.enum(["user", "ai"]).default("user"),
  source: z.enum(["user", "ai_generated"]).default("user"),
  approvalStatus: z.enum(["pending_approval", "approved", "rejected"]).default("approved"),
  taggedContacts: z.array(z.string().uuid()).nullable(),
  dueDate: z.coerce.date().nullable(),
  completedAt: z.coerce.date().nullable(),
  estimatedMinutes: z.number().int().positive().nullable(),
  actualMinutes: z.number().int().positive().nullable(),
  aiContext: z.unknown().nullable(), // JSON blob with AI reasoning/context
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type MomentumDTO = z.infer<typeof MomentumDTOSchema>;

/**
 * Momentum Action DTO Schema
 *
 * Audit trail for momentum task actions
 */
export const MomentumActionDTOSchema = z.object({
  id: z.string().uuid(),
  momentumId: z.string().uuid(),
  action: z.enum(["approved", "rejected", "edited", "completed", "deleted"]),
  previousData: z.unknown().nullable(), // JSON blob
  newData: z.unknown().nullable(), // JSON blob
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
});

export type MomentumActionDTO = z.infer<typeof MomentumActionDTOSchema>;

/**
 * Create Workspace DTO Schema
 */
export const CreateMomentumWorkspaceDTOSchema = z.object({
  name: z.string().min(1, "Workspace name is required"),
  description: z.string().optional(),
  color: z.string().default("#6366f1"),
  isDefault: z.boolean().default(false),
});

export type CreateMomentumWorkspaceDTO = z.infer<typeof CreateMomentumWorkspaceDTOSchema>;

/**
 * Create Project DTO Schema
 */
export const CreateMomentumProjectDTOSchema = z.object({
  momentumWorkspaceId: z.string().uuid(),
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  color: z.string().default("#10b981"),
  status: z.enum(["active", "completed", "on_hold", "cancelled"]).default("active"),
  dueDate: z.coerce.date().optional(),
});

export type CreateMomentumProjectDTO = z.infer<typeof CreateMomentumProjectDTOSchema>;

/**
 * Create Momentum Task DTO Schema
 */
export const CreateMomentumDTOSchema = z.object({
  momentumWorkspaceId: z.string().uuid().optional(),
  momentumProjectId: z.string().uuid().optional(),
  parentMomentumId: z.string().uuid().optional(),
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "waiting", "done", "cancelled"]).default("todo"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  assignee: z.enum(["user", "ai"]).default("user"),
  source: z.enum(["user", "ai_generated"]).default("user"),
  approvalStatus: z.enum(["pending_approval", "approved", "rejected"]).default("approved"),
  taggedContacts: z.array(z.string().uuid()).optional(),
  dueDate: z.coerce.date().optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  aiContext: z.unknown().optional(),
});

export type CreateMomentumDTO = z.infer<typeof CreateMomentumDTOSchema>;

/**
 * Update DTOs - All fields optional for partial updates
 */
export const UpdateMomentumWorkspaceDTOSchema = CreateMomentumWorkspaceDTOSchema.partial();
export type UpdateMomentumWorkspaceDTO = z.infer<typeof UpdateMomentumWorkspaceDTOSchema>;

export const UpdateMomentumProjectDTOSchema = CreateMomentumProjectDTOSchema.partial();
export type UpdateMomentumProjectDTO = z.infer<typeof UpdateMomentumProjectDTOSchema>;

export const UpdateMomentumDTOSchema = CreateMomentumDTOSchema.partial();
export type UpdateMomentumDTO = z.infer<typeof UpdateMomentumDTOSchema>;

/**
 * Create Momentum Action DTO Schema
 */
export const CreateMomentumActionDTOSchema = z.object({
  momentumId: z.string().uuid(),
  action: z.enum(["approved", "rejected", "edited", "completed", "deleted"]),
  previousData: z.unknown().optional(),
  newData: z.unknown().optional(),
  notes: z.string().optional(),
});

export type CreateMomentumActionDTO = z.infer<typeof CreateMomentumActionDTOSchema>;

// Legacy aliases for backward compatibility
export const WorkspaceDTOSchema = MomentumWorkspaceDTOSchema;
export const ProjectDTOSchema = MomentumProjectDTOSchema;
export type WorkspaceDTO = MomentumWorkspaceDTO;
export type ProjectDTO = MomentumProjectDTO;