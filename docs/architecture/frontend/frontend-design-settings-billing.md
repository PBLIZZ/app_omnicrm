# Frontend Design: Settings & Billing Interface Restructure

**Date:** August 12, 2025  
**Project:** OmniCRM Settings & Billing Module Redesign  
**Focus:** Modular Architecture, UX Excellence, GDPR Compliance

---

## Overview

This design addresses the critical findings from the comprehensive audit of the monolithic SyncSettingsPage (459 lines, 7 alert() calls, multiple responsibilities). The solution provides a modern, maintainable settings interface that follows component-driven architecture principles and integrates seamlessly with the existing shadcn/ui ecosystem.

### Key Design Goals

1. **Modular Component Architecture** - Replace monolithic component with focused, reusable modules
2. **Progressive Disclosure** - Organize complex settings with intuitive navigation
3. **European UX Standards** - DD/MM/YYYY dates, GDPR compliance built-in
4. **Toast-Based Notifications** - Replace alert() calls with proper user feedback
5. **Integration Management** - Visual status indicators for Google services
6. **Billing & Subscription Management** - Plan upgrades, usage tracking, AI token management

---

## Current Issues Analysis

### Critical Problems Identified

```typescript
// BEFORE: Monolithic component with multiple responsibilities
export default function SyncSettingsPage() {
  // 459 lines of mixed concerns:
  // - Google OAuth management
  // - Sync preferences configuration
  // - Preview and approval workflows
  // - Error handling via alert()
  // - State management sprawl

  // ❌ 7 alert() calls - poor UX
  alert(`Preview failed: ${result.error ?? "unknown_error"}`);
  alert(`Undo: ${j.ok ? "ok" : j.error}`);

  // ❌ Inline error handling - not reusable
  // ❌ No loading states - poor feedback
  // ❌ Mixed API concerns - hard to test
  // ❌ US date formats - not European-friendly
}
```

### Design System Integration

**Current shadcn/ui Components Available:**

- Button, Card, Dialog, Sheet, Sidebar
- Input, Label, Textarea, Dropdown Menu
- Badge, Avatar, Separator, Skeleton
- Sonner (Toast system) - already implemented

**Color Scheme (Current Implementation):**

```css
:root {
  --primary: oklch(0.208 0.042 265.755); /* Deep blue-violet */
  --secondary: oklch(0.968 0.007 247.896); /* Light neutral */
  --accent: oklch(0.968 0.007 247.896); /* Accent neutral */
  --destructive: oklch(0.577 0.245 27.325); /* Red-orange */

  /* Chart colors for status indicators */
  --chart-1: oklch(0.646 0.222 41.116); /* Amber/Orange */
  --chart-2: oklch(0.6 0.118 184.704); /* Teal/Cyan */
  --chart-3: oklch(0.398 0.07 227.392); /* Violet/Purple */
  --chart-4: oklch(0.828 0.189 84.429); /* Sky/Green */
}
```

---

## Component Architecture Design

### 1. Settings Layout Structure

```typescript
// /src/components/settings/SettingsLayout.tsx
interface SettingsLayoutProps {
  children: React.ReactNode;
  currentCategory: SettingsCategory;
}

export function SettingsLayout({ children, currentCategory }: SettingsLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <SettingsSidebar currentCategory={currentCategory} />
      <main className="flex-1 p-8">
        <SettingsHeader category={currentCategory} />
        <div className="max-w-4xl">
          {children}
        </div>
      </main>
    </div>
  );
}
```

### 2. Settings Navigation System

```typescript
// /src/components/settings/SettingsSidebar.tsx
type SettingsCategory =
  | "profile"
  | "integrations"
  | "billing"
  | "ai-assistant"
  | "privacy-gdpr"
  | "appearance";

interface SettingsNavItem {
  key: SettingsCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  description: string;
}

const SETTINGS_NAVIGATION: SettingsNavItem[] = [
  {
    key: "profile",
    label: "Profile & Account",
    icon: User,
    description: "Personal information and preferences",
  },
  {
    key: "integrations",
    label: "Integrations",
    icon: Zap,
    badge: "Connected",
    description: "Google, Calendar, and third-party connections",
  },
  {
    key: "billing",
    label: "Billing & Plans",
    icon: CreditCard,
    description: "Subscription, usage, and payment methods",
  },
  {
    key: "ai-assistant",
    label: "AI Assistant",
    icon: Bot,
    badge: "Beta",
    description: "Chat settings and AI token management",
  },
  {
    key: "privacy-gdpr",
    label: "Privacy & GDPR",
    icon: Shield,
    description: "Data privacy, export, and deletion controls",
  },
  {
    key: "appearance",
    label: "Appearance",
    icon: Palette,
    description: "Theme, language, and display preferences",
  },
];
```

