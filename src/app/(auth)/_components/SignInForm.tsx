import { Button, Input } from "@/components/ui";
import { PasswordInput } from "./PasswordInput";
import type { AuthFormData } from "@/lib/utils/auth";

interface SignInFormProps {
  formData: Pick<AuthFormData, "email" | "password">;
  onFormDataChange: (data: Partial<AuthFormData>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onForgotPassword: () => void;
  onMagicLink: () => void;
  isSubmitting: boolean;
}

export function SignInForm({
  formData,
  onFormDataChange,
  onSubmit,
  onForgotPassword,
  onMagicLink,
  isSubmitting,
}: SignInFormProps): JSX.Element {
  return (
    <form onSubmit={onSubmit} className="space-y-4" data-testid="signin-form" role="form">
      <Input
        type="email"
        placeholder="Email"
        value={formData.email}
        onChange={(e) => onFormDataChange({ email: e.target.value })}
        required
      />

      <PasswordInput
        value={formData.password}
        onChange={(password) => onFormDataChange({ password })}
        required
        autoComplete="current-password"
      />

      <Button
        type="submit"
        className="w-full bg-teal-800 hover:bg-teal-700 text-white"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Signing In..." : "Sign In"}
      </Button>

      <div className="text-center space-y-2">
        <button
          type="button"
          className="text-sm text-teal-600 hover:text-teal-700 underline"
          onClick={onForgotPassword}
        >
          Forgot your password?
        </button>
        <br />
        <button
          type="button"
          className="text-sm text-teal-600 hover:text-teal-700 underline"
          onClick={onMagicLink}
          disabled={!formData.email || isSubmitting}
        >
          Send magic link instead
        </button>
      </div>
    </form>
  );
}
