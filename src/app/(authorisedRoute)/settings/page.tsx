"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowRight,
  Cog,
  Mail,
  User,
  Bell,
  Shield,
  Database,
  Phone,
  Globe,
  Calendar,
  RefreshCw,
  Settings as SettingsIcon,
  RotateCcw,
  Brain,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { GmailSyncStatusPanel } from "./_components/GmailSyncStatusPanel";

interface SettingsSectionProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  buttonText: string;
}

function SettingsSection({
  title,
  description,
  icon: Icon,
  href,
  buttonText,
}: SettingsSectionProps): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-sky-500" />
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link href={href} className="flex items-center gap-2">
            {buttonText}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage(): JSX.Element {
  const searchParams = useSearchParams();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const connected = searchParams.get("connected");

    if (connected === "gmail") {
      setSuccessMessage(
        "Gmail has been successfully connected! You can now configure your sync settings.",
      );
    } else if (connected === "calendar") {
      setSuccessMessage(
        "Google Calendar has been successfully connected! You can now sync your rhythm events.",
      );
    }
    // If tab is specified, it will be handled by the Tabs component
  }, [searchParams]);

  const settingsSections: SettingsSectionProps[] = [
    {
      title: "Account Settings",
      description: "Update your profile, password, and account preferences",
      icon: Cog,
      href: "/settings/account",
      buttonText: "Manage Account",
    },
  ];

  return (
    <div className="container max-w-6xl mx-auto py-8 space-y-8">
      {/* ENHANCED SETTINGS SYSTEM - PRIMARY IMPLEMENTATION */}
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <SettingsIcon className="h-8 w-8 text-sky-500" />
            Settings & Integrations
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your account, sync preferences, and AI integrations for optimal CRM performance
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue={searchParams.get("tab") || "integrations"} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="sync">Sync Settings</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          {/* Integrations Settings - Primary Tab */}
          <TabsContent value="integrations" className="space-y-6">
            {/* Google Services Integration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Google Workspace Integration
                </CardTitle>
                <CardDescription>
                  Connect your Google services for comprehensive business intelligence
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  {/* Gmail Integration */}
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
                    <div className="flex items-center gap-3">
                      <Mail className="h-8 w-8 text-blue-600" />
                      <div>
                        <div className="font-medium">Gmail Sync</div>
                        <div className="text-sm text-muted-foreground">
                          Sync contacts and analyze email interactions
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <SettingsIcon className="h-4 w-4 mr-2" />
                        Configure
                      </Button>
                      <Button>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Connect
                      </Button>
                    </div>
                  </div>

                  {/* Rhythm Integration */}
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-8 w-8 text-green-600" />
                      <div>
                        <div className="font-medium">Google Calendar</div>
                        <div className="text-sm text-muted-foreground">
                          Track events and build client timelines
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <SettingsIcon className="h-4 w-4 mr-2" />
                        Configure
                      </Button>
                      <Button>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Connect
                      </Button>
                    </div>
                  </div>

                  {/* Drive Integration */}
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20">
                    <div className="flex items-center gap-3">
                      <Database className="h-8 w-8 text-yellow-600" />
                      <div>
                        <div className="font-medium">Google Drive</div>
                        <div className="text-sm text-muted-foreground">
                          Import attendance sheets and documents
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <SettingsIcon className="h-4 w-4 mr-2" />
                        Configure
                      </Button>
                      <Button variant="outline">
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Coming Soon
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Services Integration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI & Intelligence Services
                </CardTitle>
                <CardDescription>
                  Configure AI-powered features and analysis capabilities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Brain className="h-8 w-8 text-purple-600" />
                      <div>
                        <div className="font-medium">OpenAI Integration</div>
                        <div className="text-sm text-muted-foreground">
                          AI insights, embeddings, and semantic search
                        </div>
                      </div>
                    </div>
                    <Button variant="outline">
                      <SettingsIcon className="h-4 w-4 mr-2" />
                      Configure API
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Communication Platforms */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Communication Platforms
                </CardTitle>
                <CardDescription>Connect messaging and communication services</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Phone className="h-8 w-8 text-green-600" />
                      <div>
                        <div className="font-medium">WhatsApp Business</div>
                        <div className="text-sm text-muted-foreground">
                          Send messages to contacts
                        </div>
                      </div>
                    </div>
                    <Button variant="outline">Connect</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sync Settings Tab */}
          <TabsContent value="sync" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Data Synchronization Settings
                </CardTitle>
                <CardDescription>
                  Configure how your data syncs across different platforms and services
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-sync Gmail Contacts</Label>
                      <div className="text-sm text-muted-foreground">
                        Automatically sync new contacts from Gmail
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Rhythm Event Processing</Label>
                      <div className="text-sm text-muted-foreground">
                        Generate AI insights from rhythm events
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Background AI Analysis</Label>
                      <div className="text-sm text-muted-foreground">
                        Run AI analysis on new data automatically
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>

                {/* Sync Frequency */}
                <div className="space-y-2">
                  <Label>Sync Frequency</Label>
                  <select className="w-full p-2 border rounded-md">
                    <option value="realtime">Real-time (recommended)</option>
                    <option value="hourly">Every hour</option>
                    <option value="daily">Daily</option>
                    <option value="manual">Manual only</option>
                  </select>
                </div>

                <Button>Save Sync Settings</Button>
              </CardContent>
            </Card>

            {/* Gmail Sync Status - Original Component */}
            <GmailSyncStatusPanel />
          </TabsContent>

          {/* Profile Settings */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Update your personal information and profile details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" placeholder="Enter your first name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" placeholder="Enter your last name" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="Enter your email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea id="bio" placeholder="Tell us about yourself" rows={3} />
                </div>
                <Button>Save Changes</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Settings */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>Choose how you want to receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <div className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </div>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Contact Updates</Label>
                    <div className="text-sm text-muted-foreground">
                      Get notified when contacts are updated
                    </div>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>AI Insight Alerts</Label>
                    <div className="text-sm text-muted-foreground">
                      Receive notifications about new AI insights
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Task Reminders</Label>
                    <div className="text-sm text-muted-foreground">
                      Receive reminders for upcoming tasks
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Button>Save Preferences</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Settings
                </CardTitle>
                <CardDescription>Manage your account security and privacy</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input id="currentPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input id="newPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input id="confirmPassword" type="password" />
                </div>
                <Button>Update Password</Button>

                {/* API Security */}
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-lg font-semibold mb-4">API Security</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Two-Factor Authentication</Label>
                        <div className="text-sm text-muted-foreground">
                          Add an extra layer of security
                        </div>
                      </div>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>API Access Logging</Label>
                        <div className="text-sm text-muted-foreground">
                          Log all API access attempts
                        </div>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Settings */}
          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  System Preferences
                </CardTitle>
                <CardDescription>Configure system-wide settings and preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Dark Mode</Label>
                    <div className="text-sm text-muted-foreground">
                      Toggle between light and dark themes
                    </div>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-save</Label>
                    <div className="text-sm text-muted-foreground">
                      Automatically save changes as you work
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="space-y-2">
                  <Label>Data Export</Label>
                  <div className="text-sm text-muted-foreground mb-2">
                    Export your data for backup or migration
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline">Export Contacts</Button>
                    <Button variant="outline">Export Rhythm Data</Button>
                    <Button variant="outline">Export All Data</Button>
                  </div>
                </div>
                <Button>Save System Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* LEGACY SETTINGS SYSTEM - PRESERVED AT BOTTOM */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-gray-500">Legacy Settings</h2>
          <p className="text-muted-foreground">
            Original settings interface (to be integrated later)
          </p>
        </div>

        <div>
          <h3 className="text-xl font-semibold tracking-tight text-sky-500 mb-4">Settings</h3>
          <p className="text-muted-foreground mb-6">
            Manage your account preferences and application settings.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
          {settingsSections.map((section) => (
            <SettingsSection
              key={section.href}
              title={section.title}
              description={section.description}
              icon={section.icon}
              href={section.href}
              buttonText={section.buttonText}
            />
          ))}
        </div>

        {/* Legacy Data Ingestion Section */}
        <div className="space-y-4 mt-8">
          <div>
            <h4 className="text-lg font-semibold tracking-tight text-teal-500 flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Legacy Data Ingestion
            </h4>
            <p className="text-muted-foreground mt-1">Original Gmail sync interface</p>
          </div>

          <GmailSyncStatusPanel />
        </div>
      </div>
    </div>
  );
}
