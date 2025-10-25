"use client";

import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useReducer } from "react";

import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Label,
  Separator,
  AlertDescription,
  Alert,
} from "@/components/ui";
import {
  fetchCurrentUser,
  updateUserPassword,
  mapAuthErrorMessage,
} from "@/lib/services/client/auth.service";
import { signOut } from "@/lib/actions/auth";
import { AccountDataManagement } from "../_components/AccountDataManagement";

// Constants
import { PASSWORD_MIN_LENGTH } from "@/lib/constants/auth";
import { Shield, User as UserIcon, Info, Lock } from "lucide-react";
const ROUTES = {
  LogIn: "/log-in",
  dashboard: "/omni-flow",
};

// Message state management with useReducer
type MessageState = {
  text: string;
  type: "error" | "success";
};

type MessageAction =
  | { type: "SET_MESSAGE"; payload: { text: string; type: "error" | "success" } }
  | { type: "CLEAR_MESSAGE" };

const initialMessageState: MessageState = {
  text: "",
  type: "error",
};

function messageReducer(state: MessageState, action: MessageAction): MessageState {
  switch (action.type) {
    case "SET_MESSAGE":
      return {
        text: action.payload.text,
        type: action.payload.type,
      };
    case "CLEAR_MESSAGE":
      return initialMessageState;
    default:
      return state;
  }
}

