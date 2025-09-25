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
  maxUses: number;
  label?: string | undefined;
}

interface TokenGenerationResponse {
  token: string;
  expiresAt: string;
  onboardingUrl: string;
  maxUses: number;
  label?: string;
}

export function TokenGeneratorSection() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<TokenGenerationResponse | null>(null);
  const [hoursValid, setHoursValid] = useState<number>(72); // 3 days default
  const [maxUses, setMaxUses] = useState<number>(1);
  const [label, setLabel] = useState<string>("");

  const handleGenerateToken = async () => {
    setIsGenerating(true);

    try {
      const payload: TokenGenerationRequest = {
        hoursValid,
        maxUses,
        label: label.trim() || undefined,
      };

      const response = await post<TokenGenerationResponse>(
        "/api/onboarding/admin/generate-tokens",
        payload,
      );

      // Debug: Log the response data
      console.log("Frontend received response:", response);
      console.log("expiresAt value:", response.expiresAt, "type:", typeof response.expiresAt);

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
    <div className="space-y-4">
      {/* Configuration Form */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="hoursValid">Valid Duration</Label>
          <Select
            value={hoursValid.toString()}
            onValueChange={(value) => setHoursValid(parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24">24 Hours</SelectItem>
              <SelectItem value="48">48 Hours</SelectItem>
              <SelectItem value="72">72 Hours (3 days)</SelectItem>
              <SelectItem value="168">168 Hours (1 week)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxUses">Maximum Uses</Label>
          <Select value={maxUses.toString()} onValueChange={(value) => setMaxUses(parseInt(value))}>
            <SelectTrigger>
              <SelectValue placeholder="Select uses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Single Use</SelectItem>
              <SelectItem value="3">3 Uses</SelectItem>
              <SelectItem value="5">5 Uses</SelectItem>
              <SelectItem value="10">10 Uses</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="label">Label (Optional)</Label>
          <Input
            id="label"
            type="text"
            placeholder="e.g., Client Intake - John Smith"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={100}
          />
          <p className="text-xs text-muted-foreground">
            Add a label to help identify this token for follow-up
          </p>
        </div>

        <Button onClick={handleGenerateToken} disabled={isGenerating} className="w-full">
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
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Generated Link</Label>
            <div className="flex items-center gap-2">
              <Input value={generatedToken.onboardingUrl} readOnly className="text-xs font-mono" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(generatedToken.onboardingUrl)}
                aria-label="Copy onboarding URL"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openInNewTab(generatedToken.onboardingUrl)}
                aria-label="Open onboarding URL in new tab"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              <strong>Expires:</strong>{" "}
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
            <p className="text-sm text-muted-foreground">
              <strong>Uses allowed:</strong> {maxUses} {maxUses === 1 ? "use" : "uses"}
            </p>
          </div>

          <div className="text-xs text-muted-foreground bg-background p-2 rounded border">
            💡 <strong>Tip:</strong> Send this link to your client via email or text message. The
            link is secure and expires automatically.
          </div>
        </div>
      )}
    </div>
  );
}
