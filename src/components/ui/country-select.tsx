"use client";

import { useState, useMemo } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { COUNTRIES, COUNTRY_SEARCH_MAP } from "@/constants/countries";

interface CountrySelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

// Extended country data with native names and search terms
const COUNTRY_DATA = COUNTRIES.map((country) => ({
  ...country,
  // Native names and common variations for search
  searchTerms: getSearchTerms(country.value, country.label),
}));

function getSearchTerms(code: string, label: string): string[] {
  const terms = [label.toLowerCase()];

  // Add native names and common variations
  const nativeNames: Record<string, string[]> = {
    US: ["usa", "america", "united states of america"],
    CA: ["canada"],
    GB: ["uk", "britain", "great britain", "england", "scotland", "wales", "northern ireland"],
    AU: ["australia", "aussie"],
    NZ: ["new zealand", "aotearoa"],
    IE: ["ireland", "eire", "republic of ireland"],
    ZA: ["south africa"],
    NL: ["netherlands", "holland", "nederland"],
    SE: ["sweden", "sverige"],
    NO: ["norway", "norge"],
    DK: ["denmark", "danmark"],
    FI: ["finland", "suomi"],
    CH: ["switzerland", "schweiz", "suisse"],
    AT: ["austria", "österreich"],
    BE: ["belgium", "belgië", "belgique"],
    LU: ["luxembourg", "luxemburg"],
    MT: ["malta"],
    CY: ["cyprus", "κύπρος"],
    DE: ["germany", "deutschland"],
    FR: ["france"],
    ES: ["spain", "españa"],
    IT: ["italy", "italia"],
    PT: ["portugal"],
    BR: ["brazil", "brasil"],
    MX: ["mexico", "méxico"],
    AR: ["argentina"],
    CL: ["chile"],
    CO: ["colombia"],
    PE: ["peru", "perú"],
    IN: ["india"],
    SG: ["singapore"],
    HK: ["hong kong"],
    PH: ["philippines", "pilipinas"],
    MY: ["malaysia"],
    TH: ["thailand"],
    ID: ["indonesia"],
    JP: ["japan", "nihon", "nippon"],
    KR: ["south korea", "korea"],
    TW: ["taiwan"],
    IL: ["israel"],
    AE: ["uae", "united arab emirates", "emirates"],
    SA: ["saudi arabia", "saudi"],
    EG: ["egypt"],
    NG: ["nigeria"],
    KE: ["kenya"],
    GH: ["ghana"],
    MA: ["morocco"],
    TN: ["tunisia"],
  };

  const nativeTerms = nativeNames[code] || [];
  return [...terms, ...nativeTerms];
}

export function CountrySelect({
  value,
  onValueChange,
  placeholder = "Select country...",
  className,
  disabled = false,
}: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const selectedCountry = COUNTRY_DATA.find((country) => country.value === value);

  const filteredCountries = useMemo(() => {
    if (!searchValue) return COUNTRY_DATA;

    const searchLower = searchValue.toLowerCase().trim();
    
    // Check if the search matches a country in our search map
    const mappedCountryCode = COUNTRY_SEARCH_MAP[searchLower];
    if (mappedCountryCode) {
      // Return only the mapped country
      return COUNTRY_DATA.filter((country) => country.value === mappedCountryCode);
    }
    
    // Check for partial matches in the search map
    const partialMatches = Object.keys(COUNTRY_SEARCH_MAP).filter((key) =>
      key.includes(searchLower)
    );
    
    if (partialMatches.length > 0) {
      const matchedCodes = new Set(partialMatches.map((key) => COUNTRY_SEARCH_MAP[key]));
      return COUNTRY_DATA.filter((country) => matchedCodes.has(country.value));
    }
    
    // Fallback to original search logic
    return COUNTRY_DATA.filter((country) => {
      const matchesSearchTerms = country.searchTerms.some((term) => term.includes(searchLower));
      const matchesLabel = country.label.toLowerCase().includes(searchLower);
      return matchesSearchTerms || matchesLabel;
    });
  }, [searchValue]);

  // Group countries by continent
  const groupedCountries = useMemo(() => {
    const countries = searchValue ? filteredCountries : COUNTRY_DATA;
    const groups: Record<string, typeof COUNTRY_DATA> = {};
    
    countries.forEach((country) => {
      if (!groups[country.continent]) {
        groups[country.continent] = [];
      }
      groups[country.continent]!.push(country);
    });
    
    return groups;
  }, [searchValue, filteredCountries]);

  const continentOrder = [
    "Primary English-Speaking",
    "Large English-Speaking Population",
    "Major European Markets",
    "Major Asian Markets",
    "Americas",
    "Middle East",
    "Rest of World"
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            !selectedCountry && "text-muted-foreground",
            className,
          )}
          disabled={disabled}
        >
          {selectedCountry ? selectedCountry.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Type country name..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            {continentOrder.map((continent) => {
              const countries = groupedCountries[continent];
              if (!countries || countries.length === 0) return null;
              
              return (
                <CommandGroup key={continent} heading={continent}>
                  {countries.map((country) => (
                    <CommandItem
                      key={country.value}
                      value={country.value}
                      keywords={[country.label, ...country.searchTerms]}
                      onSelect={() => {
                        onValueChange?.(country.value);
                        setOpen(false);
                        setSearchValue("");
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === country.value ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {country.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
