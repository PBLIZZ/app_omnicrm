"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  CheckSquare2,
  Calendar,
  Clock,
  Inbox,
  Star,
  Sun,
  Moon,
  Book,
  Plus,
  FolderOpen,
  Target,
  BarChart3,
  Settings,
  Zap,
  Users,
  Timer,
  Hammer,
  ChevronDown,
  BookOpen,
  Brain,
  ExternalLink,
  Info,
  MoreHorizontal,
  PlusCircle,
  Trash2,
} from "lucide-react";
import {
  Badge,
  CollapsibleContent,
  CollapsibleTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Collapsible } from "@radix-ui/react-collapsible";

// Mock data for active projects
const mockProjects = [
  { id: "1", name: "Website Redesign", tasks: 12, progress: 75, color: "bg-blue-500" },
  { id: "2", name: "Product Launch", tasks: 8, progress: 45, color: "bg-green-500" },
  { id: "3", name: "Client Onboarding", tasks: 5, progress: 90, color: "bg-purple-500" },
];

export function MomentumSidebar(): JSX.Element {
  const pathname = usePathname();

  return (
    <SidebarContent>
      {/* Task Management */}
      <SidebarGroup>
        <SidebarGroupLabel>Task Management</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/tasks"}>
              <Link href="/tasks" className="flex items-center w-full">
                <CheckSquare2 className="w-4 h-4 mr-3" />
                <span>Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/tasks/inbox" className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <Inbox className="w-4 h-4" />
                  <span>Inbox</span>
                </div>
                <Badge
                  variant="secondary"
                  className="h-5 flex-shrink-0 bg-muted text-muted-foreground border"
                >
                  12
                </Badge>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/tasks/today" className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <Star className="w-4 h-4" />
                  <span>Today</span>
                </div>
                <Badge
                  variant="destructive"
                  className="h-5 flex-shrink-0 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800"
                >
                  5
                </Badge>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/tasks/upcoming" className="flex items-center w-full">
                <Calendar className="w-4 h-4 mr-3" />
                <span>Upcoming</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/tasks/anytime" className="flex items-center w-full">
                <Sun className="w-4 h-4 mr-3" />
                <span>Anytime</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/tasks/someday" className="flex items-center w-full">
                <Moon className="w-4 h-4 mr-3" />
                <span>Someday</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/tasks/completed" className="flex items-center w-full">
                <Book className="w-4 h-4 mr-3" />
                <span>Completed</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

      {/* Quick Actions */}
      <SidebarGroup>
        <SidebarGroupLabel>Quick Actions</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/tasks/new" className="flex items-center w-full">
                <Plus className="w-4 h-4 mr-2" />
                <span>New Task</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/projects/new" className="flex items-center w-full">
                <FolderOpen className="w-4 h-4 mr-2" />
                <span>New Project</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/tasks/quick-capture" className="flex items-center w-full">
                <Zap className="w-4 h-4 mr-2" />
                <span>Quick Capture</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/tasks/time-tracker" className="flex items-center w-full">
                <Timer className="w-4 h-4 mr-2" />
                <span>Time Tracker</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

      {/* Active Projects */}
      <SidebarGroup>
        <SidebarGroupLabel>Active Projects</SidebarGroupLabel>
        <SidebarMenu>
          {mockProjects.map((project) => (
            <SidebarMenuItem key={project.id}>
              <SidebarMenuButton asChild className="h-auto p-2">
                <Link href={`/projects/${project.id}`} className="flex items-start w-full">
                  <div className="flex items-center gap-2 w-full">
                    <div
                      className={`flex-shrink-0 w-2 h-2 rounded-full ${project.color} mt-2`}
                    ></div>
                    <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{project.name}</span>
                        <Badge
                          variant="outline"
                          className="h-4 text-xs ml-1 bg-background text-foreground border-border"
                        >
                          {project.tasks}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${project.color}`}
                            style={{ width: `${project.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-muted-foreground">{project.progress}%</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>

      {/* Productivity Tools */}
      <Collapsible>
        <SidebarGroup>
          <SidebarGroupLabel>Productivity</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/tasks/focus-mode" className="flex items-center w-full">
                  <Target className="w-4 h-4 mr-2" />
                  <span>Focus Mode</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/tasks/pomodoro" className="flex items-center w-full">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>Pomodoro Timer</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/tasks/team" className="flex items-center w-full">
                  <Users className="w-4 h-4 mr-2" />
                  <span>Team Tasks</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/tasks/analytics" className="flex items-center w-full">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  <span>Analytics</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Settings */}
        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/tasks/settings" className="flex items-center w-full">
                  <Settings className="w-4 h-4 mr-2" />
                  <span>Task Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        {/* Recent Conversations */}
        <SidebarGroup>
          <SidebarGroupLabel>SidebarGroupLabel</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href={{ pathname: "/chat" }} className="flex items-center w-full">
                  <Hammer className="w-4 h-4 mr-3" />
                  <span>SidebarMenuButton</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Help Section with Collapsible Content */}
        <SidebarGroup>
          <SidebarGroupLabel asChild>
            <CollapsibleTrigger>
              Help
              <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
            </CollapsibleTrigger>
          </SidebarGroupLabel>
          <CollapsibleContent>
            <SidebarGroupContent>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Brain className="w-4 h-4 mr-2" />
                  <span>ADHD Insights</span>
                  <Badge className="ml-auto">New</Badge>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <Collapsible className="group/submenu">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton>
                      <BookOpen className="w-4 h-4 mr-2" />
                      <span>ADHD Resources</span>
                      <ChevronDown className="ml-auto transition-transform group-data-[state=open]/submenu:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <Popover>
                          <PopoverTrigger asChild>
                            <SidebarMenuSubButton>
                              <Info className="w-4 h-4 mr-2" />
                              <span>Focus Techniques</span>
                            </SidebarMenuSubButton>
                          </PopoverTrigger>
                          <PopoverContent
                            side="right"
                            align="start"
                            className="w-[var(--sidebar-width)] h-2/3"
                          >
                            <div className="space-y-2">
                              <h4 className="font-medium">Focus Techniques</h4>
                              <p className="text-sm text-muted-foreground">
                                General information about different aspects of ADHD focus
                                techniques.
                              </p>
                              <ul className="text-sm space-y-1 mt-2">
                                <li>• Time blocking method</li>
                                <li>• Pomodoro technique</li>
                                <li>• Environment optimization</li>
                                <li>• Task breakdown strategies</li>
                              </ul>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <Popover>
                          <PopoverTrigger asChild>
                            <SidebarMenuSubButton>
                              <Info className="w-4 h-4 mr-2" />
                              <span>Organization Tips</span>
                            </SidebarMenuSubButton>
                          </PopoverTrigger>
                          <PopoverContent
                            side="right"
                            align="start"
                            className="w-[var(--sidebar-width)] h-2/3"
                          >
                            <div className="space-y-2">
                              <h4 className="font-medium">Organization Tips</h4>
                              <p className="text-sm text-muted-foreground">
                                General information about different aspects of ADHD organization.
                              </p>
                              <ul className="text-sm space-y-1 mt-2">
                                <li>• Digital organization systems</li>
                                <li>• Physical workspace setup</li>
                                <li>• Calendar management</li>
                                <li>• Reminder systems</li>
                              </ul>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <Popover>
                          <PopoverTrigger asChild>
                            <SidebarMenuSubButton>
                              <Info className="w-4 h-4 mr-2" />
                              <span>Stress Management</span>
                            </SidebarMenuSubButton>
                          </PopoverTrigger>
                          <PopoverContent
                            side="right"
                            align="start"
                            className="w-[var(--sidebar-width)] h-2/3"
                          >
                            <div className="space-y-2">
                              <h4 className="font-medium">Stress Management</h4>
                              <p className="text-sm text-muted-foreground">
                                General information about different aspects of ADHD stress
                                management.
                              </p>
                              <ul className="text-sm space-y-1 mt-2">
                                <li>• Mindfulness practices</li>
                                <li>• Breathing exercises</li>
                                <li>• Physical activity benefits</li>
                                <li>• Social support systems</li>
                              </ul>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Settings className="w-4 h-4 mr-2" />
                  <span>Omni-Momentum</span>
                </SidebarMenuButton>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuAction>
                      <MoreHorizontal className="w-4 h-4" />
                      <span className="sr-only">Project Actions</span>
                    </SidebarMenuAction>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="start">
                    <DropdownMenuItem>
                      <Trash2 className="w-4 h-4 mr-2" />
                      <span>Delete Project</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <PlusCircle className="w-4 h-4 mr-2" />
                      <span>Add Task to Project</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      <span>Open Project</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
    </SidebarContent>
  );
}
