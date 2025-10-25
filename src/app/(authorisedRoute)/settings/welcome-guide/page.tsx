"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Mail, Users, FileText, Tag, CheckCircle } from "lucide-react";
import Link from "next/link";

/**
 * Welcome Guide Page - Getting Started for New Practitioners
 *
 * Design Principles:
 * - Onboarding-focused
 * - TaskCard-inspired step cards
 * - Progressive setup flow
 * - Wellness-friendly language
 * - Encouraging tone
 */
export default function WelcomeGuidePage(): JSX.Element {
  return (
    <div className="max-w-3xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Welcome to OmniCRM</h1>
        <p className="text-muted-foreground">
          Your practice management companion - let's get you started in 3 simple steps
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-3 py-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-semibold">
            <CheckCircle className="h-5 w-5" />
          </div>
          <span className="text-sm font-medium hidden sm:inline">Setup</span>
        </div>
        <div className="h-0.5 w-12 bg-gray-200" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-sky-500 text-white rounded-full flex items-center justify-center font-semibold">
            2
          </div>
          <span className="text-sm font-medium hidden sm:inline">Connect</span>
        </div>
        <div className="h-0.5 w-12 bg-gray-200" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center font-semibold">
            3
          </div>
          <span className="text-sm font-medium hidden sm:inline">Organize</span>
        </div>
      </div>

      {/* Step 1: Complete Your Profile */}
      <Card className="bg-gradient-to-br from-violet-100 via-purple-50 to-violet-100 border-l-4 border-violet-400">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/60 backdrop-blur-sm rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <CardTitle>Step 1: Complete Your Profile</CardTitle>
              <CardDescription>Help clients recognize and trust you</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Add your name, practice details, and photo so clients feel connected.
            </p>
            <Button asChild className="w-full">
              <Link href="/settings/account">Set Up Your Profile →</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Connect Gmail */}
      <Card className="bg-gradient-to-br from-sky-100 via-blue-50 to-sky-100 border-l-4 border-sky-400">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/60 backdrop-blur-sm rounded-full flex items-center justify-center">
              <Mail className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <CardTitle>Step 2: Connect Gmail</CardTitle>
              <CardDescription>Build client relationships automatically</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Sync your emails to track client communications and build stronger relationships.
            </p>
            <Button asChild className="w-full">
              <Link href="/settings/integrations">Connect Gmail →</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Step 3: Add Your First Client */}
      <Card className="bg-gradient-to-br from-green-100 via-emerald-50 to-green-100 border-l-4 border-green-400">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/60 backdrop-blur-sm rounded-full flex items-center justify-center">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle>Step 3: Add Your First Client</CardTitle>
              <CardDescription>Start building your wellness practice</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Add a client manually or use our secure intake form to onboard new clients.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button asChild variant="outline">
                <Link href="/contacts">Add Client Manually</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/settings/onboarding">Create Intake Link</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bonus Tips */}
      <Card className="bg-gradient-to-br from-teal-100 via-cyan-50 to-teal-100 border-l-4 border-teal-400">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/60 backdrop-blur-sm rounded-full flex items-center justify-center">
              <Tag className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <CardTitle>Bonus: Organize with Tags</CardTitle>
              <CardDescription>Label clients for better organization</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Use wellness tags to categorize clients (yoga, massage, stress relief, etc.) for
              powerful filtering and insights.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/settings/tags">Explore Tags →</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Help Resources */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Button variant="outline" className="gap-2">
            <FileText className="h-4 w-4" />
            Read Documentation
          </Button>
          <Button variant="outline" className="gap-2" asChild>
            <a href="mailto:support@omnicrm.com">
              <Mail className="h-4 w-4" />
              Email Support
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
