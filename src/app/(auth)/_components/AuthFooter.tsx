import Link from "next/link";
import { CardFooter } from "@/components/ui";
import type { AuthMode } from "@/lib/utils/auth";

interface AuthFooterProps {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
}

export function AuthFooter({ mode, onModeChange }: AuthFooterProps): JSX.Element {
  return (
    <CardFooter className="flex flex-col items-center space-y-4 px-4 sm:px-6 pb-4 sm:pb-6 text-sm text-gray-600">
      {mode === "signin" && (
        <p className="text-center">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            className="font-medium text-teal-600 hover:text-teal-500 underline"
            onClick={() => onModeChange("signup")}
          >
            Sign up
          </button>
        </p>
      )}

      {mode === "signup" && (
        <p className="text-center">
          Already have an account?{" "}
          <button
            type="button"
            className="font-medium text-teal-600 hover:text-teal-500 underline"
            onClick={() => onModeChange("signin")}
          >
            Sign in
          </button>
        </p>
      )}

      <p className="px-2 text-center text-xs text-gray-500">
        By continuing, you agree to our{" "}
        <Link href="/terms" className="underline hover:text-teal-700">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline hover:text-teal-700">
          Privacy Policy
        </Link>
        .
      </p>
    </CardFooter>
  );
}
