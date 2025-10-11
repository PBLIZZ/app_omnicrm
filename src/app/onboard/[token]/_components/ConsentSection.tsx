"use client";

import { Control, FieldErrors } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingFormData } from "@/app/onboard/[token]/_components/OnboardingForm";

interface ConsentSectionProps {
  control: Control<OnboardingFormData>;
  errors: FieldErrors<OnboardingFormData>;
}
export function ConsentSection({ control, errors }: ConsentSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Consent & Agreements</CardTitle>
        <CardDescription>Please review and agree to our terms</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Personal Information Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            PERSONAL INFO
          </h4>
          <div className="flex items-start space-x-2">
            <Checkbox
              id="consentHipaa"
              {...control.register("consentHipaa")}
              className={errors.consentHipaa ? "border-red-500" : ""}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="consentHipaa" className="font-normal text-sm">
                I agree to have my personal information stored for the purposes of improving my
                wellness and understand this information will be encrypted and never shared with
                anyone outside of your wellness practitioner and complies with HIPAA and GDPR. *
              </Label>
            </div>
          </div>
          {errors.consentHipaa && (
            <p className="text-sm text-red-500">{errors.consentHipaa.message}</p>
          )}
        </div>

        {/* Marketing Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">MARKETING</h4>
          <div className="flex items-start space-x-2">
            <Checkbox id="consentMarketing" {...control.register("consentMarketing")} />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="consentMarketing" className="font-normal text-sm">
                I consent to receive educational content, promotional offers, informational updates,
                newsletters, and exciting limited space offers via email or SMS.
              </Label>
            </div>
          </div>
        </div>

        {/* Photo Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">PHOTO</h4>
          <div className="flex items-start space-x-2">
            <Checkbox
              id="consentPhotography"
              {...control.register("consentPhotography")}
              className={errors.consentPhotography ? "border-red-500" : ""}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="consentPhotography" className="font-normal text-sm">
                I consent to the use of my uploaded photo for identification and wellness tracking
                purposes within the wellness app of your wellness practitioner.
              </Label>
            </div>
          </div>
          {errors.consentPhotography && (
            <p className="text-sm text-red-500">{errors.consentPhotography.message}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
