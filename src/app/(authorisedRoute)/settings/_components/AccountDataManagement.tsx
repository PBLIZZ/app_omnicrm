"use client";

import { useState } from "react";
import { Download, Trash2, AlertTriangle, FileText } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Alert,
  AlertDescription,
  Badge,
} from "@/components/ui";

import { DataExportDialog } from "./DataExportDialog";
import { AccountDeletionDialog } from "./AccountDeletionDialog";

export function AccountDataManagement(): JSX.Element {
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showDeletionDialog, setShowDeletionDialog] = useState(false);

  return (
    <div className="space-y-6">
      {/* Data Export Section */}
      <Card className="bg-gradient-to-br from-teal-50 via-emerald-50 to-teal-50 border-l-4 border-teal-400">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            <CardTitle>Export Your Data</CardTitle>
          </div>
          <CardDescription>
            Download a complete copy of all your data in JSON format. This includes contacts,
            interactions, AI states, and manual overrides.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Complete Data Export</p>
              <p className="text-sm text-gray-600">
                Includes all contacts, interactions, AI analysis, and settings
              </p>
            </div>
            <Button onClick={() => setShowExportDialog(true)} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export Data
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <Badge variant="outline" className="mb-2">
                <FileText className="h-3 w-3 mr-1" />
                Contacts
              </Badge>
              <p className="text-sm text-gray-600">All contact information and profiles</p>
            </div>
            <div className="text-center">
              <Badge variant="outline" className="mb-2">
                <FileText className="h-3 w-3 mr-1" />
                Interactions
              </Badge>
              <p className="text-sm text-gray-600">Communication history and logs</p>
            </div>
            <div className="text-center">
              <Badge variant="outline" className="mb-2">
                <FileText className="h-3 w-3 mr-1" />
                AI Analysis
              </Badge>
              <p className="text-sm text-gray-600">AI-generated insights and overrides</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Deletion Section */}
      <Card className="bg-gradient-to-br from-red-100 via-rose-50 to-red-100 border-l-4 border-red-400">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">Delete Your Account</CardTitle>
          </div>
          <CardDescription>
            Permanently delete your account and all associated data. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-red-500/20 border-red-500/30">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> Account deletion is permanent and irreversible. All your
              contacts, interactions, AI analysis, and settings will be permanently removed from our
              systems.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">What will be deleted:</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• All contact profiles and information</li>
              <li>• Complete interaction history</li>
              <li>• AI-generated insights and analysis</li>
              <li>• Manual overrides and customizations</li>
              <li>• Account settings and preferences</li>
              <li>• Uploaded files and attachments</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Before you delete:</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• Export your data if you want to keep a copy</li>
              <li>• Cancel any active subscriptions</li>
              <li>• Inform team members if this is a shared account</li>
            </ul>
          </div>

          <div className="pt-4 border-t">
            <Button
              onClick={() => setShowDeletionDialog(true)}
              variant="destructive"
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete My Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <DataExportDialog open={showExportDialog} onOpenChange={setShowExportDialog} />
      <AccountDeletionDialog open={showDeletionDialog} onOpenChange={setShowDeletionDialog} />
    </div>
  );
}
