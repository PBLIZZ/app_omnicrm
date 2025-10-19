# OmniMomentum Seed Data

This document describes the comprehensive seed data available for the OmniMomentum workflow, including how to set it up and what data is included.

## Overview

The OmniMomentum seed data provides realistic sample data for all major components of the wellness practitioner workflow:

- **Inbox Items**: Quick capture data with various statuses
- **Daily Pulse Logs**: 7 days of wellness tracking data
- **Habits**: 8 wellness-focused habits with completion tracking
- **Projects**: 12 projects across all wellness zones
- **Tasks**: 25+ hierarchical tasks with realistic statuses
- **Goals**: Personal, business, and client wellness goals

## Quick Start

### Option 1: Simple Seed Script (Recommended)

The simplest way to get started with seed data:

```bash
# First, create the habits tables (one-time setup)
# Run this SQL in your Supabase dashboard or via migration:
# supabase/sql/53_create_habits_tables.sql

# Then run the simple seed script
pnpm run seed:omnimomentum:simple
```

This script will:

- Insert sample inbox items
- Add 7 days of daily pulse logs
- Set up 8 habits with completion tracking (if tables exist)
- Handle missing tables gracefully with helpful instructions

### Option 2: Full SQL Seed Script

For more comprehensive data including projects, tasks, and goals:

```bash
# Run the full SQL seed script
pnpm run seed:omnimomentum
```

This requires the `exec_sql` function to be available in your Supabase instance.

## What's Included

### Inbox Items (8 items)

- **3 Unprocessed**: Items for Today's Focus section
  - Sarah's nutrition plan update
  - John's sleep issues discussion
  - Meditation techniques research
- **3 Processed**: Completed items
  - Workshop venue booking
  - Website testimonials update
  - Yoga mats order
- **2 Archived**: Old or irrelevant items
  - Meditation app idea (abandoned)
  - Dr. Smith referral (handled)

### Daily Pulse Logs (7 days)

Each day includes:

- **Energy Level**: 1-5 scale with realistic variation
- **Sleep Hours**: 5.5-8 hours with natural patterns
- **Nap Minutes**: 0-30 minutes with occasional naps
- **Mood**: Emoji-based mood tracking
- **Notes**: Contextual wellness notes

### Habits (8 habits)

Wellness-focused daily habits:

1. **Morning Meditation** - 10-minute sessions
2. **Exercise** - 30 minutes of activity
3. **Journaling** - Gratitude journal writing
4. **Water Intake** - 8 glasses daily
5. **Digital Detox** - No screens before bed
6. **Client Follow-up** - Check in with clients
7. **Learning** - 30 minutes of study
8. **Gratitude Practice** - 3 things daily

Each habit includes:

- Completion tracking for the past week
- 80% realistic completion rate
- Contextual completion notes

### Projects (12 projects)

Projects across all wellness zones:

**Personal Wellness:**

- Morning Routine Optimization
- Stress Management System

**Self Care:**

- Digital Detox Protocol
- Nutrition Planning System

**Business Development:**

- Wellness Workshop Series
- Client Onboarding Process

**Client Care:**

- Client Progress Tracking
- Follow-up Communication System

**Admin & Finances:**

- Tax Preparation 2024
- Insurance Review

**Social Media & Marketing:**

- Content Calendar Q1
- Client Success Stories

### Tasks (25+ tasks)

Hierarchical tasks with:

- Realistic status distribution (todo, in_progress, done)
- Priority levels (low, medium, high, urgent)
- Due dates and time estimates
- Project associations

### Goals (9 goals)

- **3 Personal Goals**: Morning routine, continuing education, work-life balance
- **3 Business Goals**: Revenue growth, workshop launch, email list building
- **3 Client Goals**: Stress reduction, sleep improvement, activity increase

## Database Schema

### New Tables Created

#### `habits`

```sql
CREATE TABLE public.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  target_frequency TEXT NOT NULL DEFAULT 'daily',
  color TEXT DEFAULT '#10B981',
  icon_name TEXT DEFAULT 'check-circle',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `habit_completions`

```sql
CREATE TABLE public.habit_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, habit_id, completed_date)
);
```

### Row Level Security (RLS)

All new tables have RLS enabled with policies allowing users to manage only their own data.

## Usage in Components

### Daily Pulse Widget

The seed data provides realistic daily pulse logs that will populate the Daily Pulse widget with:

- Energy level ratings (1-5 stars)
- Sleep duration tracking
- Nap time monitoring
- Mood selection with emojis
- Contextual wellness notes

### Habit Trackers

The habit data will show in the Habit Trackers component with:

- 8 wellness-focused habits
- Completion status for each day
- Streak tracking
- Visual progress indicators

### Today's Focus

The unprocessed inbox items will appear in Today's Focus as:

- Top 3 priorities for the day
- Realistic wellness practitioner tasks
- Process buttons for AI categorization

### Quick Capture

The Quick Capture component will work with the seeded inbox items, allowing you to:

- Add new items to the unprocessed list
- Process existing items
- See the impact on Today's Focus

## Customization

### Changing User ID

To use a different user ID, modify the `TEST_USER_ID` constant in the seed scripts:

```typescript
const TEST_USER_ID = 'your-user-id-here';
```

### Adding More Data

You can extend the seed data by:

1. Adding more items to the arrays in the seed scripts
2. Modifying the completion rates for habits
3. Adding more days of daily pulse logs
4. Creating additional projects and tasks

### Modifying Habit Data

To customize the habits, edit the `habits` array in `seed-omnimomentum-simple.ts`:

```typescript
const habits = [
  { name: 'Your Habit', description: 'Description', color: '#10B981', icon_name: 'icon' },
  // ... more habits
];
```

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure you have the `SUPABASE_SECRET_KEY` environment variable set
2. **Table Already Exists**: The scripts use `CREATE TABLE IF NOT EXISTS` and `ON CONFLICT DO NOTHING` to handle existing data
3. **User ID Mismatch**: Make sure the `TEST_USER_ID` matches an existing user in your database

### Resetting Data

To reset the seed data:

```sql
-- Clear existing data (be careful!)
DELETE FROM public.habit_completions WHERE user_id = 'your-user-id';
DELETE FROM public.habits WHERE user_id = 'your-user-id';
DELETE FROM public.daily_pulse_logs WHERE user_id = 'your-user-id';
DELETE FROM public.inbox_items WHERE user_id = 'your-user-id';
-- ... clear other tables as needed
```

Then run the seed script again.

## Next Steps

After running the seed data:

1. **Generate Types**: `pnpm types:gen`
2. **Visit OmniMomentum Page**: See the seeded data in action
3. **Test Components**: Verify all components work with real data
4. **Customize**: Modify the data to match your specific needs
5. **Add More Data**: Extend the seed data as needed for development

The seed data provides a solid foundation for testing and developing the OmniMomentum workflow with realistic, wellness-focused data that matches the target user persona of wellness practitioners.
