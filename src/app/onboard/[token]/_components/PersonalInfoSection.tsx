"use client";

import { Control, FieldErrors } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingFormData } from "@/app/onboard/[token]/_components/OnboardingForm";

interface PersonalInfoSectionProps {
  control: Control<OnboardingFormData>;
  errors: FieldErrors<OnboardingFormData>;
}

export function PersonalInfoSection({ control, errors }: PersonalInfoSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
        <CardDescription>Please provide your basic contact information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="displayName">Full Name *</Label>
          <Input
            id="displayName"
            {...control.register("displayName")}
            className={errors.displayName ? "border-red-500" : ""}
          />
          {errors.displayName && (
            <p className="text-sm text-red-500">{errors.displayName.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="primaryEmail">Email Address</Label>
          <Input
            id="primaryEmail"
            type="email"
            {...control.register("primaryEmail")}
            className={errors.primaryEmail ? "border-red-500" : ""}
          />
          {errors.primaryEmail && (
            <p className="text-sm text-red-500">{errors.primaryEmail.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="primaryPhone">Phone Number</Label>
          <Input
            id="primaryPhone"
            type="tel"
            {...control.register("primaryPhone")}
            className={errors.primaryPhone ? "border-red-500" : ""}
          />
          {errors.primaryPhone && (
            <p className="text-sm text-red-500">{errors.primaryPhone.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">Date of Birth</Label>
          <Input
            id="dateOfBirth"
            type="date"
            {...control.register("dateOfBirth")}
            className={errors.dateOfBirth ? "border-red-500" : ""}
          />
          {errors.dateOfBirth && (
            <p className="text-sm text-red-500">{errors.dateOfBirth.message}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
