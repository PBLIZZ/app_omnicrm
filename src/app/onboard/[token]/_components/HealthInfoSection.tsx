"use client";

import { Control, FieldErrors } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingFormData } from "@/app/onboard/[token]/_components/OnboardingForm";

interface HealthInfoSectionProps {
  control: Control<OnboardingFormData>;
  errors: FieldErrors<OnboardingFormData>;
}

export function HealthInfoSection({ control, errors }: HealthInfoSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Health Information</CardTitle>
        <CardDescription>Please provide relevant health information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Health Conditions */}
        <div className="space-y-2">
          <Label htmlFor="healthConditions">Health Conditions</Label>
          <Textarea
            id="healthConditions"
            {...control.register("healthContext.conditions")}
            className={errors.healthContext?.conditions ? "border-red-500" : ""}
            placeholder="List any relevant health conditions or chronic conditions"
            rows={3}
          />
          {errors.healthContext?.conditions && (
            <p className="text-sm text-red-500">{errors.healthContext.conditions.message}</p>
          )}
        </div>

        {/* Injuries */}
        <div className="space-y-2">
          <Label htmlFor="injuries">Injuries / Anything We Should Know</Label>
          <Textarea
            id="injuries"
            {...control.register("healthContext.injuries")}
            className={errors.healthContext?.injuries ? "border-red-500" : ""}
            placeholder="List any current injuries, past injuries, or anything else we should be aware of"
            rows={3}
          />
          {errors.healthContext?.injuries && (
            <p className="text-sm text-red-500">{errors.healthContext.injuries.message}</p>
          )}
        </div>

        {/* Allergies */}
        <div className="space-y-2">
          <Label htmlFor="allergies">Allergies</Label>
          <Textarea
            id="allergies"
            {...control.register("healthContext.allergies")}
            className={errors.healthContext?.allergies ? "border-red-500" : ""}
            placeholder="List any allergies or sensitivities"
            rows={2}
          />
          {errors.healthContext?.allergies && (
            <p className="text-sm text-red-500">{errors.healthContext.allergies.message}</p>
          )}
        </div>

        {/* Fitness Level */}
        <div className="space-y-2">
          <Label htmlFor="fitnessLevel">Fitness Level</Label>
          <Select {...control.register("healthContext.fitnessLevel")}>
            <SelectTrigger className={errors.healthContext?.fitnessLevel ? "border-red-500" : ""}>
              <SelectValue placeholder="Select your fitness level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
              <SelectItem value="athlete">Athlete</SelectItem>
            </SelectContent>
          </Select>
          {errors.healthContext?.fitnessLevel && (
            <p className="text-sm text-red-500">{errors.healthContext.fitnessLevel.message}</p>
          )}
        </div>

        {/* Stress Level */}
        <div className="space-y-2">
          <Label htmlFor="stressLevel">Current Stress Level</Label>
          <Select {...control.register("healthContext.stressLevel")}>
            <SelectTrigger className={errors.healthContext?.stressLevel ? "border-red-500" : ""}>
              <SelectValue placeholder="Select your current stress level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="very_high">Very High</SelectItem>
            </SelectContent>
          </Select>
          {errors.healthContext?.stressLevel && (
            <p className="text-sm text-red-500">{errors.healthContext.stressLevel.message}</p>
          )}
        </div>

        {/* Goals */}
        <div className="space-y-2">
          <Label htmlFor="goals">What are you hoping to get out of your time with us?</Label>
          <Textarea
            id="goals"
            {...control.register("healthContext.goals")}
            className={errors.healthContext?.goals ? "border-red-500" : ""}
            placeholder="Tell us about your wellness goals and what you hope to achieve"
            rows={3}
          />
          {errors.healthContext?.goals && (
            <p className="text-sm text-red-500">{errors.healthContext.goals.message}</p>
          )}
        </div>

        {/* How did you hear about us */}
        <div className="space-y-2">
          <Label htmlFor="referralSource">How did you hear about us?</Label>
          <Textarea
            id="referralSource"
            {...control.register("referralSource")}
            className={errors.referralSource ? "border-red-500" : ""}
            placeholder="Social media, referral from a friend, Google search, etc."
            rows={2}
          />
          {errors.referralSource && (
            <p className="text-sm text-red-500">{errors.referralSource.message}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
