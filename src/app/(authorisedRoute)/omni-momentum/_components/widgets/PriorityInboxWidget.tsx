"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  Target, 
  Inbox,
  Clock,
  User,
  Bot,
  Calendar,
  FolderOpen
} from 'lucide-react';

interface Task {
  id: string;
  text: string;
  description?: string;
  completed: boolean;
  impact: 'high' | 'medium' | 'low';
  category: string;
  project?: string;
  dueDate?: string;
  dueTime?: string;
  estimatedTime?: string;
  urgency: 'urgent' | 'normal' | 'low';
  owner: 'OmniBot' | 'User';
  workspace: 'Personal' | 'Self Care' | 'Business Admin' | 'Client Work';
}

interface PriorityInboxWidgetProps {
  onTasksCompleted: () => void;
  onQuickAdd: (tasks: string[]) => void;
}

export function PriorityInboxWidget({ onTasksCompleted, onQuickAdd }: PriorityInboxWidgetProps) {
  const { toast } = useToast();
  const [inputValue, setInputValue] = useState('');
  const [isMultiLine, setIsMultiLine] = useState(false);
  
  // Mock top 3 priority tasks - these would come from AI analysis
  const [priorityTasks, setPriorityTasks] = useState<Task[]>([
    {
      id: '1',
      text: "Complete Sarah's wellness plan review", 
      description: "Review progress notes and prepare next session recommendations",
      completed: false,
      impact: 'high',
      category: 'client-care',
      project: 'Client Programs',
      dueDate: 'Today',
      dueTime: '2:00 PM',
      estimatedTime: '45 min',
      urgency: 'urgent',
      owner: 'OmniBot',
      workspace: 'Client Work'
    },
    {
      id: '2',
      text: "Record meditation podcast episode",
      description: "Episode 12: Finding stillness in busy schedules",
      completed: false, 
      impact: 'high',
      category: 'content',
      project: 'Content Pipeline',
      dueDate: 'Tomorrow',
      estimatedTime: '90 min',
      urgency: 'normal',
      owner: 'User',
      workspace: 'Business Admin'
    },
    {
      id: '3',
      text: "Review tomorrow's client sessions",
      description: "Prepare materials and review client notes",
      completed: false,
      impact: 'medium', 
      category: 'preparation',
      project: 'Inbox',
      dueDate: 'Today',
      dueTime: '6:00 PM',
      estimatedTime: '30 min',
      urgency: 'normal',
      owner: 'OmniBot',
      workspace: 'Personal'
    }
  ]);

  const completedCount = priorityTasks.filter(task => task.completed).length;
  const progressPercentage = (completedCount / priorityTasks.length) * 100;

  const handleTaskToggle = (taskId: string) => {
    setPriorityTasks(prev => {
      const updated = prev.map(task => 
        task.id === taskId ? { ...task, completed: !task.completed } : task
      );
      
      const newCompletedCount = updated.filter(t => t.completed).length;
      
      if (newCompletedCount === updated.length && completedCount < updated.length) {
        // All tasks just completed - celebration time!
        toast({
          title: "🎉 Amazing Work!",
          description: "You've completed all your high-impact tasks for today! Time to celebrate 🏆",
            });
        onTasksCompleted();
      } else if (newCompletedCount > completedCount) {
        // Single task completed
        const completedTask = updated.find(t => t.id === taskId);
        toast({
          title: "✅ Task Complete!",
          description: `"${completedTask?.text}" - Keep the momentum going!`,
        });
      }
      
      return updated;
    });
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    let tasks: string[];
    
    // Handle multiple input methods
    if (inputValue.includes(',')) {
      // Comma separated
      tasks = inputValue.split(',').map(task => task.trim()).filter(Boolean);
    } else if (inputValue.includes('\n')) {
      // Line separated  
      tasks = inputValue.split('\n').map(task => task.trim()).filter(Boolean);
    } else {
      // Single task
      tasks = [inputValue.trim()];
    }

    if (tasks.length > 0) {
      onQuickAdd(tasks);
      
      toast({
        title: `📥 ${tasks.length} Item${tasks.length > 1 ? 's' : ''} Added!`,
        description: "OmniBot is organizing and placing them in the right spots"
      });
      
      setInputValue('');
      setIsMultiLine(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      // Regular Enter = submit
      e.preventDefault();
      handleQuickAdd(e);
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';  
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'client-care': 'bg-purple-100 text-purple-800',
      'content': 'bg-blue-100 text-blue-800', 
      'preparation': 'bg-orange-100 text-orange-800',
      'business': 'bg-green-100 text-green-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200';  
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className="h-fit">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-xl">Daily Clarity</CardTitle>
          </div>
        </div>
        <CardDescription>
          Your highest-impact tasks for maximum momentum - suggested by OmniBot
        </CardDescription>
        
        {/* Progress Indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{completedCount}/{priorityTasks.length} complete</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Priority Tasks List */}
        <div className="space-y-3">
          {priorityTasks.map((task) => (
            <div 
              key={task.id} 
              className="p-4 rounded-lg border hover:bg-muted/50 transition-colors group space-y-3"
            >
              {/* Header with radio check and title */}
              <div className="flex items-start gap-3">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-0 h-6 w-6 mt-0.5"
                  onClick={() => handleTaskToggle(task.id)}
                >
                  {task.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                  )}
                </Button>
                
                <div className="flex-1 min-w-0">
                  <h4 className={`font-medium leading-relaxed ${
                    task.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                  }`}>
                    {task.text}
                  </h4>
                  {task.description && (
                    <p className={`text-sm mt-1 ${
                      task.completed ? 'text-muted-foreground/70' : 'text-muted-foreground'
                    }`}>
                      {task.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Comprehensive metadata grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <FolderOpen className="h-3 w-3 text-blue-500" />
                  <span className="text-muted-foreground">{task.project || 'Inbox'}</span>
                </div>
                
                {(task.dueDate || task.dueTime) && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-orange-500" />
                    <span className="text-muted-foreground">
                      {task.dueDate}{task.dueTime ? ` ${task.dueTime}` : ''}
                    </span>
                  </div>
                )}
                
                {task.estimatedTime && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-purple-500" />
                    <span className="text-muted-foreground">{task.estimatedTime}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-1">
                  {task.owner === 'OmniBot' ? (
                    <Bot className="h-3 w-3 text-green-500" />
                  ) : (
                    <User className="h-3 w-3 text-blue-500" />
                  )}
                  <span className="text-muted-foreground">{task.owner}</span>
                </div>
              </div>

              {/* Badges row */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`text-xs ${getImpactColor(task.impact)}`}>
                  {task.impact} impact
                </Badge>
                <Badge variant="outline" className={`text-xs ${getUrgencyColor(task.urgency)}`}>
                  {task.urgency}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {task.workspace}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        {/* Add Anything Quick Capture */}
        <div className="border-t pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Inbox className="h-4 w-4 text-blue-600" />
            <h4 className="font-medium text-sm">Add Anything</h4>
          </div>
          
          <form onSubmit={handleQuickAdd} className="space-y-2">
            {isMultiLine ? (
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add tasks, thoughts, or reminders - OmniBot will organize them"
                className="min-h-[80px] resize-none"
                rows={3}
              />
            ) : (
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add a task, thought, or reminder and OmniBot will save it in the right place"
                className="flex-1"
              />
            )}
            
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                💡 Tip: Just hit Enter to save, or use commas to add multiple items
              </p>
              <Button 
                type="submit" 
                size="sm"
                disabled={!inputValue.trim()}
                className="shrink-0"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}