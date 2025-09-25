"use client";

import { Control, FieldErrors } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingFormData } from "@/app/onboard/[token]/_components/OnboardingForm";

interface EmergencyContactSectionProps {
  control: Control<OnboardingFormData>;
  errors: FieldErrors<OnboardingFormData>;
}

export function EmergencyContactSection({ control, errors }: EmergencyContactSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Emergency Contact</CardTitle>
        <CardDescription>Please provide an emergency contact person</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="emergencyContactName">Emergency Contact Name *</Label>
          <Input
            id="emergencyContactName"
            {...control.register("emergencyContactName")}
            className={errors.emergencyContactName ? "border-red-500" : ""}
          />
          {errors.emergencyContactName && (
            <p className="text-sm text-red-500">{errors.emergencyContactName.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="emergencyContactPhone">Emergency Contact Phone *</Label>
          <Input
            id="emergencyContactPhone"
            type="tel"
            {...control.register("emergencyContactPhone")}
            className={errors.emergencyContactPhone ? "border-red-500" : ""}
          />
          {errors.emergencyContactPhone && (
            <p className="text-sm text-red-500">{errors.emergencyContactPhone.message}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
