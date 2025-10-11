"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui";
import { useAuth } from "@/hooks/use-auth";
import { useAuthActions } from "@/hooks/use-auth-actions";
import {
  validateSignInForm,
  validateSignUpForm,
  validateEmailForm,
  clearAuthForm,
  getAuthModeTitle,
  getAuthModeDescription,
  type AuthMode,
  type AuthFormData,
} from "@/lib/utils/auth";

// Components
import { AuthHeader } from "@/app/(auth)/_components/AuthHeader";
import { AuthFooter } from "@/app/(auth)/_components/AuthFooter";
import { GoogleSignInButton } from "@/app/(auth)/_components/GoogleSignInButton";
import { SignInForm } from "@/app/(auth)/_components/SignInForm";
import { SignUpForm } from "@/app/(auth)/_components/SignUpForm";
import { ForgotPasswordForm } from "@/app/(auth)/_components/ForgotPasswordForm";
import { EmailSentMessage } from "@/app/(auth)/_components/EmailSentMessage";

export const dynamic = "force-dynamic";

export default function LoginPage(): JSX.Element {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [formData, setFormData] = useState<AuthFormData>(clearAuthForm());
  const [err, setErr] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Redirect if already logged in (only once)
  useEffect(() => {
    if (!isLoading && user) {
      // Check for 'next' parameter to redirect back to intended page
      const searchParams = new URLSearchParams(window.location.search);
      const next = searchParams.get("next");
      const redirectTo = next && next.startsWith("/") ? next : "/omni-flow";
      
      // Use replace instead of push to avoid back button issues
      router.replace(redirectTo);
    }
  }, [user, isLoading, router]);

  const {
    signInWithPassword,
    signUpWithPassword,
    signInWithMagicLink,
    resetPassword,
    signInWithGoogle,
    isSubmitting,
    isGoogle,
  } = useAuthActions();

  const handleFormDataChange = (data: Partial<AuthFormData>): void => {
    setFormData((prev) => ({ ...prev, ...data }));
    if (err) setErr(null); // Clear errors when user types
  };

  const handleModeChange = (newMode: AuthMode): void => {
    setMode(newMode);
    setFormData(clearAuthForm());
    setErr(null);
    setSuccessMessage(null);
  };

  const handleSignIn = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const error = validateSignInForm(formData);
    if (error) {
      setErr(error);
      return;
    }

    const result = await signInWithPassword(formData.email, formData.password);
    if (result.error) setErr(result.error);
  };

  const handleSignUp = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const error = validateSignUpForm(formData);
    if (error) {
      setErr(error);
      return;
    }

    const result = await signUpWithPassword(formData);
    if (result.error) {
      setErr(result.error);
    } else {
      setMode("magic-link-sent");
      setSuccessMessage("Check your email for a confirmation link to complete your registration.");
    }
  };

  const handleMagicLink = async (): Promise<void> => {
    const error = validateEmailForm(formData.email);
    if (error) {
      setErr(error);
      return;
    }

    const result = await signInWithMagicLink(formData.email);
    if (result.error) {
      setErr(result.error);
    } else {
      setMode("magic-link-sent");
      setSuccessMessage("Check your email for a magic link to sign in.");
    }
  };

  const handleForgotPassword = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const error = validateEmailForm(formData.email);
    if (error) {
      setErr(error);
      return;
    }

    const result = await resetPassword(formData.email);
    if (result.error) {
      setErr(result.error);
    } else {
      setMode("magic-link-sent");
      setSuccessMessage("Check your email for a password reset link.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-teal-50 p-4 sm:p-6 md:p-8">
      <Card className="w-full max-w-md shadow-lg">
        <AuthHeader title={getAuthModeTitle(mode)} description={getAuthModeDescription(mode)} />

        <CardContent className="space-y-6 px-4 sm:px-6 pb-4 sm:pb-6 pt-4">
          {/* Message Display */}
          {err && <p className="text-sm text-center mb-4 text-red-600">{err}</p>}
          {successMessage && (
            <p className="text-sm text-center mb-4 text-green-600">{successMessage}</p>
          )}

          {mode === "magic-link-sent" ? (
            <EmailSentMessage
              message={successMessage ?? ""}
              onBackToSignIn={() => handleModeChange("signin")}
            />
          ) : (
            <div className="space-y-6">
              {/* Google OAuth - Available for all modes except forgot password */}
              {mode !== "forgot-password" && (
                <>
                  <GoogleSignInButton onClick={signInWithGoogle} disabled={isGoogle} />

                  {/* Separator */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-500">OR</span>
                    </div>
                  </div>
                </>
              )}

              {/* Form Components */}
              {mode === "signin" && (
                <SignInForm
                  formData={formData}
                  onFormDataChange={handleFormDataChange}
                  onSubmit={handleSignIn}
                  onForgotPassword={() => handleModeChange("forgot-password")}
                  onMagicLink={handleMagicLink}
                  isSubmitting={isSubmitting}
                />
              )}

              {mode === "signup" && (
                <SignUpForm
                  formData={formData}
                  onFormDataChange={handleFormDataChange}
                  onSubmit={handleSignUp}
                  isSubmitting={isSubmitting}
                />
              )}

              {mode === "forgot-password" && (
                <ForgotPasswordForm
                  email={formData.email}
                  onEmailChange={(email) => handleFormDataChange({ email })}
                  onSubmit={handleForgotPassword}
                  onBackToSignIn={() => handleModeChange("signin")}
                  isSubmitting={isSubmitting}
                />
              )}
            </div>
          )}
        </CardContent>

        <AuthFooter mode={mode} onModeChange={handleModeChange} />
      </Card>
    </div>
  );
}
