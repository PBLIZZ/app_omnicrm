OmniCRM Notes System Design Specification

Version: 1.0
Last Updated: October 2025
Owner: Product Design Team, Omnipotency AI
Context: Wellness Practitioner Use Case

1. Product Overview

The Notes System is the central nervous system of OmniCRM — a living memory that captures, organizes, and connects practitioner thoughts, voice memos, and observations to client timelines. For wellness professionals, notes are not just records; they’re reflections of client progress, insight, and care.

Practitioners must be able to capture notes anywhere, in any format (voice or text), link them instantly to the right client, and review them later with full fidelity — including rich text formatting, contextual AI insights, and voice transcriptions.

2. Core Product Vision

Capture should be effortless.
Three clicks maximum: search contact → record or type → save.

Notes are the nucleus of the contact view.
They sit front and center in the contact card, not hidden behind tabs.

Voice is a natural input.
Speech-to-text transcription via Whisper, with editing before save.

Formatting matters.
Notes should preserve structure, color, and emphasis from the practitioner’s original style.

Context builds trust.
The last note preview is visible everywhere the contact appears.

3. User Stories

3.1 Quick Note Capture (Global Button)

As a wellness practitioner,
I want a “Quick Note” button accessible from the global header,
so I can instantly record or type a note and attach it to a client.

Acceptance Criteria:

A global button component (QuickNoteCapture) in the global header

Searchable dropdown to select a contact (fuzzy search, e.g., typing “JOH” returns “John McAvoy”)

Voice capture option with transcription via Whisper

Auto-save to selected contact with timestamp and device metadata

Optional tag selection

4.2 Contact Table Preview

As a practitioner reviewing my client list,
I want to hover over a column and see the last note preview,
so I can recall recent interactions at a glance.

Acceptance Criteria:

New column Last Note in contacts table

On hover: 6–10 line preview of the last note

Displays timestamp of last note

4.3 Contact Card: Notes Front and Center

As a practitioner viewing a client’s profile,
I want to see all notes front and center,
so I can scroll, search, and capture new entries without switching screens.

Acceptance Criteria:

Rich text rendering with preserved formatting

Infinite scroll for long histories

4.4 Rich Text Fidelity

As a practitioner who takes detailed notes,
I want my formatting — colors, highlights, headings, and lists — to remain visible,
so my notes retain their clarity and emphasis.

Acceptance Criteria:

Preserve contentRich JSONB schema

SSR-safe TipTap rendering with bold/italic/lists/headers/colors

Separate contentPlain for search and AI indexing

Consistent formatting between editor and read mode

4.5 Voice Notes

As a practitioner on the move,
I want to record notes using my voice,
so I can capture thoughts naturally during or after a session.

Acceptance Criteria:

Microphone permission management

Visual recording states with timer and waveform

Whisper transcription → editable text before save

Auto-save with PII redaction pipeline

4.6 Timeline Integration

As a practitioner reviewing a client’s journey,
I want my notes to appear in a unified timeline with interactions and AI insights,
so I can see progress in one continuous view.

Acceptance Criteria:

Use notes + interactions to create AI insights by contact_id and timestamp

Unified feed sorted by recency

Search and filter by date range, sentiment, or goal

5. Feature Roadmap
Phase Feature Description Status
1 Quick Capture Global button in the header with search + record 🚧 In development
2 Rich Text Preservation Fix display pipeline for JSONB 🧩 Partial
5 Voice Integration (Whisper) Transcription + editing pipeline ⏳ Planned
6 AI Insights, TImeline and Sentiment/tags to be scaffolded
