#!/bin/bash

# Output file
OUTPUT="combined_docs.txt"

# List of input files
FILES=(
"src/app/api/onboarding/public/track-access/route.ts"
"src/server/db/business-schemas/storage.ts"
"src/server/db/business-schemas/onboarding.ts"
"src/server/services/onboarding.service.ts"
"src/server/services/signed-upload.service.ts"
"src/server/services/storage.service.ts"
"src/hooks/use-storage.ts"
"src/app/api/storage/file-url/route.ts"
"src/app/api/storage/upload-url/route.ts"
"packages/repo/src/onboarding.repo.ts"
"src/app/api/onboarding/admin/generate-tokens/route.ts"
"src/app/api/onboarding/admin/tokens/[tokenId]/route.ts"
"src/app/api/onboarding/public/upload-photo/route.ts"
"src/app/api/onboarding/admin/tokens/route.ts"
"src/app/api/onboarding/public/submit/route.ts"
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
