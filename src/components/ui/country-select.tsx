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
import { COUNTRIES } from "@/constants/countries";

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
    GB: ["uk", "britain", "england", "scotland", "wales"],
    AU: ["australia"],
    NZ: ["new zealand", "aotearoa"],
    IE: ["ireland", "eire", "eir"],
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
    DE: ["germany", "deutschland", "deutsch"],
    FR: ["france", "la france", "français"],
    ES: ["spain", "españa", "esp", "español"],
    IT: ["italy", "italia", "italiano"],
    PT: ["portugal", "português"],
    BR: ["brazil", "brasil", "português"],
    MX: ["mexico", "méxico", "mexicano"],
    AR: ["argentina", "argentino"],
    CL: ["chile", "chileno"],
    CO: ["colombia", "colombiano"],
    PE: ["peru", "perú", "peruano"],
    IN: ["india", "indian", "hindustan"],
    SG: ["singapore", "singapura"],
    HK: ["hong kong", "xianggang"],
    PH: ["philippines", "pilipinas", "filipino"],
    MY: ["malaysia", "malaysian"],
    TH: ["thailand", "thai", "ประเทศไทย"],
    ID: ["indonesia", "indonesian"],
    JP: ["japan", "japanese", "nihon", "nippon"],
    KR: ["south korea", "korea", "한국"],
    TW: ["taiwan", "taiwanese", "台灣"],
    IL: ["israel", "israeli", "ישראל"],
    AE: ["uae", "united arab emirates", "emirates"],
    SA: ["saudi arabia", "saudi"],
    EG: ["egypt", "egyptian", "مصر"],
    NG: ["nigeria", "nigerian"],
    KE: ["kenya", "kenyan"],
    GH: ["ghana", "ghanaian"],
    MA: ["morocco", "moroccan", "المغرب"],
    TN: ["tunisia", "tunisian", "تونس"],
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

    const searchLower = searchValue.toLowerCase();
    return COUNTRY_DATA.filter((country) =>
      country.searchTerms.some((term) => term.includes(searchLower)),
    );
  }, [searchValue]);

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
        <Command>
          <CommandInput
            placeholder="Type country name..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {filteredCountries.map((country) => (
                <CommandItem
                  key={country.value}
                  value={country.value}
                  onSelect={(currentValue: string) => {
                    onValueChange?.(currentValue === value ? "" : currentValue);
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
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
