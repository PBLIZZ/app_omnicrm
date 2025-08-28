import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from "lucide-react";
import { WorkflowOverview } from "./_components/WorkflowOverview";

export default function OmniMomentumPage() {
  return (
    <div className="container mx-auto py-8 max-w-6xl">
      {/* Page Header */}
      <div className="mb-8">
        <Card className="border-2 border-primary/10 bg-gradient-to-r from-slate-50 to-purple-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 shadow-lg">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  OmniMomentum
                </CardTitle>
                <CardDescription className="text-base text-muted-foreground">
                  Productivity that flows with your wellness practice rhythm
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Workflow Selection */}
      <WorkflowOverview />
    </div>
  );
}