### 3. Integrations Management (Redesigned Sync Settings)

```typescript
// /src/components/settings/integrations/IntegrationsPage.tsx
export function IntegrationsPage() {
  return (
    <div className="space-y-8">
      <GoogleIntegrationCard />
      <SyncPreferencesCard />
      <SyncHistoryCard />
      <IntegrationStatusCard />
    </div>
  );
}

// /src/components/settings/integrations/GoogleIntegrationCard.tsx
interface GoogleConnectionStatus {
  gmail: {
    connected: boolean;
    lastSync: Date | null;
    emailCount: number;
    status: 'active' | 'error' | 'syncing';
  };
  calendar: {
    connected: boolean;
    lastSync: Date | null;
    eventCount: number;
    status: 'active' | 'error' | 'syncing';
  };
}

export function GoogleIntegrationCard() {
  const { status, connect, disconnect } = useGoogleIntegration();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 bg-chart-2/10 rounded-md">
            <Mail className="h-4 w-4 text-chart-2" />
          </div>
          Google Workspace
        </CardTitle>
        <CardDescription>
          Connect Gmail and Calendar for automatic contact and event synchronization
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <GoogleServiceCard
            service="gmail"
            icon={<Mail className="h-4 w-4" />}
            title="Gmail Integration"
            status={status.gmail}
            onConnect={() => connect('gmail')}
            onDisconnect={() => disconnect('gmail')}
          />

          <GoogleServiceCard
            service="calendar"
            icon={<Calendar className="h-4 w-4" />}
            title="Calendar Integration"
            status={status.calendar}
            onConnect={() => connect('calendar')}
            onDisconnect={() => disconnect('calendar')}
          />
        </div>

        {(status.gmail.connected || status.calendar.connected) && (
          <SyncActionsPanel />
        )}
      </CardContent>
    </Card>
  );
}

// /src/components/settings/integrations/GoogleServiceCard.tsx
interface GoogleServiceCardProps {
  service: 'gmail' | 'calendar';
  icon: React.ReactNode;
  title: string;
  status: GoogleConnectionStatus['gmail'] | GoogleConnectionStatus['calendar'];
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
}

export function GoogleServiceCard({ service, icon, title, status, onConnect, onDisconnect }: GoogleServiceCardProps) {
  const { isConnecting } = useConnectionState(service);

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium">{title}</span>
        </div>

        <ConnectionStatusBadge status={status.status} connected={status.connected} />
      </div>

      {status.connected && (
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex justify-between">
            <span>Last sync:</span>
            <span>{formatEuropeanDate(status.lastSync)}</span>
          </div>
          <div className="flex justify-between">
            <span>{service === 'gmail' ? 'Emails' : 'Events'}:</span>
            <span>{status.emailCount || status.eventCount}</span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {status.connected ? (
          <>
            <Button variant="outline" size="sm" onClick={() => handleSync(service)}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Sync Now
            </Button>
            <Button variant="outline" size="sm" onClick={onDisconnect}>
              Disconnect
            </Button>
          </>
        ) : (
          <Button
            onClick={onConnect}
            disabled={isConnecting}
            className="w-full"
          >
            {isConnecting ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              icon
            )}
            Connect {title}
          </Button>
        )}
      </div>
    </div>
  );
}
```

### 4. Sync Preferences with Smart Defaults

