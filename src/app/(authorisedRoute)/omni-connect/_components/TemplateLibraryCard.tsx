"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, ArrowRight, Plus } from "lucide-react";

interface EmailTemplate {
  id: string;
  name: string;
  emailCount: number;
  category: string;
  description: string;
}

// Wellness-focused email templates based on user requirements
const defaultTemplates: EmailTemplate[] = [
  {
    id: "client-onboarding",
    name: "Client Onboarding",
    emailCount: 5,
    category: "client-journey",
    description: "Welcome sequence for new wellness clients",
  },
  {
    id: "session-followups",
    name: "Session Follow-ups",
    emailCount: 4,
    category: "client-care",
    description: "Post-session check-ins and wellness tips",
  },
  {
    id: "client-reengagement",
    name: "Client Re-engagement",
    emailCount: 3,
    category: "retention",
    description: "Win back lost clients with personalized outreach",
  },
  {
    id: "admin-notifications",
    name: "Administrative Notifications",
    emailCount: 6,
    category: "operations",
    description: "Booking, confirmations, reminders, and follow-ups",
  },
];

interface TemplateLibraryCardProps {
  onTemplateSelect?: (templateId: string) => void;
  onViewAll?: () => void;
  onCreateNew?: () => void;
}

export function TemplateLibraryCard({
  onTemplateSelect,
  onViewAll,
  onCreateNew,
}: TemplateLibraryCardProps): JSX.Element {
  const handleUseTemplate = (templateId: string): void => {
    onTemplateSelect?.(templateId);
  };

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case "client-journey":
        return "bg-blue-100 text-blue-800";
      case "client-care":
        return "bg-green-100 text-green-800";
      case "retention":
        return "bg-orange-100 text-orange-800";
      case "operations":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryEmoji = (category: string): string => {
    switch (category) {
      case "client-journey":
        return "🧘";
      case "client-care":
        return "💪";
      case "retention":
        return "🎯";
      case "operations":
        return "📅";
      default:
        return "📧";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Mail className="h-5 w-5 text-blue-600" />
          Template Library
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {defaultTemplates.map((template) => (
            <div
              key={template.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-3 flex-1">
                <span className="text-lg">{getCategoryEmoji(template.category)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">{template.name}</span>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${getCategoryColor(template.category)}`}
                    >
                      {template.emailCount} emails
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-1">{template.description}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleUseTemplate(template.id)}
                className="shrink-0 ml-2"
              >
                Use
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-4">
          <Button variant="default" size="sm" className="flex-1" onClick={onViewAll}>
            View All Templates
          </Button>
          <Button variant="outline" size="sm" onClick={onCreateNew}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
