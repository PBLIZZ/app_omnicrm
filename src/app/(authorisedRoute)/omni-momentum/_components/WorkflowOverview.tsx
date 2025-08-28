"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Target, 
  Zap, 
  BarChart3, 
  ArrowRight, 
  CheckCircle,
  Grid3X3,
  Calendar
} from "lucide-react";
import { useRouter } from "next/navigation";

interface WorkflowCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  route: string;
  color: string;
  features: string[];
  status: "ready" | "beta" | "coming-soon";
}

export function WorkflowOverview() {
  const router = useRouter();

  const workflows: WorkflowCard[] = [
    {
      id: "daily-focus",
      title: "Daily Focus",
      description: "Start your day with clarity - Today's Top 3 priorities with AI-powered insights",
      icon: <Zap className="h-6 w-6" />,
      route: "/omni-momentum/daily-focus",
      color: "from-blue-500 to-purple-600",
      features: [
        "Today's Top 3 priorities",
        "AI-enhanced task capture", 
        "Energy-based suggestions",
        "Schedule integration"
      ],
      status: "ready"
    },
    {
      id: "matrix",
      title: "Strategic Matrix",
      description: "Organize tasks by urgency and importance using the proven Eisenhower Matrix",
      icon: <Grid3X3 className="h-6 w-6" />,
      route: "/omni-momentum/matrix",
      color: "from-purple-500 to-pink-600",
      features: [
        "4-quadrant organization",
        "Strategic insights",
        "Priority recommendations",
        "Delegation guidance"
      ],
      status: "ready"
    }
  ];

  const handleWorkflowSelect = (route: string) => {
    router.push(route);
  };

  const getStatusBadge = (status: WorkflowCard["status"]) => {
    switch (status) {
      case "ready":
        return <Badge className="bg-green-100 text-green-700">Ready</Badge>;
      case "beta":
        return <Badge variant="secondary">Beta</Badge>;
      case "coming-soon":
        return <Badge variant="outline">Coming Soon</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Workflow Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {workflows.map((workflow) => (
          <Card 
            key={workflow.id}
            className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-2 hover:border-primary/20"
            onClick={() => workflow.status === "ready" && handleWorkflowSelect(workflow.route)}
          >
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className={`p-3 rounded-lg bg-gradient-to-br ${workflow.color}`}>
                  <div className="text-white">
                    {workflow.icon}
                  </div>
                </div>
                {getStatusBadge(workflow.status)}
              </div>
              
              <div className="space-y-2">
                <CardTitle className="text-xl group-hover:text-primary transition-colors">
                  {workflow.title}
                </CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {workflow.description}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Features */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Key Features</h4>
                <ul className="space-y-1">
                  {workflow.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <Button 
                className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                variant={workflow.status === "ready" ? "default" : "outline"}
                disabled={workflow.status !== "ready"}
                onClick={(e) => {
                  e.stopPropagation();
                  if (workflow.status === "ready") {
                    handleWorkflowSelect(workflow.route);
                  }
                }}
              >
                {workflow.status === "ready" ? (
                  <>
                    Start {workflow.title}
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                ) : (
                  `${workflow.status === "beta" ? "Try Beta" : "Coming Soon"}`
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Getting Started */}
      <Card className="bg-gradient-to-r from-slate-50 to-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Getting Started with OmniMomentum
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                Morning Routine
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Start each day with <strong>Daily Focus</strong> to identify your Top 3 priorities. 
                Let AI suggest tasks based on your energy level and schedule.
              </p>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-purple-600" />
                Weekly Planning
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Use the <strong>Strategic Matrix</strong> for weekly reviews to organize tasks 
                by urgency and importance, preventing crisis management.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}