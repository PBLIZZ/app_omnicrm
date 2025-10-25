import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PersonalDetailsView } from "../PersonalDetailsView";
import type { ContactWithNotes } from "@/server/db/schema";

// Mock the UI components
vi.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: any) => (
    <div className={className} data-testid="card">
      {children}
    </div>
  ),
  CardContent: ({ children, className }: any) => (
    <div className={className} data-testid="card-content">
      {children}
    </div>
  ),
  CardHeader: ({ children, className }: any) => (
    <div className={className} data-testid="card-header">
      {children}
    </div>
  ),
  CardTitle: ({ children, className }: any) => (
    <h3 className={className} data-testid="card-title">
      {children}
    </h3>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={`badge ${variant} ${className}`} data-testid="badge">
      {children}
    </span>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}));

// Mock date-fns
vi.mock("date-fns", () => ({
  formatDistanceToNow: vi.fn((date) => `2 days ago`),
  format: vi.fn((date, format) => "January 15, 2024"),
}));

describe("PersonalDetailsView", () => {
  const mockContact: ContactWithNotes = {
    id: "contact-1",
    userId: "user-1",
    displayName: "John Doe",
    primaryEmail: "john@example.com",
    primaryPhone: "+1234567890",
    photoUrl: null,
    source: "manual",
    lifecycleStage: "prospect",
    confidenceScore: "high",
    dateOfBirth: "1990-01-15",
    emergencyContactName: "Jane Doe",
    emergencyContactPhone: "+0987654321",
    clientStatus: "active",
    referralSource: "Website",
    address: {
      street: "123 Main St",
      city: "Anytown",
      state: "CA",
      postalCode: "12345",
      country: "USA",
    },
    healthContext: {
      conditions: ["Diabetes", "Hypertension"],
      medications: ["Metformin", "Lisinopril"],
      allergies: ["Peanuts", "Shellfish"],
      emergencyContact: "Jane Doe",
    },
    preferences: {
      communicationMethod: "email",
      appointmentReminders: true,
      marketingConsent: false,
      dataSharing: true,
    },
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-15"),
    notes: [],
  };

  const mockOnEdit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render basic contact information", () => {
    render(<PersonalDetailsView contact={mockContact} onEdit={mockOnEdit} />);

    expect(screen.getByText("Personal Details")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
    expect(screen.getByText("+1234567890")).toBeInTheDocument();
    expect(screen.getByText("January 15, 2024")).toBeInTheDocument(); // DOB
  });

  it("should render wellness profile information", () => {
    render(<PersonalDetailsView contact={mockContact} onEdit={mockOnEdit} />);

    expect(screen.getByText("prospect")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
    expect(screen.getByText("Website")).toBeInTheDocument();
    expect(screen.getByText("vip")).toBeInTheDocument();
    expect(screen.getByText("wellness")).toBeInTheDocument();
    expect(screen.getByText("high")).toBeInTheDocument();
  });

  it("should render health information when available", () => {
    render(<PersonalDetailsView contact={mockContact} onEdit={mockOnEdit} />);

    expect(screen.getByText("Medical Conditions")).toBeInTheDocument();
    expect(screen.getByText("Diabetes")).toBeInTheDocument();
    expect(screen.getByText("Hypertension")).toBeInTheDocument();

    expect(screen.getByText("Medications")).toBeInTheDocument();
    expect(screen.getByText("Metformin")).toBeInTheDocument();
    expect(screen.getByText("Lisinopril")).toBeInTheDocument();

    expect(screen.getByText("Allergies")).toBeInTheDocument();
    expect(screen.getByText("Peanuts")).toBeInTheDocument();
    expect(screen.getByText("Shellfish")).toBeInTheDocument();
  });

  it("should render emergency contact information", () => {
    render(<PersonalDetailsView contact={mockContact} onEdit={mockOnEdit} />);

    expect(screen.getByText("Emergency Contact")).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("+0987654321")).toBeInTheDocument();
  });

  it("should render preferences and consents", () => {
    render(<PersonalDetailsView contact={mockContact} onEdit={mockOnEdit} />);

    expect(screen.getByText("Preferences & Consents")).toBeInTheDocument();
    expect(screen.getByText("email")).toBeInTheDocument();
    expect(screen.getByText("Enabled")).toBeInTheDocument();
    expect(screen.getByText("Not Consented")).toBeInTheDocument();
    expect(screen.getByText("Allowed")).toBeInTheDocument();
  });

  it("should render system information", () => {
    render(<PersonalDetailsView contact={mockContact} onEdit={mockOnEdit} />);

    expect(screen.getByText("System Information")).toBeInTheDocument();
    expect(screen.getByText("manual")).toBeInTheDocument();
    expect(screen.getAllByText("2 days ago")).toHaveLength(2); // Created and Updated
  });

  it("should call onEdit when Edit Details button is clicked", () => {
    render(<PersonalDetailsView contact={mockContact} onEdit={mockOnEdit} />);

    const editButton = screen.getByText("Edit Details");
    fireEvent.click(editButton);

    expect(mockOnEdit).toHaveBeenCalled();
  });

  it("should handle missing optional fields gracefully", () => {
    const contactWithoutOptionalFields: ContactWithNotes = {
      ...mockContact,
      primaryEmail: null,
      primaryPhone: null,
      dateOfBirth: null,
      address: null,
      healthContext: null,
      preferences: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      source: null,
    };

    render(<PersonalDetailsView contact={contactWithoutOptionalFields} onEdit={mockOnEdit} />);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Manual Entry")).toBeInTheDocument(); // Default source
  });

  it("should format address correctly when available", () => {
    render(<PersonalDetailsView contact={mockContact} onEdit={mockOnEdit} />);

    expect(screen.getByText("123 Main St, Anytown, CA, 12345, USA")).toBeInTheDocument();
  });

  it("should not render health information section when healthContext is null", () => {
    const contactWithoutHealth: ContactWithNotes = {
      ...mockContact,
      healthContext: null,
    };

    render(<PersonalDetailsView contact={contactWithoutHealth} onEdit={mockOnEdit} />);

    expect(screen.queryByText("Health Information")).not.toBeInTheDocument();
  });

  it("should not render emergency contact section when both fields are null", () => {
    const contactWithoutEmergency: ContactWithNotes = {
      ...mockContact,
      emergencyContactName: null,
      emergencyContactPhone: null,
    };

    render(<PersonalDetailsView contact={contactWithoutEmergency} onEdit={mockOnEdit} />);

    expect(screen.queryByText("Emergency Contact")).not.toBeInTheDocument();
  });

  it("should not render preferences section when preferences is null", () => {
    const contactWithoutPreferences: ContactWithNotes = {
      ...mockContact,
      preferences: null,
    };

    render(<PersonalDetailsView contact={contactWithoutPreferences} onEdit={mockOnEdit} />);

    expect(screen.queryByText("Preferences & Consents")).not.toBeInTheDocument();
  });

  it("should handle empty arrays in health context", () => {
    const contactWithEmptyHealth: ContactWithNotes = {
      ...mockContact,
      healthContext: {
        conditions: [],
        medications: [],
        allergies: [],
        emergencyContact: null,
      },
    };

    render(<PersonalDetailsView contact={contactWithEmptyHealth} onEdit={mockOnEdit} />);

    expect(screen.getByText("Health Information")).toBeInTheDocument();
    // Should not render any condition/medication/allergy badges
    expect(screen.queryByText("Diabetes")).not.toBeInTheDocument();
  });

  it("should render allergy badges with destructive variant", () => {
    render(<PersonalDetailsView contact={mockContact} onEdit={mockOnEdit} />);

    const allergyBadges = screen.getAllByText(/Peanuts|Shellfish/);
    allergyBadges.forEach((badge) => {
      expect(badge.closest('[data-testid="badge"]')).toHaveClass("badge destructive");
    });
  });

  it("should handle unknown date values gracefully", () => {
    const contactWithNullDates: ContactWithNotes = {
      ...mockContact,
      createdAt: null,
      updatedAt: null,
    };

    render(<PersonalDetailsView contact={contactWithNullDates} onEdit={mockOnEdit} />);

    expect(screen.getAllByText("Unknown")).toHaveLength(2); // Created and Updated
  });
});
