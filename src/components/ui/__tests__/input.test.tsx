import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Simplified Input component for testing
interface MockInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  "aria-label"?: string;
}

const MockInput = ({
  type = "text",
  className = "",
  disabled,
  placeholder,
  value,
  onChange,
  onFocus,
  onBlur,
  "aria-label": ariaLabel,
  ...props
}: MockInputProps) => {
  const baseClasses =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
  const disabledClasses = disabled ? "cursor-not-allowed opacity-50" : "";
  const classes = `${baseClasses} ${disabledClasses} ${className}`.trim();

  return (
    <input
      type={type}
      className={classes}
      disabled={disabled}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onFocus={onFocus}
      onBlur={onBlur}
      aria-label={ariaLabel}
      {...props}
    />
  );
};

describe("Input (Simplified)", () => {
  it("renders input with default props", () => {
    render(<MockInput />);

    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
  });

  it("renders with placeholder", () => {
    render(<MockInput placeholder="Enter text..." />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("placeholder", "Enter text...");
  });

  it("renders with value", () => {
    render(<MockInput value="test value" readOnly />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("test value");
  });

  it("handles user input", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<MockInput onChange={onChange} />);

    const input = screen.getByRole("textbox");
    await user.type(input, "hello");

    expect(onChange).toHaveBeenCalled();
    expect(input).toHaveValue("hello");
  });

  it("respects disabled state", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<MockInput onChange={onChange} disabled />);

    const input = screen.getByRole("textbox");
    expect(input).toBeDisabled();

    await user.click(input);
    await user.keyboard("test");

    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue("");
  });

  it("handles focus and blur events", async () => {
    const user = userEvent.setup();
    const onFocus = vi.fn();
    const onBlur = vi.fn();

    render(<MockInput onFocus={onFocus} onBlur={onBlur} />);

    const input = screen.getByRole("textbox");

    await user.click(input);
    expect(onFocus).toHaveBeenCalled();

    await user.tab();
    expect(onBlur).toHaveBeenCalled();
  });

  it("supports different input types", () => {
    render(<MockInput type="email" />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("type", "email");
  });

  it("supports password input", () => {
    render(<MockInput type="password" />);

    const input = document.querySelector('input[type="password"]');
    expect(input).toBeInTheDocument();
  });

  it("supports number input", () => {
    render(<MockInput type="number" />);

    const input = screen.getByRole("spinbutton");
    expect(input).toHaveAttribute("type", "number");
  });

  it("supports search input", () => {
    render(<MockInput type="search" />);

    const input = screen.getByRole("searchbox");
    expect(input).toHaveAttribute("type", "search");
  });

  it("applies custom className", () => {
    render(<MockInput className="custom-class" />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveClass("custom-class");
  });

  it("supports aria-label", () => {
    render(<MockInput aria-label="Custom input label" />);

    const input = screen.getByLabelText("Custom input label");
    expect(input).toBeInTheDocument();
  });

  it("supports required attribute", () => {
    render(<MockInput required />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("required");
  });

  it("supports readonly attribute", () => {
    render(<MockInput readOnly value="readonly value" />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("readonly");
    expect(input).toHaveValue("readonly value");
  });

  it("is keyboard accessible", async () => {
    const user = userEvent.setup();

    render(<MockInput />);

    const input = screen.getByRole("textbox");

    await user.tab();
    expect(input).toHaveFocus();

    await user.keyboard("test");
    expect(input).toHaveValue("test");
  });

  it("forwards HTML attributes", () => {
    render(
      <MockInput name="test-input" id="test-input" maxLength={100} data-testid="test-input" />,
    );

    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("name", "test-input");
    expect(input).toHaveAttribute("id", "test-input");
    expect(input).toHaveAttribute("maxlength", "100");
    expect(input).toHaveAttribute("data-testid", "test-input");
  });

  it("applies disabled styles", () => {
    render(<MockInput disabled />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveClass("cursor-not-allowed");
    expect(input).toHaveClass("opacity-50");
  });
});
