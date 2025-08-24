"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, X } from "lucide-react";

interface NotificationsMenuProps {
  notificationCount: number;
}

export function NotificationsMenu({ notificationCount }: NotificationsMenuProps): JSX.Element {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center pulse"
            >
              {notificationCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-2">
          <h4 className="font-medium">Notifications</h4>
          <Button variant="ghost" size="sm" className="h-auto p-1">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <DropdownMenuSeparator />
        <div className="p-2">
          <div className="space-y-2">
            <div className="flex items-start gap-2 p-2 rounded border-l-2 border-green-500">
              <div className="text-green-500 mt-1">🟢</div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">Appointment confirmed</p>
                <p className="text-xs text-muted-foreground">Sarah M. - Tomorrow 3:00 PM</p>
                <p className="text-xs text-muted-foreground">2 minutes ago</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 rounded border-l-2 border-blue-500">
              <div className="text-blue-500 mt-1">🤖</div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">AI approval ready</p>
                <p className="text-xs text-muted-foreground">3 email drafts need review</p>
                <p className="text-xs text-muted-foreground">15 minutes ago</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 rounded border-l-2 border-orange-500">
              <div className="text-orange-500 mt-1">📧</div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">New client message</p>
                <p className="text-xs text-muted-foreground">John D. asked about pricing</p>
                <p className="text-xs text-muted-foreground">1 hour ago</p>
              </div>
            </div>
          </div>
        </div>
        <DropdownMenuSeparator />
        <div className="p-2 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1">
            Mark all as read
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            View all
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
