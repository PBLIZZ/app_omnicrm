#!/bin/bash

# Output file
OUTPUT="combined_docs.txt"

# List of input files
FILES=(
"supabase/sql/35_merge_calendar_events_into_interactions.sql"
"supabase/sql/36_migrate_calendar_events_data.sql"
"supabase/sql/37_backup_calendar_events_table.sql"
"supabase/sql/38_wipe_interaction_tables.sql"
"supabase/sql/39_refactor_interactions_table.sql"
"supabase/sql/40_refactor_raw_events_table.sql"
"supabase/sql/41_create_jobs_table.sql"
"supabase/sql/42_consolidate_sync_and_error_tables.sql"
"supabase/sql/43_jobs_table_rls.sql"
"supabase/sql/44_remove_contact_id_from_raw_events.sql"
"supabase/sql/45_add_provider_enum.sql"
"supabase/sql/046_add_contact_extraction_status.sql"
"supabase/sql/047_create_ignored_identifiers_table.sql"
"supabase/sql/048_add_contact_identities_descriptions.sql"
"supabase/sql/49_simplify_interactions_table.sql"
"supabase/sql/050_refactor_raw_events_and_interactions.sql"
"supabase/sql/051_add_rls_to_ignored_identifiers.sql"
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
