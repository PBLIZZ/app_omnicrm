import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Simplified Button component for testing
interface MockButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const MockButton = ({
  children,
  onClick,
  disabled,
  variant = "default",
  size = "default",
  className = "",
  type = "button",
  ...props
}: MockButtonProps) => {
  const baseClasses = "inline-flex items-center justify-center rounded-md font-medium";
  const variantClasses = {
    default: "bg-primary text-primary-foreground",
    destructive: "bg-destructive text-destructive-foreground",
    outline: "border border-input",
    secondary: "bg-secondary text-secondary-foreground",
    ghost: "hover:bg-accent",
    link: "text-primary underline-offset-4",
  };
  const sizeClasses = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8",
    icon: "h-10 w-10",
  };

  const classes =
    `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`.trim();

  return (
    <button type={type} className={classes} onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  );
};

describe("Button (Simplified)", () => {
  it("renders button with default props", () => {
    render(<MockButton>Click me</MockButton>);

    const button = screen.getByRole("button", { name: "Click me" });
    expect(button).toBeInTheDocument();
  });

  it("renders button text correctly", () => {
    render(<MockButton>Test Button</MockButton>);

    const button = screen.getByRole("button", { name: "Test Button" });
    expect(button).toHaveTextContent("Test Button");
  });

  it("handles click events", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<MockButton onClick={onClick}>Clickable</MockButton>);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("respects disabled state", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <MockButton onClick={onClick} disabled>
        Disabled
      </MockButton>,
    );

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();

    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("applies custom className", () => {
    render(<MockButton className="custom-class">Test</MockButton>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("custom-class");
  });

  it("supports different button types", () => {
    render(<MockButton type="submit">Submit</MockButton>);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("type", "submit");
  });

  it("handles keyboard events", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<MockButton onClick={onClick}>Keyboard Test</MockButton>);

    const button = screen.getByRole("button");
    button.focus();

    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalled();
  });

  it("supports aria-label", () => {
    render(<MockButton aria-label="Custom label">Icon</MockButton>);

    const button = screen.getByRole("button", { name: "Custom label" });
    expect(button).toBeInTheDocument();
  });

  it("applies variant classes", () => {
    render(<MockButton variant="destructive">Destructive</MockButton>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-destructive");
  });

  it("applies size classes", () => {
    render(<MockButton size="sm">Small</MockButton>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("h-9");
  });

  it("forwards HTML attributes", () => {
    render(
      <MockButton data-testid="test-button" name="test-name">
        Test
      </MockButton>,
    );

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("data-testid", "test-button");
    expect(button).toHaveAttribute("name", "test-name");
  });

  it("has proper focus behavior", async () => {
    const user = userEvent.setup();

    render(<MockButton>Focus Test</MockButton>);

    const button = screen.getByRole("button");

    await user.tab();
    expect(button).toHaveFocus();
  });
});
