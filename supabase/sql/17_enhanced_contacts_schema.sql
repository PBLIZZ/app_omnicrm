-- Enhanced contacts schema for AI features and calendar integration
-- Add new columns to contacts table for AI features

ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS stage text,
ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS confidence_score text;

-- Update the embeddings table to support calendar events
-- (owner_type already supports 'calendar_event' from the schema)

-- Create notes table for detailed contact notes
CREATE TABLE IF NOT EXISTS notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
    title text,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create calendar_events table for Google Calendar integration
CREATE TABLE IF NOT EXISTS calendar_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    google_event_id text UNIQUE NOT NULL,
    title text NOT NULL,
    description text,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    attendees jsonb DEFAULT '[]'::jsonb,
    location text,
    status text DEFAULT 'confirmed',
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create contact_timeline table to track contact interactions
CREATE TABLE IF NOT EXISTS contact_timeline (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    event_type text NOT NULL, -- 'email', 'call', 'meeting', 'note', 'calendar'
    title text NOT NULL,
    description text,
    event_data jsonb DEFAULT '{}'::jsonb,
    occurred_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_contact_id ON notes(contact_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_google_id ON calendar_events(google_event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_attendees ON calendar_events USING gin(attendees);

CREATE INDEX IF NOT EXISTS idx_contact_timeline_user_id ON contact_timeline(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_timeline_contact_id ON contact_timeline(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_timeline_occurred_at ON contact_timeline(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_timeline_event_type ON contact_timeline(event_type);

-- Add RLS policies for new tables
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_timeline ENABLE ROW LEVEL SECURITY;

-- Notes RLS policies
CREATE POLICY "Users can manage their own notes" ON notes
    FOR ALL USING (user_id = auth.uid());

-- Calendar events RLS policies
CREATE POLICY "Users can manage their own calendar events" ON calendar_events
    FOR ALL USING (user_id = auth.uid());

-- Contact timeline RLS policies
CREATE POLICY "Users can manage their own contact timeline" ON contact_timeline
    FOR ALL USING (user_id = auth.uid());

-- Add updated_at trigger for new tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();