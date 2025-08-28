import {
  Plus,
  Search,
  Settings,
  Filter,
  MoreVertical,
  Star,
  Archive,
  Trash2,
  Paperclip,
  Send,
  Phone,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export default function MessagesPage(): JSX.Element {
  // Mock conversations
  const conversations = [
    {
      id: "1",
      name: "Sarah Johnson",
      lastMessage:
        "Thanks for the consultation yesterday. When would be a good time for our next session?",
      time: "2m ago",
      unread: 2,
      avatar: "/avatars/sarah.jpg",
      status: "online",
      type: "client",
    },
    {
      id: "2",
      name: "Team Support",
      lastMessage:
        "We've resolved the calendar sync issue. Everything should be working normally now.",
      time: "1h ago",
      unread: 0,
      avatar: "/avatars/support.jpg",
      status: "away",
      type: "support",
    },
    {
      id: "3",
      name: "Mike Chen",
      lastMessage: "Can we reschedule our meeting to Thursday instead?",
      time: "3h ago",
      unread: 1,
      avatar: "/avatars/mike.jpg",
      status: "offline",
      type: "client",
    },
    {
      id: "4",
      name: "Emma Davis",
      lastMessage: "I've sent over the wellness plan documents for review.",
      time: "1d ago",
      unread: 0,
      avatar: "/avatars/emma.jpg",
      status: "online",
      type: "client",
    },
  ];

  // Mock current conversation messages
  const currentMessages = [
    {
      id: "1",
      sender: "Sarah Johnson",
      content:
        "Hi! I wanted to follow up on our session yesterday. The breathing exercises you taught me have been really helpful.",
      time: "10:30 AM",
      isOwn: false,
    },
    {
      id: "2",
      sender: "You",
      content:
        "That's wonderful to hear! I'm so glad the techniques are working for you. How have you been feeling overall?",
      time: "10:35 AM",
      isOwn: true,
    },
    {
      id: "3",
      sender: "Sarah Johnson",
      content:
        "Much better actually. My stress levels have decreased noticeably. When would be a good time for our next session?",
      time: "10:45 AM",
      isOwn: false,
    },
  ];

  const selectedConversation = conversations[0] ?? null;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
          <p className="text-muted-foreground">Communicate with clients and team members</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Message
          </Button>
        </div>
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
        {/* Conversations List */}
        <div className="w-80 flex flex-col">
          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Conversations</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>All Messages</DropdownMenuItem>
                    <DropdownMenuItem>Unread</DropdownMenuItem>
                    <DropdownMenuItem>Clients</DropdownMenuItem>
                    <DropdownMenuItem>Team</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search conversations..." className="pl-10" />
              </div>
            </CardHeader>

            <CardContent className="flex-1 p-0 overflow-hidden">
              <div className="space-y-1 p-3 overflow-y-auto max-h-full">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                      conversation.id === "1" ? "bg-accent" : "hover:bg-accent/50",
                    )}
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={conversation.avatar} />
                        <AvatarFallback>
                          {conversation.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
                          conversation.status === "online"
                            ? "bg-green-500"
                            : conversation.status === "away"
                              ? "bg-yellow-500"
                              : "bg-gray-400",
                        )}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">{conversation.name}</p>
                        <div className="flex items-center gap-1">
                          {conversation.unread > 0 && (
                            <Badge variant="default" className="h-5 min-w-5 text-xs px-1.5">
                              {conversation.unread}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">{conversation.time}</span>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {conversation.lastMessage}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          <Card className="flex-1 flex flex-col">
            {/* Chat Header */}
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedConversation?.avatar} />
                    <AvatarFallback>
                      {selectedConversation?.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("") ?? "??"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedConversation?.name ?? "Unknown"}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {selectedConversation?.status ?? "offline"} •{" "}
                      {selectedConversation?.type ?? "unknown"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Star className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem>
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>

            <Separator />

            {/* Messages */}
            <CardContent className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-4">
                {currentMessages.map((message) => (
                  <div
                    key={message.id}
                    className={cn("flex gap-3", message.isOwn ? "justify-end" : "justify-start")}
                  >
                    {!message.isOwn && (
                      <Avatar className="h-8 w-8 mt-1">
                        <AvatarImage src={selectedConversation?.avatar} />
                        <AvatarFallback className="text-xs">
                          {selectedConversation?.name
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("") ?? "??"}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div className={cn("max-w-xs lg:max-w-md", message.isOwn ? "order-first" : "")}>
                      <div
                        className={cn(
                          "rounded-lg px-3 py-2 text-sm",
                          message.isOwn ? "bg-primary text-primary-foreground" : "bg-muted",
                        )}
                      >
                        {message.content}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 px-1">{message.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>

            <Separator />

            {/* Message Input */}
            <CardContent className="p-4">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Textarea
                    placeholder="Type your message..."
                    className="min-h-[40px] max-h-32 resize-none"
                    rows={1}
                  />
                </div>

                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button size="sm">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
