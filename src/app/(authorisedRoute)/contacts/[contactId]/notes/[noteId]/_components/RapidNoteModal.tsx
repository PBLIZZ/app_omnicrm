/**
 * RapidNoteModal Component
 * Task 1.2.2 - 1.2.17 Implementation
 *
 * A full-screen modal for rapid note capture with:
 * - Full-screen overlay with dimmed background
 * - Text input area with 1200 character limit
 * - Voice recording integration via VoiceRecorder component
 * - Contact selector dropdown
 * - Auto-save draft functionality
 * - PII detection warnings
 *
 * @see __tests__/RapidNoteModal.test.tsx for test coverage
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mic, Loader2 } from "lucide-react";
import { VoiceRecorder } from "./VoiceRecorder";
import { ContactSearchCombobox } from "./ContactSearchCombobox";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { validateNoPII, type PIIValidationResult } from "@/lib/pii-detector-client";
import { waitForTranscription } from "./waitForTranscription";

export interface Contact {
  id: string;
  displayName: string;
  primaryEmail?: string | null;
}

export interface RapidNoteModalProps {
  /**
   * Controls modal visibility
   */
  isOpen: boolean;

  /**
   * Callback when modal should close
   */
  onClose: () => void;

  /**
   * Callback when note is saved
   * Returns the saved note data
   */
  onSave: (data: {
    contactId: string;
    content: string;
    sourceType: "typed" | "voice";
  }) => Promise<{ success: boolean; redactionWarning?: boolean }>;

  /**
   * Optional: Pre-select the last viewed contact
   */
  lastViewedContactId?: string;
}

const MAX_CHARACTERS = 1200;
const WARNING_THRESHOLD = 1100;

