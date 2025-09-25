// Auth utility functions and types

export type AuthMode = "signin" | "signup" | "forgot-password" | "magic-link-sent";

export type AuthFormData = {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
};

// Validation utilities
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validatePassword(password: string): string | null {
  if (!password) return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  return null;
}

export function validateSignUpForm(data: AuthFormData): string | null {
  if (!isValidEmail(data.email.trim())) return "Enter a valid email address";

  const passwordError = validatePassword(data.password);
  if (passwordError) return passwordError;

  if (data.password !== data.confirmPassword) return "Passwords do not match";
  if (!data.fullName.trim()) return "Full name is required";

  return null;
}

export function validateSignInForm(data: Pick<AuthFormData, "email" | "password">): string | null {
  if (!isValidEmail(data.email.trim())) return "Enter a valid email address";
  if (!data.password) return "Password is required";
  return null;
}

export function validateEmailForm(email: string): string | null {
  if (!isValidEmail(email.trim())) return "Enter a valid email address";
  return null;
}

// UI helper functions
export function getAuthModeTitle(mode: AuthMode): string {
  switch (mode) {
    case "signup":
      return "Sign Up";
    case "forgot-password":
      return "Reset Password";
    case "magic-link-sent":
      return "Check Your Email";
    default:
      return "Sign In";
  }
}

export function getAuthModeDescription(mode: AuthMode): string {
  switch (mode) {
    case "signup":
      return "Create your account to get started.";
    case "forgot-password":
      return "Enter your email to reset your password.";
    case "magic-link-sent":
      return "We've sent you instructions via email.";
    default:
      return "Welcome back! Sign in to your account.";
  }
}

export function clearAuthForm(): AuthFormData {
  return {
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
  };
}
