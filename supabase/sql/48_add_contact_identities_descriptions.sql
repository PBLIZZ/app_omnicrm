-- Migration 48: ADD COLUMN DESCRIPTIONS to contact_identities
-- Description: Adds comprehensive column descriptions to the contact_identities table
-- to document the purpose and usage of each field following industry standards.

-- Add descriptions to all columns in contact_identities table
COMMENT ON TABLE public.contact_identities IS 'Maps contact identifiers (emails, phones, handles) to contact records. This table serves as the bridge between raw data sources and verified contacts, enabling efficient contact matching and deduplication across multiple communication channels.';

COMMENT ON COLUMN public.contact_identities.id IS 'Primary key: Unique identifier for each contact identity record.';

COMMENT ON COLUMN public.contact_identities.user_id IS 'Foreign key: References the user who owns this contact identity mapping.';

COMMENT ON COLUMN public.contact_identities.contact_id IS 'Foreign key: References the contact record this identifier belongs to. Multiple identifiers can map to the same contact (e.g., work email, personal email, phone).';

COMMENT ON COLUMN public.contact_identities.kind IS 'Type of identifier found: "email" (email address), "phone" (phone number), "handle" (social media username), "provider_id" (platform-specific identifier like Google contact ID).';

COMMENT ON COLUMN public.contact_identities.value IS 'The actual identifier value: email address (e.g., john@example.com), phone number (e.g., +1234567890), social media handle (e.g., @johndoe), or provider-specific ID. Stored in plain text following industry standards with application-level security.';

COMMENT ON COLUMN public.contact_identities.provider IS 'Source system where this identifier was discovered: "gmail" (Gmail emails), "google_calendar" (Calendar events), "manual" (user input), "upload" (document upload), "session_attendance" (attendance list), "drive" (Google Drive document), or NULL for manually entered identifiers.';

COMMENT ON COLUMN public.contact_identities.created_at IS 'Timestamp when this identity mapping was first created in the system.';
