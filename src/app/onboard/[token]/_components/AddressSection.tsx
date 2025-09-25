"use client";

import { Control, FieldErrors } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingFormData } from "@/app/onboard/[token]/_components/OnboardingForm";

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
          <Input
            id="addressLine1"
            {...control.register("address.line1")}
            className={errors.address?.line1 ? "border-red-500" : ""}
            placeholder="Street address"
          />
          {errors.address?.line1 && (
            <p className="text-sm text-red-500">{errors.address.line1.message}</p>
          )}
        </div>

        {/* Address Line 2 */}
        <div className="space-y-2">
          <Label htmlFor="addressLine2">Address Line 2</Label>
          <Input
            id="addressLine2"
            {...control.register("address.line2")}
            className={errors.address?.line2 ? "border-red-500" : ""}
            placeholder="Apartment, suite, unit, etc. (optional)"
          />
          {errors.address?.line2 && (
            <p className="text-sm text-red-500">{errors.address.line2.message}</p>
          )}
        </div>

        {/* City and State */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              {...control.register("address.city")}
              className={errors.address?.city ? "border-red-500" : ""}
              placeholder="City"
            />
            {errors.address?.city && (
              <p className="text-sm text-red-500">{errors.address.city.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">State/Province</Label>
            <Input
              id="state"
              {...control.register("address.state")}
              className={errors.address?.state ? "border-red-500" : ""}
              placeholder="State or Province"
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
            <Input
              id="zipCode"
              {...control.register("address.zipCode")}
              className={errors.address?.zipCode ? "border-red-500" : ""}
              placeholder="ZIP or Postal Code"
            />
            {errors.address?.zipCode && (
              <p className="text-sm text-red-500">{errors.address.zipCode.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Select {...control.register("address.country")}>
              <SelectTrigger className={errors.address?.country ? "border-red-500" : ""}>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="US">United States</SelectItem>
                <SelectItem value="CA">Canada</SelectItem>
                <SelectItem value="GB">United Kingdom</SelectItem>
                <SelectItem value="AU">Australia</SelectItem>
                <SelectItem value="DE">Germany</SelectItem>
                <SelectItem value="FR">France</SelectItem>
                <SelectItem value="ES">Spain</SelectItem>
                <SelectItem value="IT">Italy</SelectItem>
                <SelectItem value="NL">Netherlands</SelectItem>
                <SelectItem value="SE">Sweden</SelectItem>
                <SelectItem value="NO">Norway</SelectItem>
                <SelectItem value="DK">Denmark</SelectItem>
                <SelectItem value="FI">Finland</SelectItem>
                <SelectItem value="CH">Switzerland</SelectItem>
                <SelectItem value="AT">Austria</SelectItem>
                <SelectItem value="BE">Belgium</SelectItem>
                <SelectItem value="IE">Ireland</SelectItem>
                <SelectItem value="PT">Portugal</SelectItem>
                <SelectItem value="GR">Greece</SelectItem>
                <SelectItem value="PL">Poland</SelectItem>
                <SelectItem value="CZ">Czech Republic</SelectItem>
                <SelectItem value="HU">Hungary</SelectItem>
                <SelectItem value="SK">Slovakia</SelectItem>
                <SelectItem value="SI">Slovenia</SelectItem>
                <SelectItem value="HR">Croatia</SelectItem>
                <SelectItem value="RO">Romania</SelectItem>
                <SelectItem value="BG">Bulgaria</SelectItem>
                <SelectItem value="LT">Lithuania</SelectItem>
                <SelectItem value="LV">Latvia</SelectItem>
                <SelectItem value="EE">Estonia</SelectItem>
                <SelectItem value="LU">Luxembourg</SelectItem>
                <SelectItem value="MT">Malta</SelectItem>
                <SelectItem value="CY">Cyprus</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.address?.country && (
              <p className="text-sm text-red-500">{errors.address.country.message}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
