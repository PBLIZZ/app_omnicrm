"use client";

import { Control, FieldErrors, useController } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingFormData } from "@/app/onboard/[token]/_components/OnboardingForm";

type SessionTime = "mornings" | "afternoons" | "evenings" | "weekends";
type CommunicationPref = "email" | "phone" | "text";

interface PreferencesSectionProps {
  control: Control<OnboardingFormData>;
  errors: FieldErrors<OnboardingFormData>;
}

export function PreferencesSection({ control, errors }: PreferencesSectionProps) {
  const sessionTimeController = useController({
    control,
    name: "preferences.sessionTimes",
    defaultValue: [],
  });

  const communicationController = useController({
    control,
    name: "preferences.communicationPrefs",
    defaultValue: [],
  });

  const sessionTimeOptions: Array<{ value: SessionTime; label: string }> = [
    { value: "mornings", label: "Mornings (6 AM - 12 PM)" },
    { value: "afternoons", label: "Afternoons (12 PM - 6 PM)" },
    { value: "evenings", label: "Evenings (6 PM - 10 PM)" },
    { value: "weekends", label: "Weekends" },
  ];

  const communicationOptions: Array<{ value: CommunicationPref; label: string }> = [
    { value: "email", label: "Email" },
    { value: "phone", label: "Phone Call" },
    { value: "text", label: "Text Message" },
  ];

  const handleSessionTimeChange = (value: SessionTime, checked: boolean) => {
    const currentValues = sessionTimeController.field.value || [];
    if (checked) {
      if (!currentValues.includes(value)) {
        sessionTimeController.field.onChange([...currentValues, value]);
      }
    } else {
      sessionTimeController.field.onChange(currentValues.filter((item) => item !== value));
    }
  };

  const handleCommunicationChange = (value: CommunicationPref, checked: boolean) => {
    const currentValues = communicationController.field.value || [];
    if (checked) {
      if (!currentValues.includes(value)) {
        communicationController.field.onChange([...currentValues, value]);
      }
    } else {
      communicationController.field.onChange(currentValues.filter((item) => item !== value));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
        <CardDescription>
          Let us know your preferences for sessions and communication
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preferred Session Times */}
        <div className="space-y-3">
          <Label>Preferred Session Times</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sessionTimeOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`sessionTime-${option.value}`}
                  checked={(sessionTimeController.field.value || []).includes(option.value)}
                  onCheckedChange={(checked) =>
                    handleSessionTimeChange(option.value, checked as boolean)
                  }
                />
                <Label htmlFor={`sessionTime-${option.value}`} className="text-sm font-normal">
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
          {errors.preferences?.sessionTimes && (
            <p className="text-sm text-red-500">{errors.preferences.sessionTimes.message}</p>
          )}
        </div>

        {/* Communication Preferences */}
        <div className="space-y-3">
          <Label>Communication Preferences</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {communicationOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`communication-${option.value}`}
                  checked={(communicationController.field.value || []).includes(option.value)}
                  onCheckedChange={(checked) =>
                    handleCommunicationChange(option.value, checked as boolean)
                  }
                />
                <Label htmlFor={`communication-${option.value}`} className="text-sm font-normal">
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
          {errors.preferences?.communicationPrefs && (
            <p className="text-sm text-red-500">{errors.preferences.communicationPrefs.message}</p>
          )}
        </div>

        {/* Additional Notes */}
        <div className="space-y-2">
          <Label htmlFor="preferencesNotes">Additional Preferences or Notes</Label>
          <Textarea
            id="preferencesNotes"
            {...control.register("preferences.notes")}
            className={errors.preferences?.notes ? "border-red-500" : ""}
            placeholder="Any other preferences or special requests..."
            rows={3}
          />
          {errors.preferences?.notes && (
            <p className="text-sm text-red-500">{errors.preferences.notes.message}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