```typescript
// /src/components/settings/integrations/SyncPreferencesCard.tsx
interface SyncPreferencesFormData {
  gmail: {
    query: string;
    labelIncludes: string[];
    labelExcludes: string[];
    syncFrequency: 'realtime' | 'hourly' | 'daily' | 'manual';
  };
  calendar: {
    includeOrganizerSelf: boolean;
    includePrivate: boolean;
    timeWindowDays: number;
    syncFrequency: 'realtime' | 'hourly' | 'daily' | 'manual';
  };
}

export function SyncPreferencesCard() {
  const { preferences, updatePreferences, isLoading } = useSyncPreferences();
  const [isEditing, setIsEditing] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Sync Preferences</CardTitle>
            <CardDescription>
              Configure what data to sync and how frequently
            </CardDescription>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Settings2 className="h-3 w-3 mr-1" />
            {isEditing ? 'Save' : 'Edit'}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          <GmailPreferencesPanel
            preferences={preferences.gmail}
            isEditing={isEditing}
            onChange={(gmail) => updatePreferences({ gmail })}
          />

          <CalendarPreferencesPanel
            preferences={preferences.calendar}
            isEditing={isEditing}
            onChange={(calendar) => updatePreferences({ calendar })}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// /src/components/settings/integrations/GmailPreferencesPanel.tsx
export function GmailPreferencesPanel({ preferences, isEditing, onChange }: GmailPreferencesPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b">
        <Mail className="h-4 w-4 text-chart-2" />
        <span className="font-medium">Gmail Settings</span>
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="gmail-query">Search Query</Label>
          <Input
            id="gmail-query"
            value={preferences.query}
            onChange={(e) => onChange({ ...preferences, query: e.target.value })}
            disabled={!isEditing}
            placeholder="is:unread -label:spam"
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Use Gmail search syntax to filter emails
          </p>
        </div>

        <div>
          <Label>Include Labels</Label>
          <TagInput
            value={preferences.labelIncludes}
            onChange={(labels) => onChange({ ...preferences, labelIncludes: labels })}
            disabled={!isEditing}
            placeholder="Add label..."
          />
        </div>

        <div>
          <Label>Exclude Labels</Label>
          <TagInput
            value={preferences.labelExcludes}
            onChange={(labels) => onChange({ ...preferences, labelExcludes: labels })}
            disabled={!isEditing}
            placeholder="Add label..."
          />
        </div>

        <div>
          <Label htmlFor="gmail-frequency">Sync Frequency</Label>
          <Select
            value={preferences.syncFrequency}
            onValueChange={(value) => onChange({ ...preferences, syncFrequency: value })}
            disabled={!isEditing}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="realtime">Real-time</SelectItem>
              <SelectItem value="hourly">Every hour</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="manual">Manual only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
```

### 5. Billing & Subscription Management

```typescript
// /src/components/settings/billing/BillingPage.tsx
interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: 'EUR' | 'USD' | 'GBP';
  interval: 'month' | 'year';
  features: string[];
  aiTokens: number;
  contactLimit: number;
  current: boolean;
}

interface UsageMetrics {
  aiTokensUsed: number;
  aiTokensLimit: number;
  contactsCount: number;
  contactsLimit: number;
  storageUsed: number; // in MB
  storageLimit: number; // in MB
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
}

export function BillingPage() {
  const { subscription, usage, paymentMethods } = useBilling();

  return (
    <div className="space-y-8">
      <CurrentPlanCard subscription={subscription} />
      <UsageOverviewCard usage={usage} />
      <AITokenManagementCard usage={usage} />
      <PaymentMethodsCard methods={paymentMethods} />
      <BillingHistoryCard />
      <PlanComparisonCard currentPlan={subscription.plan} />
    </div>
  );
}

// /src/components/settings/billing/CurrentPlanCard.tsx
export function CurrentPlanCard({ subscription }: { subscription: SubscriptionPlan }) {
  return (
    <Card className="bg-gradient-to-br from-chart-3/5 via-chart-4/5 to-chart-1/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-chart-1" />
              {subscription.name} Plan
            </CardTitle>
            <CardDescription>
              Your current subscription plan and billing details
            </CardDescription>
          </div>

          <Badge variant="secondary" className="bg-chart-1/20 text-chart-1">
            Active
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold">€{subscription.price}</span>
          <span className="text-muted-foreground">/{subscription.interval}</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-background/50 rounded-lg">
            <div className="text-2xl font-semibold text-chart-2">{subscription.aiTokens.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">AI Tokens</div>
          </div>

          <div className="text-center p-3 bg-background/50 rounded-lg">
            <div className="text-2xl font-semibold text-chart-3">
              {subscription.contactLimit === -1 ? '∞' : subscription.contactLimit.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Contacts</div>
          </div>

          <div className="text-center p-3 bg-background/50 rounded-lg">
            <div className="text-2xl font-semibold text-chart-4">50GB</div>
            <div className="text-sm text-muted-foreground">Storage</div>
          </div>

          <div className="text-center p-3 bg-background/50 rounded-lg">
            <div className="text-2xl font-semibold text-chart-1">24/7</div>
            <div className="text-sm text-muted-foreground">Support</div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline">
            <CreditCard className="h-3 w-3 mr-1" />
            Update Payment
          </Button>
          <Button variant="outline">
            <ArrowUpCircle className="h-3 w-3 mr-1" />
            Upgrade Plan
          </Button>
          <Button variant="ghost">
            <Download className="h-3 w-3 mr-1" />
            Download Invoice
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// /src/components/settings/billing/UsageOverviewCard.tsx
export function UsageOverviewCard({ usage }: { usage: UsageMetrics }) {
  const aiTokensPercentage = (usage.aiTokensUsed / usage.aiTokensLimit) * 100;
  const contactsPercentage = (usage.contactsCount / usage.contactsLimit) * 100;
  const storagePercentage = (usage.storageUsed / usage.storageLimit) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Usage Overview
        </CardTitle>
        <CardDescription>
          Current usage for billing period {formatEuropeanDate(usage.billingPeriodStart)} - {formatEuropeanDate(usage.billingPeriodEnd)}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <UsageMetricBar
          label="AI Tokens"
          used={usage.aiTokensUsed}
          limit={usage.aiTokensLimit}
          percentage={aiTokensPercentage}
          color="chart-2"
          unit="tokens"
        />

        <UsageMetricBar
          label="Contacts"
          used={usage.contactsCount}
          limit={usage.contactsLimit}
          percentage={contactsPercentage}
          color="chart-3"
          unit="contacts"
        />

        <UsageMetricBar
          label="Storage"
          used={usage.storageUsed}
          limit={usage.storageLimit}
          percentage={storagePercentage}
          color="chart-4"
          unit="MB"
        />
      </CardContent>
    </Card>
  );
}
```

