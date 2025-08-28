// OmniMomentum Shared Components - all micro-components under 250 lines
// Built with DRY principles and composable architecture
// Workflow-specific components are colocated in their respective page directories

// Shared Task Capture System (used by multiple workflows)
export { TaskCaptureInput } from "./TaskCaptureInput";
export { CategorySuggestions } from "./CategorySuggestions";
export { TaskEnhancementPreview } from "./TaskEnhancementPreview";
export { TaskCaptureModal } from "./TaskCaptureModal";

// Shared Dashboard Components (used by multiple workflows)
export { PriorityList } from "./PriorityList";
export { AIInsightsPanel } from "./AIInsightsPanel";
export { QuickActionsBar } from "./QuickActionsBar";

// Workflow-specific components are now colocated:
// - Daily Focus: /app/(authorisedRoute)/omni-momentum/daily-focus/_components/
// - Matrix: /app/(authorisedRoute)/omni-momentum/matrix/_components/