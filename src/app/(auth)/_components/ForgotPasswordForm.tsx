import { Button, Input } from "@/components/ui";

interface ForgotPasswordFormProps {
  email: string;
  onEmailChange: (email: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBackToSignIn: () => void;
  isSubmitting: boolean;
}

export function ForgotPasswordForm({
  email,
  onEmailChange,
  onSubmit,
  onBackToSignIn,
  isSubmitting,
}: ForgotPasswordFormProps): JSX.Element {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        required
      />

      <Button
        type="submit"
        className="w-full bg-teal-800 hover:bg-teal-700 text-white"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Sending..." : "Send Reset Link"}
      </Button>

      <div className="text-center">
        <button
          type="button"
          className="text-sm text-teal-600 hover:text-teal-700 underline"
          onClick={onBackToSignIn}
        >
          Back to Sign In
        </button>
      </div>
    </form>
  );
}