### 6. AI Assistant Settings

```typescript
// /src/components/settings/ai/AIAssistantPage.tsx
export function AIAssistantPage() {
  return (
    <div className="space-y-8">
      <AITokenManagementCard />
      <ChatPreferencesCard />
      <AIModelSettingsCard />
      <ContextSettingsCard />
      <AIUsageAnalyticsCard />
    </div>
  );
}

// /src/components/settings/ai/AITokenManagementCard.tsx
interface TokenUsage {
  current: number;
  limit: number;
  resetDate: Date;
  costThisMonth: number;
  averagePerDay: number;
  projectedMonthly: number;
}

export function AITokenManagementCard() {
  const { tokenUsage, settings, updateSettings } = useAISettings();
  const [showTokenPurchase, setShowTokenPurchase] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-chart-1" />
          AI Token Management
        </CardTitle>
        <CardDescription>
          Monitor and manage your AI conversation tokens
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-chart-1/10 rounded-lg border">
            <div className="text-2xl font-bold text-chart-1">
              {tokenUsage.current.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Tokens Used</div>
            <div className="text-xs mt-1">
              of {tokenUsage.limit.toLocaleString()} available
            </div>
          </div>

          <div className="text-center p-4 bg-chart-2/10 rounded-lg border">
            <div className="text-2xl font-bold text-chart-2">
              €{tokenUsage.costThisMonth.toFixed(2)}
            </div>
            <div className="text-sm text-muted-foreground">Cost This Month</div>
            <div className="text-xs mt-1">
              Projected: €{tokenUsage.projectedMonthly.toFixed(2)}
            </div>
          </div>

          <div className="text-center p-4 bg-chart-3/10 rounded-lg border">
            <div className="text-2xl font-bold text-chart-3">
              {Math.ceil((tokenUsage.resetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))}
            </div>
            <div className="text-sm text-muted-foreground">Days Until Reset</div>
            <div className="text-xs mt-1">
              Resets {formatEuropeanDate(tokenUsage.resetDate)}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="token-limit">Monthly Token Budget</Label>
            <span className="text-sm text-muted-foreground">
              {settings.monthlyTokenLimit.toLocaleString()} tokens
            </span>
          </div>
          <Slider
            id="token-limit"
            min={1000}
            max={100000}
            step={1000}
            value={[settings.monthlyTokenLimit]}
            onValueChange={([value]) => updateSettings({ monthlyTokenLimit: value })}
            className="w-full"
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="usage-alerts"
              checked={settings.usageAlerts}
              onCheckedChange={(checked) => updateSettings({ usageAlerts: checked })}
            />
            <Label htmlFor="usage-alerts">Usage alerts at 80%</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="auto-top-up"
              checked={settings.autoTopUp}
              onCheckedChange={(checked) => updateSettings({ autoTopUp: checked })}
            />
            <Label htmlFor="auto-top-up">Auto top-up when low</Label>
          </div>
        </div>

        {tokenUsage.current > tokenUsage.limit * 0.8 && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="font-medium text-destructive">Token limit approaching</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              You've used {Math.round((tokenUsage.current / tokenUsage.limit) * 100)}% of your monthly tokens.
              Consider purchasing additional tokens or upgrading your plan.
            </p>
            <Button
              size="sm"
              className="mt-2"
              onClick={() => setShowTokenPurchase(true)}
            >
              Purchase Tokens
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### 7. GDPR Privacy Controls

```typescript
// /src/components/settings/privacy/PrivacyGDPRPage.tsx
export function PrivacyGDPRPage() {
  return (
    <div className="space-y-8">
      <PrivacyOverviewCard />
      <DataExportCard />
      <DataDeletionCard />
      <ConsentManagementCard />
      <CookiePreferencesCard />
      <DataProcessingCard />
    </div>
  );
}

