"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { EnergyTrackerWidget } from "./widgets/EnergyTrackerWidget";
import { PriorityInboxWidget } from "./widgets/PriorityInboxWidget";
import { PathwaysOverviewWidget } from "./widgets/PathwaysOverviewWidget";
import { Settings, Target } from "lucide-react";

interface OmniMomentumClientWrapperProps {
  activeView?: string;
  onViewChange?: (view: string) => void;
}

export function OmniMomentumClientWrapper({
  activeView = "overview",
  onViewChange,
}: OmniMomentumClientWrapperProps) {
  const { toast } = useToast();

  // Widget customization state - user can choose which widgets appear
  const [customizedWidgets] = useState(["energy-tracker", "priority-inbox", "pathways-overview"]);

  // Handle task completion celebrations
  const handleTasksCompleted = () => {
    // Additional celebration logic can go here
    // The toast is handled within PriorityInboxWidget
  };

  // Handle energy tracking submission
  const handleEnergySubmit = (energyData: {
    energy: number;
    mood: string;
    sleep: number;
    timestamp: Date;
  }) => {
    // This data feeds AI insights in Goals/Pulse pages
    toast({
      title: " Wellness Check Complete!",
      description: `Energy: ${energyData.energy}/5 | Mood: ${energyData.mood} | Sleep: ${energyData.sleep}h`,
    });
  };

  // Handle quick thought capture
  const handleQuickCapture = (_thoughts: string[]) => {
    // AI organizes these into meaningful tasks/projects
    // This would integrate with backend AI processing
  };

  // Handle widget customization
  const handleCustomizeWidgets = () => {
    toast({
      title: "<� Widget Customization",
      description: "Widget customization panel coming soon!",
    });
  };

  // Landing page overview (default view)
  if (activeView === "overview") {
    return (
      <div className="space-y-6">
        {/* Customize Controls */}
        <div className="flex justify-end mb-4">
          <Button variant="outline" size="sm" onClick={handleCustomizeWidgets}>
            <Settings className="h-4 w-4 mr-2" />
            Customize View
          </Button>
        </div>

        {/* Main Widgets Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Priority Inbox takes 2/3 of space */}
          <div className="lg:col-span-2">
            {customizedWidgets.includes("priority-inbox") && (
              <PriorityInboxWidget
                onTasksCompleted={handleTasksCompleted}
                onQuickAdd={handleQuickCapture}
              />
            )}
          </div>

          {/* Right column widgets */}
          <div className="space-y-6">
            {customizedWidgets.includes("energy-tracker") && (
              <EnergyTrackerWidget onSubmit={handleEnergySubmit} />
            )}
          </div>
        </div>

        {/* Bottom widget - Pathways Overview */}
        {customizedWidgets.includes("pathways-overview") && <PathwaysOverviewWidget />}
      </div>
    );
  }

  // Detailed views for sidebar navigation (placeholders for now)
  return (
    <div className="space-y-6">
      <Card className="p-8">
        <div className="text-center space-y-4">
          <div className="p-4 rounded-full bg-muted w-16 h-16 mx-auto flex items-center justify-center">
            <Target className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">
              {activeView?.charAt(0).toUpperCase() + activeView?.slice(1)} View
            </h3>
            <p className="text-muted-foreground">
              Detailed {activeView} management will be built here
            </p>
          </div>
          <Button onClick={() => onViewChange?.("overview")}>Back to Overview</Button>
        </div>
      </Card>
    </div>
  );
}
