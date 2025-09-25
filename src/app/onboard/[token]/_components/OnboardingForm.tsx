"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Loader2, Upload, AlertCircle } from "lucide-react";
import { PhotoUploadSection } from "@/app/onboard/[token]/_components/PhotoUploadSection";
import { PersonalInfoSection } from "./PersonalInfoSection";
import { EmergencyContactSection } from "@/app/onboard/[token]/_components/EmergencyContactSection";
import { HealthInfoSection } from "@/app/onboard/[token]/_components/HealthInfoSection";
import { AddressSection } from "@/app/onboard/[token]/_components/AddressSection";
import { PreferencesSection } from "@/app/onboard/[token]/_components/PreferencesSection";
import { ConsentSection } from "@/app/onboard/[token]/_components/ConsentSection";

// Form validation schema
const OnboardingFormSchema = z.object({
  // Personal Information
  displayName: z.string().min(1, "Full name is required").max(255),
  primaryEmail: z.string().email("Invalid email format").optional(),
  primaryPhone: z
    .string()
    .regex(/^[\p{N}\p{P}\p{Z}]*$/u, "Phone number contains invalid characters")
    .min(10, "Phone number must be at least 10 digits")
    .optional(),
  dateOfBirth: z.string().optional(),

  // Emergency Contact
  emergencyContactName: z.string().min(1, "Emergency contact name is required").max(255),
  emergencyContactPhone: z
    .string()
    .regex(/^[\p{N}\p{P}\p{Z}]*$/u, "Emergency contact phone contains invalid characters")
    .min(10, "Emergency contact phone must be at least 10 digits"),

  // Client Status & Referral
  referralSource: z.string().optional(),

  // Address (optional)
  address: z
    .object({
      line1: z.string().optional(),
      line2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
      country: z.string(),
    })
    .optional(),

  // Health Context
  healthContext: z
    .object({
      conditions: z.string().optional(), // Health conditions as text
      injuries: z.string().optional(), // Injuries/anything we should know
      allergies: z.string().optional(), // Allergies as text
      fitnessLevel: z.enum(["beginner", "intermediate", "advanced", "athlete"]).optional(),
      stressLevel: z.enum(["low", "moderate", "high", "very_high"]).optional(),
      goals: z.string().optional(), // What are you hoping to get out of your time with us
    })
    .optional(),

  // Preferences
  preferences: z
    .object({
      sessionTimes: z.array(z.enum(["mornings", "afternoons", "evenings", "weekends"])).optional(), // Preferred times
      communicationPrefs: z.array(z.enum(["email", "phone", "text"])).optional(), // Email, SMS, etc.
      notes: z.string().optional(), // Additional preferences
    })
    .optional(),

  // Consent flags
  consentMarketing: z.boolean(),
  consentHipaa: z.boolean(),
  consentPhotography: z.boolean(),
});

export type OnboardingFormData = z.infer<typeof OnboardingFormSchema>;

interface OnboardingFormProps {
  token: string;
}

