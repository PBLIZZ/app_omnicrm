// UI Components Index
// Re-exports all UI components for easy importing

// Basic components
export { Button, buttonVariants } from "./button";
export { Input } from "./input";
export { Label } from "./label";
export { Textarea } from "./textarea";

// Layout components
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from "./card";
export { Separator } from "./separator";
export { ScrollArea } from "./scroll-area";

// Form components
export { Checkbox } from "./checkbox";
export {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "./select";
export { Switch } from "./switch";
export { Slider } from "./slider";

// Navigation components
export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from "./breadcrumb";

// Overlay components
export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "./dialog";
export {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "./sheet";
export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuTrigger,
} from "./dropdown-menu";

// Feedback components
export { Alert, AlertDescription, AlertTitle } from "./alert";
export { Badge, badgeVariants } from "./badge";
export { Skeleton } from "./skeleton";
export { LoadingSpinner } from "./loading-spinner";

// Interactive components
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";
export { HoverCard, HoverCardContent, HoverCardTrigger } from "./hover-card";
export { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible";
export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from "./popover";

// Data display components
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";
export { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

// Advanced components
export { Avatar, AvatarFallback, AvatarImage } from "./avatar";
export { AvatarImage as CustomAvatarImage } from "./avatar-image";
export { ModeToggle } from "./theme-toggle";
export { Toggle, toggleVariants } from "./toggle";
export { ToggleGroup, ToggleGroupItem } from "./toggle-group";

// Sidebar components (if they exist)
export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "./sidebar";
