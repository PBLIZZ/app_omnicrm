import { Suspense } from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { OnboardingForm } from "./_components/OnboardingForm";
import { OnboardingFormSkeleton } from "./_components/OnboardingFormSkeleton";
import { AccessTracker } from "./_components/AccessTracker";
import { getSupabaseServerClient } from "@/server/db/supabase/server";

interface OnboardPageProps {
  params: {
    token: string;
  };
}

export const metadata: Metadata = {
  title: "Welcome - Complete Your Profile",
  description: "Complete your wellness profile and upload your photo",
};

// Validate token format (basic check)
function isValidTokenFormat(token: string): boolean {
  // Basic format validation - tokens should be alphanumeric with hyphens/underscores and reasonable length
  return /^[a-zA-Z0-9_-]{32,64}$/.test(token);
}

// Server-side token validation and user info retrieval
async function validateTokenAndGetUserInfo(
  token: string,
): Promise<{ isValid: boolean; userName?: string }> {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("onboarding_tokens")
      .select(
        `
        id, 
        expires_at, 
        disabled, 
        used_count, 
        max_uses,
        user_id,
        created_by
      `,
      )
      .eq("token", token)
      .single();

    if (error || !data) {
      return { isValid: false };
    }

    // Check if token is active and not expired
    const now = new Date();
    const expiresAt = new Date(data.expires_at);
    const isNotDisabled = !data.disabled;
    const isNotExpired = expiresAt > now;
    const hasUsesRemaining = data.used_count < data.max_uses;

    const isValid = isNotDisabled && isNotExpired && hasUsesRemaining;

    if (!isValid) {
      return { isValid: false };
    }

    // Get user information for personalization using Supabase auth API
    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(
      data.user_id,
    );

    if (authError || !authData?.user) {
      // If we can't get user data, still allow the form to work
      return { isValid: true };
    }

    // Use the same logic as UserNav component
    const userMetadata = authData.user.user_metadata as {
      full_name?: string;
      [key: string]: unknown;
    };
    const userName = userMetadata?.full_name ?? authData.user.email ?? "A Wellness Practitioner";

    return { isValid: true, userName };
  } catch (error) {
    console.error("Token validation error:", error);
    return { isValid: false };
  }
}

export default async function OnboardPage({ params }: OnboardPageProps) {
  const { token } = await params;

  // Basic token format validation (fast fail)
  if (!token || !isValidTokenFormat(token)) {
    notFound();
  }

  // Server-side token validation and user info retrieval
  const { isValid, userName } = await validateTokenAndGetUserInfo(token);
  if (!isValid) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="OmniCRM Logo"
              width={80}
              height={80}
              className="rounded-lg shadow-lg"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Your Wellness Journey
          </h1>
          <p className="text-gray-600 mb-4">
            {userName || "A Wellness Practitioner"} has sent you this form to get your journey
            started.
          </p>
          <p className="text-sm text-gray-500">
            Please complete your profile to help us provide you with the best possible care
          </p>
        </div>

        {/* Access Tracking */}
        <AccessTracker token={token} />

        {/* Form */}
        <Suspense fallback={<OnboardingFormSkeleton />}>
          <OnboardingForm token={token} />
        </Suspense>

        {/* Footer */}
        <footer className="text-center mt-12 text-sm text-gray-500">
          <p>Your information is secure and protected by industry-standard encryption.</p>
          <p className="mt-1">Questions? Contact your wellness practitioner for assistance.</p>
        </footer>
      </div>
    </div>
  );
}
