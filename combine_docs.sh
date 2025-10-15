#!/bin/bash

# Output file
OUTPUT="combined_docs.txt"

# List of input files
FILES=(
"docs/features/notes-wellness-practitioner-spec.md"
"docs/features/contact-table-notes-tags-enhancement-2025-01-21.md"
"docs/roadmap/enhanced-contacts-system.md"
"src/server/db/schema.ts"
"src/server/db/business-schemas/notes.ts"
"src/server/db/database.types.ts"
"supabase/sql/17_enhanced_contacts_schema.sql"
"src/app/api/notes/route.ts"
"src/app/api/notes/[noteId]/route.ts"
"src/server/services/notes.service.ts"
"src/server/services/contacts.service.ts"
"src/server/services/user-deletion.service.ts"
"packages/repo/src/notes.repo.ts"
"src/app/(authorisedRoute)/contacts/_components/ContactDetailsCard.tsx"
"src/app/(authorisedRoute)/contacts/[contactId]/notes/[noteId]/_components/NotesMainPane.tsx"
"src/app/(authorisedRoute)/contacts/[contactId]/notes/[noteId]/_components/NotesHoverCard.tsx"
"src/hooks/use-notes.ts"
"src/lib/validation/jsonb.ts"
"src/server/ai/contacts/utils/contact-utils.ts"
"src/server/ai/contacts/utils/validation-utils.ts"
"packages/repo/src/search.repo.ts"
"src/server/jobs/processors/insight.ts"
"src/app/onboard/[token]/_components/PreferencesSection.tsx"
"src/app/onboard/[token]/_components/OnboardingForm.tsx"
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