export function OnboardingForm({ token }: OnboardingFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(OnboardingFormSchema),
    defaultValues: {
      displayName: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      consentMarketing: false,
      consentHipaa: false,
      consentPhotography: false,
      address: { country: "US" },
    },
  });

  const onSubmit = async (data: OnboardingFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate and parse displayName into first_name and last_name
      const trimmedName = data.displayName.trim();

      // Check for empty or whitespace-only names
      if (!trimmedName) {
        form.setError("displayName", {
          type: "manual",
          message: "Full name is required",
        });
        setIsSubmitting(false);
        return;
      }

      // Normalize multiple spaces and split on whitespace
      const nameParts = trimmedName.replace(/\s+/g, " ").split(" ");

      // Sanitize names: remove illegal characters and enforce length limits
      const sanitizeName = (name: string) => {
        return name
          .replace(/[^a-zA-Z\s\-'\.]/g, "") // Remove illegal characters
          .substring(0, 50) // Enforce reasonable length limit
          .trim();
      };

      let first_name: string;
      let last_name: string;

      if (nameParts.length === 1) {
        // Single name: use as first_name, leave last_name empty
        first_name = sanitizeName(nameParts[0] || "");
        last_name = "";
      } else {
        // Multiple parts: first part is first_name, rest is last_name
        first_name = sanitizeName(nameParts[0] || "");
        last_name = sanitizeName(nameParts.slice(1).join(" "));
      }

      // Validate that we have a valid first name after sanitization
      if (!first_name) {
        form.setError("displayName", {
          type: "manual",
          message: "Please enter a valid name",
        });
        setIsSubmitting(false);
        return;
      }

      // Prepare the submission data in the format expected by the API
      const submissionData = {
        token,
        client: {
          first_name,
          last_name,
          primary_email: data.primaryEmail || "",
          primary_phone: data.primaryPhone || "",
          date_of_birth: data.dateOfBirth || "",
          emergency_contact_name: data.emergencyContactName || "",
          emergency_contact_phone: data.emergencyContactPhone || "",
          referral_source: data.referralSource || "",
          address: {
            line1: data.address?.line1 || "",
            line2: data.address?.line2 || "",
            city: data.address?.city || "",
            state: data.address?.state || "",
            postalCode: data.address?.zipCode || "",
            country: data.address?.country || "US",
          },
          health_context: {
            conditions: data.healthContext?.conditions ? [data.healthContext.conditions] : [],
            allergies: data.healthContext?.allergies ? [data.healthContext.allergies] : [],
            fitnessLevel: data.healthContext?.fitnessLevel || "",
            stressLevel: data.healthContext?.stressLevel || "",
            medications: data.healthContext?.injuries ? [data.healthContext.injuries] : [],
            notes: data.healthContext?.goals || "",
          },
          preferences: {
            sessionTimes: data.preferences?.sessionTimes || [],
            communicationPreference: data.preferences?.communicationPrefs?.[0] || "email",
            reminderFrequency: "weekly",
            notes: data.preferences?.notes || "",
          },
        },
        consent: {
          consent_type: "data_processing",
          consent_text_version: "1.0",
          granted: true,
          signature_svg: "",
          signature_image_url: "",
        },
        photo_path: uploadedPhotoUrl || null,
      };

      // Debug: Log the submission data
      // Submit onboarding data

      // Get CSRF token from cookie
      const getCsrfToken = (): string => {
        if (typeof document === "undefined") return "";
        const match = document.cookie.match(/(?:^|; )csrf=([^;]+)/);
        return match ? decodeURIComponent(match[1] ?? "") : "";
      };

      const csrfToken = getCsrfToken();
      if (!csrfToken) {
        throw new Error("CSRF token not found. Please refresh the page and try again.");
      }

      const response = await fetch("/api/onboarding/public/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify(submissionData),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle detailed validation errors
        if (result.details && Array.isArray(result.details)) {
          const errorMessages = result.details
            .map(
              (detail: { field: string; message: string }) => `${detail.field}: ${detail.message}`,
            )
            .join(", ");
          throw new Error(`Validation failed: ${errorMessages}`);
        }
        throw new Error(result.error || "Submission failed");
      }

      toast.success("Profile completed successfully!");

      // Redirect to success page
      router.push("/onboard/success");
    } catch (error) {
      console.error("Submission error:", error);
      const message = error instanceof Error ? error.message : "An unexpected error occurred";
      setError(message);
      toast.error("Failed to submit profile: " + message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Photo Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Profile Photo
          </CardTitle>
          <CardDescription>Upload a clear photo for your profile (optional)</CardDescription>
        </CardHeader>
        <CardContent>
          <PhotoUploadSection token={token} onPhotoUploaded={setUploadedPhotoUrl} />
        </CardContent>
      </Card>

      {/* Personal Information */}
      <PersonalInfoSection control={form.control} errors={form.formState.errors} />

      {/* Emergency Contact */}
      <EmergencyContactSection control={form.control} errors={form.formState.errors} />

      {/* Health Information */}
      <HealthInfoSection control={form.control} errors={form.formState.errors} />

      {/* Address Information */}
      <AddressSection control={form.control} errors={form.formState.errors} />

      {/* Preferences */}
      <PreferencesSection control={form.control} errors={form.formState.errors} />

      {/* Consent & Privacy */}
      <ConsentSection control={form.control} errors={form.formState.errors} />

      {/* Submit Button */}
      <div className="flex justify-center pt-6">
        <Button type="submit" disabled={isSubmitting} className="w-full max-w-md h-12 text-lg">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Completing Profile...
            </>
          ) : (
            "Complete My Profile"
          )}
        </Button>
      </div>
    </form>
  );
}
