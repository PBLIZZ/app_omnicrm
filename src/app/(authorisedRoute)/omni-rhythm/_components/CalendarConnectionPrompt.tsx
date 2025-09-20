/**
 * Calendar Connection Prompt Component
 *
 * Follows the proven OmniConnect pattern for consistent user experience
 * across Gmail and Calendar connection flows.
 */
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, Zap, BookCheck, AlertCircle } from "lucide-react";

interface CalendarConnectionPromptProps {
  onConnect: () => void;
  isConnecting: boolean;
  error?: string | null;
  onClearError?: () => void;
}

export function CalendarConnectionPrompt({
  onConnect,
  isConnecting,
  error,
  onClearError,
}: CalendarConnectionPromptProps): JSX.Element {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Connect Your Google Calendar</h1>
        <p className="text-muted-foreground text-lg">
          Unlock intelligent insights about your wellness practice schedule
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            {onClearError && (
              <Button variant="ghost" size="sm" onClick={onClearError}>
                Dismiss
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Connection Card */}
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-xl">
              <Calendar className="h-6 w-6" />
              Google Calendar Integration
            </CardTitle>
            <CardDescription>
              Connect your Google Calendar to automatically sync events and generate business
              intelligence for your wellness practice.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Benefits */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center space-y-2">
                <Calendar className="h-8 w-8 mx-auto text-primary" />
                <h3 className="font-semibold">Event Sync</h3>
                <p className="text-sm text-muted-foreground">
                  Automatically import your appointments and sessions
                </p>
              </div>
              <div className="text-center space-y-2">
                <Zap className="h-8 w-8 mx-auto text-primary" />
                <h3 className="font-semibold">AI Insights</h3>
                <p className="text-sm text-muted-foreground">
                  Get intelligent business recommendations and patterns
                </p>
              </div>
              <div className="text-center space-y-2">
                <BookCheck className="h-8 w-8 mx-auto text-primary" />
                <h3 className="font-semibold">Client Timeline</h3>
                <p className="text-sm text-muted-foreground">
                  Track client progress and session history automatically
                </p>
              </div>
            </div>

            {/* Connection Button */}
            <div className="text-center">
              <Button
                onClick={onConnect}
                disabled={isConnecting}
                size="lg"
                className="w-full md:w-auto"
              >
                {isConnecting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    Connect Google Calendar
                  </>
                )}
              </Button>
            </div>

            {/* Privacy Note */}
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                We only access your calendar events. Your data is encrypted and secure.
                You can disconnect at any time in settings.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* What happens next */}
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What happens next?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-semibold">
                  1
                </div>
                <div>
                  <h4 className="font-medium">Secure Authorization</h4>
                  <p className="text-sm text-muted-foreground">
                    You&apos;ll be redirected to Google to grant calendar access
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-semibold">
                  2
                </div>
                <div>
                  <h4 className="font-medium">Initial Sync</h4>
                  <p className="text-sm text-muted-foreground">
                    We&apos;ll import your recent calendar events and appointments
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-semibold">
                  3
                </div>
                <div>
                  <h4 className="font-medium">AI Processing</h4>
                  <p className="text-sm text-muted-foreground">
                    Generate insights and build client timelines automatically
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}