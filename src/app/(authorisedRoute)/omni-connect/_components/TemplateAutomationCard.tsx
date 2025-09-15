"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Plus, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface EmailTemplate {
  id: string;
  name: string;
  emailCount: number;
  category: string;
  description: string;
  status: "active" | "draft" | "paused";
  usage: number;
}

interface TemplateAutomationCardProps {
  templates?: EmailTemplate[];
  onTemplateSelect?: (templateId: string) => void;
  onViewAll?: () => void;
  onCreateNew?: () => void;
}

export function TemplateAutomationCard({
  templates = [],
  onTemplateSelect,
  onViewAll,
  onCreateNew,
}: TemplateAutomationCardProps): JSX.Element {
  const handleUseTemplate = (templateId: string): void => {
    onTemplateSelect?.(templateId);
  };

  const activeTemplates = templates.filter((t) => t.status === "active").length;
  const totalUsage = templates.reduce((sum, t) => sum + (t.usage ?? 0), 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-purple-600" />
            Template Automation
          </CardTitle>
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {activeTemplates} Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {templates.length > 0 ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{totalUsage}</div>
                <div className="text-muted-foreground">Total Usage</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {Math.round((totalUsage * 2.5) / 60)}h
                </div>
                <div className="text-muted-foreground">Time Saved</div>
              </div>
            </div>

            {/* Active Templates */}
            <div className="space-y-2">
              {templates.slice(0, 3).map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium truncate">{template.name}</span>
                        <Badge
                          variant={template.status === "active" ? "default" : "secondary"}
                          className="text-xs px-1 py-0"
                        >
                          {template.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {template.description}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleUseTemplate(template.id)}
                    className="shrink-0 h-8 w-8 p-0"
                  >
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">No automation templates yet.</div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={onViewAll} asChild>
            <Link href="/omni-connect?view=template-library">View All</Link>
          </Button>
          <Button
            variant="default"
            size="sm"
            className="flex-1 gap-2"
            onClick={onCreateNew}
            asChild
          >
            <Link href="/omni-connect?view=template-library&action=create">
              <Plus className="h-4 w-4" />
              Create
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
