"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, ExternalLink, Loader2 } from "lucide-react";
import { post } from "@/lib/api";

interface TokenGenerationRequest {
  hoursValid: number;
  label?: string;
}

interface TokenGenerationResponse {
  token: string;
  expiresAt: string;
  onboardingUrl: string;
  label?: string;
}

export function TokenGeneratorSection() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<TokenGenerationResponse | null>(null);
  const [hoursValid, setHoursValid] = useState<number>(72); // 3 days default
  const [label, setLabel] = useState<string>("");

  const handleGenerateToken = async () => {
    setIsGenerating(true);

    try {
      const payload: TokenGenerationRequest = {
        hoursValid,
        ...(label.trim() && { label: label.trim() }),
      };

      const response = await post<TokenGenerationResponse>(
        "/api/onboarding/admin/generate-tokens",
        payload,
      );

      setGeneratedToken(response);
      toast.success("Onboarding link generated successfully!");
    } catch (error) {
      console.error("Token generation error:", error);
      toast.error("Failed to generate onboarding link. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Link copied to clipboard!");
    } catch (error) {
      console.error("Copy error:", error);
      toast.error("Failed to copy link");
    }
  };

  const openInNewTab = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      {/* Configuration Form */}
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="hoursValid" className="text-sm font-medium">
            Valid Duration
          </Label>
          <Select
            value={hoursValid.toString()}
            onValueChange={(value) => setHoursValid(parseInt(value))}
          >
            <SelectTrigger className="h-10" aria-label="Select duration">
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24">24 Hours</SelectItem>
              <SelectItem value="48">48 Hours</SelectItem>
              <SelectItem value="72">72 Hours (3 days)</SelectItem>
              <SelectItem value="168">168 Hours (1 week)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Each link can only be used once and will expire after the selected duration
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="label" className="text-sm font-medium">
            Label (Optional)
          </Label>
          <Input
            id="label"
            type="text"
            placeholder="e.g., Client Intake - John Smith"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={100}
            className="h-10"
          />
          <p className="text-xs text-muted-foreground">
            Add a label to help identify this token for follow-up
          </p>
        </div>

        <Button
          onClick={handleGenerateToken}
          disabled={isGenerating}
          className="w-full h-11 text-base font-medium"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Link...
            </>
          ) : (
            "Generate Onboarding Link"
          )}
        </Button>
      </div>

      {/* Generated Token Display */}
      {generatedToken && (
        <div className="space-y-4 p-6 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <Label className="text-base font-semibold text-green-800">Generated Link</Label>
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={generatedToken.onboardingUrl}
                readOnly
                className="text-sm font-mono bg-white border-green-300 focus:border-green-400"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(generatedToken.onboardingUrl)}
                aria-label="Copy onboarding URL"
                className="border-green-300 hover:bg-green-50"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openInNewTab(generatedToken.onboardingUrl)}
                aria-label="Open onboarding URL in new tab"
                className="border-green-300 hover:bg-green-50"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-700">Expires</p>
              <p className="text-sm text-gray-600">
                {(() => {
                  try {
                    const date = new Date(generatedToken.expiresAt);
                    if (isNaN(date.getTime())) {
                      return "Invalid date";
                    }
                    return new Intl.DateTimeFormat(navigator.language, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(date);
                  } catch (error) {
                    console.error(
                      "Date formatting error:",
                      error,
                      "expiresAt:",
                      generatedToken.expiresAt,
                    );
                    return "Invalid date";
                  }
                })()}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-700">Usage</p>
              <p className="text-sm text-gray-600">Single use only</p>
            </div>
          </div>

          <div className="text-sm text-green-700 bg-green-100 p-3 rounded border border-green-200">
            <div className="flex items-start gap-2">
              <span className="text-lg">💡</span>
              <div>
                <strong>Tip:</strong> Send this link to your client via email or text message. The
                link is secure and expires automatically.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
