"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Textarea,
} from "@/components/ui";
import { Sparkles, Mic, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * MagicInboxCard - Unified "Dump Everything" Interface
 *
 * Combines Quick Capture and Simple Inbox Capture into one cohesive component.
 * Research findings:
 * - Wellness practitioners need to quickly capture thoughts between sessions
 * - Voice input preferred for hands-free capture during treatments
 * - Simple text input as fallback
 * - AI processing for intelligent categorization by zones
 */
export function MagicInboxCard(): JSX.Element {
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (): Promise<void> => {
    if (!inputText.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/omni-momentum/inbox/intelligent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rawText: inputText,
          enableIntelligentProcessing: true,
          priority: "medium",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to queue item for processing");
      }

      const result = await response.json();

      toast({
        title: "Captured! ✨",
        description: result.message || "Your thoughts have been queued for intelligent processing.",
      });

      setInputText("");
    } catch (error) {
      toast({
        title: "Capture Failed",
        description: "Please try again or check your connection.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoiceCapture = (): void => {
    setIsRecording(true);
    toast({
      title: "Voice Capture",
      description: "Voice input coming soon! Use text input for now.",
    });
    setTimeout(() => setIsRecording(false), 2000);
  };

  return (
    <Card className="bg-gradient-to-r from-teal-50 via-emerald-50 to-amber-50 border-teal-200 h-[390px] flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="w-5 h-5 text-teal-600" />
          Magic Inbox
        </CardTitle>
        <CardDescription className="text-xs">
          Dump everything here - AI will organize it for you
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* Text Input */}
        <Textarea
          placeholder="Just dump your thoughts... 'Call John, finish report by Friday, book dentist, team meeting next week'"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="min-h-[80px] resize-none text-sm"
          disabled={isSubmitting}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              handleSubmit();
            }
          }}
        />

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleVoiceCapture}
            disabled={isRecording || isSubmitting}
            size="sm"
            variant="outline"
            className="flex-1"
          >
            {isRecording ? (
              <>
                <div className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mr-2" />
                Recording...
              </>
            ) : (
              <>
                <Mic className="w-3 h-3 mr-2" />
                Voice
              </>
            )}
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={!inputText.trim() || isSubmitting}
            size="sm"
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
          >
            {isSubmitting ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Send className="w-3 h-3 mr-2" />
                Capture
              </>
            )}
          </Button>
        </div>

        {/* Quick Tip */}
        <p className="text-[10px] text-gray-500 text-center">
          ⌘/Ctrl + Enter to submit • AI categorizes by zones
        </p>
      </CardContent>
    </Card>
  );
}
