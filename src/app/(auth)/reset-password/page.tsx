"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
} from "@/components/ui";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage(): JSX.Element {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check if we have the required tokens from the URL
    const accessToken = searchParams.get("access_token");
    const refreshToken = searchParams.get("refresh_token");

    if (!accessToken || !refreshToken) {
      setErr("Invalid or expired reset link. Please request a new password reset.");
      setIsLoading(false);
      return;
    }

    // Set the session with the tokens from the URL
    const setSession = async (): Promise<void> => {
      try {
        const { error } = await getSupabaseBrowser().auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          setErr("Invalid or expired reset link. Please request a new password reset.");
        }
      } catch {
        setErr("Invalid or expired reset link. Please request a new password reset.");
      } finally {
        setIsLoading(false);
      }
    };

    void setSession();
  }, [searchParams]);

  const handleResetPassword = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setErr(null);
    setSuccessMessage(null);

    if (!password || password.length < 6) {
      setErr("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setErr("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await getSupabaseBrowser().auth.updateUser({
        password: password,
      });

      if (error) {
        setErr(error.message);
      } else {
        setSuccessMessage("Password updated successfully! Redirecting to dashboard...");
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push("/");
        }, 2000);
      }
    } catch {
      setErr("Failed to update password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-teal-50 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600">Validating reset link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-teal-50 p-4 sm:p-6 md:p-8">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-4 pt-6 pb-4 px-4 sm:px-6">
          <div className="flex items-center space-x-3 self-start">
            <Image
              src="/logo.png"
              alt="OmniCRM Logo"
              width={40}
              height={40}
              className="h-8 w-8 sm:h-10 sm:w-10"
            />
            <div>
              <p className="text-xl font-semibold text-teal-700">OmniCRM</p>
              <p className="text-xs text-gray-500">by Omnipotency AI</p>
            </div>
          </div>
          <div className="text-center">
            <CardTitle className="text-xl sm:text-2xl font-bold text-teal-800">
              Reset Password
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-gray-600">
              Enter your new password below.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 px-4 sm:px-6 pb-6 pt-4">
          {/* Message Display */}
          {err && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{err}</p>
              {err.includes("Invalid or expired") && (
                <Link
                  href="/login"
                  className="text-red-700 underline hover:text-red-900 text-sm mt-2 inline-block"
                >
                  Request a new password reset
                </Link>
              )}
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 text-sm">{successMessage}</p>
            </div>
          )}

          {!err?.includes("Invalid or expired") && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="New Password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <Button
                type="submit"
                className="w-full bg-teal-800 hover:bg-teal-700 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Updating Password..." : "Update Password"}
              </Button>
            </form>
          )}

          <div className="text-center">
            <Link href="/login" className="text-sm text-teal-600 hover:text-teal-700 underline">
              Back to Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
