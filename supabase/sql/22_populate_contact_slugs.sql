-- Populate slug column for existing contacts
-- This migration generates SEO-friendly slugs for all contacts that don't have them yet

-- Function to generate slug from display name
CREATE OR REPLACE FUNCTION generate_slug(display_name TEXT)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
BEGIN
    -- Convert to lowercase, replace spaces with hyphens, remove special chars
    base_slug := lower(
        regexp_replace(
            regexp_replace(
                regexp_replace(display_name, '[^a-zA-Z0-9\s-]', '', 'g'),
                '\s+', '-', 'g'
            ),
            '-+', '-', 'g'
        )
    );
    
    -- Trim leading/trailing hyphens
    base_slug := trim(both '-' from base_slug);
    
    -- If empty or too short, generate a fallback
    IF base_slug IS NULL OR length(base_slug) < 2 THEN
        base_slug := 'client-' || extract(epoch from now())::bigint;
    END IF;
    
    RETURN base_slug;
END;
$$ LANGUAGE plpgsql;

-- Function to generate unique slug for a user
CREATE OR REPLACE FUNCTION generate_unique_slug(display_name TEXT, user_id UUID)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    suffix INTEGER := 1;
    slug_exists BOOLEAN;
BEGIN
    base_slug := generate_slug(display_name);
    final_slug := base_slug;
    
    -- Check for uniqueness within user's contacts
    LOOP
        SELECT EXISTS(
            SELECT 1 FROM contacts 
            WHERE slug = final_slug AND user_id = generate_unique_slug.user_id
        ) INTO slug_exists;
        
        IF NOT slug_exists THEN
            EXIT;
        END IF;
        
        final_slug := base_slug || '-' || suffix;
        suffix := suffix + 1;
    END LOOP;
    
    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Update all contacts that don't have slugs
UPDATE contacts 
SET slug = generate_unique_slug(display_name, user_id),
    updated_at = now()
WHERE slug IS NULL;

-- Drop the temporary functions
DROP FUNCTION IF EXISTS generate_slug(TEXT);
DROP FUNCTION IF EXISTS generate_unique_slug(TEXT, UUID);

-- Verify the update
DO $$
DECLARE
    null_slug_count INTEGER;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_slug_count FROM contacts WHERE slug IS NULL;
    SELECT COUNT(*) INTO total_count FROM contacts;
    
    RAISE NOTICE 'Migration completed: % contacts updated, % total contacts, % remaining without slugs', 
        total_count - null_slug_count, total_count, null_slug_count;
END $$;
