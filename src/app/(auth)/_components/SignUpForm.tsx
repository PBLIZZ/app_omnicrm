import { Button, Input } from "@/components/ui";
import { PasswordInput } from "./PasswordInput";
import type { AuthFormData } from "@/lib/utils/auth";

interface SignUpFormProps {
  formData: AuthFormData;
  onFormDataChange: (data: Partial<AuthFormData>) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}

export function SignUpForm({
  formData,
  onFormDataChange,
  onSubmit,
  isSubmitting,
}: SignUpFormProps): JSX.Element {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input
        type="text"
        placeholder="Full Name"
        value={formData.fullName}
        onChange={(e) => onFormDataChange({ fullName: e.target.value })}
        required
      />

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
        placeholder="Password (min 6 characters)"
        required
        autoComplete="new-password"
      />

      <PasswordInput
        value={formData.confirmPassword}
        onChange={(confirmPassword) => onFormDataChange({ confirmPassword })}
        placeholder="Confirm Password"
        required
        autoComplete="new-password"
      />

      <Button
        type="submit"
        className="w-full bg-teal-800 hover:bg-teal-700 text-white"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Creating Account..." : "Create Account"}
      </Button>
    </form>
  );
}
