import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui";

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
}

export function PasswordInput({
  value,
  onChange,
  placeholder = "Password",
  required = false,
  autoComplete,
}: PasswordInputProps): JSX.Element {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <label htmlFor="password-input" className="sr-only">
        Password
      </label>
      <Input
        id="password-input"
        type={showPassword ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
        onClick={() => setShowPassword(!showPassword)}
        aria-label={showPassword ? "Hide password field" : "Show password field"}
        tabIndex={-1}
      >
        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
