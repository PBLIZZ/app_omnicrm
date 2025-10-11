"use client";

import { Control, FieldErrors, Controller } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingFormData } from "@/app/onboard/[token]/_components/OnboardingForm";
import { CountrySelect } from "@/components/ui/country-select";

interface AddressSectionProps {
  control: Control<OnboardingFormData>;
  errors: FieldErrors<OnboardingFormData>;
}

export function AddressSection({ control, errors }: AddressSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Address Information</CardTitle>
        <CardDescription>Your address information (optional)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Address Line 1 */}
        <div className="space-y-2">
          <Label htmlFor="addressLine1">Address Line 1</Label>
          <Controller
            name="address.line1"
            control={control}
            render={({ field }) => (
              <Input
                id="addressLine1"
                {...field}
                value={field.value || ""}
                className={errors.address?.line1 ? "border-red-500" : ""}
                placeholder="Street address"
              />
            )}
          />
          {errors.address?.line1 && (
            <p className="text-sm text-red-500">{errors.address.line1.message}</p>
          )}
        </div>

        {/* Address Line 2 */}
        <div className="space-y-2">
          <Label htmlFor="addressLine2">Address Line 2</Label>
          <Controller
            name="address.line2"
            control={control}
            render={({ field }) => (
              <Input
                id="addressLine2"
                {...field}
                value={field.value || ""}
                className={errors.address?.line2 ? "border-red-500" : ""}
                placeholder="Apartment, suite, unit, etc. (optional)"
              />
            )}
          />
          {errors.address?.line2 && (
            <p className="text-sm text-red-500">{errors.address.line2.message}</p>
          )}
        </div>

        {/* City and State */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Controller
              name="address.city"
              control={control}
              render={({ field }) => (
                <Input
                  id="city"
                  {...field}
                  value={field.value || ""}
                  className={errors.address?.city ? "border-red-500" : ""}
                  placeholder="City"
                />
              )}
            />
            {errors.address?.city && (
              <p className="text-sm text-red-500">{errors.address.city.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">State/Province</Label>
            <Controller
              name="address.state"
              control={control}
              render={({ field }) => (
                <Input
                  id="state"
                  {...field}
                  value={field.value || ""}
                  className={errors.address?.state ? "border-red-500" : ""}
                  placeholder="State or Province"
                />
              )}
            />
            {errors.address?.state && (
              <p className="text-sm text-red-500">{errors.address.state.message}</p>
            )}
          </div>
        </div>

        {/* ZIP Code and Country */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="zipCode">ZIP/Postal Code</Label>
            <Controller
              name="address.zipCode"
              control={control}
              render={({ field }) => (
                <Input
                  id="zipCode"
                  {...field}
                  value={field.value || ""}
                  className={errors.address?.zipCode ? "border-red-500" : ""}
                  placeholder="ZIP or Postal Code"
                />
              )}
            />
            {errors.address?.zipCode && (
              <p className="text-sm text-red-500">{errors.address.zipCode.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Controller
              name="address.country"
              control={control}
              render={({ field }) => (
                <CountrySelect
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Select country"
                  className={errors.address?.country ? "border-red-500" : ""}
                />
              )}
            />
            {errors.address?.country && (
              <p className="text-sm text-red-500">{errors.address.country.message}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
