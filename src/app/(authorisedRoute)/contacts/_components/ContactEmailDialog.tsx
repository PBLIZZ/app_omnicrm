"use client";

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Mail, Copy, ExternalLink, Loader2 } from 'lucide-react';
import { ContactEmailSuggestion } from '@/hooks/use-contact-ai-actions';
import { toast } from 'sonner';

interface ContactEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emailSuggestion: ContactEmailSuggestion | null;
  isLoading: boolean;
  contactName?: string;
  contactEmail?: string | null;
}

export function ContactEmailDialog({
  open,
  onOpenChange,
  emailSuggestion,
  isLoading,
  contactName,
  contactEmail,
}: ContactEmailDialogProps): JSX.Element {
  const [editedSubject, setEditedSubject] = useState('');
  const [editedContent, setEditedContent] = useState('');

  // Update edited values when emailSuggestion changes
  useEffect(() => {
    if (emailSuggestion) {
      setEditedSubject(emailSuggestion.subject);
      setEditedContent(emailSuggestion.content);
    }
  }, [emailSuggestion]);

  const handleCopyEmail = (): void => {
    if (!emailSuggestion) return;
    
    const emailText = `Subject: ${editedSubject}\n\nTo: ${contactEmail}\n\n${editedContent}`;
    navigator.clipboard.writeText(emailText).catch((error) => {
      console.error('Failed to copy email to clipboard:', error);
      toast.error('Failed to copy email to clipboard');
    });
    toast.success('Email copied to clipboard');
  };

  const handleOpenEmailClient = (): void => {
    if (!contactEmail || !editedSubject || !editedContent) return;
    
    const mailtoUrl = `mailto:${contactEmail}?subject=${encodeURIComponent(editedSubject)}&body=${encodeURIComponent(editedContent)}`;
    window.open(mailtoUrl, '_blank');
  };

  const getToneColor = (tone: string): string => {
    switch (tone) {
      case 'professional': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'friendly': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'casual': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'formal': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-green-600" />
            <DialogTitle>AI Email Suggestion</DialogTitle>
          </div>
          <DialogDescription>
            {contactName && contactEmail && 
              `AI-generated email suggestion for ${contactName} (${contactEmail})`
            }
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            <span className="ml-2 text-sm text-muted-foreground">
              Generating email suggestion...
            </span>
          </div>
        )}

        {emailSuggestion && !isLoading && (
          <div className="space-y-6">
            {/* Email Metadata */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`text-xs ${getToneColor(emailSuggestion.tone)}`}>
                Tone: {emailSuggestion.tone}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Purpose: {emailSuggestion.purpose}
              </Badge>
            </div>

            {/* Subject Field */}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={editedSubject}
                onChange={(e) => setEditedSubject(e.target.value)}
                placeholder="Email subject"
              />
            </div>

            {/* Content Field */}
            <div className="space-y-2">
              <Label htmlFor="content">Email Content</Label>
              <Textarea
                id="content"
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                placeholder="Email content"
                rows={12}
                className="resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-between">
              <Button
                variant="outline"
                onClick={handleCopyEmail}
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy Email
              </Button>
              
              {contactEmail && (
                <Button
                  onClick={handleOpenEmailClient}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in Email Client
                </Button>
              )}
            </div>
          </div>
        )}

        {!emailSuggestion && !isLoading && (
          <div className="text-center py-8">
            <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">
              No email suggestion available. Try generating an email for this contact.
            </p>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}