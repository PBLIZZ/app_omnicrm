"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Mic, Send } from "lucide-react";
import { toast } from "sonner";
import { post } from "@/lib/api/client";
import { Textarea } from "@/components/ui/textarea";

// Speech Recognition Types
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: Event) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

// Extend window for speech recognition
declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
  }
}

interface NoteComposerPopoverProps {
  children: React.ReactNode;
  contactId: string;
  contactName: string;
}

export function NoteComposerPopover({
  children,
  contactId,
  contactName,
}: NoteComposerPopoverProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Draft persistence
  const draftKey = `note-draft-${contactId}`;

  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        setContent(savedDraft);
      }
      // Focus will be handled by ReactQuill internally
    }
  }, [isOpen, draftKey]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const trimmedContent = content?.trim() || "";
      if (trimmedContent) {
        localStorage.setItem(draftKey, trimmedContent);
      } else {
        localStorage.removeItem(draftKey);
      }
    }
  }, [content, draftKey]);

  const handleSubmit = async (): Promise<void> => {
    const plainTextContent = content.trim();

    if (!plainTextContent) {
      toast.error("Please enter a note");
      return;
    }

    setIsSubmitting(true);
    try {
      await post<{
        id: string;
        title?: string;
        content: string;
        createdAt: string;
        updatedAt: string;
      }>(`/api/contacts/${contactId}/notes`, {
        content: `[User] ${plainTextContent}`,
      });

      toast.success("Note saved successfully");
      setContent("");
      localStorage.removeItem(draftKey);
      setIsOpen(false);

      // Refresh the notes data - you may want to use React Query invalidation here
      window.dispatchEvent(new CustomEvent("notesUpdated", { detail: { contactId } }));
    } catch (error) {
      console.error("Failed to save note:", error);
      toast.error("Failed to save note");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnhance = async (): Promise<void> => {
    const plainTextContent = content.trim();

    if (!plainTextContent) {
      toast.error("Please enter some text to enhance");
      return;
    }

    setIsEnhancing(true);
    try {
      // TODO: Implement LLM enhancement API call
      const result = await post<{ enhancedContent: string }>(
        `/api/contacts/${contactId}/notes/enhance`,
        {
          content: plainTextContent,
        },
      );

      setContent(result.enhancedContent);
      toast.success("Note enhanced with AI");
    } catch (error) {
      console.error("AI enhancement failed:", error);
      toast.error("AI enhancement not available");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleVoiceToText = async (): Promise<void> => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      toast.error("Voice recognition not supported in this browser");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsRecording(true);
      toast.info("Listening... Speak now");
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript;
      const newText = content + (content ? " " : "") + transcript;
      setContent(newText);
      toast.success("Voice input added");
    };

    recognition.onerror = (event: Event) => {
      console.error("Voice recognition error:", event);
      toast.error("Voice recognition failed");
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  // Handle Enter key to submit
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit().catch((error) => {
        toast.error("Failed to save note");
        console.error("Note submission error:", error);
      });
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-96 p-0" side="right" align="start">
        <div className="p-4 space-y-3">
          <div className="space-y-1">
            <h4 className="font-semibold text-sm">Add Note</h4>
            <p className="text-xs text-muted-foreground">for {contactName}</p>
          </div>

          <div className="space-y-2">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write your note here..."
              className="min-h-32 resize-none"
              rows={5}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEnhance}
                disabled={isEnhancing || !content.trim()}
                className="h-8 text-xs"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                {isEnhancing ? "Enhancing..." : "Enhance"}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleVoiceToText}
                disabled={isRecording}
                className="h-8 text-xs"
              >
                <Mic className={`h-3.5 w-3.5 mr-1 ${isRecording ? "text-red-500" : ""}`} />
                {isRecording ? "Listening..." : "Voice"}
              </Button>
            </div>

            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting || !content.trim()}
              className="h-8 text-xs"
            >
              <Send className="h-3.5 w-3.5 mr-1" />
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