export default function AccountPage(): JSX.Element {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isFetchingUser, setIsFetchingUser] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [messageState, dispatchMessage] = useReducer(messageReducer, initialMessageState);

  // Fetch user data on component mount
  useEffect(() => {
    const getUserData = async (): Promise<void> => {
      setIsFetchingUser(true);

      const { user: currentUser, error } = await fetchCurrentUser();

      if (error || !currentUser) {
        dispatchMessage({
          type: "SET_MESSAGE",
          payload: {
            text: "Could not fetch user data. Please sign in again.",
            type: "error",
          },
        });
        router.push(ROUTES.LogIn);
      } else {
        setUser(currentUser);
      }

      setIsFetchingUser(false);
    };

    void getUserData();
  }, [router]);

  // Handle password update
  const handlePasswordUpdate = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsPasswordLoading(true);
    dispatchMessage({ type: "CLEAR_MESSAGE" });

    // Validate passwords
    if (!newPassword) {
      dispatchMessage({
        type: "SET_MESSAGE",
        payload: {
          text: "Password cannot be empty.",
          type: "error",
        },
      });
      setIsPasswordLoading(false);
      return;
    }

    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      dispatchMessage({
        type: "SET_MESSAGE",
        payload: {
          text: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`,
          type: "error",
        },
      });
      setIsPasswordLoading(false);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      dispatchMessage({
        type: "SET_MESSAGE",
        payload: {
          text: "New passwords do not match.",
          type: "error",
        },
      });
      setIsPasswordLoading(false);
      return;
    }

    // Update password
    const { error } = await updateUserPassword(newPassword);

    if (error) {
      dispatchMessage({
        type: "SET_MESSAGE",
        payload: {
          text: `Password update failed: ${mapAuthErrorMessage(error.message)}`,
          type: "error",
        },
      });
    } else {
      dispatchMessage({
        type: "SET_MESSAGE",
        payload: {
          text: "Password updated successfully!",
          type: "success",
        },
      });
    }

    // Always clear password fields after attempt
    setNewPassword("");
    setConfirmNewPassword("");
    setIsPasswordLoading(false);
  };

  // Handle sign out
  const handleSignOut = async (): Promise<void> => {
    setIsLoggingOut(true);
    dispatchMessage({ type: "CLEAR_MESSAGE" });

    const { error } = await signOut();

    if (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      dispatchMessage({
        type: "SET_MESSAGE",
        payload: {
          text: `Sign out failed: ${mapAuthErrorMessage(errorMessage)}`,
          type: "error",
        },
      });
      setIsLoggingOut(false);
    } else {
      router.push(ROUTES.LogIn);
    }
  };

  // Loading state
  if (isFetchingUser && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p>Loading account information...</p>
      </div>
    );
  }

  // No user state (fallback if redirect in useEffect fails)
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p>
          Please{" "}
          <Link href={ROUTES.LogIn} className="underline">
            log in
          </Link>{" "}
          to view your account.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl py-8">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Practice Profile</h1>
          <p className="text-gray-600 mt-2">
            Manage your account details, security settings, and privacy controls.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* LEFT COLUMN */}
          <div className="space-y-6">
            {/* Account Information & Security */}
            <Card className="bg-gradient-to-br from-teal-50 via-emerald-50 to-teal-50 border-l-4 border-teal-400 shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <UserIcon className="h-5 w-5" />
                  <CardTitle>Account Information</CardTitle>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <p className="text-gray-900 text-sm">
                    <span className="text-sm font-medium text-gray-900">Email:</span> {user.email}
                  </p>
                  <p className="text-gray-900 text-sm">
                    <span className="text-sm font-medium text-gray-900">Account Created:</span>{" "}
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
                  </p>
                  {user.last_sign_in_at && (
                    <p className="text-gray-900 text-sm">
                      <span className="text-sm font-medium text-gray-900">Last Sign In:</span>{" "}
                      {new Date(user.last_sign_in_at).toLocaleString()}
                    </p>
                  )}
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-base font-semibold flex items-center gap-2 text-gray-900">
                    <Lock className="h-4 w-4" />
                    Change Password
                  </h3>
                  <form onSubmit={handlePasswordUpdate} className="space-y-4">
                    <div>
                      <Label htmlFor="new_password" className="text-gray-900">
                        New Password
                      </Label>
                      <Input
                        id="new_password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirm_new_password" className="text-gray-900">
                        Confirm New Password
                      </Label>
                      <Input
                        id="confirm_new_password"
                        type="password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Confirm new password"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full sm:w-auto" disabled={isPasswordLoading}>
                      {isPasswordLoading ? "Updating..." : "Update Password"}
                    </Button>
                  </form>
                </div>

                {messageState.text && (
                  <p
                    className={`mt-4 text-sm ${messageState.type === "error" ? "text-red-600" : "text-green-600"}`}
                  >
                    {messageState.text}
                  </p>
                )}

                <Separator />

                <div>
                  <Button
                    variant="destructive"
                    onClick={handleSignOut}
                    className="w-full sm:w-auto"
                    disabled={isLoggingOut || isPasswordLoading}
                  >
                    {isLoggingOut ? "Logging out..." : "Log Out"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Privacy & Data Retention - Moved from AccountDataManagement */}
            <Card className="bg-gradient-to-br from-sky-50 via-violet-50 to-sky-50 border-l-4 border-sky-400">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  <CardTitle>Privacy & Data Retention</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-600">
                <p>
                  <span className="text-gray-900">Backup Retention:</span> Deleted data may remain
                  in encrypted backups for up to 30 days before being permanently purged from all
                  systems.
                </p>
                <p>
                  <span className="text-gray-900">Third-party Services:</span> We will also request
                  deletion of your data from integrated services like email providers and analytics
                  platforms.
                </p>
                <p>
                  <span className="text-gray-900">Audit Logs:</span> For security and compliance, we
                  maintain minimal audit logs of deletion requests (without personal information)
                  for regulatory purposes.
                </p>
              </CardContent>
            </Card>
            {/* Privacy Notice */}
            <Alert className="bg-gradient-to-br from-teal-50 via-emerald-50 to-teal-50 border-l-4 border-teal-400">
              <Shield className="h-4 w-4" />
              <AlertDescription className="text-gray-600">
                Your privacy is important to us. You have full control over your data and can export
                or delete it at any time. All operations comply with GDPR and other privacy
                regulations.
              </AlertDescription>
            </Alert>
          </div>

          {/* RIGHT COLUMN - GDPR Data Management */}
          <div>
            <AccountDataManagement />
          </div>
        </div>

        <div className="text-center">
          <Link
            href={ROUTES.dashboard}
            className="text-sm font-medium text-gray-900 hover:underline"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
