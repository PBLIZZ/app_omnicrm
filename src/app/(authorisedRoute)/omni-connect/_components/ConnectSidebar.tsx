"use client";

import {
  Users,
  LetterTextIcon,
  ChevronDown,
  MoreHorizontal,
  Hammer,
  Brain,
  BookOpen,
  Settings,
  Info,
  Trash2,
  PlusCircle,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import {
  Collapsible,
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
import { Badge } from "@/components/ui/badge";

export function ConnectSidebar(): JSX.Element {

  return (
    <SidebarContent>
      {/* Communications Navigation */}
      <SidebarGroup>
        <SidebarGroupLabel>SidebarGroupLabel</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href={{ pathname: "/chat" }} className="flex items-center w-full">
                <LetterTextIcon className="w-4 h-4 mr-3" />
                <span>SidebarMenuButton</span>
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
              <Link href={{ pathname: "/contacts" }} className="flex items-center w-full">
                <Users className="w-4 h-4 mr-2" />
                <span>Manage Contacts</span>
              </Link>
            </SidebarMenuButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuAction>
                  <MoreHorizontal />
                </SidebarMenuAction>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start">
                <DropdownMenuItem>
                  <span>Edit Project</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <span>Delete Project</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
      <Collapsible defaultOpen className="group/collapsible">
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
