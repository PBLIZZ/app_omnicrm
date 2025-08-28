"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Sun, Moon, Sunset, Star } from "lucide-react";
import { format } from "date-fns";

interface DailyFocusHeaderProps {
  date?: Date;
  energyLevel?: number; // 1-5 scale
  completedTasks?: number;
  totalTasks?: number;
  greeting?: string;
}

function EnergyIndicator({ level }: { level: number }) {
  const getEnergyIcon = () => {
    if (level >= 4) return <Sun className="h-4 w-4 text-yellow-500" />;
    if (level === 3) return <Sunset className="h-4 w-4 text-orange-500" />;
    if (level === 2) return <Moon className="h-4 w-4 text-blue-400" />;
    return <Star className="h-4 w-4 text-gray-400" />;
  };

  const getEnergyLabel = () => {
    if (level >= 4) return "High Energy";
    if (level === 3) return "Moderate Energy";
    if (level === 2) return "Low Energy";
    return "Very Low Energy";
  };

  const getEnergyColor = () => {
    if (level >= 4) return "bg-yellow-50 text-yellow-700 border-yellow-200";
    if (level === 3) return "bg-orange-50 text-orange-700 border-orange-200";
    if (level === 2) return "bg-blue-50 text-blue-700 border-blue-200";
    return "bg-gray-50 text-gray-700 border-gray-200";
  };

  return (
    <Badge variant="outline" className={`${getEnergyColor()} flex items-center gap-1`}>
      {getEnergyIcon()}
      {getEnergyLabel()}
    </Badge>
  );
}

function ProgressIndicator({ completed, total }: { completed: number; total: number }) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  const getProgressColor = () => {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 50) return "bg-blue-500";
    if (percentage >= 25) return "bg-yellow-500";
    return "bg-gray-300";
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm font-medium text-muted-foreground">
        {completed}/{total}
      </span>
    </div>
  );
}

function WellnessGreeting({ greeting, energyLevel }: { greeting?: string; energyLevel: number }) {
  const getPersonalizedGreeting = () => {
    if (greeting) return greeting;
    
    const hour = new Date().getHours();
    const baseGreeting = 
      hour < 12 ? "Good morning" :
      hour < 17 ? "Good afternoon" : 
      "Good evening";

    const energyResponse = energyLevel >= 4 ? 
      ", you're feeling energized today!" :
      energyLevel >= 3 ?
      ", ready to flow through your day?" :
      ", let's start gently.";

    return `${baseGreeting}${energyResponse}`;
  };

  return (
    <p className="text-sm text-muted-foreground">
      {getPersonalizedGreeting()}
    </p>
  );
}

export function DailyFocusHeader({
  date = new Date(),
  energyLevel = 3,
  completedTasks = 0,
  totalTasks = 0,
  greeting,
}: DailyFocusHeaderProps) {
  const formattedDate = format(date, "EEEE, MMMM do, yyyy");
  
  return (
    <Card className="border-2 border-primary/10 bg-gradient-to-r from-primary/5 to-transparent">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="text-sm font-medium">{formattedDate}</span>
          </div>
          <EnergyIndicator level={energyLevel} />
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Greeting */}
          <div>
            <CardTitle className="text-2xl mb-1">Today's Focus</CardTitle>
            <WellnessGreeting greeting={greeting} energyLevel={energyLevel} />
          </div>

          {/* Progress */}
          {totalTasks > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Daily Progress</span>
                <span className="text-xs text-muted-foreground">
                  {Math.round((completedTasks / totalTasks) * 100)}% complete
                </span>
              </div>
              <ProgressIndicator completed={completedTasks} total={totalTasks} />
            </div>
          )}

          {/* Motivational message based on progress */}
          {totalTasks > 0 && (
            <div className="text-xs text-muted-foreground text-center py-2">
              {completedTasks === 0 && "Ready to make today meaningful? Let's begin! 🌱"}
              {completedTasks > 0 && completedTasks < totalTasks && "You're making beautiful progress! Keep flowing! ✨"}
              {completedTasks === totalTasks && "Incredible! You've completed today's focus. Time to rest and celebrate! 🎉"}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}