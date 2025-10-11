"use client";

import { useState } from "react";
import { CountrySelect } from "./country-select";

/**
 * Example usage of CountrySelect component
 *
 * This shows how to use the CountrySelect component in different scenarios:
 * - Basic usage
 * - With form libraries (react-hook-form)
 * - With validation
 */

export function CountrySelectExample() {
  const [selectedCountry, setSelectedCountry] = useState<string>("");

  return (
    <div className="space-y-4 p-4">
      <h3 className="text-lg font-semibold">Country Select Examples</h3>

      {/* Basic usage */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Basic Country Select:</label>
        <CountrySelect
          value={selectedCountry}
          onValueChange={setSelectedCountry}
          placeholder="Choose your country..."
        />
        {selectedCountry && (
          <p className="text-sm text-muted-foreground">Selected: {selectedCountry}</p>
        )}
      </div>

      {/* Search examples */}
      <div className="space-y-2">
        <h4 className="font-medium">Search Examples:</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Type "esp" → Spain</li>
          <li>• Type "eir" → Ireland</li>
          <li>• Type "fran" → France</li>
          <li>• Type "ital" → Italy</li>
          <li>• Type "bras" → Brazil</li>
          <li>• Type "deut" → Germany</li>
          <li>• Type "neth" → Netherlands</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * Example with react-hook-form integration
 */
export function CountrySelectWithForm() {
  // This would be used with react-hook-form like this:
  /*
  <Controller
    name="country"
    control={control}
    render={({ field }) => (
      <CountrySelect
        value={field.value}
        onValueChange={field.onChange}
        placeholder="Select country"
        className={errors.country ? "border-red-500" : ""}
      />
    )}
  />
  */
  return null;
}
