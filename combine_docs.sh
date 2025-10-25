#!/bin/bash

# Output file
OUTPUT="combined_docs.txt"

# List of input files
FILES=(
"src/app/(authorisedRoute)/omni-momentum/_components/DailyPulseWidget.tsx"
"src/app/(authorisedRoute)/omni-momentum/_components/HabitTrackers.tsx"
"src/app/(authorisedRoute)/omni-momentum/_components/IntelligentInboxWidget.tsx"
"src/app/(authorisedRoute)/omni-momentum/_components/IntelligentProcessingApproval.tsx"
"src/app/(authorisedRoute)/omni-momentum/_components/MomentumPageLayout.tsx"
"src/app/(authorisedRoute)/omni-momentum/_components/MomentumSidebar.tsx"
"src/app/(authorisedRoute)/omni-momentum/_components/OmniMomentumPage.tsx"
"src/app/(authorisedRoute)/omni-momentum/_components/SimpleInboxCapture.tsx"
"src/app/(authorisedRoute)/omni-momentum/_components/TodaysFocusSection.tsx"
"src/app/(authorisedRoute)/omni-momentum/page.tsx"
"src/app/(authorisedRoute)/omni-momentum/README.md"
)

# Remove output file if it already exists
rm -f "$OUTPUT"

# Loop through files and append them to the output file
for FILE in "${FILES[@]}"; do
  if [[ -f "$FILE" ]]; then
    echo "===== $FILE =====" >> "$OUTPUT"
    cat "$FILE" >> "$OUTPUT"
    echo -e "\n\n" >> "$OUTPUT"
  else
    echo "⚠️  Warning: $FILE not found" >&2
  fi
done

echo "✅ Combined files into $OUTPUT"
