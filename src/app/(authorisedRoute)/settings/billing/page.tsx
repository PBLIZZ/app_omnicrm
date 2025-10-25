"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UsageBar } from "../_components/UsageBar";
import { Users, Brain, Database, CheckCircle, ArrowRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";

/**
 * Billing Page - Plans & Payments with progressive disclosure
 *
 * Design Principles:
 * - Wellness-friendly language
 * - TaskCard-inspired gradients
 * - Progressive disclosure (collapsed details)
 * - Clear value proposition
 * - No technical jargon
 */
export default function BillingPage(): JSX.Element {
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [showBillingHistory, setShowBillingHistory] = useState(false);

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Plans & Payments</h1>
        <p className="text-muted-foreground mt-2">
          Your subscription, usage, and billing information
        </p>
      </div>

      {/* Current Plan Card - TaskCard-inspired gradient */}
      <Card className="bg-gradient-to-br from-green-100 via-emerald-50 to-green-100 border-l-4 border-green-400">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl">Your Practice Plan</CardTitle>
              <CardDescription className="mt-1">
                Free Forever - Supporting Wellness Professionals
              </CardDescription>
            </div>
            <Badge className="bg-emerald-500">
              <CheckCircle className="w-3 h-3 mr-1" />
              Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Plan Features */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-600" />
                <span className="font-semibold text-sm">Clients</span>
              </div>
              <div className="text-2xl font-bold">Unlimited</div>
              <p className="text-xs text-muted-foreground">Add as many clients as you need</p>
            </div>

            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-emerald-600" />
                <span className="font-semibold text-sm">AI Insights</span>
              </div>
              <div className="text-2xl font-bold">500/mo</div>
              <p className="text-xs text-muted-foreground">Automatic client insights</p>
            </div>

            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-emerald-600" />
                <span className="font-semibold text-sm">Storage</span>
              </div>
              <div className="text-2xl font-bold">5 GB</div>
              <p className="text-xs text-muted-foreground">Photos and documents</p>
            </div>
          </div>

          {/* Upgrade CTA */}
          <div className="pt-4 border-t border-emerald-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Need More AI Insights?</h3>
                <p className="text-sm text-muted-foreground">
                  Upgrade to Pro for unlimited AI analysis
                </p>
              </div>
              <Button variant="outline" className="gap-2">
                View Pro Plan
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage This Month */}
      <Card className="bg-gradient-to-br from-sky-100 via-blue-50 to-sky-100 border-l-4 border-sky-400">
        <CardHeader>
          <CardTitle>How You're Using OmniCRM</CardTitle>
          <CardDescription>Current month activity (October 2025)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <UsageBar label="AI Insights Generated" current={347} limit={500} />
          <UsageBar label="Storage Used" current={2.3} limit={5} unit="GB" />
          <UsageBar label="Contacts Managed" current={124} unlimited />
          <UsageBar label="Notes Created" current={89} unlimited />

          <div className="pt-4 border-t border-sky-200">
            <p className="text-sm text-muted-foreground">
              Your usage resets on the 1st of each month. All unlimited features stay unlimited
              forever.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method - Collapsed by default (progressive disclosure) */}
      <Collapsible open={showPaymentDetails} onOpenChange={setShowPaymentDetails}>
        <CollapsibleTrigger asChild>
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Payment Method</CardTitle>
                  <CardDescription>Manage your payment information</CardDescription>
                </div>
                <Button variant="ghost" size="sm">
                  {showPaymentDetails ? "Hide" : "View"} Details
                </Button>
              </div>
            </CardHeader>
          </Card>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-2">
            <CardContent className="pt-6 space-y-4">
              <div className="bg-gradient-to-br from-gray-100 to-gray-50 rounded-lg p-4">
                <p className="text-center text-muted-foreground">
                  No payment method required
                </p>
                <p className="text-center text-sm text-muted-foreground mt-2">
                  OmniCRM is free for wellness practitioners. If you upgrade to Pro, you'll add
                  payment details here.
                </p>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Billing History - Collapsed by default (progressive disclosure) */}
      <Collapsible open={showBillingHistory} onOpenChange={setShowBillingHistory}>
        <CollapsibleTrigger asChild>
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Billing History</CardTitle>
                  <CardDescription>View past invoices and receipts</CardDescription>
                </div>
                <Button variant="ghost" size="sm">
                  {showBillingHistory ? "Hide" : "View"} History
                </Button>
              </div>
            </CardHeader>
          </Card>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-2">
            <CardContent className="pt-6 space-y-4">
              <div className="bg-gradient-to-br from-gray-100 to-gray-50 rounded-lg p-4">
                <p className="text-center text-muted-foreground">No billing history</p>
                <p className="text-center text-sm text-muted-foreground mt-2">
                  You're on the free plan - no charges have been made to your account.
                </p>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <h3 className="font-medium text-sm">Questions about billing?</h3>
            <p className="text-sm text-muted-foreground">
              Email us at{" "}
              <a href="mailto:support@omnicrm.com" className="text-blue-600 hover:underline">
                support@omnicrm.com
              </a>
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-medium text-sm">Want to upgrade?</h3>
            <p className="text-sm text-muted-foreground">
              Pro plans are coming soon with unlimited AI insights, advanced analytics, and priority
              support.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