// /src/components/settings/privacy/DataExportCard.tsx
interface ExportRequest {
  id: string;
  type: 'full' | 'contacts' | 'conversations' | 'integrations';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: Date;
  completedAt?: Date;
  downloadUrl?: string;
  expiresAt?: Date;
}

export function DataExportCard() {
  const { exportRequests, requestExport } = useDataExport();
  const [selectedExportType, setSelectedExportType] = useState<ExportRequest['type']>('full');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Data Export (GDPR Article 20)
        </CardTitle>
        <CardDescription>
          Request a copy of your personal data in a machine-readable format
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="export-type">Export Type</Label>
            <Select value={selectedExportType} onValueChange={setSelectedExportType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Complete Data Export</SelectItem>
                <SelectItem value="contacts">Contacts Only</SelectItem>
                <SelectItem value="conversations">AI Conversations</SelectItem>
                <SelectItem value="integrations">Integration Data</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-1">
              Choose what data to include in your export
            </p>
          </div>

          <div className="flex items-end">
            <Button onClick={() => requestExport(selectedExportType)} className="w-full">
              <Download className="h-3 w-3 mr-1" />
              Request Export
            </Button>
          </div>
        </div>

        {exportRequests.length > 0 && (
          <div className="space-y-3">
            <Label>Recent Export Requests</Label>
            <div className="space-y-2">
              {exportRequests.map((request) => (
                <ExportRequestItem key={request.id} request={request} />
              ))}
            </div>
          </div>
        )}

        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2">Export Information</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Data is exported in JSON format for portability</li>
            <li>• Exports are available for 30 days after completion</li>
            <li>• Processing typically takes 2-24 hours</li>
            <li>• You'll receive an email notification when ready</li>
            <li>• All exports are encrypted and password-protected</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

// /src/components/settings/privacy/DataDeletionCard.tsx
interface DeletionOption {
  id: string;
  label: string;
  description: string;
  consequences: string[];
  irreversible: boolean;
  confirmationRequired: boolean;
}

export function DataDeletionCard() {
  const [showDeletionDialog, setShowDeletionDialog] = useState(false);
  const [selectedDeletion, setSelectedDeletion] = useState<DeletionOption | null>(null);

  const deletionOptions: DeletionOption[] = [
    {
      id: 'conversations',
      label: 'Delete AI Conversations',
      description: 'Remove all AI chat history and conversation data',
      consequences: ['AI assistant loses context', 'Cannot be recovered'],
      irreversible: true,
      confirmationRequired: true
    },
    {
      id: 'contacts',
      label: 'Delete All Contacts',
      description: 'Remove all contact records and associated data',
      consequences: ['All contact data lost', 'Integration history cleared', 'Cannot be recovered'],
      irreversible: true,
      confirmationRequired: true
    },
    {
      id: 'integrations',
      label: 'Disconnect All Integrations',
      description: 'Revoke all third-party connections and sync data',
      consequences: ['Google access revoked', 'Sync history cleared', 'Can reconnect later'],
      irreversible: false,
      confirmationRequired: false
    },
    {
      id: 'account',
      label: 'Delete Entire Account',
      description: 'Permanently delete your account and all associated data',
      consequences: ['All data permanently deleted', 'Account cannot be recovered', 'Subscription cancelled'],
      irreversible: true,
      confirmationRequired: true
    }
  ];

  return (
    <>
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-4 w-4" />
            Data Deletion (GDPR Article 17)
          </CardTitle>
          <CardDescription>
            Request deletion of your personal data (Right to be Forgotten)
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {deletionOptions.map((option) => (
              <div
                key={option.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm text-muted-foreground">{option.description}</div>
                  {option.irreversible && (
                    <Badge variant="destructive" className="mt-1 text-xs">
                      Irreversible
                    </Badge>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedDeletion(option);
                    setShowDeletionDialog(true);
                  }}
                  className="border-destructive/20 text-destructive hover:bg-destructive/10"
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>

          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
              <div>
                <h4 className="font-medium text-destructive">Important Notice</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Some deletion requests are irreversible and will permanently remove your data.
                  Please ensure you have exported any data you wish to keep before proceeding.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <DeletionConfirmationDialog
        isOpen={showDeletionDialog}
        onClose={() => setShowDeletionDialog(false)}
        option={selectedDeletion}
      />
    </>
  );
}
```

---

## Enhanced UX Patterns

### 1. Toast-Based Notifications

```typescript
// /src/hooks/useNotifications.ts - Replace alert() calls
import { toast } from "sonner";

export function useNotifications() {
  return {
    success: (message: string, description?: string) => {
      toast.success(message, {
        description,
        duration: 4000,
      });
    },

    error: (message: string, description?: string) => {
      toast.error(message, {
        description,
        duration: 6000,
        action: {
          label: "Retry",
          onClick: () => window.location.reload(),
        },
      });
    },

    loading: (message: string) => {
      return toast.loading(message, {
        duration: Infinity,
      });
    },

    promise: <T>(
      promise: Promise<T>,
      {
        loading,
        success,
        error,
      }: {
        loading: string;
        success: (data: T) => string;
        error: (err: Error) => string;
      },
    ) => {
      return toast.promise(promise, {
        loading,
        success,
        error,
        duration: 4000,
      });
    },
  };
}

// Usage in components:
export function GoogleServiceCard() {
  const notifications = useNotifications();

  const handleConnect = async (service: "gmail" | "calendar") => {
    const connectPromise = connect(service);

    notifications.promise(connectPromise, {
      loading: `Connecting to ${service}...`,
      success: () => `${service} connected successfully!`,
      error: (err) => `Failed to connect ${service}: ${err.message}`,
    });
  };
}
```

### 2. European Date Formatting

```typescript
// /src/lib/dateFormat.ts
export function formatEuropeanDate(date: Date | null | undefined): string {
  if (!date) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatEuropeanDateTime(date: Date | null | undefined): string {
  if (!date) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatRelativeTime(date: Date): string {
  const rtf = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });
  const diffInSeconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return rtf.format(-diffInSeconds, "second");
  if (diffInSeconds < 3600) return rtf.format(-Math.floor(diffInSeconds / 60), "minute");
  if (diffInSeconds < 86400) return rtf.format(-Math.floor(diffInSeconds / 3600), "hour");
  return rtf.format(-Math.floor(diffInSeconds / 86400), "day");
}
```

### 3. Loading States and Skeletons

```typescript
// /src/components/settings/LoadingStates.tsx
export function SettingsPageSkeleton() {
  return (
    <div className="space-y-8">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-32" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function SyncStatusSkeleton() {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
    </div>
  );
}
```

---

## API Integration Patterns

### 1. Custom Hooks for Settings Management

```typescript
// /src/hooks/useGoogleIntegration.ts
interface GoogleIntegrationHook {
  status: GoogleConnectionStatus;
  connect: (service: "gmail" | "calendar") => Promise<void>;
  disconnect: (service: "gmail" | "calendar") => Promise<void>;
  sync: (service: "gmail" | "calendar") => Promise<void>;
  preview: (service: "gmail" | "calendar") => Promise<PreviewResult>;
  isLoading: boolean;
  error: string | null;
}

export function useGoogleIntegration(): GoogleIntegrationHook {
  const [status, setStatus] = useState<GoogleConnectionStatus>(initialStatus);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const notifications = useNotifications();

  const connect = useCallback(
    async (service: "gmail" | "calendar") => {
      setIsLoading(true);
      setError(null);

      try {
        // Trigger OAuth flow
        window.location.href = `/api/google/oauth?scope=${service}`;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Connection failed";
        setError(errorMessage);
        notifications.error(`Failed to connect ${service}`, errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [notifications],
  );

  const sync = useCallback(
    async (service: "gmail" | "calendar") => {
      const syncPromise = callAPI(`/api/sync/approve/${service}`, "POST");

      notifications.promise(syncPromise, {
        loading: `Starting ${service} sync...`,
        success: (result) => `${service} sync completed: ${result.processed} items`,
        error: (err) => `Sync failed: ${err.message}`,
      });

      return syncPromise;
    },
    [notifications],
  );

  // Load status on mount and when needed
  useEffect(() => {
    loadStatus();
  }, []);

  return {
    status,
    connect,
    disconnect,
    sync,
    preview,
    isLoading,
    error,
  };
}

// /src/hooks/useSyncPreferences.ts
export function useSyncPreferences() {
  const [preferences, setPreferences] = useState<SyncPreferencesFormData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const notifications = useNotifications();

  const loadPreferences = useCallback(async () => {
    try {
      const response = await fetch("/api/settings/sync/prefs");
      if (!response.ok) throw new Error("Failed to load preferences");

      const data = await response.json();
      setPreferences(data);
    } catch (err) {
      notifications.error("Failed to load sync preferences");
    } finally {
      setIsLoading(false);
    }
  }, [notifications]);

  const updatePreferences = useCallback(
    async (updates: Partial<SyncPreferencesFormData>) => {
      const newPrefs = { ...preferences, ...updates };
      setPreferences(newPrefs);

      try {
        const response = await fetch("/api/settings/sync/prefs", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": getCsrfToken() || "",
          },
          body: JSON.stringify(newPrefs),
        });

        if (!response.ok) throw new Error("Failed to save preferences");

        notifications.success("Preferences saved successfully");
      } catch (err) {
        // Revert optimistic update
        setPreferences(preferences);
        notifications.error("Failed to save preferences");
      }
    },
    [preferences, notifications],
  );

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return {
    preferences,
    updatePreferences,
    isLoading,
    reload: loadPreferences,
  };
}
```

### 2. Error Boundary for Settings

```typescript
// /src/components/settings/SettingsErrorBoundary.tsx
export class SettingsErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Settings Error Boundary caught an error:', error, errorInfo);

    // Report to monitoring service
    if (typeof window !== 'undefined') {
      toast.error('Settings Error', {
        description: 'An unexpected error occurred. Please refresh the page.',
        action: {
          label: 'Refresh',
          onClick: () => window.location.reload()
        }
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Something went wrong</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              An error occurred while loading this settings section.
            </p>
            <Button
              onClick={() => this.setState({ hasError: false })}
              variant="outline"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
```

---

## File Structure

```bash
src/
├── components/
│   └── settings/
│       ├── SettingsLayout.tsx           # Main layout with sidebar
│       ├── SettingsSidebar.tsx          # Navigation sidebar
│       ├── SettingsHeader.tsx           # Page header
│       ├── SettingsErrorBoundary.tsx    # Error handling
│       ├── LoadingStates.tsx            # Skeleton components
│       │
│       ├── integrations/                # Google Integration (replaces SyncSettingsPage)
│       │   ├── IntegrationsPage.tsx
│       │   ├── GoogleIntegrationCard.tsx
│       │   ├── GoogleServiceCard.tsx
│       │   ├── SyncPreferencesCard.tsx
│       │   ├── GmailPreferencesPanel.tsx
│       │   ├── CalendarPreferencesPanel.tsx
│       │   ├── SyncActionsPanel.tsx
│       │   ├── SyncHistoryCard.tsx
│       │   └── IntegrationStatusCard.tsx
│       │
│       ├── billing/                     # Billing & Subscriptions
│       │   ├── BillingPage.tsx
│       │   ├── CurrentPlanCard.tsx
│       │   ├── UsageOverviewCard.tsx
│       │   ├── PaymentMethodsCard.tsx
│       │   ├── BillingHistoryCard.tsx
│       │   └── PlanComparisonCard.tsx
│       │
│       ├── ai/                          # AI Assistant Settings
│       │   ├── AIAssistantPage.tsx
│       │   ├── AITokenManagementCard.tsx
│       │   ├── ChatPreferencesCard.tsx
│       │   ├── AIModelSettingsCard.tsx
│       │   ├── ContextSettingsCard.tsx
│       │   └── AIUsageAnalyticsCard.tsx
│       │
│       ├── privacy/                     # GDPR & Privacy
│       │   ├── PrivacyGDPRPage.tsx
│       │   ├── PrivacyOverviewCard.tsx
│       │   ├── DataExportCard.tsx
│       │   ├── DataDeletionCard.tsx
│       │   ├── ConsentManagementCard.tsx
│       │   ├── CookiePreferencesCard.tsx
│       │   └── DataProcessingCard.tsx
│       │
│       ├── profile/                     # Profile & Account
│       │   ├── ProfilePage.tsx
│       │   ├── AccountInfoCard.tsx
│       │   ├── SecuritySettingsCard.tsx
│       │   └── TwoFactorCard.tsx
│       │
│       └── appearance/                  # Theme & Display
│           ├── AppearancePage.tsx
│           ├── ThemeSettingsCard.tsx
│           ├── LanguageSettingsCard.tsx
│           └── DisplayPreferencesCard.tsx
│
├── hooks/
│   ├── useGoogleIntegration.ts         # Google services management
│   ├── useSyncPreferences.ts           # Sync settings hook
│   ├── useBilling.ts                   # Billing & subscription data
│   ├── useAISettings.ts                # AI assistant configuration
│   ├── useNotifications.ts             # Toast notifications
│   └── useDataExport.ts                # GDPR data export
│
├── lib/
│   ├── dateFormat.ts                   # European date formatting
│   └── settingsUtils.ts               # Shared utilities
│
└── app/
    └── settings/
        ├── layout.tsx                  # Settings app layout
        ├── page.tsx                    # Default: Profile page
        ├── integrations/
        │   └── page.tsx                # Google integrations
        ├── billing/
        │   └── page.tsx                # Billing & plans
        ├── ai-assistant/
        │   └── page.tsx                # AI settings
        ├── privacy-gdpr/
        │   └── page.tsx                # Privacy controls
        └── appearance/
            └── page.tsx                # Theme & display
```

---

## Implementation Priority

### Phase 1: Core Infrastructure (Week 1)

1. **SettingsLayout** and **SettingsSidebar** - Navigation foundation
2. **SettingsErrorBoundary** - Error handling
3. **useNotifications** - Replace all alert() calls
4. **dateFormat.ts** - European date formatting

### Phase 2: Integrations Refactor (Week 2)

1. **IntegrationsPage** - Replace monolithic SyncSettingsPage
2. **GoogleIntegrationCard** with service cards
3. **SyncPreferencesCard** with modular panels
4. **Toast notifications** for all sync operations

### Phase 3: Billing & AI Settings (Week 3)

1. **BillingPage** with subscription management
2. **AITokenManagementCard** with usage tracking
3. **UsageOverviewCard** with progress indicators

### Phase 4: GDPR & Privacy (Week 4)

1. **PrivacyGDPRPage** with data controls
2. **DataExportCard** with GDPR Article 20 compliance
3. **DataDeletionCard** with Right to be Forgotten
4. **ConsentManagementCard** for privacy preferences

---

## Testing Strategy

### Component Testing

```typescript
// /src/components/settings/__tests__/GoogleIntegrationCard.test.tsx
describe('GoogleIntegrationCard', () => {
  it('shows connection status correctly', () => {
    render(<GoogleIntegrationCard />);
    expect(screen.getByText('Google Workspace')).toBeInTheDocument();
  });

  it('handles connection flow with toast notifications', async () => {
    const mockConnect = jest.fn();
    render(<GoogleIntegrationCard onConnect={mockConnect} />);

    fireEvent.click(screen.getByText('Connect Gmail'));
    expect(mockConnect).toHaveBeenCalledWith('gmail');
  });

  it('formats European dates correctly', () => {
    const lastSync = new Date('2025-08-12T14:30:00Z');
    render(<GoogleServiceCard status={{ lastSync, connected: true }} />);

    expect(screen.getByText('12/08/2025')).toBeInTheDocument();
  });
});
```

### Integration Testing

```typescript
// Test the complete settings flow
describe('Settings Integration', () => {
  it('navigates between settings categories', () => {
    render(<SettingsLayout />);

    fireEvent.click(screen.getByText('Integrations'));
    expect(screen.getByText('Google Workspace')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Billing & Plans'));
    expect(screen.getByText('Current Plan')).toBeInTheDocument();
  });

  it('saves preferences with proper error handling', async () => {
    const mockSave = jest.fn().mockRejectedValue(new Error('Network error'));
    render(<SyncPreferencesCard onSave={mockSave} />);

    fireEvent.click(screen.getByText('Save Preferences'));

    await waitFor(() => {
      expect(screen.getByText('Failed to save preferences')).toBeInTheDocument();
    });
  });
});
```

---

## Success Metrics

### Technical Improvements

- **Reduced Complexity**: 459-line component → 8 focused components (<100 lines each)
- **Eliminated Alert() Calls**: 0 alert() calls, all replaced with toast notifications
- **Error Handling**: Proper error boundaries and user feedback
- **European Standards**: DD/MM/YYYY dates throughout
- **Type Safety**: Full TypeScript coverage for all settings interfaces

### User Experience Improvements

- **Progressive Disclosure**: Complex settings organized by category
- **Visual Status Indicators**: Clear connection states and sync status
- **Loading States**: Skeleton loading for all async operations
- **GDPR Compliance**: Built-in data export and deletion controls
- **Responsive Design**: Mobile-friendly settings interface

### Maintainability Gains

- **Modular Components**: Easy to test and extend individual settings
- **Reusable Hooks**: Shared logic for API calls and state management
- **Consistent Patterns**: Standardized card layouts and form controls
- **Error Boundaries**: Graceful failure handling at component level

This design provides a comprehensive solution to the current SyncSettingsPage issues while establishing a scalable foundation for future settings categories. The modular architecture ensures each component has a single responsibility, making the codebase more maintainable and the user experience significantly improved.
