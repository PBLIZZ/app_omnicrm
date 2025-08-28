"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  MapPin, 
  Users, 
  BookOpen, 
  TrendingUp, 
  Clock, 
  ArrowRight,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  type: 'client-program' | 'content-creation' | 'business-growth';
  progress: number;
  status: 'on-track' | 'needs-attention' | 'completed';
  dueDate: string;
  nextAction: string;
  clientCount?: number;
}

export function PathwaysOverviewWidget() {
  const { toast } = useToast();
  
  // Mock active projects - would come from API
  const activeProjects: Project[] = [
    {
      id: '1',
      name: 'Q1 Wellness Programs',
      type: 'client-program',
      progress: 75,
      status: 'on-track',
      dueDate: 'Mar 31',
      nextAction: 'Schedule group check-ins',
      clientCount: 8
    },
    {
      id: '2', 
      name: 'Mindful Mornings Content',
      type: 'content-creation',
      progress: 45,
      status: 'needs-attention',
      dueDate: 'Feb 15',
      nextAction: 'Record episodes 4-6'
    },
    {
      id: '3',
      name: 'Referral Partnership Program', 
      type: 'business-growth',
      progress: 90,
      status: 'on-track',
      dueDate: 'Feb 28',
      nextAction: 'Launch partner onboarding'
    }
  ];

  const getProjectIcon = (type: Project['type']) => {
    switch (type) {
      case 'client-program': return Users;
      case 'content-creation': return BookOpen;
      case 'business-growth': return TrendingUp;
      default: return MapPin;
    }
  };

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'on-track': return 'bg-green-100 text-green-800 border-green-200';
      case 'needs-attention': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: Project['status']) => {
    switch (status) {
      case 'on-track': return CheckCircle2;
      case 'needs-attention': return AlertTriangle;
      case 'completed': return CheckCircle2;
      default: return Clock;
    }
  };

  const getTypeLabel = (type: Project['type']) => {
    switch (type) {
      case 'client-program': return 'Client Program';
      case 'content-creation': return 'Content';
      case 'business-growth': return 'Business';
      default: return 'Project';
    }
  };

  const handleProjectClick = (project: Project) => {
    toast({
      title: `📋 ${project.name}`,
      description: `Next: ${project.nextAction}`
    });
  };

  const handleViewAll = () => {
    toast({
      title: "🗺️ Opening Pathways",
      description: "Loading complete project management view..."
    });
  };

  const overallProgress = activeProjects.reduce((acc, project) => acc + project.progress, 0) / activeProjects.length;
  const needsAttentionCount = activeProjects.filter(p => p.status === 'needs-attention').length;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Active Pathways</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={handleViewAll}>
            View All
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
        <CardDescription>
          Your wellness business projects and client programs
        </CardDescription>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{activeProjects.length}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{Math.round(overallProgress)}%</p>
            <p className="text-xs text-muted-foreground">Progress</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">{needsAttentionCount}</p>
            <p className="text-xs text-muted-foreground">Need Focus</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {activeProjects.map((project) => {
          const Icon = getProjectIcon(project.type);
          const StatusIcon = getStatusIcon(project.status);
          
          return (
            <div 
              key={project.id}
              className="p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer group"
              onClick={() => handleProjectClick(project)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <h4 className="font-medium text-sm truncate">{project.name}</h4>
                  {project.clientCount && (
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {project.clientCount} clients
                    </Badge>
                  )}
                </div>
                <Badge variant="outline" className={`text-xs shrink-0 ${getStatusColor(project.status)}`}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {project.status.replace('-', ' ')}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{getTypeLabel(project.type)}</span>
                  <span className="font-medium">Due {project.dueDate}</span>
                </div>
                
                <Progress value={project.progress} className="h-1.5" />
                
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Next: {project.nextAction}
                  </p>
                  <span className="text-xs font-medium">{project.progress}%</span>
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Quick Actions */}
        <div className="pt-2 border-t">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="justify-start">
              <Users className="h-4 w-4 mr-2" />
              New Program
            </Button>
            <Button variant="outline" size="sm" className="justify-start">
              <BookOpen className="h-4 w-4 mr-2" />
              Content Plan
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}