#!/bin/bash

# Output file
OUTPUT="combined_docs.txt"

# List of input files
FILES=(
 "packages/repo/src/auth-user.repo.ts"
 "packages/repo/src/calendar-events.repo.ts"
 "packages/repo/src/contacts.repo.ts"
 "packages/repo/src/identities.repo.ts"
 "packages/repo/src/inbox.repo.ts"
 "packages/repo/src/index.ts"
 "packages/repo/src/interactions.repo.ts"
 "packages/repo/src/jobs.repo.ts"
 "packages/repo/src/momentum.repo.ts"
 "packages/repo/src/notes.repo.ts"
 "packages/repo/src/onboarding.repo.ts"
 "packages/repo/src/raw-events.repo.ts"
 "packages/repo/src/schema-canaries.test.ts"
 "packages/repo/src/search.repo.ts"
 "packages/repo/src/sync-sessions.repo.ts"
 "packages/repo/src/user-integrations.repo.ts"
 "packages/repo/src/zones.repo.ts"
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