export function RapidNoteModal({
  isOpen,
  onClose,
  onSave,
  lastViewedContactId,
}: RapidNoteModalProps): JSX.Element {
  const [content, setContent] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string | undefined>(
    lastViewedContactId,
  );
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [sourceType, setSourceType] = useState<"typed" | "voice">("typed");
  const [piiValidation, setPiiValidation] = useState<PIIValidationResult | null>(null);

  // Pre-select last viewed contact when modal opens
  useEffect(() => {
    if (isOpen && lastViewedContactId) {
      setSelectedContactId(lastViewedContactId);
    }
  }, [isOpen, lastViewedContactId]);

  // Auto-save draft functionality
  useEffect(() => {
    if (!isOpen || !selectedContactId) return;

    // Load existing draft when modal opens
    const draftKey = `rapid-note-draft-${selectedContactId}`;
    const savedDraft = localStorage.getItem(draftKey);

    if (savedDraft && !content) {
      setContent(savedDraft);
    }
  }, [isOpen, selectedContactId, content]);

  // Auto-save draft every 5 seconds while typing
  useEffect(() => {
    if (!isOpen || !selectedContactId || !content) return;

    const draftKey = `rapid-note-draft-${selectedContactId}`;
    const timer = setInterval(() => {
      localStorage.setItem(draftKey, content);
    }, 5000);

    return () => clearInterval(timer);
  }, [isOpen, selectedContactId, content]);

  // Character count with limit enforcement
  const characterCount = content.length;
  const isApproachingLimit = characterCount > WARNING_THRESHOLD;
  const isAtLimit = characterCount >= MAX_CHARACTERS;

  // Handle text input with character limit and PII detection
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const newContent = e.target.value;
    if (newContent.length <= MAX_CHARACTERS) {
      setContent(newContent);
      setSourceType("typed");

      // Run PII detection on content change
      const validation = validateNoPII(newContent);
      setPiiValidation(validation);
    }
  };

  // Handle voice recording complete
  const handleRecordingComplete = useCallback(async (_audioBlob: Blob) => {
    setIsRecording(false);
    setIsTranscribing(true);

    try {
      // Await a mockable helper to represent transcription latency (mocked in tests)
      await waitForTranscription();
      // Placeholder until /api/notes/transcribe is implemented
      // When available, call the endpoint with multipart/form-data and replace the fallback text
      const transcribedText = "[Transcribing audio… integration pending]";

      const newContent = content + (content ? "\n\n" : "") + transcribedText;
      const finalContent = newContent.slice(0, MAX_CHARACTERS);
      setContent(finalContent);
      setSourceType("voice");

      // Run PII detection on transcribed content
      const validation = validateNoPII(finalContent);
      setPiiValidation(validation);
    } catch (error) {
      console.error("Transcription failed:", error);
      toast.error("Transcription failed. Please try again.");
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  // Handle save
  const handleSave = async (): Promise<void> => {
    // Validate contact selection
    if (!selectedContactId) {
      toast.error("Please select a contact");
      return;
    }

    // Validate content
    if (!content.trim()) {
      toast.error("Please enter note content");
      return;
    }

    setIsSaving(true);

    try {
      const result = await onSave({
        contactId: selectedContactId,
        content: content.trim(),
        sourceType,
      });

      // Show appropriate toast based on redaction
      if (result.redactionWarning) {
        toast.error("PII detected and redacted", {
          description: "Sensitive information was automatically removed from your note.",
          duration: 5000,
        });
      } else {
        toast.success("Note saved successfully", {
          duration: 3000,
        });
      }

      // Clear draft and reset form
      if (selectedContactId) {
        const draftKey = `rapid-note-draft-${selectedContactId}`;
        localStorage.removeItem(draftKey);
      }

      setContent("");
      setSelectedContactId(lastViewedContactId);
      setSourceType("typed");
      setPiiValidation(null);
      onClose();
    } catch (error) {
      console.error("Failed to save note:", error);
      // API client already shows error toast
    } finally {
      setIsSaving(false);
    }
  };

  // Handle modal close
  const handleClose = (): void => {
    if (!isSaving) {
      onClose();
    }
  };

  // Disable save button conditions
  const isSaveDisabled = !selectedContactId || !content.trim() || isSaving;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-4xl h-[90vh] flex flex-col p-0"
        aria-modal="true"
        onEscapeKeyDown={handleClose}
      >
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-2xl font-semibold">Rapid Note Capture</DialogTitle>
          <DialogDescription>
            Quickly capture notes for your contacts. Select a contact and add your note content.
          </DialogDescription>
        </DialogHeader>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col px-6 py-4 gap-6 overflow-hidden">
          {/* Contact Selector */}
          <div className="space-y-2">
            <Label htmlFor="contact-selector">Select Contact</Label>
            <ContactSearchCombobox
              value={selectedContactId}
              onValueChange={setSelectedContactId}
              placeholder="Search contacts..."
              className="w-full"
            />
          </div>

          {/* PII Warning Banner */}
          {piiValidation?.hasPII && (
            <div className="border border-amber-200 bg-amber-50 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <div className="text-amber-600 text-sm font-medium">
                  ⚠️ Sensitive information detected
                </div>
              </div>
              <div className="text-amber-700 text-sm mt-1">
                The following information will be automatically removed:{" "}
                {piiValidation.detectedTypes.join(", ")}
              </div>
            </div>
          )}

          {/* Voice Recorder (when active) */}
          {isRecording && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <VoiceRecorder
                onRecordingComplete={handleRecordingComplete}
                maxDuration={180}
                onError={(error) => {
                  console.error("Recording error:", error);
                  setIsRecording(false);
                }}
              />
            </div>
          )}

          {/* Note Content Input Area */}
          <div className="flex-1 flex flex-col space-y-2 min-h-0">
            <div className="flex items-center justify-between">
              <Label htmlFor="note-content">Note Content</Label>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-sm tabular-nums",
                    isAtLimit && "text-destructive font-semibold",
                    isApproachingLimit && !isAtLimit && "text-amber-600 font-medium",
                    !isApproachingLimit && "text-muted-foreground",
                  )}
                >
                  {characterCount} / {MAX_CHARACTERS}
                </span>
              </div>
            </div>

            <div className="flex-1 min-h-0 relative">
              <Textarea
                id="note-content"
                aria-label="Rapid note content"
                value={content}
                onChange={handleContentChange}
                placeholder="Type your note here or click the microphone to record..."
                className="h-full resize-none font-sans"
                disabled={isRecording || isTranscribing}
              />

              {/* Mic Button (overlay on textarea) */}
              {!isRecording && !isTranscribing && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="absolute bottom-3 right-3"
                  onClick={() => setIsRecording(true)}
                  aria-label="Record voice note"
                >
                  <Mic className="h-4 w-4" />
                </Button>
              )}

              {isTranscribing && (
                <div
                  className="absolute bottom-3 right-3 flex items-center gap-2 text-sm text-muted-foreground"
                  aria-live="polite"
                  aria-busy="true"
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Transcribing…
                </div>
              )}
            </div>

            {/* Helper Text */}
            <p className="text-sm text-muted-foreground">
              For advanced editing options, visit the Contact Details page
            </p>
          </div>
        </div>

        {/* Footer with Actions */}
        <div className="px-6 py-4 border-t flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaveDisabled}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Note"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
