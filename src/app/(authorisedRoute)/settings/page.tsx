"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, RefreshCw, User, Shield, Bell, Palette } from "lucide-react";
import Link from "next/link";

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
          <Icon className="h-5 w-5 text-blue-600" />
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
  const settingsSections: SettingsSectionProps[] = [
    {
      title: "Sync Preferences",
      description: "Configure Gmail/Calendar preferences and preview imports",
      icon: RefreshCw,
      href: "/settings/sync-preferences",
      buttonText: "Open Sync Preferences",
    },
    {
      title: "Account Settings",
      description: "Update your profile, password, and account preferences",
      icon: User,
      href: "/settings/account",
      buttonText: "Manage Account",
    },
    {
      title: "Privacy & Security",
      description: "Control your data privacy and security settings",
      icon: Shield,
      href: "/settings/privacy",
      buttonText: "Privacy Settings",
    },
    {
      title: "Notifications",
      description: "Configure email and in-app notification preferences",
      icon: Bell,
      href: "/settings/notifications",
      buttonText: "Notification Settings",
    },
    {
      title: "Appearance",
      description: "Customize the look and feel of your workspace",
      icon: Palette,
      href: "/settings/appearance",
      buttonText: "Appearance Settings",
    },
  ];

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
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
    </div>
  );
}
