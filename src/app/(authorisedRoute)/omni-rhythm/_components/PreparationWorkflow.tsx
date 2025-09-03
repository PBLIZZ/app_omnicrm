"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  FileText,
  MessageSquare,
  Calendar,
  Zap,
  Target,
  Lightbulb,
  ArrowRight,
} from "lucide-react";
import { format, differenceInHours } from "date-fns";

interface PreparationTask {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  estimatedTime: number; // minutes
  category: "client" | "preparation" | "followup" | "administrative";
  dueDate?: Date;
}

interface UpcomingAppointment {
  id: string;
  title: string;
  clientName: string;
  date: string;
  startTime: string;
  endTime: string;
  serviceType: string;
  preparationTasks: PreparationTask[];
  clientNotes?: string;
  lastSessionNotes?: string;
}

interface PreparationWorkflowProps {
  upcomingAppointments: UpcomingAppointment[];
  isLoading?: boolean;
}

export function PreparationWorkflow({
  upcomingAppointments,
  isLoading = false,
}: PreparationWorkflowProps) {
  const [selectedAppointment, setSelectedAppointment] = useState<string | null>(
    upcomingAppointments[0]?.id || null,
  );
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  const currentAppointment = upcomingAppointments.find((app) => app.id === selectedAppointment);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Preparation Workflow
          </CardTitle>
          <CardDescription>Loading preparation tasks...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalTasks = currentAppointment?.preparationTasks.length || 0;
  const completedCount =
    currentAppointment?.preparationTasks.filter((task) => completedTasks.has(task.id)).length || 0;
  const progressPercentage = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Preparation Workflow
        </CardTitle>
        <CardDescription>
          Prepare for upcoming sessions with automated checklists and insights
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upcoming Appointments Selector */}
        {upcomingAppointments.length > 1 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Select Appointment to Prepare:</h4>
            <div className="grid gap-2">
              {upcomingAppointments.map((appointment) => {
                const hoursUntil = differenceInHours(new Date(appointment.startTime), new Date());
                const isUrgent = hoursUntil <= 24;

                return (
                  <Button
                    key={appointment.id}
                    variant={selectedAppointment === appointment.id ? "default" : "outline"}
                    className="justify-start h-auto p-3"
                    onClick={() => setSelectedAppointment(appointment.id)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="text-left">
                        <div className="font-medium">{appointment.clientName}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(appointment.startTime), "MMM d, h:mm a")} -{" "}
                          {appointment.serviceType}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isUrgent && <AlertCircle className="h-4 w-4 text-orange-500" />}
                        <Badge variant="secondary" className="text-xs">
                          {hoursUntil}h
                        </Badge>
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {currentAppointment ? (
          <>
            {/* Current Appointment Header */}
            <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950/20">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{currentAppointment.clientName}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(currentAppointment.startTime), "EEEE, MMMM d")}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {format(new Date(currentAppointment.startTime), "h:mm a")} -
                      {format(new Date(currentAppointment.endTime), "h:mm a")}
                    </div>
                  </div>
                </div>
                <Badge variant="outline">{currentAppointment.serviceType}</Badge>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Preparation Progress</span>
                  <span>
                    {completedCount}/{totalTasks} tasks
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Preparation Tasks */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Preparation Checklist
              </h4>

              <div className="space-y-3">
                {currentAppointment.preparationTasks.map((task) => (
                  <PreparationTaskItem
                    key={task.id}
                    task={task}
                    isCompleted={completedTasks.has(task.id)}
                    onToggle={(completed) => {
                      const newCompleted = new Set(completedTasks);
                      if (completed) {
                        newCompleted.add(task.id);
                      } else {
                        newCompleted.delete(task.id);
                      }
                      setCompletedTasks(newCompleted);
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Client Insights */}
            {(currentAppointment.clientNotes || currentAppointment.lastSessionNotes) && (
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Client Insights
                </h4>

                {currentAppointment.clientNotes && (
                  <div className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-sm">Client Notes</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {currentAppointment.clientNotes}
                    </p>
                  </div>
                )}

                {currentAppointment.lastSessionNotes && (
                  <div className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-sm">Last Session Summary</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {currentAppointment.lastSessionNotes}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Quick Actions */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Quick Actions
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="justify-start">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Reminder
                </Button>
                <Button variant="outline" className="justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  View Full History
                </Button>
                <Button variant="outline" className="justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  Reschedule
                </Button>
                <Button variant="outline" className="justify-start">
                  <Target className="h-4 w-4 mr-2" />
                  Session Goals
                </Button>
              </div>
            </div>

            {/* Automated Workflows */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <ArrowRight className="h-4 w-4" />
                Automated Workflows
              </h4>

              <div className="space-y-2">
                <AutomatedWorkflowItem
                  title="Pre-Session Email"
                  description="Send welcome email with session details"
                  status="scheduled"
                  timeUntil="2 hours before"
                />
                <AutomatedWorkflowItem
                  title="Client Intake Review"
                  description="Review and update client intake form"
                  status="pending"
                  timeUntil="1 hour before"
                />
                <AutomatedWorkflowItem
                  title="Follow-up Message"
                  description="Send post-session care instructions"
                  status="ready"
                  timeUntil="After session"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No upcoming appointments</p>
            <p className="text-sm mt-1">
              Preparation workflows will appear here when you have scheduled sessions
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PreparationTaskItem({
  task,
  isCompleted,
  onToggle,
}: {
  task: PreparationTask;
  isCompleted: boolean;
  onToggle: (completed: boolean) => void;
}) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-600 dark:text-red-400";
      case "medium":
        return "text-orange-600 dark:text-orange-400";
      case "low":
        return "text-green-600 dark:text-green-400";
      default:
        return "text-gray-600";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "client":
        return <User className="h-4 w-4" />;
      case "preparation":
        return <Target className="h-4 w-4" />;
      case "followup":
        return <MessageSquare className="h-4 w-4" />;
      case "administrative":
        return <FileText className="h-4 w-4" />;
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  return (
    <div
      className={`border rounded-lg p-4 transition-all ${
        isCompleted
          ? "bg-green-50 dark:bg-green-950/20 border-green-200"
          : "hover:bg-gray-50 dark:hover:bg-gray-900/50"
      }`}
    >
      <div className="flex items-start gap-3">
        <Checkbox checked={isCompleted} onCheckedChange={onToggle} className="mt-1" />

        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getCategoryIcon(task.category)}
              <h5
                className={`font-medium ${isCompleted ? "line-through text-muted-foreground" : ""}`}
              >
                {task.title}
              </h5>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>
                {task.priority}
              </Badge>
              <span className="text-xs text-muted-foreground">{task.estimatedTime}min</span>
            </div>
          </div>

          <p
            className={`text-sm ${isCompleted ? "text-muted-foreground" : "text-muted-foreground"}`}
          >
            {task.description}
          </p>

          {task.dueDate && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Due: {format(task.dueDate, "MMM d, h:mm a")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AutomatedWorkflowItem({
  title,
  description,
  status,
  timeUntil,
}: {
  title: string;
  description: string;
  status: "scheduled" | "pending" | "ready" | "completed";
  timeUntil: string;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-100 dark:bg-green-900/30";
      case "ready":
        return "text-blue-600 bg-blue-100 dark:bg-blue-900/30";
      case "scheduled":
        return "text-orange-600 bg-orange-100 dark:bg-orange-900/30";
      case "pending":
        return "text-gray-600 bg-gray-100 dark:bg-gray-900/30";
      default:
        return "text-gray-600 bg-gray-100 dark:bg-gray-900/30";
    }
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h5 className="font-medium text-sm">{title}</h5>
          <Badge variant="outline" className={`text-xs ${getStatusColor(status)}`}>
            {status}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="text-xs text-muted-foreground">{timeUntil}</div>
    </div>
  );
}
