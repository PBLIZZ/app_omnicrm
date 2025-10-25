"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FileText, Plus, Search, Edit3, Copy, Eye, Mail, Star } from "lucide-react";

interface EmailTemplate {
  id: string;
  name: string;
  category: "welcome" | "follow-up" | "booking" | "reminder" | "promotional" | "support";
  subject: string;
  content: string;
  usage: number;
  lastUsed?: string;
  isActive: boolean;
  isFavorite?: boolean;
}

// Type guard for category validation
function isValidCategory(value: string): value is EmailTemplate["category"] {
  return ["welcome", "follow-up", "booking", "reminder", "promotional", "support"].includes(value);
}

export function TemplateLibraryView(): JSX.Element {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState<{
    name: string;
    category: EmailTemplate["category"];
    subject: string;
    content: string;
  }>({
    name: "",
    category: "welcome",
    subject: "",
    content: "",
  });

  // TODO: Replace with real email templates from database
  // Templates should be generated from actual email patterns and LLM analysis
  const templates: EmailTemplate[] = [];

  const categories = [
    { value: "all", label: "All Templates", count: templates.length },
    {
      value: "welcome",
      label: "Welcome",
      count: templates.filter((t) => t.category === "welcome").length,
    },
    {
      value: "booking",
      label: "Booking",
      count: templates.filter((t) => t.category === "booking").length,
    },
    {
      value: "follow-up",
      label: "Follow-up",
      count: templates.filter((t) => t.category === "follow-up").length,
    },
    {
      value: "reminder",
      label: "Reminder",
      count: templates.filter((t) => t.category === "reminder").length,
    },
    {
      value: "promotional",
      label: "Promotional",
      count: templates.filter((t) => t.category === "promotional").length,
    },
  ];

  const filteredTemplates = templates.filter((template) => {
    const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryBadgeColor = (category: EmailTemplate["category"]): string => {
    const colors = {
      welcome: "bg-green-100 text-green-800",
      booking: "bg-blue-100 text-blue-800",
      "follow-up": "bg-purple-100 text-purple-800",
      reminder: "bg-yellow-100 text-yellow-800",
      promotional: "bg-pink-100 text-pink-800",
      support: "bg-gray-100 text-gray-800",
    };
    return colors[category];
  };

  const handleCreateTemplate = (): void => {
    // Implementation for creating new template
    setIsCreateDialogOpen(false);
    setNewTemplate({ name: "", category: "welcome", subject: "", content: "" });
  };

  const handleUseTemplate = (template: EmailTemplate): void => {
    // Implementation for using template
    // TODO: Implement template usage functionality
    // Template: template.name
    void template; // Explicitly mark as intentionally unused
  };

  const handleCopyTemplate = (template: EmailTemplate): void => {
    // Implementation for copying template
    navigator.clipboard
      .writeText(template.content)
      .then(() => {
        // Template copied to clipboard successfully
        // TODO: Show success toast notification
      })
      .catch((err: unknown) => {
        console.error("Failed to copy template:", template.name, err);
        // TODO: Show error toast notification
      });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Email Template Library
            </CardTitle>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Template</DialogTitle>
                  <DialogDescription>
                    Design a reusable email template for your wellness business.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Template Name</label>
                      <Input
                        placeholder="e.g., Welcome New Students"
                        value={newTemplate.name}
                        onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Category</label>
                      <select
                        className="w-full p-2 border rounded-md"
                        value={newTemplate.category}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (isValidCategory(value)) {
                            setNewTemplate({ ...newTemplate, category: value });
                          }
                        }}
                      >
                        <option value="welcome">Welcome</option>
                        <option value="booking">Booking</option>
                        <option value="follow-up">Follow-up</option>
                        <option value="reminder">Reminder</option>
                        <option value="promotional">Promotional</option>
                        <option value="support">Support</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Subject Line</label>
                    <Input
                      placeholder="Use {{variables}} for personalization"
                      value={newTemplate.subject}
                      onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email Content</label>
                    <Textarea
                      placeholder="Write your email template here. Use {{firstName}}, {{className}}, etc. for personalization"
                      rows={8}
                      value={newTemplate.content}
                      onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTemplate}>Create Template</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search templates by name, subject, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {categories.map((category) => (
                <Button
                  key={category.value}
                  variant={selectedCategory === category.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.value)}
                  className="whitespace-nowrap"
                >
                  {category.label} ({category.count})
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      {template.name}
                      {template.isFavorite && (
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">{template.subject}</p>
                  </div>
                </div>
                <Badge className={getCategoryBadgeColor(template.category)}>
                  {template.category}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground line-clamp-3">{template.content}</div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span>Used {template.usage} times</span>
                  {template.lastUsed && (
                    <span>Last: {new Date(template.lastUsed).toLocaleDateString()}</span>
                  )}
                </div>
                <div
                  className={`text-xs px-2 py-1 rounded-full ${template.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}
                >
                  {template.isActive ? "Active" : "Inactive"}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleUseTemplate(template)}
                  className="flex-1 gap-1"
                >
                  <Mail className="h-4 w-4" />
                  Use
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedTemplate(template)}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleCopyTemplate(template)}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Edit3 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No templates found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || selectedCategory !== "all"
                ? "Try adjusting your search or filters"
                : "Create your first email template to get started"}
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Template
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Template Preview Dialog */}
      {selectedTemplate && (
        <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {selectedTemplate.name}
              </DialogTitle>
              <DialogDescription>{selectedTemplate.subject}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <pre className="whitespace-pre-wrap text-sm">{selectedTemplate.content}</pre>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                Close
              </Button>
              <Button onClick={() => handleUseTemplate(selectedTemplate)}>Use Template</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
