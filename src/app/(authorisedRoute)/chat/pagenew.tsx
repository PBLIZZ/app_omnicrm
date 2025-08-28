"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, User, Bot, Loader2, Plus, MessageSquare, Trash2, MoreVertical, Edit, Check, X } from "lucide-react";
import { useAuth } from "@/lib/auth/providers";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

function formatThreadDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = diffInMs / (1000 * 60 * 60);
  const diffInDays = diffInHours / 24;

  if (diffInHours < 1) {
    const minutes = Math.floor(diffInMs / (1000 * 60));
    return minutes <= 1 ? "Just now" : `${minutes}m ago`;
  } else if (diffInHours < 24) {
    const hours = Math.floor(diffInHours);
    return `${hours}h ago`;
  } else if (diffInDays < 7) {
    const days = Math.floor(diffInDays);
    return `${days}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatThread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export default function ChatPage(): JSX.Element {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { user, isLoading: authLoading } = useAuth();

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load threads on component mount
  useEffect(() => {
    loadThreads();
  }, []);

  // Load messages when thread changes
  useEffect(() => {
    if (currentThreadId) {
      loadMessages(currentThreadId);
    } else {
      setMessages([]);
    }
  }, [currentThreadId]);

  const loadThreads = async () => {
    try {
      const response = await fetch("/api/chat/threads");
      if (response.ok) {
        const data = await response.json();
        setThreads(data.threads || []);
        // Select first thread if no current thread
        if (!currentThreadId && data.threads?.length > 0) {
          setCurrentThreadId(data.threads[0].id);
        }
      }
    } catch (error) {
      console.error("Error loading threads:", error);
    } finally {
      setThreadsLoading(false);
    }
  };

  const loadMessages = async (threadId: string) => {
    try {
      const response = await fetch(`/api/chat/threads/${threadId}/messages`);
      if (response.ok) {
        const data = await response.json();
        const formattedMessages = data.messages?.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content?.text || msg.content,
          timestamp: new Date(msg.createdAt),
        })) || [];
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const createNewThread = async (firstMessage?: string) => {
    try {
      const response = await fetch("/api/chat/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title: generateThreadTitle(firstMessage),
          message: firstMessage 
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        const newThread = data.thread;
        setThreads(prev => [newThread, ...prev]);
        setCurrentThreadId(newThread.id);
        setMessages([]);
        return newThread.id;
      }
    } catch (error) {
      console.error("Error creating thread:", error);
    }
    return null;
  };

  const generateThreadTitle = (message?: string): string => {
    if (!message || typeof message !== 'string') {
      return "New Chat";
    }
    
    const cleaned = message.trim().replace(/\n+/g, ' ').replace(/\s+/g, ' ');
    if (cleaned.length <= 40) {
      return cleaned;
    }
    
    const truncated = cleaned.substring(0, 40);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > 20) {
      return truncated.substring(0, lastSpace) + '...';
    }
    
    return truncated + '...';
  };

  const startRenaming = (threadId: string, currentTitle: string) => {
    setEditingThreadId(threadId);
    setEditingTitle(currentTitle);
  };

  const cancelRenaming = () => {
    setEditingThreadId(null);
    setEditingTitle("");
  };

  const saveRename = async (threadId: string) => {
    if (!editingTitle.trim()) return;

    try {
      const response = await fetch(`/api/chat/threads/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editingTitle.trim() }),
      });

      if (response.ok) {
        setThreads(prev => 
          prev.map(thread => 
            thread.id === threadId 
              ? { ...thread, title: editingTitle.trim() }
              : thread
          )
        );
        cancelRenaming();
      }
    } catch (error) {
      console.error("Error renaming thread:", error);
    }
  };

  const deleteThread = async (threadId: string) => {
    if (!confirm("Are you sure you want to delete this chat? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/chat/threads/${threadId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setThreads(prev => prev.filter(thread => thread.id !== threadId));
        
        // If we're deleting the current thread, clear the selection
        if (currentThreadId === threadId) {
          setCurrentThreadId(null);
          setMessages([]);
        }
      }
    } catch (error) {
      console.error("Error deleting thread:", error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const messageText = input;
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // If no current thread, create one with the message as title
    let threadId = currentThreadId;
    if (!threadId) {
      threadId = await createNewThread(messageText);
      if (!threadId) {
        setIsLoading(false);
        return;
      }
    }

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: messageText,
          threadId: threadId 
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Refresh threads to show updated timestamp
      loadThreads();

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                
                // Handle content updates
                if (parsed.content) {
                  setMessages(prev => 
                    prev.map(msg => 
                      msg.id === assistantMessage.id 
                        ? { ...msg, content: msg.content + parsed.content }
                        : msg
                    )
                  );
                }
                
                // Handle title updates
                if (parsed.titleUpdate && threadId) {
                  setThreads(prev => 
                    prev.map(thread => 
                      thread.id === threadId 
                        ? { ...thread, title: parsed.titleUpdate }
                        : thread
                    )
                  );
                }
              } catch (e) {
                console.error("Error parsing SSE data:", e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-full max-h-[calc(100vh-8rem)]" data-testid="chat-page">
      {/* Sidebar with thread history */}
      <div className="w-80 border-r bg-background/50 flex flex-col">
        <div className="p-4 border-b">
          <Button 
            onClick={() => createNewThread()}
            className="w-full justify-start gap-2"
            data-testid="new-chat-button"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {threadsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : threads.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 px-4">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No chats yet. Start a new conversation!</p>
              </div>
            ) : (
              threads.map((thread) => (
                <div
                  key={thread.id}
                  className={`group relative flex items-center rounded-md ${
                    currentThreadId === thread.id ? "bg-secondary" : "hover:bg-accent"
                  }`}
                >
                  {editingThreadId === thread.id ? (
                    <div className="flex-1 flex items-center gap-2 p-3">
                      <Input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            saveRename(thread.id);
                          } else if (e.key === "Escape") {
                            cancelRenaming();
                          }
                        }}
                        className="flex-1 h-8 text-sm"
                        autoFocus
                        data-testid={`edit-thread-input-${thread.id}`}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => saveRename(thread.id)}
                        data-testid={`save-rename-${thread.id}`}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={cancelRenaming}
                        data-testid={`cancel-rename-${thread.id}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        className="flex-1 justify-start text-left h-auto p-3 whitespace-normal"
                        onClick={() => setCurrentThreadId(thread.id)}
                        data-testid={`thread-${thread.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{thread.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatThreadDate(thread.updatedAt)}
                          </div>
                        </div>
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 focus:opacity-100 mr-2"
                            onClick={(e) => e.stopPropagation()}
                            data-testid={`thread-menu-${thread.id}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              startRenaming(thread.id, thread.title);
                            }}
                            data-testid={`rename-thread-${thread.id}`}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteThread(thread.id);
                            }}
                            className="text-destructive focus:text-destructive"
                            data-testid={`delete-thread-${thread.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {currentThreadId ? (
          <Card className="flex-1 flex flex-col border-0 rounded-none">
            <CardHeader className="flex-shrink-0 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-semibold">AI Assistant</h1>
                  <p className="text-sm text-muted-foreground">
                    Ask questions about your contacts, schedule, or get general help
                  </p>
                </div>
                {user && (
                  <div className="text-xs text-muted-foreground">
                    {user.email}
                  </div>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col min-h-0 p-0">
              <ScrollArea className="flex-1 px-6" ref={scrollAreaRef}>
                <div className="space-y-4 py-4">
                  {messages.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Start a conversation with your AI assistant!</p>
                    </div>
                  )}
                  
                  {messages.map((message) => (
                    <div key={message.id} className="flex items-start gap-3" data-testid={`message-${message.role}`}>
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        {message.role === "user" ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {message.role === "user" ? "You" : "Assistant"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {message.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                      </div>
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Assistant</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              <div className="border-t bg-background p-4">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Ask me anything..."
                    disabled={isLoading}
                    className="flex-1"
                    data-testid="chat-input"
                  />
                  <Button 
                    onClick={sendMessage} 
                    disabled={!input.trim() || isLoading}
                    size="icon"
                    data-testid="send-button"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h2 className="text-xl font-semibold mb-2">Welcome to AI Assistant</h2>
              <p className="mb-4">Select a chat from the sidebar or start a new conversation</p>
              <Button onClick={createNewThread} className="gap-2">
                <Plus className="h-4 w-4" />
                Start New Chat
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}