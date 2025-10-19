// React component testing
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignInForm } from "../SignInForm";
import { renderWithProviders } from "@/__tests__/test-utils";

describe("SignInForm", () => {
  const user = userEvent.setup();

  const defaultProps = {
    formData: {
      email: "",
      password: "",
    },
    onFormDataChange: vi.fn(),
    onSubmit: vi.fn(),
    onForgotPassword: vi.fn(),
    onMagicLink: vi.fn(),
    isSubmitting: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders all form elements", () => {
      renderWithProviders(<SignInForm {...defaultProps} />);

      expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
      expect(screen.getByText("Forgot your password?")).toBeInTheDocument();
      expect(screen.getByText("Send magic link instead")).toBeInTheDocument();
    });

    it("displays correct input types", () => {
      renderWithProviders(<SignInForm {...defaultProps} />);

      const emailInput = screen.getByPlaceholderText("Email");
      expect(emailInput).toHaveAttribute("type", "email");
      expect(emailInput).toHaveAttribute("required");

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute("required");
      expect(passwordInput).toHaveAttribute("autocomplete", "current-password");
    });

    it("applies correct styling classes", () => {
      renderWithProviders(<SignInForm {...defaultProps} />);

      const form =
        screen.getByRole("form") ||
        screen.getByTestId("signin-form") ||
        screen.getByPlaceholderText("Email").closest("form");
      expect(form).toHaveClass("space-y-4");

      const submitButton = screen.getByRole("button", { name: "Sign In" });
      expect(submitButton).toHaveClass("w-full", "bg-teal-800", "hover:bg-teal-700", "text-white");
    });

    it("uses proper form structure", () => {
      renderWithProviders(<SignInForm {...defaultProps} />);

      const emailInput = screen.getByPlaceholderText("Email");
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole("button", { name: "Sign In" });

      const form = emailInput.closest("form");
      expect(form).toBeInTheDocument();
      expect(form?.contains(passwordInput)).toBe(true);
      expect(form?.contains(submitButton)).toBe(true);
    });
  });

  describe("Form Data Handling", () => {
    it("displays current form data values", () => {
      const propsWithData = {
        ...defaultProps,
        formData: {
          email: "test@example.com",
          password: "password123",
        },
      };

      renderWithProviders(<SignInForm {...propsWithData} />);

      const emailInput = screen.getByPlaceholderText("Email") as HTMLInputElement;
      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;

      expect(emailInput.value).toBe("test@example.com");
      expect(passwordInput.value).toBe("password123");
    });

    it("calls onFormDataChange when email is changed", async () => {
      renderWithProviders(<SignInForm {...defaultProps} />);

      const emailInput = screen.getByPlaceholderText("Email");
      await user.type(emailInput, "new@example.com");

      expect(defaultProps.onFormDataChange).toHaveBeenCalledWith({
        email: "n",
      });

      expect(defaultProps.onFormDataChange).toHaveBeenCalledWith({
        email: "ne",
      });

      // Should be called for each character typed
      expect(defaultProps.onFormDataChange).toHaveBeenCalledTimes(15); // length of "new@example.com"
    });

    it("calls onFormDataChange when password is changed", async () => {
      renderWithProviders(<SignInForm {...defaultProps} />);

      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(passwordInput, "secret");

      expect(defaultProps.onFormDataChange).toHaveBeenCalledWith({
        password: "s",
      });

      expect(defaultProps.onFormDataChange).toHaveBeenCalledWith({
        password: "se",
      });

      // Should be called for each character typed
      expect(defaultProps.onFormDataChange).toHaveBeenCalledTimes(6); // length of "secret"
    });

    it("clears email input when data is updated externally", () => {
      const { rerender } = renderWithProviders(
        <SignInForm
          {...defaultProps}
          formData={{ email: "test@example.com", password: "password" }}
        />,
      );

      const emailInput = screen.getByPlaceholderText("Email") as HTMLInputElement;
      expect(emailInput.value).toBe("test@example.com");

      rerender(<SignInForm {...defaultProps} formData={{ email: "", password: "password" }} />);

      expect(emailInput.value).toBe("");
    });
  });

  describe("Form Submission", () => {
    it("calls onSubmit when form is submitted", async () => {
      renderWithProviders(<SignInForm {...defaultProps} />);

      const submitButton = screen.getByRole("button", { name: "Sign In" });
      await user.click(submitButton);

      expect(defaultProps.onSubmit).toHaveBeenCalledTimes(1);
      expect(defaultProps.onSubmit).toHaveBeenCalledWith(expect.any(Object));
    });

    it("calls onSubmit when Enter is pressed in email field", async () => {
      renderWithProviders(<SignInForm {...defaultProps} />);

      const emailInput = screen.getByPlaceholderText("Email");
      await user.type(emailInput, "test@example.com");
      await user.keyboard("{Enter}");

      expect(defaultProps.onSubmit).toHaveBeenCalledTimes(1);
    });

    it("calls onSubmit when Enter is pressed in password field", async () => {
      renderWithProviders(<SignInForm {...defaultProps} />);

      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(passwordInput, "password123");
      await user.keyboard("{Enter}");

      expect(defaultProps.onSubmit).toHaveBeenCalledTimes(1);
    });

    it("disables submit button when isSubmitting is true", () => {
      renderWithProviders(<SignInForm {...defaultProps} isSubmitting={true} />);

      const submitButton = screen.getByRole("button", { name: "Signing In..." });
      expect(submitButton).toBeDisabled();
    });

    it("changes submit button text when submitting", () => {
      renderWithProviders(<SignInForm {...defaultProps} isSubmitting={true} />);

      expect(screen.getByText("Signing In...")).toBeInTheDocument();
      expect(screen.queryByText("Sign In")).not.toBeInTheDocument();
    });

    it("prevents multiple submissions when isSubmitting is true", async () => {
      renderWithProviders(<SignInForm {...defaultProps} isSubmitting={true} />);

      const submitButton = screen.getByRole("button", { name: "Signing In..." });
      await user.click(submitButton);

      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("Action Buttons", () => {
    it("calls onForgotPassword when forgot password link is clicked", async () => {
      renderWithProviders(<SignInForm {...defaultProps} />);

      const forgotPasswordLink = screen.getByText("Forgot your password?");
      await user.click(forgotPasswordLink);

      expect(defaultProps.onForgotPassword).toHaveBeenCalledTimes(1);
    });

    it("calls onMagicLink when magic link button is clicked", async () => {
      const propsWithEmail = {
        ...defaultProps,
        formData: { email: "test@example.com", password: "" },
      };

      renderWithProviders(<SignInForm {...propsWithEmail} />);

      const magicLinkButton = screen.getByText("Send magic link instead");
      await user.click(magicLinkButton);

      expect(defaultProps.onMagicLink).toHaveBeenCalledTimes(1);
    });

    it("disables magic link button when email is empty", () => {
      renderWithProviders(<SignInForm {...defaultProps} />);

      const magicLinkButton = screen.getByText("Send magic link instead");
      expect(magicLinkButton).toBeDisabled();
    });

    it("enables magic link button when email is provided", () => {
      const propsWithEmail = {
        ...defaultProps,
        formData: { email: "test@example.com", password: "" },
      };

      renderWithProviders(<SignInForm {...propsWithEmail} />);

      const magicLinkButton = screen.getByText("Send magic link instead");
      expect(magicLinkButton).not.toBeDisabled();
    });

    it("disables magic link button when isSubmitting is true", () => {
      const propsWithEmail = {
        ...defaultProps,
        formData: { email: "test@example.com", password: "" },
        isSubmitting: true,
      };

      renderWithProviders(<SignInForm {...propsWithEmail} />);

      const magicLinkButton = screen.getByText("Send magic link instead");
      expect(magicLinkButton).toBeDisabled();
    });

    it("applies correct styling to action links", () => {
      renderWithProviders(<SignInForm {...defaultProps} />);

      const forgotPasswordLink = screen.getByText("Forgot your password?");
      const magicLinkButton = screen.getByText("Send magic link instead");

      expect(forgotPasswordLink).toHaveClass(
        "text-sm",
        "text-teal-600",
        "hover:text-teal-700",
        "underline",
      );

      expect(magicLinkButton).toHaveClass(
        "text-sm",
        "text-teal-600",
        "hover:text-teal-700",
        "underline",
      );
    });
  });

  describe("Accessibility", () => {
    it("provides proper form semantics", () => {
      renderWithProviders(<SignInForm {...defaultProps} />);

      const emailInput = screen.getByPlaceholderText("Email");
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole("button", { name: "Sign In" });

      expect(emailInput).toHaveAttribute("type", "email");
      expect(emailInput).toHaveAttribute("required");
      expect(passwordInput).toHaveAttribute("required");
      expect(submitButton).toHaveAttribute("type", "submit");
    });

    it("supports keyboard navigation", async () => {
      renderWithProviders(<SignInForm {...defaultProps} />);

      const emailInput = screen.getByPlaceholderText("Email");
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole("button", { name: "Sign In" });
      const forgotPasswordLink = screen.getByText("Forgot your password?");
      const magicLinkButton = screen.getByText("Send magic link instead");

      // Tab through all focusable elements
      await user.tab();
      expect(emailInput).toHaveFocus();

      await user.tab();
      expect(passwordInput).toHaveFocus();

      await user.tab();
      expect(submitButton).toHaveFocus();

      await user.tab();
      expect(forgotPasswordLink).toHaveFocus();

      await user.tab();
      expect(magicLinkButton).toHaveFocus();
    });

    it("provides appropriate autocomplete attributes", () => {
      renderWithProviders(<SignInForm {...defaultProps} />);

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute("autocomplete", "current-password");
    });

    it("uses semantic button elements", () => {
      renderWithProviders(<SignInForm {...defaultProps} />);

      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(3); // Submit, forgot password, magic link

      const submitButton = screen.getByRole("button", { name: "Sign In" });
      const forgotPasswordButton = screen.getByRole("button", { name: "Forgot your password?" });
      const magicLinkButton = screen.getByRole("button", { name: "Send magic link instead" });

      expect(submitButton).toHaveAttribute("type", "submit");
      expect(forgotPasswordButton).toHaveAttribute("type", "button");
      expect(magicLinkButton).toHaveAttribute("type", "button");
    });

    it("provides proper disabled state feedback", () => {
      renderWithProviders(<SignInForm {...defaultProps} isSubmitting={true} />);

      const submitButton = screen.getByRole("button", { name: "Signing In..." });
      const magicLinkButton = screen.getByText("Send magic link instead");

      expect(submitButton).toBeDisabled();
      expect(magicLinkButton).toBeDisabled();

      // Disabled buttons should still be focusable for screen readers
      expect(submitButton).toHaveAttribute("disabled");
      expect(magicLinkButton).toHaveAttribute("disabled");
    });
  });

  describe("Input Validation", () => {
    it("requires email input", () => {
      renderWithProviders(<SignInForm {...defaultProps} />);

      const emailInput = screen.getByPlaceholderText("Email");
      expect(emailInput).toHaveAttribute("required");
    });

    it("requires password input", () => {
      renderWithProviders(<SignInForm {...defaultProps} />);

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute("required");
    });

    it("uses email input type for validation", () => {
      renderWithProviders(<SignInForm {...defaultProps} />);

      const emailInput = screen.getByPlaceholderText("Email");
      expect(emailInput).toHaveAttribute("type", "email");
    });
  });

  describe("Layout and Styling", () => {
    it("maintains proper spacing between elements", () => {
      renderWithProviders(<SignInForm {...defaultProps} />);

      const form = screen.getByPlaceholderText("Email").closest("form");
      expect(form).toHaveClass("space-y-4");

      const actionContainer = screen.getByText("Forgot your password?").closest("div");
      expect(actionContainer).toHaveClass("text-center", "space-y-2");
    });

    it("uses full-width submit button", () => {
      renderWithProviders(<SignInForm {...defaultProps} />);

      const submitButton = screen.getByRole("button", { name: "Sign In" });
      expect(submitButton).toHaveClass("w-full");
    });

    it("applies consistent link styling", () => {
      renderWithProviders(<SignInForm {...defaultProps} />);

      const forgotPasswordLink = screen.getByText("Forgot your password?");
      const magicLinkButton = screen.getByText("Send magic link instead");

      const expectedClasses = ["text-sm", "text-teal-600", "hover:text-teal-700", "underline"];

      expectedClasses.forEach((className) => {
        expect(forgotPasswordLink).toHaveClass(className);
        expect(magicLinkButton).toHaveClass(className);
      });
    });
  });

  describe("Edge Cases", () => {
    it("handles empty formData gracefully", () => {
      const propsWithUndefinedData = {
        ...defaultProps,
        formData: { email: "", password: "" },
      };

      expect(() => {
        renderWithProviders(<SignInForm {...propsWithUndefinedData} />);
      }).not.toThrow();

      const emailInput = screen.getByPlaceholderText("Email") as HTMLInputElement;
      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;

      expect(emailInput.value).toBe("");
      expect(passwordInput.value).toBe("");
    });

    it("handles rapid form data changes", async () => {
      renderWithProviders(<SignInForm {...defaultProps} />);

      const emailInput = screen.getByPlaceholderText("Email");

      // Rapid typing should call onChange for each character
      await user.type(emailInput, "test");

      expect(defaultProps.onFormDataChange).toHaveBeenCalledTimes(4);
    });

    it("maintains button state consistency", () => {
      const { rerender } = renderWithProviders(<SignInForm {...defaultProps} />);

      let submitButton = screen.getByRole("button", { name: "Sign In" });
      expect(submitButton).not.toBeDisabled();

      rerender(<SignInForm {...defaultProps} isSubmitting={true} />);

      submitButton = screen.getByRole("button", { name: "Signing In..." });
      expect(submitButton).toBeDisabled();

      rerender(<SignInForm {...defaultProps} isSubmitting={false} />);

      submitButton = screen.getByRole("button", { name: "Sign In" });
      expect(submitButton).not.toBeDisabled();
    });

    it("handles special characters in form inputs", async () => {
      renderWithProviders(<SignInForm {...defaultProps} />);

      const emailInput = screen.getByPlaceholderText("Email");
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, "test+email@example.com");
      await user.type(passwordInput, "p@ssw0rd!#$%");

      expect(defaultProps.onFormDataChange).toHaveBeenCalledWith({ email: "t" });
      expect(defaultProps.onFormDataChange).toHaveBeenCalledWith({ password: "p" });
    });
  });

  describe("Performance", () => {
    it("does not cause unnecessary re-renders", () => {
      const { rerender } = renderWithProviders(<SignInForm {...defaultProps} />);

      // Re-render with same props should not cause issues
      rerender(<SignInForm {...defaultProps} />);
      rerender(<SignInForm {...defaultProps} />);

      expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
    });

    it("renders quickly", () => {
      const startTime = performance.now();
      renderWithProviders(<SignInForm {...defaultProps} />);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});
