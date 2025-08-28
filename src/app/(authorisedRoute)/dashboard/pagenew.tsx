"use client";

import {
  ArrowRight,
  Calendar,
  Users,
  Activity,
  CheckSquare,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";



import {
  Button,
} from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export default function DashboardPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState("overview");

  // Mock data - replace with actual data fetching
  const totalContacts = 0;
  const recentActivity = 0;
  const upcomingTasks = 0;

  return (
    <div className="py-6">
      <div className="flex flex-col space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome to your contact management system</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalContacts}</div>
              <p className="text-xs text-muted-foreground">
                {totalContacts === 1 ? "1 contact" : `${totalContacts} contacts`} in your CRM
              </p>
            </CardContent>
            <CardFooter>
              <Link
                href="/contacts"
                className="text-xs text-blue-600 hover:underline flex items-center"
              >
                View all contacts
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Welcome to OmniCRM</CardTitle>
              <CardDescription>
                Your contact management system is ready. Add contacts and track your interactions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/contacts/new">Add First Contact</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{recentActivity}</div>
              <p className="text-xs text-muted-foreground">
                {recentActivity} activities in the last 7 days
              </p>
            </CardContent>
            <CardFooter>
              <Link href="#" className="text-xs text-blue-600 hover:underline flex items-center">
                View activity log
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Tasks</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingTasks}</div>
              <p className="text-xs text-muted-foreground">
                {upcomingTasks} tasks scheduled for this week
              </p>
            </CardContent>
            <CardFooter>
              <Link href="#" className="text-xs text-blue-600 hover:underline flex items-center">
                View all tasks
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </CardFooter>
          </Card>
        </div>

        {/* Tabs for different dashboard sections */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="recent">Recent Activity</TabsTrigger>
            <TabsTrigger value="system">System Status</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  className="h-auto flex flex-col items-center justify-center p-4 space-y-2"
                  asChild
                >
                  <Link href="/contacts">
                    <Users className="h-6 w-6 mb-2" />
                    <span>View Contacts</span>
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex flex-col items-center justify-center p-4 space-y-2"
                  disabled
                >
                  <Calendar className="h-6 w-6 mb-2" />
                  <span>Schedule Task</span>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recent Activity Tab */}
          <TabsContent value="recent" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your latest actions and updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Activity className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No recent activity to display</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Status Tab */}
          <TabsContent value="system" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
                <CardDescription>Current system information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Application</span>
                  <span className="text-sm text-green-600">Running</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Database</span>
                  <span className="text-sm text-green-600">Connected</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">API</span>
                  <span className="text-sm text-green-600">Operational</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}